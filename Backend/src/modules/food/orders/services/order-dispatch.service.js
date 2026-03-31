import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from '../models/order.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { ValidationError, NotFoundError } from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { config } from '../../../../config/env.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';
import {
  buildDeliverySocketPayload,
  haversineKm,
  notifyOwnerSafely,
  notifyOwnersSafely,
} from './order.helpers.js';

async function listNearbyOnlineDeliveryPartners(
  restaurantId,
  { maxKm = 15, limit = 25 } = {},
) {
  const rId = (restaurantId?._id || restaurantId).toString();
  const restaurant = await FoodRestaurant.findById(rId)
    .select("location")
    .lean();

  if (!restaurant?.location?.coordinates?.length) {
    const partners = await FoodDeliveryPartner.find({
      status: "approved",
      availabilityStatus: "online",
    })
      .select("_id status name")
      .limit(Math.max(1, limit))
      .lean();

    return {
      restaurant: null,
      partners: partners.map((p) => ({ partnerId: p._id, distanceKm: null })),
    };
  }

  const [rLng, rLat] = restaurant.location.coordinates;
  const allOnline = await FoodDeliveryPartner.find({
    availabilityStatus: "online",
  })
    .select("_id status lastLat lastLng lastLocationAt name")
    .lean();

  const scored = [];
  const allowedStatuses = process.env.NODE_ENV === 'production' ? ['approved'] : ['approved', 'pending'];
  const STALE_GPS_MS = 10 * 60 * 1000;

  for (const p of allOnline) {
    if (!allowedStatuses.includes(p.status)) continue;

    const isStale = !p.lastLocationAt || (Date.now() - new Date(p.lastLocationAt).getTime()) > STALE_GPS_MS;
    if (p.lastLat == null || p.lastLng == null || isStale) {
      scored.push({ partnerId: p._id, distanceKm: 999, status: p.status });
      continue;
    }

    const d = haversineKm(rLat, rLng, p.lastLat, p.lastLng);
    if (Number.isFinite(d) && d <= maxKm) {
      scored.push({ partnerId: p._id, distanceKm: d, status: p.status });
    }
  }

  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  const picked = scored.slice(0, Math.max(1, limit));

  if (picked.length === 0) {
    const anyOnline = await FoodDeliveryPartner.find({
      status: { $in: allowedStatuses },
      availabilityStatus: "online",
    })
      .select("_id status name")
      .limit(Math.max(1, limit))
      .lean();

    return {
      partners: anyOnline.map((p) => ({
        partnerId: p._id,
        distanceKm: null,
        status: p.status,
      })),
    };
  }

  const final = (config.env === 'production')
    ? picked.filter(p => p.status === 'approved')
    : picked;

  return { partners: final };
}

export async function getDispatchSettings() {
  let doc = await FoodSettings.findOne({ key: "dispatch" }).lean();
  if (!doc) {
    await FoodSettings.create({ key: "dispatch", dispatchMode: "manual" });
    doc = await FoodSettings.findOne({ key: "dispatch" }).lean();
  }
  return { dispatchMode: doc?.dispatchMode || "manual" };
}

export async function updateDispatchSettings(dispatchMode, adminId) {
  await FoodSettings.findOneAndUpdate(
    { key: "dispatch" },
    {
      $set: {
        dispatchMode,
        updatedBy: { role: "ADMIN", adminId, at: new Date() },
      },
    },
    { upsert: true, new: true },
  );
  return getDispatchSettings();
}

export async function tryAutoAssign(orderId, options = {}) {
  const order = await FoodOrder.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(orderId),
      $or: [
        { 'dispatch.status': 'unassigned' },
        {
          'dispatch.status': 'assigned',
          'dispatch.acceptedAt': { $exists: false },
          'dispatch.assignedAt': { $lt: new Date(Date.now() - 55000) }
        }
      ],
      'dispatch.dispatchingAt': { $exists: false }
    },
    {
      $set: { 'dispatch.dispatchingAt': new Date() }
    },
    { new: true }
  ).populate(['restaurantId', 'userId']);

  if (!order) {
    logger.info(`tryAutoAssign: Skip for ${orderId} (already dispatching or accepted).`);
    return null;
  }

  try {
    const offeredIds = (order.dispatch?.offeredTo || []).map(o => o.partnerId.toString());
    const searchOptions = { maxKm: 30, limit: 10 };
    const { partners } = await listNearbyOnlineDeliveryPartners(order.restaurantId, searchOptions);
    const eligible = partners.filter(p => !offeredIds.includes(p.partnerId.toString()));

    if (eligible.length === 0) {
      try {
        const io = getIO();
        if (io) {
          const payload = buildDeliverySocketPayload(order, order.restaurantId);
          for (const p of partners) {
            const roomName = rooms.delivery(p.partnerId);
            logger.info(
              `[DeliveryDispatch] Emitting new_order_available to ${roomName} for order ${order._id.toString()} (distanceKm=${p.distanceKm ?? 'n/a'})`,
            );
            io.to(roomName).emit('new_order_available', {
              ...payload,
              pickupDistanceKm: p.distanceKm,
            });
            logger.info(
              `[DeliveryDispatch] Emitting play_notification_sound to ${roomName} for order ${order._id.toString()} (broadcast fallback)`,
            );
            io.to(roomName).emit('play_notification_sound', {
              orderId: payload.orderId,
              orderMongoId: payload.orderMongoId,
            });
          }
        }

        await notifyOwnersSafely(
          partners.slice(0, 10).map(p => ({ ownerType: 'DELIVERY_PARTNER', ownerId: p.partnerId })),
          {
            title: 'New delivery order available',
            body: `Order #${order._id.toString()} is available near you.`,
            data: {
              type: 'new_order_available',
              orderId: order._id.toString(),
              orderMongoId: order._id.toString(),
              link: '/delivery',
            },
          },
        );
      } catch (err) {
        logger.warn(`Broadcast failed for order ${order._id.toString()}: ${err.message}`);
      }
      return order;
    }

    const payload = buildDeliverySocketPayload(order, order.restaurantId);
    const io = getIO();

    for (const p of eligible) {
      const roomName = rooms.delivery(p.partnerId);
      try {
        if (io) {
          const pPayload = { ...payload, distanceKm: p.distanceKm === 999 ? null : p.distanceKm };
          logger.info(
            `[DeliveryDispatch] Emitting new_order to ${roomName} for order ${order._id.toString()} (distanceKm=${pPayload.distanceKm ?? 'n/a'})`,
          );
          io.to(roomName).emit('new_order', pPayload);
          logger.info(
            `[DeliveryDispatch] Emitting play_notification_sound to ${roomName} for order ${order._id.toString()}`,
          );
          io.to(roomName).emit('play_notification_sound', {
            orderId: payload.orderId,
            orderMongoId: payload.orderMongoId,
          });
        }
      } catch (err) {
        logger.warn(`Failed to notify partner ${p.partnerId}: ${err.message}`);
      }
    }

    const best = eligible[0];
    order.dispatch.status = 'assigned';
    order.dispatch.deliveryPartnerId = best.partnerId;
    order.dispatch.assignedAt = new Date();
    order.dispatch.offeredTo.push({
      partnerId: best.partnerId,
      at: new Date(),
      action: 'offered',
    });

    await order.save();

    try {
      await notifyOwnerSafely(
        { ownerType: 'DELIVERY_PARTNER', ownerId: best.partnerId },
        {
          title: 'New order assigned!',
          body: `You have 60 seconds to accept Order #${order._id.toString()}.`,
          data: {
            type: 'new_order',
            orderId: order._id.toString(),
            orderMongoId: order._id.toString(),
            link: '/delivery',
          },
        },
      );
    } catch (err) {
      logger.warn(`Failed to notify best partner ${best.partnerId}: ${err.message}`);
    }

    await addOrderJob({
      action: 'DISPATCH_TIMEOUT_CHECK',
      orderMongoId: order._id.toString(),
      orderId: order._id.toString(),
      partnerId: best.partnerId.toString(),
    }, { delay: 60000 });

    return order;
  } finally {
    await FoodOrder.findByIdAndUpdate(orderId, {
      $unset: { 'dispatch.dispatchingAt': '' },
    });
  }
}

export async function processDispatchTimeout(orderId, partnerId) {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;

  const stillAssigned = order.dispatch?.status === 'assigned' &&
    String(order.dispatch?.deliveryPartnerId) === String(partnerId) &&
    !order.dispatch?.acceptedAt;

  if (stillAssigned) {
    const offer = order.dispatch.offeredTo.find(
      o => String(o.partnerId) === String(partnerId) && o.action === 'offered'
    );
    if (offer) offer.action = 'timeout';

    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = null;
    await order.save();
    await tryAutoAssign(orderId);
  }
}

export async function resendDeliveryNotificationRestaurant(orderId, restaurantId) {
  const order = await FoodOrder.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!order) throw new NotFoundError('Order not found');

  const activeStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'ready'];
  if (!activeStatuses.includes(order.orderStatus)) {
    throw new ValidationError(`Cannot resend notification for order in status: ${order.orderStatus}`);
  }

  if (order.dispatch?.status === 'accepted') {
    throw new ValidationError('A delivery partner has already accepted this order.');
  }

  order.dispatch.status = 'unassigned';
  order.dispatch.deliveryPartnerId = null;
  order.dispatch.offeredTo = [];
  await order.save();

  await tryAutoAssign(order._id);
  return { success: true };
}
