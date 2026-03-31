import mongoose from 'mongoose';
import { FoodOrder } from '../models/order.model.js';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import {
  createPaymentLink,
  fetchRazorpayPaymentLink,
  isRazorpayConfigured,
} from '../helpers/razorpay.helper.js';
import * as foodTransactionService from './foodTransaction.service.js';
import {
  buildOrderIdentityFilter,
  enqueueOrderEvent,
} from './order.helpers.js';

async function syncRazorpayQrPayment(orderDoc) {
  if (!orderDoc?.payment) return orderDoc?.payment;
  if (orderDoc.payment.method !== 'razorpay_qr') return orderDoc.payment;
  if (orderDoc.payment.status === 'paid') return orderDoc.payment;

  const paymentLinkId = orderDoc.payment?.qr?.paymentLinkId;
  if (!paymentLinkId || !isRazorpayConfigured()) return orderDoc.payment;

  let link;
  try {
    link = await fetchRazorpayPaymentLink(paymentLinkId);
  } catch (error) {
    logger.warn(
      `Razorpay payment-link fetch failed for ${paymentLinkId}: ${
        error?.message || error
      }`,
    );
    return orderDoc.payment;
  }

  const linkStatus = String(link?.status || '').toLowerCase();
  if (!linkStatus) return orderDoc.payment;

  orderDoc.payment.qr = {
    ...(orderDoc.payment.qr?.toObject?.() || orderDoc.payment.qr || {}),
    status: linkStatus,
  };

  if (['paid', 'captured', 'authorized'].includes(linkStatus)) {
    orderDoc.payment.status = 'paid';
    await orderDoc.save();
  } else if (['expired', 'cancelled', 'canceled', 'failed'].includes(linkStatus)) {
    orderDoc.payment.status = 'failed';
    await orderDoc.save();
  }

  return orderDoc.payment;
}

export async function createCollectQr(
  orderId,
  deliveryPartnerId,
  customerInfo = {},
) {
  const query = mongoose.Types.ObjectId.isValid(orderId)
    ? { _id: orderId }
    : { orderId };

  const order = await FoodOrder.findOne(query)
    .populate('userId', 'name email phone')
    .lean();

  if (!order) throw new NotFoundError('Order not found');
  if (
    order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()
  ) {
    throw new ForbiddenError('Not your order');
  }
  if (order.payment.method !== 'cash' && order.payment.status === 'paid') {
    throw new ValidationError('Order already paid');
  }

  const amountDue = order.payment.amountDue ?? order.pricing?.total ?? 0;
  if (amountDue < 1) throw new ValidationError('No amount due');
  if (!isRazorpayConfigured()) {
    throw new ValidationError('QR payment not configured');
  }

  const user = order.userId || {};
  const link = await createPaymentLink({
    amountPaise: Math.round(amountDue * 100),
    currency: 'INR',
    description: `Order ${order._id.toString()} - COD collect`,
    orderId: order._id.toString(),
    customerName: customerInfo.name || user.name || 'Customer',
    customerEmail: customerInfo.email || user.email || 'customer@example.com',
    customerPhone: customerInfo.phone || user.phone,
  });

  await FoodOrder.findByIdAndUpdate(order._id, {
    $set: {
      'payment.method': 'razorpay_qr',
      'payment.status': 'pending_qr',
      'payment.qr': {
        paymentLinkId: link.id,
        shortUrl: link.short_url,
        imageUrl: link.short_url,
        status: link.status || 'created',
        expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null,
      },
    },
  });

  const updated = await FoodOrder.findById(order._id)
    .select('orderId restaurantId userId riderEarning payment pricing')
    .lean();

  if (updated) {
    await foodTransactionService.updateTransactionStatus(
      order._id,
      'cod_collect_qr_created',
      {
        recordedByRole: 'DELIVERY_PARTNER',
        recordedById: deliveryPartnerId,
        note: 'COD collection QR created',
      },
    );
  }

  enqueueOrderEvent('collect_qr_created', {
    orderMongoId: String(orderId),
    orderId: updated?.orderId || null,
    deliveryPartnerId,
    paymentLinkId: link.id,
    shortUrl: link.short_url,
    amountDue,
  });

  return {
    shortUrl:
      link?.short_url ?? link?.shortUrl ?? link?.short_url_path ?? null,
    imageUrl:
      link?.short_url ??
      link?.image_url ??
      link?.imageUrl ??
      link?.image ??
      null,
    amount: amountDue,
    expiresAt: link?.expire_by
      ? new Date(link.expire_by * 1000)
      : link?.expiresAt
        ? new Date(link.expiresAt)
        : null,
  };
}

export async function getPaymentStatus(orderId, deliveryPartnerId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError('Order id required');

  const order = await FoodOrder.findOne(identity).select(
    'payment dispatch riderEarning platformProfit pricing',
  );
  if (!order) throw new NotFoundError('Order not found');
  if (
    order.dispatch?.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()
  ) {
    throw new ForbiddenError('Not your order');
  }

  if (order.payment?.method === 'razorpay_qr') {
    await syncRazorpayQrPayment(order);
  }

  const transaction = await FoodTransaction.findOne({ orderId: order._id }).lean();
  const latestHistory =
    (transaction?.history || []).sort((a, b) => (b.at || 0) - (a.at || 0))[0] ||
    null;

  return {
    payment: {
      ...(order.payment?.toObject?.() || order.payment || {}),
      status: order.payment?.status,
    },
    latestPaymentSnapshot: latestHistory,
    riderEarning: order.riderEarning ?? 0,
    platformProfit: order.platformProfit ?? 0,
    pricingTotal: order.pricing?.total ?? 0,
    transactionStatus: transaction?.status ?? null,
  };
}
