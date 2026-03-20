import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from '../models/order.model.js';
import {
    recordFoodOrderPaymentEvent,
    paymentSnapshotFromOrder
} from './foodOrderPayment.service.js';
import { logger } from '../../../../utils/logger.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodZone } from '../../admin/models/zone.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import { ValidationError, ForbiddenError } from '../../../../core/auth/errors.js';
import { buildPaginationOptions, buildPaginatedResult } from '../../../../utils/helpers.js';
import { FoodOffer } from '../../admin/models/offer.model.js';
import { FoodOfferUsage } from '../../admin/models/offerUsage.model.js';
import { FoodDeliveryCommissionRule } from '../../admin/models/deliveryCommissionRule.model.js';
import {
  sendNotificationToOwner,
  sendNotificationToOwners,
} from "../../../../core/notifications/firebase.service.js";
import {
    createRazorpayOrder,
    createPaymentLink,
    verifyPaymentSignature,
    getRazorpayKeyId,
    isRazorpayConfigured
} from '../helpers/razorpay.helper.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';

const ORDER_ID_PREFIX = "FOD-";
const ORDER_ID_LENGTH = 6;

/**
 * Fire-and-forget BullMQ enqueue for order lifecycle events.
 * Never blocks API response; failures are logged only.
 */
function enqueueOrderEvent(action, payload = {}) {
    try {
        void addOrderJob({ action, ...payload }).catch((err) => {
            logger.warn(`BullMQ enqueue order event failed: ${action} - ${err?.message || err}`);
        });
    } catch (err) {
        logger.warn(`BullMQ enqueue order event failed (sync): ${action} - ${err?.message || err}`);
    }
}

function generateFourDigitDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Remove secret fields before returning order JSON to delivery partner / restaurant. */
function sanitizeOrderForExternal(orderDoc) {
  const o = orderDoc?.toObject ? orderDoc.toObject() : { ...(orderDoc || {}) };
  delete o.deliveryOtp;
  const dv = o.deliveryVerification;
  if (dv && dv.dropOtp != null) {
    const d = dv.dropOtp;
    o.deliveryVerification = {
      ...dv,
      dropOtp: {
        required: Boolean(d.required),
        verified: Boolean(d.verified),
      },
    };
  }
  return o;
}

function emitDeliveryDropOtpToUser(order, plainOtp) {
  try {
    const io = getIO();
    if (!io || !plainOtp || !order?.userId) return;
    io.to(rooms.user(order.userId)).emit("delivery_drop_otp", {
      orderMongoId: order._id?.toString?.(),
      orderId: order.orderId,
      otp: plainOtp,
      message:
        "Share this OTP with your delivery partner to hand over the order.",
    });
  } catch (e) {
    logger.warn(`emitDeliveryDropOtpToUser failed: ${e?.message || e}`);
  }
}

async function notifyOwnersSafely(targets, payload) {
  try {
    await sendNotificationToOwners(targets, payload);
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

async function notifyOwnerSafely(target, payload) {
  try {
    await sendNotificationToOwner({ ...target, payload });
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

function buildOrderIdentityFilter(orderIdOrMongoId) {
  const raw = String(orderIdOrMongoId || "").trim();
  if (!raw) return null;
  if (mongoose.isValidObjectId(raw))
    return { _id: new mongoose.Types.ObjectId(raw) };
  return { orderId: raw };
}

function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < ORDER_ID_LENGTH; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return ORDER_ID_PREFIX + s;
}

async function ensureUniqueOrderId() {
  let orderId;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    orderId = generateOrderId();
    const found = await FoodOrder.exists({ orderId });
    exists = !!found;
    attempts++;
  }
  if (exists) throw new ValidationError("Could not generate unique order id");
  return orderId;
}

function toGeoPoint(lat, lng) {
  if (lat == null || lng == null) return undefined;
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return { type: "Point", coordinates: [b, a] };
}

function pushStatusHistory(order, { byRole, byId, from, to, note = "" }) {
  order.statusHistory.push({
    at: new Date(),
    byRole,
    byId: byId || undefined,
    from,
    to,
    note,
  });
}

function normalizeOrderForClient(orderDoc) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc || {};
  return {
    ...order,
    status: order?.orderStatus || order?.status || "",
    deliveredAt:
      order?.deliveryState?.deliveredAt || order?.deliveredAt || null,
    deliveryPartnerId:
      order?.dispatch?.deliveryPartnerId || order?.deliveryPartnerId || null,
    rating: order?.ratings?.restaurant?.rating ?? order?.rating ?? null,
  };
}

async function applyAggregateRating(model, entityId, newRating) {
  if (!entityId) return;
  const doc = await model.findById(entityId).select("rating totalRatings");
  if (!doc) return;

  const totalRatings = Number(doc.totalRatings || 0);
  const currentAverage = Number(doc.rating || 0);
  const nextTotal = totalRatings + 1;
  const nextAverage = Number(
    ((currentAverage * totalRatings + Number(newRating)) / nextTotal).toFixed(
      1,
    ),
  );

  doc.totalRatings = nextTotal;
  doc.rating = nextAverage;
  await doc.save();
}

const COMMISSION_CACHE_MS = 10 * 1000;
let commissionRulesCache = null;
let commissionRulesLoadedAt = 0;

async function getActiveCommissionRules() {
  const now = Date.now();
  if (
    commissionRulesCache &&
    now - commissionRulesLoadedAt < COMMISSION_CACHE_MS
  ) {
    return commissionRulesCache;
  }
  const list = await FoodDeliveryCommissionRule.find({
    status: { $ne: false },
  }).lean();
  commissionRulesCache = list || [];
  commissionRulesLoadedAt = now;
  return commissionRulesCache;
}

async function getRiderEarning(distanceKm) {
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const rules = await getActiveCommissionRules();
  if (!rules.length) return 0;

  const sorted = [...rules].sort(
    (a, b) => (a.minDistance || 0) - (b.minDistance || 0),
  );
  const baseRule = sorted.find((r) => Number(r.minDistance || 0) === 0) || null;
  if (!baseRule) return 0;

  let earning = Number(baseRule.basePayout || 0);

  for (const r of sorted) {
    const perKm = Number(r.commissionPerKm || 0);
    if (!Number.isFinite(perKm) || perKm <= 0) continue;
    const min = Number(r.minDistance || 0);
    const max = r.maxDistance == null ? null : Number(r.maxDistance);
    if (d <= min) continue;
    const upper = max == null ? d : Math.min(d, max);
    const kmInSlab = Math.max(0, upper - min);
    if (kmInSlab > 0) {
      earning += kmInSlab * perKm;
    }
  }

  if (!Number.isFinite(earning) || earning <= 0) return 0;
  return Math.round(earning);
}

/** Append-only food_order_payments row; never blocks main flow on failure */
async function appendOrderPaymentLedger(orderDoc, kind, extra = {}) {
  try {
    const snap = paymentSnapshotFromOrder(orderDoc);
    await recordFoodOrderPaymentEvent({
      orderId: orderDoc._id,
      userId: orderDoc.userId,
      orderReadableId: orderDoc.orderId,
      kind,
      method: snap.method,
      status: snap.status,
      amount: snap.amount,
      currency: snap.currency,
      amountDue: snap.amountDue,
      pricingSnapshot: snap.pricingSnapshot,
      razorpay: snap.razorpay,
      qr: snap.qr,
      metadata: extra.metadata,
      recordedByRole: extra.recordedByRole || "SYSTEM",
      recordedById: extra.recordedById,
    });
  } catch (err) {
    const detail = err?.errors ? JSON.stringify(err.errors) : "";
    logger.error(
      `appendOrderPaymentLedger failed (${kind}): ${err?.message || err} ${detail}`.trim(),
    );
  }
}

function buildDeliverySocketPayload(orderDoc, restaurantDoc = null) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc || {};
  const restaurant = restaurantDoc || order?.restaurantId || null;
  const restaurantLocation = restaurant?.location || {};

  return {
    orderMongoId:
      orderDoc?._id?.toString?.() || order?._id?.toString?.() || order?._id,
    orderId: order?.orderId,
    status: orderDoc?.orderStatus || order?.orderStatus,
    items: order?.items || [],
    pricing: order?.pricing,
    total: order?.pricing?.total,
    payment: order?.payment,
    paymentMethod: order?.payment?.method,
    restaurantId:
      order?.restaurantId?._id?.toString?.() ||
      order?.restaurantId?.toString?.() ||
      order?.restaurantId,
    restaurantName: restaurant?.restaurantName || order?.restaurantName,
    restaurantLocation: {
      latitude: restaurantLocation?.latitude,
      longitude: restaurantLocation?.longitude,
      address:
        restaurantLocation?.address ||
        restaurantLocation?.formattedAddress ||
        restaurant?.addressLine1 ||
        "",
      formattedAddress:
        restaurantLocation?.formattedAddress ||
        restaurantLocation?.address ||
        "",
      area: restaurantLocation?.area || restaurant?.area || "",
      city: restaurantLocation?.city || restaurant?.city || "",
      state: restaurantLocation?.state || restaurant?.state || "",
    },
    deliveryAddress: order?.deliveryAddress,
    deliveryFleet: order?.deliveryFleet,
    dispatch: order?.dispatch,
    createdAt: order?.createdAt,
    updatedAt: order?.updatedAt,
  };
}

async function listNearbyOnlineDeliveryPartners(
  restaurantId,
  { maxKm = 15, limit = 25 } = {},
) {
  const restaurant = await FoodRestaurant.findById(restaurantId)
    .select("location")
    .lean();
  if (!restaurant?.location?.coordinates?.length) {
    // Fallback: if restaurant location is missing, notify any online approved partners.
    const partners = await FoodDeliveryPartner.find({
      status: "approved",
      availabilityStatus: "online",
    })
      .select("_id")
      .limit(Math.max(1, limit))
      .lean();
    return {
      restaurant: null,
      partners: partners.map((p) => ({ partnerId: p._id, distanceKm: null })),
    };
  }

  const [rLng, rLat] = restaurant.location.coordinates;
  const partners = await FoodDeliveryPartner.find({
    status: "approved",
    availabilityStatus: "online",
    lastLat: { $exists: true, $ne: null },
    lastLng: { $exists: true, $ne: null },
  })
    .select("_id lastLat lastLng")
    .lean();

  const scored = [];
  for (const p of partners) {
    const d = haversineKm(rLat, rLng, p.lastLat, p.lastLng);
    if (Number.isFinite(d) && d <= maxKm)
      scored.push({ partnerId: p._id, distanceKm: d });
  }

  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  const picked = scored.slice(0, Math.max(1, limit));

  // Fallback: if no one has GPS yet, still notify online partners (common right after login).
  if (picked.length === 0) {
    const anyOnline = await FoodDeliveryPartner.find({
      status: "approved",
      availabilityStatus: "online",
    })
      .select("_id")
      .limit(Math.max(1, limit))
      .lean();
    return {
      restaurant,
      partners: anyOnline.map((p) => ({ partnerId: p._id, distanceKm: null })),
    };
  }

  return { restaurant, partners: picked };
}

// ----- Settings -----
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

// ----- Calculate (validation + return pricing from payload) -----
export async function calculateOrder(userId, dto) {
  const restaurant = await FoodRestaurant.findById(dto.restaurantId)
    .select("status")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");
  if (restaurant.status !== "approved")
    throw new ValidationError("Restaurant not available");

  const items = Array.isArray(dto.items) ? dto.items : [];
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0,
  );

  // Fee settings (admin-configured). Use safe fallbacks for dev if not configured.
  const feeDoc = await FoodFeeSettings.findOne({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  const feeSettings = feeDoc || {
    deliveryFee: 25,
    deliveryFeeRanges: [],
    freeDeliveryThreshold: 149,
    platformFee: 5,
    gstRate: 5,
  };

  const packagingFee = 0;
  const platformFee = Number(feeSettings.platformFee || 0);

  // Delivery fee by subtotal range (fallback to flat fee; free above threshold).
  const freeThreshold = Number(feeSettings.freeDeliveryThreshold || 0);
  let deliveryFee = 0;
  if (
    Number.isFinite(freeThreshold) &&
    freeThreshold > 0 &&
    subtotal >= freeThreshold
  ) {
    deliveryFee = 0;
  } else {
    const ranges = Array.isArray(feeSettings.deliveryFeeRanges)
      ? [...feeSettings.deliveryFeeRanges]
      : [];
    if (ranges.length > 0) {
      ranges.sort((a, b) => Number(a.min) - Number(b.min));
      let matched = null;
      for (let i = 0; i < ranges.length; i += 1) {
        const r = ranges[i] || {};
        const min = Number(r.min);
        const max = Number(r.max);
        const fee = Number(r.fee);
        if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          !Number.isFinite(fee)
        )
          continue;
        const isLast = i === ranges.length - 1;
        const inRange = isLast
          ? subtotal >= min && subtotal <= max
          : subtotal >= min && subtotal < max;
        if (inRange) {
          matched = fee;
          break;
        }
      }
      deliveryFee = Number.isFinite(matched)
        ? matched
        : Number(feeSettings.deliveryFee || 0);
    } else {
      deliveryFee = Number(feeSettings.deliveryFee || 0);
    }
  }

  const gstRate = Number(feeSettings.gstRate || 0);
  const tax =
    Number.isFinite(gstRate) && gstRate > 0
      ? Math.round(subtotal * (gstRate / 100))
      : 0;

  let discount = 0;
  let appliedCoupon = null;
  const codeRaw = dto.couponCode
    ? String(dto.couponCode).trim().toUpperCase()
    : "";
  if (codeRaw) {
    const now = new Date();
    const offer = await FoodOffer.findOne({ couponCode: codeRaw }).lean();
    if (!offer) {
      discount = 0;
    } else {
      const statusOk = offer.status === "active";
      const startOk = !offer.startDate || now >= new Date(offer.startDate);
      const endOk = !offer.endDate || now < new Date(offer.endDate);
      const scopeOk =
        offer.restaurantScope !== "selected" ||
        String(offer.restaurantId || "") === String(dto.restaurantId || "");
      const minOk = subtotal >= (Number(offer.minOrderValue) || 0);
      let usageOk = true;
      if (
        Number(offer.usageLimit) > 0 &&
        Number(offer.usedCount || 0) >= Number(offer.usageLimit)
      )
        usageOk = false;
      let perUserOk = true;
      if (userId && Number(offer.perUserLimit) > 0) {
        const usage = await FoodOfferUsage.findOne({
          offerId: offer._id,
          userId,
        }).lean();
        if (usage && Number(usage.count) >= Number(offer.perUserLimit))
          perUserOk = false;
      }
      let firstOrderOk = true;
      if (userId && offer.customerScope === "first-time") {
        const c = await FoodOrder.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
        });
        firstOrderOk = c === 0;
      }
      if (userId && offer.isFirstOrderOnly === true) {
        const c2 = await FoodOrder.countDocuments({
          userId: new mongoose.Types.ObjectId(userId),
        });
        if (c2 > 0) firstOrderOk = false;
      }
      const allowed =
        statusOk &&
        startOk &&
        endOk &&
        scopeOk &&
        minOk &&
        usageOk &&
        perUserOk &&
        firstOrderOk;
      if (allowed) {
        if (offer.discountType === "percentage") {
          const raw = subtotal * (Number(offer.discountValue) / 100);
          const capped = Number(offer.maxDiscount)
            ? Math.min(raw, Number(offer.maxDiscount))
            : raw;
          discount = Math.max(0, Math.min(subtotal, Math.floor(capped)));
        } else {
          discount = Math.max(
            0,
            Math.min(subtotal, Math.floor(Number(offer.discountValue) || 0)),
          );
        }
        appliedCoupon = { code: codeRaw, discount };
      }
    }
  }
  const total = Math.max(
    0,
    subtotal + packagingFee + deliveryFee + platformFee + tax - discount,
  );
  return {
    pricing: {
      subtotal,
      tax,
      packagingFee,
      deliveryFee,
      platformFee,
      discount,
      total,
      currency: "INR",
      couponCode: appliedCoupon?.code || codeRaw || null,
      appliedCoupon,
    },
  };
}

// ----- Create order -----
export async function createOrder(userId, dto) {
  const restaurant = await FoodRestaurant.findById(dto.restaurantId)
    .select("status restaurantName zoneId location")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");
  if (restaurant.status !== "approved")
    throw new ValidationError("Restaurant not accepting orders");

  const orderId = await ensureUniqueOrderId();
  const settings = await getDispatchSettings();
  const dispatchMode = settings.dispatchMode;

  const deliveryAddress = {
    label: dto.address?.label || "Home",
    street: dto.address?.street || "",
    additionalDetails: dto.address?.additionalDetails || "",
    city: dto.address?.city || "",
    state: dto.address?.state || "",
    zipCode: dto.address?.zipCode || "",
    phone: dto.address?.phone || "",
    location: dto.address?.location?.coordinates
      ? { type: "Point", coordinates: dto.address.location.coordinates }
      : undefined,
  };

  const paymentMethod =
    dto.paymentMethod === "card" ? "razorpay" : dto.paymentMethod;
  const isCash = paymentMethod === "cash";
  const isWallet = paymentMethod === "wallet";

  // Ensure pricing is present and consistent.
  const computedSubtotal = (dto.items || []).reduce((sum, item) => {
    const price = Number(item?.price);
    const qty = Number(item?.quantity);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return sum;
    return sum + Math.max(0, price) * Math.max(0, qty);
  }, 0);
  const normalizedPricing = {
    subtotal: Number(dto.pricing?.subtotal ?? computedSubtotal),
    tax: Number(dto.pricing?.tax ?? 0),
    packagingFee: Number(dto.pricing?.packagingFee ?? 0),
    deliveryFee: Number(dto.pricing?.deliveryFee ?? 0),
    platformFee: Number(dto.pricing?.platformFee ?? 0),
    discount: Number(dto.pricing?.discount ?? 0),
    total: Number(dto.pricing?.total ?? 0),
    currency: String(dto.pricing?.currency || "INR"),
  };
  const computedTotal = Math.max(
    0,
    (Number.isFinite(normalizedPricing.subtotal)
      ? normalizedPricing.subtotal
      : 0) +
      (Number.isFinite(normalizedPricing.tax) ? normalizedPricing.tax : 0) +
      (Number.isFinite(normalizedPricing.packagingFee)
        ? normalizedPricing.packagingFee
        : 0) +
      (Number.isFinite(normalizedPricing.deliveryFee)
        ? normalizedPricing.deliveryFee
        : 0) +
      (Number.isFinite(normalizedPricing.platformFee)
        ? normalizedPricing.platformFee
        : 0) -
      (Number.isFinite(normalizedPricing.discount)
        ? normalizedPricing.discount
        : 0),
  );
  if (
    !Number.isFinite(normalizedPricing.total) ||
    normalizedPricing.total <= 0
  ) {
    normalizedPricing.total = computedTotal;
  }

  const payment = {
    method: paymentMethod,
    status: isCash ? "cod_pending" : isWallet ? "paid" : "created",
    amountDue: normalizedPricing.total ?? 0,
    razorpay: {},
    qr: {},
  };

  let distanceKm = null;
  if (
    restaurant.location?.coordinates?.length === 2 &&
    dto.address?.location?.coordinates?.length === 2
  ) {
    const [rLng, rLat] = restaurant.location.coordinates;
    const [dLng, dLat] = dto.address.location.coordinates;
    const d = haversineKm(rLat, rLng, dLat, dLng);
    distanceKm = Number.isFinite(d) ? d : null;
  } else {
    console.warn(
      `Food order ${orderId}: distance not available, rider earning set to 0`,
    );
  }

  const riderEarning = await getRiderEarning(distanceKm);
  const platformProfit = Math.max(
    0,
    (Number.isFinite(normalizedPricing.deliveryFee)
      ? normalizedPricing.deliveryFee
      : 0) +
      (Number.isFinite(normalizedPricing.platformFee)
        ? normalizedPricing.platformFee
        : 0) -
      riderEarning,
  );

  const order = new FoodOrder({
    orderId,
    userId: new mongoose.Types.ObjectId(userId),
    restaurantId: new mongoose.Types.ObjectId(dto.restaurantId),
    zoneId: dto.zoneId
      ? new mongoose.Types.ObjectId(dto.zoneId)
      : restaurant.zoneId,
    items: dto.items,
    deliveryAddress,
    pricing: normalizedPricing,
    payment,
    orderStatus: "created",
    dispatch: { modeAtCreation: dispatchMode, status: "unassigned" },
    statusHistory: [
      {
        at: new Date(),
        byRole: "SYSTEM",
        from: "",
        to: "created",
        note: "Order placed",
      },
    ],
    note: dto.note || "",
    sendCutlery: dto.sendCutlery !== false,
    deliveryFleet: dto.deliveryFleet || "standard",
    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    riderEarning,
    platformProfit,
  });

  let razorpayPayload = null;

  if (paymentMethod === "razorpay" && isRazorpayConfigured()) {
    const amountPaise = Math.round((normalizedPricing.total ?? 0) * 100);
    if (amountPaise < 100)
      throw new ValidationError("Amount too low for online payment");
    try {
      const rzOrder = await createRazorpayOrder(amountPaise, "INR", orderId);
      order.payment.razorpay = {
        orderId: rzOrder.id,
        paymentId: "",
        signature: "",
      };
      order.payment.status = "created";
      razorpayPayload = {
        key: getRazorpayKeyId(),
        orderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency || "INR",
      };
    } catch (err) {
      throw new ValidationError(err?.message || "Payment gateway error");
    }
  }

  await order.save();

  await appendOrderPaymentLedger(order, "order_placed", {
    recordedByRole: "USER",
    recordedById: new mongoose.Types.ObjectId(userId),
    metadata: { dispatchMode, paymentMethod },
  });
  if (paymentMethod === "razorpay" && order.payment?.razorpay?.orderId) {
    await appendOrderPaymentLedger(order, "razorpay_order_created", {
      recordedByRole: "SYSTEM",
      metadata: { razorpayOrderId: order.payment.razorpay.orderId },
    });
  }

  // Real-time: notify restaurant instantly (Zomato-style).
  try {
    const io = getIO();
    if (io) {
      const payload = {
        ...order.toObject(),
        orderMongoId: order._id?.toString?.() || undefined,
      };
      io.to(rooms.restaurant(dto.restaurantId)).emit("new_order", payload);
      io.to(rooms.restaurant(dto.restaurantId)).emit(
        "play_notification_sound",
        {
          orderId: payload.orderId,
          orderMongoId: payload.orderMongoId,
        },
      );
    }

    // Notify Customer
    await notifyOwnersSafely([{ ownerType: "USER", ownerId: userId }], {
      title: "Order Confirmed! 🍔",
      body: `Your order #${orderId} from ${restaurant.restaurantName || "the restaurant"} has been placed successfully.`,
      image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
      data: {
        type: "order_created",
        orderId: String(orderId),
        orderMongoId: order._id?.toString?.() || "",
        link: `/food/user/orders/${order._id?.toString?.() || ""}`,
      },
    });

    // Notify Restaurant
    await notifyOwnersSafely(
      [{ ownerType: "RESTAURANT", ownerId: dto.restaurantId }],
      {
        title: "New order received",
        body: `Order ${order.orderId} is waiting for review.`,
        data: {
          type: "new_order",
          orderId: order.orderId,
          orderMongoId: order._id?.toString?.() || "",
          link: `/restaurant/orders/${order._id?.toString?.() || ""}`,
        },
      },
    );
  } catch {
    // Don't block order placement on socket failures.
  }
  const couponCode = dto.pricing?.couponCode
    ? String(dto.pricing.couponCode).trim().toUpperCase()
    : "";
  if (couponCode) {
    const offer = await FoodOffer.findOne({ couponCode }).lean();
    if (offer) {
      await FoodOffer.updateOne({ _id: offer._id }, { $inc: { usedCount: 1 } });
      if (userId) {
        await FoodOfferUsage.updateOne(
          { offerId: offer._id, userId: new mongoose.Types.ObjectId(userId) },
          { $inc: { count: 1 }, $set: { lastUsedAt: new Date() } },
          { upsert: true },
        );
      }
    }
  }

  if (
    dispatchMode === "auto" &&
    (isCash ||
      order.payment.status === "paid" ||
      order.payment.status === "cod_pending")
  ) {
    try {
      await tryAutoAssign(order._id);
    } catch {
      // leave unassigned
    }
  }

  const saved = order.toObject();
  return { order: saved, razorpay: razorpayPayload };
}

// ----- Verify payment -----
export async function verifyPayment(userId, dto) {
  const order = await FoodOrder.findOne({
    _id: new mongoose.Types.ObjectId(dto.orderId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new ValidationError("Order not found");
  if (order.payment.status === "paid")
    return { order: order.toObject(), payment: order.payment };

  const valid = verifyPaymentSignature(
    dto.razorpayOrderId,
    dto.razorpayPaymentId,
    dto.razorpaySignature,
  );
  if (!valid) throw new ValidationError("Payment verification failed");

  order.payment.status = "paid";
  order.payment.razorpay.paymentId = dto.razorpayPaymentId;
  order.payment.razorpay.signature = dto.razorpaySignature;
  pushStatusHistory(order, {
    byRole: "USER",
    byId: userId,
    from: order.orderStatus,
    to: "created",
    note: "Payment verified",
  });
  await order.save();

  await appendOrderPaymentLedger(order, "online_payment_verified", {
    recordedByRole: "USER",
    recordedById: new mongoose.Types.ObjectId(userId),
    metadata: {
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpayOrderId: dto.razorpayOrderId,
    },
  });

  // Notify Customer about payment success
  await notifyOwnersSafely([{ ownerType: "USER", ownerId: userId }], {
    title: "Payment Successful! ✅",
    body: `We have received your payment of ₹${order.payment.amountDue} for Order #${order.orderId}.`,
    image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
    data: {
      type: "payment_success",
      orderId: String(order.orderId),
      orderMongoId: String(order._id),
    },
  });

  const settings = await getDispatchSettings();
  if (settings.dispatchMode === "auto") {
    try {
      await tryAutoAssign(order._id);
    } catch {}
  }

  return { order: order.toObject(), payment: order.payment };
}

// ----- Auto-assign -----
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function tryAutoAssign(orderId) {
  const order = await FoodOrder.findById(orderId)
    .select("restaurantId dispatch")
    .lean();
  if (!order || order.dispatch?.status !== "unassigned") return null;

  const restaurant = await FoodRestaurant.findById(order.restaurantId)
    .select("location")
    .lean();
  if (!restaurant?.location?.coordinates?.length) return null;

  const [rLng, rLat] = restaurant.location.coordinates;
  const partners = await FoodDeliveryPartner.find({
    status: "approved",
    availabilityStatus: "online",
    lastLat: { $exists: true, $ne: null },
    lastLng: { $exists: true, $ne: null },
  })
    .select("_id lastLat lastLng")
    .lean();

  let best = null;
  let bestDist = Infinity;
  for (const p of partners) {
    const d = haversineKm(rLat, rLng, p.lastLat, p.lastLng);
    if (d < bestDist && d <= 15) {
      bestDist = d;
      best = p;
    }
  }

  if (!best) return null;

    const doc = await FoodOrder.findByIdAndUpdate(
        orderId,
        {
            $set: {
                'dispatch.status': 'assigned',
                'dispatch.deliveryPartnerId': best._id,
                'dispatch.assignedAt': new Date()
            }
        },
        { new: true }
    );
  return doc;
}

// ----- User: list, get, cancel -----
export async function listOrdersUser(userId, query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate(
        "restaurantId",
        "restaurantName profileImage area city location rating totalRatings",
      )
      .populate("dispatch.deliveryPartnerId", "name phone rating totalRatings")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  return buildPaginatedResult({
    docs: docs.map((doc) => normalizeOrderForClient(doc)),
    total,
    page,
    limit,
  });
}

export async function getOrderById(
  orderId,
  { userId, restaurantId, deliveryPartnerId, admin } = {},
) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");
  const order = await FoodOrder.findOne(identity)
    .populate(
      "restaurantId",
      "restaurantName profileImage area city location rating totalRatings",
    )
    .populate("dispatch.deliveryPartnerId", "name phone rating totalRatings")
    .populate("userId", "name phone email")
    .select("+deliveryOtp")
    .lean();
  if (!order) throw new ValidationError("Order not found");

  if (admin) return normalizeOrderForClient(order);

  const orderUserId = order.userId?._id?.toString() || order.userId?.toString();
  const orderRestaurantId = order.restaurantId?._id?.toString() || order.restaurantId?.toString();
  const orderPartnerId = order.dispatch?.deliveryPartnerId?._id?.toString() || order.dispatch?.deliveryPartnerId?.toString();

  if (userId && orderUserId !== userId.toString())
    throw new ForbiddenError("Not your order");
  if (restaurantId && orderRestaurantId !== restaurantId.toString())
    throw new ForbiddenError("Not your restaurant order");
  if (deliveryPartnerId && orderPartnerId !== deliveryPartnerId.toString())
    throw new ForbiddenError("Not assigned to you");

  if (deliveryPartnerId || restaurantId) {
    return sanitizeOrderForExternal(order);
  }

  if (userId) {
    const drop = order.deliveryVerification?.dropOtp || {};
    const secret = String(order.deliveryOtp || "").trim();
    const out = normalizeOrderForClient(order);
    delete out.deliveryOtp;
    out.deliveryVerification = {
      ...(order.deliveryVerification || {}),
      dropOtp: {
        required: Boolean(drop.required),
        verified: Boolean(drop.verified),
      },
    };
    if (drop.required && !drop.verified && secret) {
      out.handoverOtp = secret;
    }
    return out;
  }

  return sanitizeOrderForExternal(order);
}

export async function cancelOrder(orderId, userId, reason) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new ValidationError("Order not found");

  const allowed = ["created"];
  if (!allowed.includes(order.orderStatus))
    throw new ValidationError("Order cannot be cancelled");

  const from = order.orderStatus;
  order.orderStatus = "cancelled_by_user";
  pushStatusHistory(order, {
    byRole: "USER",
    byId: userId,
    from,
    to: "cancelled_by_user",
    note: reason || "",
  });
  await order.save();

  enqueueOrderEvent("order_cancelled_by_user", {
    orderMongoId: order._id?.toString?.(),
    orderId: order.orderId,
    userId,
    reason: reason || "",
  });

  // Notify User and Restaurant about the cancellation
  await notifyOwnersSafely(
    [
      { ownerType: "USER", ownerId: userId },
      { ownerType: "RESTAURANT", ownerId: order.restaurantId },
    ],
    {
      title: "Order Cancelled ❌",
      body: `Order #${order.orderId} has been cancelled successfully.`,
      image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
      data: {
        type: "order_cancelled",
        orderId: String(order.orderId),
        orderMongoId: String(order._id),
      },
    },
  );

  return order.toObject();
}

export async function submitOrderRatings(orderId, userId, dto) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new ValidationError("Order not found");
  if (String(order.orderStatus) !== "delivered") {
    throw new ValidationError("You can rate only delivered orders");
  }

  const hasDeliveryPartner = !!order.dispatch?.deliveryPartnerId;
  if (hasDeliveryPartner && !dto.deliveryPartnerRating) {
    throw new ValidationError("Delivery partner rating is required");
  }

  const restaurantAlreadyRated = Number.isFinite(
    Number(order?.ratings?.restaurant?.rating),
  );
  const deliveryAlreadyRated = Number.isFinite(
    Number(order?.ratings?.deliveryPartner?.rating),
  );
  if (restaurantAlreadyRated || (hasDeliveryPartner && deliveryAlreadyRated)) {
    throw new ValidationError("Ratings already submitted for this order");
  }

  const now = new Date();
  order.ratings = order.ratings || {};
  order.ratings.restaurant = {
    rating: dto.restaurantRating,
    comment: dto.restaurantComment || "",
    ratedAt: now,
  };

  if (hasDeliveryPartner) {
    order.ratings.deliveryPartner = {
      rating: dto.deliveryPartnerRating,
      comment: dto.deliveryPartnerComment || "",
      ratedAt: now,
    };
  }

  await Promise.all([
    applyAggregateRating(
      FoodRestaurant,
      order.restaurantId,
      dto.restaurantRating,
    ),
    hasDeliveryPartner
      ? applyAggregateRating(
          FoodDeliveryPartner,
          order.dispatch.deliveryPartnerId,
          dto.deliveryPartnerRating,
        )
      : Promise.resolve(),
  ]);

    await order.save();
    enqueueOrderEvent('order_ratings_submitted', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        userId,
        restaurantRating: dto.restaurantRating,
        deliveryPartnerRating: hasDeliveryPartner ? dto.deliveryPartnerRating : null
    });
}

// ----- Restaurant -----
export async function listOrdersRestaurant(restaurantId, query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };
  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  return buildPaginatedResult({ docs, total, page, limit });
}

export async function updateOrderStatusRestaurant(
  orderId,
  restaurantId,
  orderStatus,
) {
  const order = await FoodOrder.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });
  if (!order) throw new ValidationError("Order not found");
  const from = order.orderStatus;
  order.orderStatus = orderStatus;
  pushStatusHistory(order, {
    byRole: "RESTAURANT",
    byId: restaurantId,
    from,
    to: orderStatus,
  });
  await order.save();

  // Real-time: status update to restaurant room.
  try {
    const io = getIO();
    if (io) {
      console.log(
        `[DEBUG] Emitting status update to restaurant ${restaurantId} and user ${order.userId}: ${orderStatus}`,
      );
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        orderStatus: order.orderStatus,
      };
      io.to(rooms.restaurant(restaurantId)).emit(
        "order_status_update",
        payload,
      );
      io.to(rooms.user(order.userId)).emit("order_status_update", payload);
    }

    let title = `Order ${order.orderId} updated`;
    let body = `Status changed to ${String(orderStatus).replace(/_/g, " ")}`;

    // Custom messages for customer based on status
    if (orderStatus === "confirmed") {
      title = "Order Accepted! 🧑‍🍳";
      body =
        "The restaurant has accepted your order and is starting to prepare it.";
    } else if (orderStatus === "preparing") {
      title = "Food is being prepared! 🍳";
      body = "Your food is currently being prepared by the restaurant.";
    } else if (orderStatus === "ready_for_pickup" || orderStatus === "ready") {
      title = "Food is ready! 🛍️";
      body = "Your order is ready and waiting to be picked up.";
    } else if (String(orderStatus).includes("cancel")) {
      title = "Order Cancelled ❌";
      body = "Unfortunately, your order has been cancelled by the restaurant.";
    }

    const notifyList = [
      { ownerType: "USER", ownerId: order.userId },
      { ownerType: "RESTAURANT", ownerId: restaurantId },
    ];

    const assignedRiderId = order.dispatch?.deliveryPartnerId;
    if (assignedRiderId) {
      notifyList.push({ ownerType: "DELIVERY_PARTNER", ownerId: assignedRiderId });
    }

    let riderTitle = `Order #${order.orderId} updated`;
    let riderBody = `The order status is now ${String(orderStatus).replace(/_/g, " ")}.`;

    if (String(orderStatus).includes("cancel")) {
      riderTitle = "Order Cancelled ❌";
      riderBody = `Order #${order.orderId} has been cancelled. Please stop your current task.`;
    }

    await notifyOwnersSafely(
      notifyList,
      {
        title: title,
        body: body,
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "order_status_update",
          orderId: order.orderId,
          orderMongoId: order._id?.toString?.() || "",
          orderStatus: String(orderStatus || ""),
          link: `/food/user/orders/${order._id?.toString?.() || ""}`,
        },
      },
    );
  } catch (err) {
    console.error("[DEBUG] Error emitting status update to restaurant:", err);
  }

  // Real-time: delivery request / ready notifications.
  try {
    const io = getIO();
    if (io) {
      // On accept -> request delivery partners.
      if (String(orderStatus) === "preparing" && String(from) !== "preparing") {
        console.log(
          `[DEBUG] Order ${order.orderId} status changed to 'preparing'. Triggering delivery dispatch.`,
        );
        // If auto dispatch, try assign now.
        if (
          order.dispatch?.status === "unassigned" &&
          order.dispatch?.modeAtCreation === "auto"
        ) {
          try {
            console.log(`[DEBUG] Auto-assigning order ${order.orderId}`);
            await tryAutoAssign(order._id);
            await order.reload();
          } catch (err) {
            console.error(
              `[DEBUG] Auto-assign failed for order ${order.orderId}:`,
              err,
            );
          }
        }

        const restaurant = await FoodRestaurant.findById(order.restaurantId)
          .select("restaurantName location addressLine1 area city state")
          .lean();
        const payload = buildDeliverySocketPayload(order, restaurant);

        // If assigned, notify assigned partner only.
        const assignedId =
          order.dispatch?.deliveryPartnerId?.toString?.() ||
          order.dispatch?.deliveryPartnerId;
        if (assignedId && order.dispatch?.status === "assigned") {
          console.log(
            `[DEBUG] Order ${order.orderId} assigned to ${assignedId}. Notifying.`,
          );
          io.to(rooms.delivery(assignedId)).emit("new_order", payload);
          io.to(rooms.delivery(assignedId)).emit("play_notification_sound", {
            orderId: payload.orderId,
            orderMongoId: payload.orderMongoId,
          });
          await notifyOwnerSafely(
            { ownerType: "DELIVERY_PARTNER", ownerId: assignedId },
            {
              title: "New delivery task",
              body: `Order ${payload.orderId} is assigned to you.`,
              data: {
                type: "new_order",
                orderId: payload.orderId,
                orderMongoId: payload.orderMongoId,
                link: "/delivery",
              },
            },
          );
        } else {
          // Broadcast to nearby online partners so someone can accept/claim.
          console.log(
            `[DEBUG] Searching for nearby partners for order ${order.orderId}`,
          );
          const { partners } = await listNearbyOnlineDeliveryPartners(
            order.restaurantId,
            { maxKm: 15, limit: 25 },
          );
          console.log(
            `[DEBUG] Found ${partners.length} partners: ${JSON.stringify(partners)}`,
          );
          for (const p of partners) {
            const targetRoom = rooms.delivery(p.partnerId);
            console.log(
              `[DEBUG] Emitting new_order_available to room: ${targetRoom}`,
            );
            io.to(targetRoom).emit("new_order_available", {
              ...payload,
              pickupDistanceKm: p.distanceKm,
            });
          }
          await notifyOwnersSafely(
            partners.slice(0, 5).map((p) => ({
              ownerType: "DELIVERY_PARTNER",
              ownerId: p.partnerId,
            })),
            {
              title: "New delivery order available",
              body: `Order ${payload.orderId} is available near ${restaurant?.restaurantName || "your area"}.`,
              data: {
                type: "new_order_available",
                orderId: payload.orderId,
                orderMongoId: payload.orderMongoId,
                link: "/delivery",
              },
            },
          );
          // Also trigger a generic sound event for the first few partners.
          for (const p of partners.slice(0, 5)) {
            io.to(rooms.delivery(p.partnerId)).emit("play_notification_sound", {
              orderId: payload.orderId,
              orderMongoId: payload.orderMongoId,
            });
          }
        }
      }

            // When ready for pickup -> ping assigned delivery partner.
            if (String(orderStatus) === 'ready_for_pickup' && String(from) !== 'ready_for_pickup') {
                console.log(`[DEBUG] Order ${order.orderId} changed to 'ready_for_pickup'.`);
                const assignedId = order.dispatch?.deliveryPartnerId?.toString?.() || order.dispatch?.deliveryPartnerId;
                if (assignedId) {
                    console.log(`[DEBUG] Notifying assigned partner ${assignedId} that order is ready.`);
                    const restaurant = await FoodRestaurant.findById(order.restaurantId).select('restaurantName location addressLine1 area city state').lean();
                    const payload = buildDeliverySocketPayload(order, restaurant);
                    io.to(rooms.delivery(assignedId)).emit('order_ready', payload);
                } else {
                    console.log(`[DEBUG] Order ${order.orderId} is ready but no partner assigned.`);
                }
            }
        }
    } catch (err) {
        console.error('[DEBUG] Error in delivery notification logic:', err);
    }
    enqueueOrderEvent('restaurant_order_status_updated', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        restaurantId,
        from,
        to: orderStatus
    });
    return order.toObject();
}

// ----- Delivery: available, accept, reject, status -----
export async function listOrdersAvailableDelivery(deliveryPartnerId, query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = {
    $or: [
      // "Marketplace" pool – only show orders once restaurant accepted.
      {
        "dispatch.status": "unassigned",
        orderStatus: { $in: ["preparing", "ready_for_pickup"] },
      },
      // My assigned/accepted orders – keep showing until terminal.
      {
        "dispatch.deliveryPartnerId": new mongoose.Types.ObjectId(
          deliveryPartnerId,
        ),
        orderStatus: {
          $nin: [
            "delivered",
            "cancelled_by_user",
            "cancelled_by_restaurant",
            "cancelled_by_admin",
          ],
        },
      },
    ],
  };
  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  return buildPaginatedResult({ docs, total, page, limit });
}

export async function acceptOrderDelivery(orderId, deliveryPartnerId) {
  const partnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  // Atomically claim if unassigned, or accept if already assigned to me.
  const order = await FoodOrder.findOne({
    ...identity,
    orderStatus: {
      $nin: [
        "delivered",
        "cancelled_by_user",
        "cancelled_by_restaurant",
        "cancelled_by_admin",
      ],
    },
    $or: [
      { "dispatch.status": "unassigned" },
      { "dispatch.deliveryPartnerId": partnerId },
    ],
  });

  if (!order) throw new ValidationError("Order not found");

  // Guard: only dispatchable after restaurant accepted.
  if (
    !["preparing", "ready_for_pickup", "picked_up"].includes(order.orderStatus)
  ) {
    throw new ValidationError("Order not ready for delivery assignment");
  }

  const wasUnassigned =
    order.dispatch?.status === "unassigned" ||
    !order.dispatch?.deliveryPartnerId;
  if (
    !wasUnassigned &&
    order.dispatch.deliveryPartnerId?.toString() !==
      deliveryPartnerId.toString()
  ) {
    throw new ForbiddenError("Not your order");
  }

  const from = order.dispatch?.status || "unassigned";
  order.dispatch.deliveryPartnerId = partnerId;
  order.dispatch.status = "accepted";
  if (!order.dispatch.assignedAt) order.dispatch.assignedAt = new Date();
  order.dispatch.acceptedAt = new Date();
  pushStatusHistory(order, {
    byRole: "DELIVERY_PARTNER",
    byId: deliveryPartnerId,
    from,
    to: "accepted",
  });
  await order.save();

  // Notify delivery partner (self) + restaurant about dispatch acceptance.
  try {
    const io = getIO();
    if (io) {
      io.to(rooms.delivery(deliveryPartnerId)).emit("order_status_update", {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        dispatchStatus: order.dispatch?.status,
      });
      io.to(rooms.restaurant(order.restaurantId)).emit("order_status_update", {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        dispatchStatus: order.dispatch?.status,
      });
      io.to(rooms.user(order.userId)).emit("order_status_update", {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        dispatchStatus: order.dispatch?.status,
      });
    }
    await notifyOwnersSafely(
      [
        { ownerType: "USER", ownerId: order.userId },
        { ownerType: "RESTAURANT", ownerId: order.restaurantId },
        { ownerType: "DELIVERY_PARTNER", ownerId: deliveryPartnerId },
      ],
      {
        title: `Order ${order.orderId} accepted`,
        body: "A delivery partner has accepted your order.",
        data: {
          type: "delivery_accepted",
          orderId: order.orderId,
          orderMongoId: order._id?.toString?.() || "",
          dispatchStatus: order.dispatch?.status,
          link: "/food/user/orders",
        },
      },
    );
  } catch {}

    enqueueOrderEvent('delivery_accepted', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        dispatchStatus: order.dispatch?.status,
        orderStatus: order.orderStatus
    });
    return order.toObject();
}

export async function rejectOrderDelivery(orderId, deliveryPartnerId) {
    const identity = buildOrderIdentityFilter(orderId);
    if (!identity) throw new ValidationError('Order id required');
    const order = await FoodOrder.findOne(identity);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = undefined;
    order.dispatch.assignedAt = undefined;
    order.dispatch.acceptedAt = undefined;
    pushStatusHistory(order, { byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from: 'assigned', to: 'unassigned', note: 'Rejected' });
    await order.save();
    enqueueOrderEvent('delivery_rejected', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId
    });
    return order.toObject();
}

export async function confirmReachedPickupDelivery(orderId, deliveryPartnerId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne(identity);
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");
  if (order.orderStatus === "delivered")
    throw new ValidationError("Order already delivered");

  // Idempotent: if already at/after pickup, keep success.
  const currentPhase = order.deliveryState?.currentPhase || "";
  const currentStatus = order.deliveryState?.status || "";
  if (currentPhase === "at_pickup" || currentStatus === "reached_pickup") {
    return order.toObject();
  }

  const from = currentStatus || currentPhase || order.orderStatus;
  order.deliveryState = {
    ...(order.deliveryState?.toObject?.() || order.deliveryState || {}),
    currentPhase: "at_pickup",
    status: "reached_pickup",
    reachedPickupAt: order.deliveryState?.reachedPickupAt || new Date(),
  };
  pushStatusHistory(order, {
    byRole: "DELIVERY_PARTNER",
    byId: deliveryPartnerId,
    from,
    to: "reached_pickup",
    note: "Reached pickup location",
  });
  await order.save();

  // Notify
  emitOrderUpdate(order, deliveryPartnerId);

  // Notify Restaurant about rider arrival
  try {
    const restaurant = await FoodRestaurant.findById(order.restaurantId).select("restaurantName").lean();
    const partner = await FoodDeliveryPartner.findById(deliveryPartnerId).select("name").lean();
    
    const { notifyOwnersSafely } = await import("../../../../core/notifications/firebase.service.js");
    await notifyOwnersSafely(
      [{ ownerType: "RESTAURANT", ownerId: order.restaurantId }],
      {
        title: "Rider Arrived! 🛵",
        body: `${partner?.name || "The delivery partner"} has arrived at your restaurant to pick up Order #${order.orderId}.`,
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "rider_arrived",
          orderId: String(order.orderId),
          orderMongoId: String(order._id),
          partnerName: partner?.name || ""
        }
      }
    );
  } catch (err) {
    console.error("[DEBUG] Error notifying restaurant about rider arrival:", err);
  }

    enqueueOrderEvent('reached_pickup', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        orderStatus: order.orderStatus,
        deliveryPhase: order.deliveryState?.currentPhase,
        deliveryStatus: order.deliveryState?.status
    });
    return order.toObject();
}

/**
 * Slide to confirm pickup (Bill uploaded)
 */
export async function confirmPickupDelivery(
  orderId,
  deliveryPartnerId,
  billImageUrl,
) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne(identity);
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");

  const from = order.orderStatus;
  order.orderStatus = "picked_up";
  order.deliveryState = {
    ...(order.deliveryState?.toObject?.() || order.deliveryState || {}),
    currentPhase: "en_route_to_delivery",
    status: "picked_up",
    pickedUpAt: new Date(),
    billImageUrl,
  };
  pushStatusHistory(order, {
    byRole: "DELIVERY_PARTNER",
    byId: deliveryPartnerId,
    from,
    to: "picked_up",
    note: "Order picked up",
  });
  await order.save();

    emitOrderUpdate(order, deliveryPartnerId);
    enqueueOrderEvent('picked_up', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        billImageUrl: billImageUrl || null
    });
    return order.toObject();
}

export async function confirmReachedDropDelivery(orderId, deliveryPartnerId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne(identity).select("+deliveryOtp");
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");

  if (order.deliveryVerification?.dropOtp?.verified) {
    emitOrderUpdate(order, deliveryPartnerId);
    return sanitizeOrderForExternal(order);
  }

  const alreadyAtDrop =
    order.deliveryState?.currentPhase === "at_drop" ||
    order.deliveryState?.status === "reached_drop";
  const fromPhase =
    order.deliveryState?.status ||
    order.deliveryState?.currentPhase ||
    order.orderStatus ||
    "";

  const existingOtp = String(order.deliveryOtp || "").trim();
  if (!alreadyAtDrop || !existingOtp) {
    order.deliveryOtp = generateFourDigitDeliveryOtp();
    order.deliveryVerification = {
      ...(order.deliveryVerification?.toObject?.() ||
        order.deliveryVerification ||
        {}),
      dropOtp: { required: true, verified: false },
    };
  }

  order.deliveryState = {
    ...(order.deliveryState?.toObject?.() || order.deliveryState || {}),
    currentPhase: "at_drop",
    status: "reached_drop",
    reachedDropAt: order.deliveryState?.reachedDropAt || new Date(),
  };

  if (!alreadyAtDrop) {
    pushStatusHistory(order, {
      byRole: "DELIVERY_PARTNER",
      byId: deliveryPartnerId,
      from: fromPhase,
      to: "reached_drop",
      note: "Reached drop location",
    });
  }

  await order.save();

    const plainOtp = String(order.deliveryOtp || '').trim();
    emitDeliveryDropOtpToUser(order, plainOtp);
    emitOrderUpdate(order, deliveryPartnerId);
    enqueueOrderEvent('reached_drop', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        dropOtpRequired: order.deliveryVerification?.dropOtp?.required ?? true,
        dropOtpVerified: order.deliveryVerification?.dropOtp?.verified ?? false
    });
    return sanitizeOrderForExternal(order);
}

export async function verifyDropOtpDelivery(orderId, deliveryPartnerId, otp) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne(identity).select("+deliveryOtp");
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");

  const otpStr = String(otp || "").trim();
  if (!otpStr) throw new ValidationError("OTP is required");

  if (!order.deliveryVerification?.dropOtp?.required) {
    throw new ValidationError(
      "OTP verification is not active for this order. Confirm reached drop first.",
    );
  }
  if (order.deliveryVerification?.dropOtp?.verified) {
    return { order: sanitizeOrderForExternal(order) };
  }

  const expected = String(order.deliveryOtp || "").trim();
  if (!expected || expected !== otpStr) {
    throw new ValidationError(
      "Invalid OTP. Ask the customer for the code shown in their app.",
    );
  }

  order.deliveryVerification = {
    ...(order.deliveryVerification?.toObject?.() ||
      order.deliveryVerification ||
      {}),
    dropOtp: { required: true, verified: true },
  };
  order.deliveryOtp = "";
  await order.save();

    emitOrderUpdate(order, deliveryPartnerId);
    enqueueOrderEvent('drop_otp_verified', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId
    });
    return { order: sanitizeOrderForExternal(order) };
}

export async function completeDelivery(orderId, deliveryPartnerId) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne(identity);
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");

  if (
    order.deliveryVerification?.dropOtp?.required &&
    !order.deliveryVerification?.dropOtp?.verified
  ) {
    throw new ValidationError(
      "Customer handover OTP is required. Verify the OTP from the customer before completing delivery.",
    );
  }

  const from = order.orderStatus;
  const prevPayStatus = order.payment.status;
  const payMethod = order.payment.method;
  order.orderStatus = "delivered";
  order.payment.status = "paid"; // Mark as paid upon delivery
  order.deliveryState = {
    ...(order.deliveryState?.toObject?.() || order.deliveryState || {}),
    currentPhase: "delivered",
    status: "delivered",
    deliveredAt: new Date(),
  };

  pushStatusHistory(order, {
    byRole: "DELIVERY_PARTNER",
    byId: deliveryPartnerId,
    from,
    to: "delivered",
    note: "Delivery completed successfully",
  });
  await order.save();

  const ledgerKind =
    payMethod === "cash" && prevPayStatus === "cod_pending"
      ? "cod_marked_paid_on_delivery"
      : "payment_snapshot_sync";
  await appendOrderPaymentLedger(order, ledgerKind, {
    recordedByRole: "DELIVERY_PARTNER",
    recordedById: deliveryPartnerId,
    metadata: {
      previousPaymentStatus: prevPayStatus,
      orderStatus: "delivered",
    },
  });

    emitOrderUpdate(order, deliveryPartnerId);
    enqueueOrderEvent('delivery_completed', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        payMethod,
        prevPayStatus,
        paymentStatus: order.payment?.status
    });
    return order.toObject();
}

function emitOrderUpdate(order, deliveryPartnerId) {
  try {
    const io = getIO();
    if (io) {
      const dv =
        order.deliveryVerification?.toObject?.() || order.deliveryVerification;
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        deliveryState: order.deliveryState,
        deliveryVerification: dv,
      };
      io.to(rooms.delivery(deliveryPartnerId)).emit(
        "order_status_update",
        payload,
      );
      io.to(rooms.restaurant(order.restaurantId)).emit(
        "order_status_update",
        payload,
      );
      io.to(rooms.user(order.userId)).emit("order_status_update", payload);
    }
    let riderTitle = `Order deliverd! 🏁`;
    let riderBody = `Order #${order.orderId} has been marked as delivered.`;

    // Special message for COD payment collection
    if (order.payment?.method === "cash") {
      riderTitle = "Payment Collected! 💵";
      riderBody = `You have collected ₹${order.pricing?.total || 0} cash for Order #${order.orderId}.`;
    }

    void notifyOwnersSafely(
      [
        { ownerType: "RESTAURANT", ownerId: order.restaurantId },
        { ownerType: "USER", ownerId: order.userId },
      ],
      {
        title: `Order #${order.orderId} delivered! ✅`,
        body: `Hope you enjoyed your meal!`,
        data: {
          type: "order_status_update",
          orderId: order.orderId,
          orderMongoId: order._id?.toString?.() || "",
          orderStatus: "delivered",
        },
      },
    );

    void notifyOwnerSafely(
      { ownerType: "DELIVERY_PARTNER", ownerId: deliveryPartnerId },
      {
        title: riderTitle,
        body: riderBody,
        data: {
          type: "order_completed",
          orderId: order.orderId,
          orderMongoId: order._id?.toString?.() || "",
          paymentMethod: order.payment?.method,
          amountCollected: String(order.pricing?.total || 0),
        },
      }
    );
  } catch (e) {
    console.error("Error emitting order update:", e);
  }
}

export async function updateOrderStatusDelivery(orderId, deliveryPartnerId, orderStatus) {
    const identity = buildOrderIdentityFilter(orderId);
    if (!identity) throw new ValidationError('Order id required');
    const order = await FoodOrder.findOne(identity);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    const from = order.orderStatus;
    order.orderStatus = orderStatus;
    pushStatusHistory(order, { byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from, to: orderStatus });
    await order.save();
    enqueueOrderEvent('delivery_status_updated', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        from,
        to: orderStatus
    });
    return order.toObject();
}

// ----- COD QR collection -----
export async function createCollectQr(
  orderId,
  deliveryPartnerId,
  customerInfo = {},
) {
  const order = await FoodOrder.findById(orderId)
    .populate("userId", "name email phone")
    .lean();
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");
  if (order.payment.method !== "cash" && order.payment.status === "paid")
    throw new ValidationError("Order already paid");
  const amountDue = order.payment.amountDue ?? order.pricing?.total ?? 0;
  if (amountDue < 1) throw new ValidationError("No amount due");

  if (!isRazorpayConfigured())
    throw new ValidationError("QR payment not configured");

  const amountPaise = Math.round(amountDue * 100);
  const user = order.userId || {};
  const link = await createPaymentLink({
    amountPaise,
    currency: "INR",
    description: `Order ${order.orderId} - COD collect`,
    orderId: order.orderId,
    customerName: customerInfo.name || user.name || "Customer",
    customerEmail: customerInfo.email || user.email || "customer@example.com",
    customerPhone: customerInfo.phone || user.phone,
  });

  await FoodOrder.findByIdAndUpdate(orderId, {
    $set: {
      "payment.method": "razorpay_qr",
      "payment.status": "pending_qr",
      "payment.qr": {
        paymentLinkId: link.id,
        shortUrl: link.short_url,
        imageUrl: link.short_url,
        status: link.status || "created",
        expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
      },
    },
  });

    const updated = await FoodOrder.findById(orderId).select('orderId userId payment pricing').lean();
    if (updated) {
        await appendOrderPaymentLedger(updated, 'cod_collect_qr_created', {
            recordedByRole: 'DELIVERY_PARTNER',
            recordedById: deliveryPartnerId,
            metadata: { paymentLinkId: link.id, shortUrl: link.short_url }
        });
    }

    enqueueOrderEvent('collect_qr_created', {
        orderMongoId: String(orderId),
        orderId: updated?.orderId || null,
        deliveryPartnerId,
        paymentLinkId: link.id,
        shortUrl: link.short_url,
        amountDue
    });
}

export async function getPaymentStatus(orderId, deliveryPartnerId) {
  const order = await FoodOrder.findById(orderId)
    .select("payment dispatch")
    .lean();
  if (!order) throw new ValidationError("Order not found");
  if (
    order.dispatch?.deliveryPartnerId?.toString() !==
    deliveryPartnerId.toString()
  )
    throw new ForbiddenError("Not your order");
  return { payment: order.payment };
}

// ----- Admin -----
export async function listOrdersAdmin(query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = {};

  const rawStatus =
    typeof query.status === "string" ? query.status.trim().toLowerCase() : "";
  const cancelledBy =
    typeof query.cancelledBy === "string"
      ? query.cancelledBy.trim().toLowerCase()
      : "";
  const restaurantIdRaw =
    typeof query.restaurantId === "string" ? query.restaurantId.trim() : "";
  const startDateRaw =
    typeof query.startDate === "string" ? query.startDate.trim() : "";
  const endDateRaw =
    typeof query.endDate === "string" ? query.endDate.trim() : "";

  if (rawStatus && rawStatus !== "all") {
    switch (rawStatus) {
      case "pending":
        filter.orderStatus = { $in: ["created", "confirmed"] };
        break;
      case "accepted":
        filter.orderStatus = "confirmed";
        break;
      case "processing":
        filter.orderStatus = { $in: ["preparing", "ready_for_pickup"] };
        break;
      case "food-on-the-way":
        filter.orderStatus = "picked_up";
        break;
      case "delivered":
        filter.orderStatus = "delivered";
        break;
      case "canceled":
      case "cancelled":
        filter.orderStatus = {
          $in: [
            "cancelled_by_user",
            "cancelled_by_restaurant",
            "cancelled_by_admin",
          ],
        };
        break;
      case "restaurant-cancelled":
        filter.orderStatus = "cancelled_by_restaurant";
        break;
      case "payment-failed":
        filter["payment.status"] = "failed";
        break;
      case "refunded":
        filter["payment.status"] = "refunded";
        break;
      case "offline-payments":
        filter["payment.method"] = "cash";
        filter.orderStatus = { $in: ["created", "confirmed", "delivered"] };
        break;
      case "scheduled":
        filter.scheduledAt = { $ne: null };
        break;
      default:
        break;
    }
  }

  if (cancelledBy) {
    if (cancelledBy === "restaurant") {
      filter.orderStatus = "cancelled_by_restaurant";
    } else if (cancelledBy === "user" || cancelledBy === "customer") {
      filter.orderStatus = "cancelled_by_user";
    }
  }

  if (restaurantIdRaw && mongoose.Types.ObjectId.isValid(restaurantIdRaw)) {
    filter.restaurantId = new mongoose.Types.ObjectId(restaurantIdRaw);
  }

  if (startDateRaw || endDateRaw) {
    const createdAt = {};
    const start = startDateRaw ? new Date(startDateRaw) : null;
    const end = endDateRaw ? new Date(endDateRaw) : null;
    if (start && !Number.isNaN(start.getTime())) {
      createdAt.$gte = start;
    }
    if (end && !Number.isNaN(end.getTime())) {
      createdAt.$lte = end;
    }
    if (Object.keys(createdAt).length > 0) {
      filter.createdAt = createdAt;
    }
  }

  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate("userId", "name phone email")
      .populate("restaurantId", "restaurantName area city ownerPhone")
      .populate("dispatch.deliveryPartnerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  const paginated = buildPaginatedResult({ docs, total, page, limit });
  return { ...paginated, orders: paginated.data };
}

export async function assignDeliveryPartnerAdmin(
  orderId,
  deliveryPartnerId,
  adminId,
) {
  const order = await FoodOrder.findById(orderId);
  if (!order) throw new ValidationError("Order not found");
  if (order.dispatch.status === "accepted")
    throw new ValidationError("Order already accepted by partner");

  const partner = await FoodDeliveryPartner.findById(deliveryPartnerId)
    .select("status")
    .lean();
  if (!partner || partner.status !== "approved")
    throw new ValidationError("Delivery partner not available");

    order.dispatch.status = 'assigned';
    order.dispatch.deliveryPartnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    order.dispatch.assignedAt = new Date();
    pushStatusHistory(order, { byRole: 'ADMIN', byId: adminId, from: order.dispatch.status, to: 'assigned' });
    await order.save();
    enqueueOrderEvent('delivery_partner_assigned', {
        orderMongoId: order._id?.toString?.(),
        orderId: order.orderId,
        deliveryPartnerId,
        adminId
    });
    return order.toObject();
}
