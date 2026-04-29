import mongoose from 'mongoose';
import { getIO, rooms } from '../../../config/socket.js';
import { logger } from '../../../utils/logger.js';
import { QuickOrder } from '../models/order.model.js';
import { QuickCart } from '../models/cart.model.js';
import { QuickProduct } from '../models/product.model.js';
import { Seller } from '../seller/models/seller.model.js';
import { SellerOrder } from '../seller/models/sellerOrder.model.js';
import { getSellerCommissionSnapshot } from '../admin/services/commission.service.js';
import * as foodTransactionService from '../../food/orders/services/foodTransaction.service.js';

const approvedProductFilter = {
  $or: [
    { isActive: true },
    { isActive: { $exists: false } },
    { status: 'active' },
  ],
  $and: [
    {
      $or: [
        { approvalStatus: { $exists: false } },
        { approvalStatus: 'approved' },
      ],
    },
  ],
};

const resolveId = (req) => {
  if (req.user?.userId) return { userId: req.user.userId };
  const sessionId = String(req.headers['x-quick-session'] || req.body.sessionId || req.query.sessionId || '').trim();
  return sessionId ? { sessionId } : null;
};

const normalizeOrderSummary = (order) => ({
  id: order._id,
  _id: order._id,
  orderId: order.orderId,
  orderNumber: order.orderId,
  total: order.pricing?.total || 0,
  status: order.orderStatus,
  workflowStatus: order.workflowStatus || '',
  itemCount: Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0,
  createdAt: order.createdAt,
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        itemId: item.itemId || item.productId || '',
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      }))
    : [],
  pricing: order.pricing || {},
});

const normalizeDeliveryAddress = (address) => {
  if (!address || typeof address !== 'object') return null;

  const street = String(address.address || address.street || '').trim();
  const city = String(address.city || '').trim();
  const additionalDetails = String(address.landmark || address.additionalDetails || '').trim();
  const phone = String(address.phone || '').trim();
  const label = ['Home', 'Office', 'Other'].includes(address.type) ? address.type : 'Other';
  const lat = Number(address.location?.lat);
  const lng = Number(address.location?.lng);

  return {
    label,
    street,
    additionalDetails,
    city: city || 'NA',
    state: 'NA',
    zipCode: '',
    phone,
    ...(Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          location: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        }
      : {}),
  };
};

const normalizeRequestedItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      productId: String(item?.productId || item?.itemId || item?.id || item?._id || '').trim(),
      quantity: Math.max(1, Number(item?.quantity || 1)),
    }))
    .filter((item) => item.productId && mongoose.isValidObjectId(item.productId));
};

const emitQuickOrderStatusUpdate = (order, message = '') => {
  try {
    if (!order?.userId) return;
    const io = getIO();
    if (!io) return;

    const payload = {
      orderMongoId: order._id?.toString?.() || '',
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      workflowStatus: order.workflowStatus || '',
      message,
    };

    io.to(rooms.user(order.userId)).emit('order_status_update', payload);
    io.to(rooms.tracking(order.orderId)).emit('order_status_update', payload);
    io.to(rooms.tracking(order.orderId)).emit('order:status:update', payload);
  } catch {
    // best-effort realtime update
  }
};

const emitQuickSellerOrders = (sellerOrders) => {
  try {
    const io = getIO();
    if (!io || !Array.isArray(sellerOrders) || sellerOrders.length === 0) return;

    sellerOrders.forEach((sellerOrder) => {
      if (!sellerOrder?.sellerId) return;
      const payload = {
        orderId: sellerOrder.orderId,
        sellerOrderId: sellerOrder._id?.toString?.() || '',
        status: sellerOrder.status,
        workflowStatus: sellerOrder.workflowStatus,
        items: sellerOrder.items || [],
        pricing: sellerOrder.pricing || {},
        createdAt: sellerOrder.createdAt || new Date(),
      };

      io.to(rooms.seller(sellerOrder.sellerId)).emit('new_order', payload);
      io.to(rooms.seller(sellerOrder.sellerId)).emit('order:new', payload);
    });
  } catch {
    // best-effort realtime update
  }
};

export const placeOrder = async (req, res) => {
  try {
    const idQuery = resolveId(req);

    if (!idQuery) {
      return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
    }

    const cart = await QuickCart.findOne(idQuery).lean();
    const requestedItems = normalizeRequestedItems(req.body?.items);
    const sourceItems =
      Array.isArray(cart?.items) && cart.items.length > 0 ? cart.items : requestedItems;

    if (sourceItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const productIds = sourceItems.map((item) => item.productId);
    const products = await QuickProduct.find({ _id: { $in: productIds }, ...approvedProductFilter }).lean();
    const productMap = products.reduce((acc, product) => {
      acc[String(product._id)] = product;
      return acc;
    }, {});

    let items = sourceItems
      .map((item) => {
        const product = productMap[String(item.productId)];
        if (!product) return null;
        const unitPrice =
          Number(product.salePrice || 0) > 0
            ? Number(product.salePrice)
            : Number(product.price || 0);
        return {
          productId: product._id,
          sellerId: product.sellerId || null,
          name: product.name,
          image: product.image || product.mainImage || '',
          price: unitPrice,
          quantity: item.quantity,
        };
      })
      .filter(Boolean);

    if (items.length === 0 && requestedItems.length > 0 && sourceItems !== requestedItems) {
      const fallbackProductIds = requestedItems.map((item) => item.productId);
      const fallbackProducts = await QuickProduct.find({
        _id: { $in: fallbackProductIds },
        ...approvedProductFilter,
      }).lean();
      const fallbackProductMap = fallbackProducts.reduce((acc, product) => {
        acc[String(product._id)] = product;
        return acc;
      }, {});

      items = requestedItems
        .map((item) => {
          const product = fallbackProductMap[String(item.productId)];
          if (!product) return null;
          const unitPrice =
            Number(product.salePrice || 0) > 0
              ? Number(product.salePrice)
              : Number(product.price || 0);
          return {
            productId: product._id,
            sellerId: product.sellerId || null,
            name: product.name,
            image: product.image || product.mainImage || '',
            price: unitPrice,
            quantity: item.quantity,
          };
        })
        .filter(Boolean);
    }

    if (items.length === 0) {
      logger.warn(`Quick placeOrder: No valid items found for productIds: ${JSON.stringify(productIds)} using idQuery: ${JSON.stringify(idQuery)}`);
      return res.status(400).json({ success: false, message: 'No valid items found in cart' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 25;
    const total = subtotal + deliveryFee;
    const orderNumber = `QC${Date.now().toString().slice(-8)}`;
    const isOnlinePayment = String(req.body?.paymentMode || 'COD').toUpperCase() === 'ONLINE';
    const paymentMode = isOnlinePayment ? 'razorpay' : 'cash';
    const sellerPaymentMode = isOnlinePayment ? 'online' : 'cash';
    const shouldFanOutSellerOrders = !isOnlinePayment;
    const deliveryAddress = normalizeDeliveryAddress(req.body?.address);

    // Calculate rider earning (using base payout if distance is unknown/short)
    const riderEarning = await foodTransactionService.getRiderEarning(0.1); 

    const order = await QuickOrder.create({
      orderType: 'quick',
      orderId: orderNumber,
      sessionId: idQuery.sessionId || '',
      userId: idQuery.userId || null,
      items: items.map((item) => ({
        itemId: String(item.productId),
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        type: 'quick',
        sourceId: String(item.sellerId || item.productId),
        sourceName: '',
      })),
      pricing: {
        subtotal,
        tax: 0,
        packagingFee: 0,
        deliveryFee,
        platformFee: 0,
        restaurantCommission: 0,
        discount: 0,
        total,
        currency: 'INR',
      },
      deliveryAddress,
      timeSlot: req.body?.timeSlot || 'now',
      payment: {
        method: paymentMode,
        status: paymentMode === 'razorpay' ? 'created' : 'cod_pending',
        amountDue: total,
      },
      orderStatus: 'placed',
      riderEarning: riderEarning || 0,
      platformProfit: Math.max(0, deliveryFee - (riderEarning || 0)), // Initial guess, will be updated with commission
      statusHistory: [
        {
          byRole: 'SYSTEM',
          from: '',
          to: 'placed',
          note: 'Quick commerce order placed',
        },
      ],
    });

    const sellerBuckets = new Map();
    items.forEach((item) => {
      const sellerId = item.sellerId ? String(item.sellerId) : '';
      if (!sellerId) return;
      if (!sellerBuckets.has(sellerId)) sellerBuckets.set(sellerId, []);
      sellerBuckets.get(sellerId).push(item);
    });

    const sellerOrdersResults = sellerBuckets.size > 0
        ? await Promise.all(Array.from(sellerBuckets.entries()).map(async ([sellerId, sellerItems]) => {
            const sellerSubtotal = sellerItems.reduce(
              (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
              0,
            );
            const allocatedDeliveryFee = Number(
              ((deliveryFee * sellerSubtotal) / Math.max(subtotal, 1)).toFixed(2),
            );

            // Calculate commission for this specific seller
            const { commissionAmount } = await getSellerCommissionSnapshot(sellerId, sellerSubtotal);

            return {
              sellerId,
              orderId: order.orderId,
              customer: {
                name: String(req.body?.address?.name || 'Customer').trim() || 'Customer',
                phone: String(req.body?.address?.phone || '').trim(),
              },
              items: sellerItems.map((item) => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
              })),
              pricing: {
                subtotal: sellerSubtotal,
                commission: commissionAmount,
                total: sellerSubtotal + allocatedDeliveryFee,
              },
              status: 'pending',
              workflowStatus: 'SELLER_PENDING',
              sellerPendingExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
              address: {
                address: deliveryAddress?.street || '',
                city: deliveryAddress?.city || '',
                ...(Array.isArray(deliveryAddress?.location?.coordinates)
                  ? {
                      location: {
                        lat: deliveryAddress.location.coordinates[1],
                        lng: deliveryAddress.location.coordinates[0],
                      },
                    }
                  : {}),
              },
              payment: {
                method: sellerPaymentMode,
              },
            };
          }))
        : [];

    const totalSellerCommission = sellerOrdersResults.reduce((sum, so) => sum + (so.pricing?.commission || 0), 0);
    
    // Update the main order with the total commission
    if (totalSellerCommission > 0) {
      const platformProfit = Math.max(0, deliveryFee + totalSellerCommission - (riderEarning || 0));
      await QuickOrder.updateOne(
        { _id: order._id },
        { 
          $set: { 
            'pricing.restaurantCommission': totalSellerCommission,
            platformProfit: platformProfit
          } 
        }
      );
      order.pricing.restaurantCommission = totalSellerCommission;
      order.platformProfit = platformProfit;
    }

    const sellerOrders = sellerOrdersResults;

    await QuickCart.findOneAndUpdate(idQuery, { $set: { items: [] } }, { upsert: false });

    emitQuickOrderStatusUpdate(order, 'Quick order placed successfully.');

    if (shouldFanOutSellerOrders) {
      void (async () => {
        try {
          if (!sellerOrders.length) return;
          const insertedSellerOrders = await SellerOrder.insertMany(sellerOrders, { ordered: false });
          emitQuickSellerOrders(insertedSellerOrders);
        } catch (error) {
          logger.error(`Quick seller order fanout failed for ${order.orderId}: ${error?.message || error}`);
        }
      })();
    }

    return res.status(201).json({
      success: true,
      result: {
        id: order._id,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderId,
        total: order.pricing?.total || 0,
        status: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    logger.error(`Quick placeOrder failed: ${error?.message || error}`);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to place quick order',
    });
  }
};

export const getMyOrders = async (req, res) => {
  const idQuery = resolveId(req);

  if (!idQuery) {
    return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
  }

  const orders = await QuickOrder.find({ ...idQuery, orderType: 'quick' }).sort({ createdAt: -1 }).lean();

  const mappedOrders = orders.map(normalizeOrderSummary);

  return res.json({
    success: true,
    result: mappedOrders,
    results: mappedOrders,
  });
};

export const getOrderById = async (req, res) => {
  try {
    const idQuery = resolveId(req);

    if (!idQuery) {
      return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
    }

    const rawOrderId = String(req.params.orderId || '').trim();
    if (!rawOrderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const orderIdentityQuery = [{ orderId: rawOrderId }];
    if (mongoose.isValidObjectId(rawOrderId)) {
      orderIdentityQuery.unshift({ _id: rawOrderId });
    }

    const query = {
      ...idQuery,
      orderType: 'quick',
      $or: orderIdentityQuery,
    };

    const order = await QuickOrder.findOne(query).select('+deliveryOtp').lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const sellerOrder = await SellerOrder.findOne({ orderId: order.orderId }).lean();
    const seller =
      sellerOrder?.sellerId
        ? await Seller.findById(sellerOrder.sellerId).select('_id name shopName location').lean()
        : null;

    const deliveryAddress = order.deliveryAddress || {};
    const deliveryCoords = Array.isArray(deliveryAddress.location?.coordinates)
      ? {
          lat: Number(deliveryAddress.location.coordinates[1]),
          lng: Number(deliveryAddress.location.coordinates[0]),
        }
      : null;
    const dropOtp = order.deliveryVerification?.dropOtp || {};
    const handoverOtp = String(order.deliveryOtp || '').trim();

    return res.json({
      success: true,
      result: {
        ...order,
        id: order._id,
        _id: order._id,
        orderNumber: order.orderId,
        orderId: order.orderId,
        address: {
          type: deliveryAddress.label || 'Other',
          name: '',
          address: deliveryAddress.street || '',
          city: deliveryAddress.city || '',
          phone: deliveryAddress.phone || '',
          ...(deliveryCoords ? { location: deliveryCoords } : {}),
        },
        seller: seller
          ? {
              _id: seller._id,
              id: seller._id,
              name: seller.shopName || seller.name || 'Store',
              shopName: seller.shopName || seller.name || 'Store',
              location: seller.location || null,
            }
          : null,
        sellerOrder: sellerOrder
          ? {
              _id: sellerOrder._id,
              status: sellerOrder.status,
              workflowStatus: sellerOrder.workflowStatus,
              address: sellerOrder.address || null,
            }
          : null,
        deliveryVerification: {
          ...(order.deliveryVerification || {}),
          dropOtp: {
            required: Boolean(dropOtp.required),
            verified: Boolean(dropOtp.verified),
          },
        },
        ...(dropOtp.required && !dropOtp.verified && handoverOtp
          ? { handoverOtp }
          : {}),
      },
    });
  } catch (error) {
    logger.error(`Quick getOrderById failed: ${error?.message || error}`);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to load quick order',
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const idQuery = resolveId(req);

    if (!idQuery) {
      return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
    }

    const rawOrderId = String(req.params.orderId || '').trim();
    if (!rawOrderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const orderIdentityQuery = [{ orderId: rawOrderId }];
    if (mongoose.isValidObjectId(rawOrderId)) {
      orderIdentityQuery.unshift({ _id: rawOrderId });
    }

    const query = {
      ...idQuery,
      orderType: 'quick',
      $or: orderIdentityQuery,
    };

    const order = await QuickOrder.findOne(query);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = String(order.orderStatus || '').toLowerCase();
    if (['delivered', 'cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: currentStatus === 'delivered' ? 'Delivered orders cannot be cancelled' : 'Order is already cancelled',
      });
    }

    order.orderStatus = 'cancelled_by_user';
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      byRole: 'USER',
      from: currentStatus || '',
      to: 'cancelled_by_user',
      note: String(req.body?.reason || 'Quick commerce order cancelled by user').trim(),
    });

    if (order.payment?.method === 'cash') {
      order.payment.status = 'failed';
    }

    await order.save();

    await SellerOrder.updateMany(
      {
        orderId: order.orderId,
        status: { $nin: ['cancelled', 'delivered'] },
      },
      {
        $set: {
          status: 'cancelled',
          workflowStatus: 'CANCELLED_BY_USER',
        },
      },
    );

    emitQuickOrderStatusUpdate(order, 'Quick order cancelled successfully.');

    return res.json({
      success: true,
      result: {
        id: order._id,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderId,
        status: order.orderStatus,
      },
    });
  } catch (error) {
    logger.error(`Quick cancelOrder failed: ${error?.message || error}`);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to cancel quick order',
    });
  }
};

