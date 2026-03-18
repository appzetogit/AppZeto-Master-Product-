import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from './order.model.js';
import { FoodUser } from '../../../core/users/user.model.js';
import { FoodRestaurant } from '../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../delivery/models/deliveryPartner.model.js';
import { FoodZone } from '../admin/models/zone.model.js';
import { ValidationError, ForbiddenError } from '../../../core/auth/errors.js';
import { buildPaginationOptions, buildPaginatedResult } from '../../../utils/helpers.js';
import {
    createRazorpayOrder,
    createPaymentLink,
    verifyPaymentSignature,
    getRazorpayKeyId,
    isRazorpayConfigured
} from './razorpay.helper.js';

const ORDER_ID_PREFIX = 'FOD-';
const ORDER_ID_LENGTH = 6;

function generateOrderId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
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
    if (exists) throw new ValidationError('Could not generate unique order id');
    return orderId;
}

function toGeoPoint(lat, lng) {
    if (lat == null || lng == null) return undefined;
    const a = Number(lat);
    const b = Number(lng);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
    return { type: 'Point', coordinates: [b, a] };
}

function pushStatusHistory(order, { byRole, byId, from, to, note = '' }) {
    order.statusHistory.push({
        at: new Date(),
        byRole,
        byId: byId || undefined,
        from,
        to,
        note
    });
}

// ----- Settings -----
export async function getDispatchSettings() {
    let doc = await FoodSettings.findOne({ key: 'dispatch' }).lean();
    if (!doc) {
        await FoodSettings.create({ key: 'dispatch', dispatchMode: 'manual' });
        doc = await FoodSettings.findOne({ key: 'dispatch' }).lean();
    }
    return { dispatchMode: doc?.dispatchMode || 'manual' };
}

export async function updateDispatchSettings(dispatchMode, adminId) {
    await FoodSettings.findOneAndUpdate(
        { key: 'dispatch' },
        {
            $set: {
                dispatchMode,
                updatedBy: { role: 'ADMIN', adminId, at: new Date() }
            }
        },
        { upsert: true, new: true }
    );
    return getDispatchSettings();
}

// ----- Calculate (validation + return pricing from payload) -----
export async function calculateOrder(userId, dto) {
    const restaurant = await FoodRestaurant.findById(dto.restaurantId).select('status').lean();
    if (!restaurant) throw new ValidationError('Restaurant not found');
    if (restaurant.status !== 'approved') throw new ValidationError('Restaurant not available');
    return {
        pricing: dto.pricing || {
            subtotal: 0,
            tax: 0,
            packagingFee: 0,
            deliveryFee: 0,
            discount: 0,
            total: 0,
            currency: 'INR'
        }
    };
}

// ----- Create order -----
export async function createOrder(userId, dto) {
    const restaurant = await FoodRestaurant.findById(dto.restaurantId).select('status restaurantName zoneId location').lean();
    if (!restaurant) throw new ValidationError('Restaurant not found');
    if (restaurant.status !== 'approved') throw new ValidationError('Restaurant not accepting orders');

    const orderId = await ensureUniqueOrderId();
    const settings = await getDispatchSettings();
    const dispatchMode = settings.dispatchMode;

    const deliveryAddress = {
        label: dto.address?.label || 'Home',
        street: dto.address?.street || '',
        additionalDetails: dto.address?.additionalDetails || '',
        city: dto.address?.city || '',
        state: dto.address?.state || '',
        zipCode: dto.address?.zipCode || '',
        phone: dto.address?.phone || '',
        location: dto.address?.location?.coordinates
            ? { type: 'Point', coordinates: dto.address.location.coordinates }
            : undefined
    };

    const paymentMethod = dto.paymentMethod === 'card' ? 'razorpay' : dto.paymentMethod;
    const isCash = paymentMethod === 'cash';
    const isWallet = paymentMethod === 'wallet';

    const payment = {
        method: paymentMethod,
        status: isCash ? 'cod_pending' : isWallet ? 'paid' : 'created',
        amountDue: dto.pricing?.total ?? 0,
        razorpay: {},
        qr: {}
    };

    const order = new FoodOrder({
        orderId,
        userId: new mongoose.Types.ObjectId(userId),
        restaurantId: new mongoose.Types.ObjectId(dto.restaurantId),
        zoneId: dto.zoneId ? new mongoose.Types.ObjectId(dto.zoneId) : restaurant.zoneId,
        items: dto.items,
        deliveryAddress,
        pricing: dto.pricing,
        payment,
        orderStatus: 'created',
        dispatch: { modeAtCreation: dispatchMode, status: 'unassigned' },
        statusHistory: [{ at: new Date(), byRole: 'SYSTEM', from: '', to: 'created', note: 'Order placed' }],
        note: dto.note || '',
        sendCutlery: dto.sendCutlery !== false,
        deliveryFleet: dto.deliveryFleet || 'standard'
    });

    let razorpayPayload = null;

    if (paymentMethod === 'razorpay' && isRazorpayConfigured()) {
        const amountPaise = Math.round((dto.pricing?.total ?? 0) * 100);
        if (amountPaise < 100) throw new ValidationError('Amount too low for online payment');
        try {
            const rzOrder = await createRazorpayOrder(amountPaise, 'INR', orderId);
            order.payment.razorpay = { orderId: rzOrder.id, paymentId: '', signature: '' };
            order.payment.status = 'created';
            razorpayPayload = {
                key: getRazorpayKeyId(),
                orderId: rzOrder.id,
                amount: rzOrder.amount,
                currency: rzOrder.currency || 'INR'
            };
        } catch (err) {
            throw new ValidationError(err?.message || 'Payment gateway error');
        }
    }

    await order.save();

    if (dispatchMode === 'auto' && (isCash || order.payment.status === 'paid' || order.payment.status === 'cod_pending')) {
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
        userId: new mongoose.Types.ObjectId(userId)
    });
    if (!order) throw new ValidationError('Order not found');
    if (order.payment.status === 'paid') return { order: order.toObject(), payment: order.payment };

    const valid = verifyPaymentSignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    if (!valid) throw new ValidationError('Payment verification failed');

    order.payment.status = 'paid';
    order.payment.razorpay.paymentId = dto.razorpayPaymentId;
    order.payment.razorpay.signature = dto.razorpaySignature;
    pushStatusHistory(order, { byRole: 'USER', byId: userId, from: order.orderStatus, to: 'created', note: 'Payment verified' });
    await order.save();

    const settings = await getDispatchSettings();
    if (settings.dispatchMode === 'auto') {
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
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function tryAutoAssign(orderId) {
    const order = await FoodOrder.findById(orderId).select('restaurantId dispatch').lean();
    if (!order || order.dispatch?.status !== 'unassigned') return null;

    const restaurant = await FoodRestaurant.findById(order.restaurantId).select('location').lean();
    if (!restaurant?.location?.coordinates?.length) return null;

    const [rLng, rLat] = restaurant.location.coordinates;
    const partners = await FoodDeliveryPartner.find({
        status: 'approved',
        availabilityStatus: 'online',
        lastLat: { $exists: true, $ne: null },
        lastLng: { $exists: true, $ne: null }
    })
        .select('_id lastLat lastLng')
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
        FoodOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodOrder.countDocuments(filter)
    ]);
    return buildPaginatedResult({ docs, total, page, limit });
}

export async function getOrderById(orderId, { userId, restaurantId, deliveryPartnerId, admin } = {}) {
    const id = mongoose.Types.ObjectId.isValid(orderId) ? new mongoose.Types.ObjectId(orderId) : null;
    if (!id) throw new ValidationError('Invalid order id');
    const order = await FoodOrder.findById(id)
        .populate('restaurantId', 'restaurantName profileImage area city')
        .populate('dispatch.deliveryPartnerId', 'name phone')
        .lean();
    if (!order) throw new ValidationError('Order not found');

    if (admin) return order;
    if (userId && order.userId?.toString() !== userId.toString()) throw new ForbiddenError('Not your order');
    if (restaurantId && order.restaurantId?._id?.toString() !== restaurantId.toString()) throw new ForbiddenError('Not your restaurant order');
    if (deliveryPartnerId && order.dispatch?.deliveryPartnerId?._id?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not assigned to you');

    return order;
}

export async function cancelOrder(orderId, userId, reason) {
    const order = await FoodOrder.findOne({ _id: new mongoose.Types.ObjectId(orderId), userId: new mongoose.Types.ObjectId(userId) });
    if (!order) throw new ValidationError('Order not found');
    const allowed = ['created'];
    if (!allowed.includes(order.orderStatus)) throw new ValidationError('Order cannot be cancelled');
    order.orderStatus = 'cancelled_by_user';
    pushStatusHistory(order, { byRole: 'USER', byId: userId, from: order.orderStatus, to: 'cancelled_by_user', note: reason || '' });
    await order.save();
    return order.toObject();
}

// ----- Restaurant -----
export async function listOrdersRestaurant(restaurantId, query) {
    const { page, limit, skip } = buildPaginationOptions(query);
    const filter = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };
    const [docs, total] = await Promise.all([
        FoodOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodOrder.countDocuments(filter)
    ]);
    return buildPaginatedResult({ docs, total, page, limit });
}

export async function updateOrderStatusRestaurant(orderId, restaurantId, orderStatus) {
    const order = await FoodOrder.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId)
    });
    if (!order) throw new ValidationError('Order not found');
    const from = order.orderStatus;
    order.orderStatus = orderStatus;
    pushStatusHistory(order, { byRole: 'RESTAURANT', byId: restaurantId, from, to: orderStatus });
    await order.save();
    return order.toObject();
}

// ----- Delivery: available, accept, reject, status -----
export async function listOrdersAvailableDelivery(deliveryPartnerId, query) {
    const { page, limit, skip } = buildPaginationOptions(query);
    const filter = {
        $or: [
            { 'dispatch.status': 'unassigned' },
            { 'dispatch.deliveryPartnerId': new mongoose.Types.ObjectId(deliveryPartnerId) }
        ],
        orderStatus: { $nin: ['delivered', 'cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'] }
    };
    const [docs, total] = await Promise.all([
        FoodOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodOrder.countDocuments(filter)
    ]);
    return buildPaginatedResult({ docs, total, page, limit });
}

export async function acceptOrderDelivery(orderId, deliveryPartnerId) {
    const order = await FoodOrder.findById(orderId);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.status !== 'assigned' || order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) {
        throw new ValidationError('Order not assigned to you or already accepted');
    }
    order.dispatch.status = 'accepted';
    order.dispatch.acceptedAt = new Date();
    pushStatusHistory(order, { byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from: 'assigned', to: 'accepted' });
    await order.save();
    return order.toObject();
}

export async function rejectOrderDelivery(orderId, deliveryPartnerId) {
    const order = await FoodOrder.findById(orderId);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = undefined;
    order.dispatch.assignedAt = undefined;
    order.dispatch.acceptedAt = undefined;
    pushStatusHistory(order, { byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from: 'assigned', to: 'unassigned', note: 'Rejected' });
    await order.save();
    return order.toObject();
}

export async function updateOrderStatusDelivery(orderId, deliveryPartnerId, orderStatus) {
    const order = await FoodOrder.findById(orderId);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    const from = order.orderStatus;
    order.orderStatus = orderStatus;
    pushStatusHistory(order, { byRole: 'DELIVERY_PARTNER', byId: deliveryPartnerId, from, to: orderStatus });
    await order.save();
    return order.toObject();
}

// ----- COD QR collection -----
export async function createCollectQr(orderId, deliveryPartnerId, customerInfo = {}) {
    const order = await FoodOrder.findById(orderId)
        .populate('userId', 'name email phone')
        .lean();
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    if (order.payment.method !== 'cash' && order.payment.status === 'paid') throw new ValidationError('Order already paid');
    const amountDue = order.payment.amountDue ?? order.pricing?.total ?? 0;
    if (amountDue < 1) throw new ValidationError('No amount due');

    if (!isRazorpayConfigured()) throw new ValidationError('QR payment not configured');

    const amountPaise = Math.round(amountDue * 100);
    const user = order.userId || {};
    const link = await createPaymentLink({
        amountPaise,
        currency: 'INR',
        description: `Order ${order.orderId} - COD collect`,
        orderId: order.orderId,
        customerName: customerInfo.name || user.name || 'Customer',
        customerEmail: customerInfo.email || user.email || 'customer@example.com',
        customerPhone: customerInfo.phone || user.phone
    });

    await FoodOrder.findByIdAndUpdate(orderId, {
        $set: {
            'payment.method': 'razorpay_qr',
            'payment.status': 'pending_qr',
            'payment.qr': {
                paymentLinkId: link.id,
                shortUrl: link.short_url,
                imageUrl: link.short_url,
                status: link.status || 'created',
                expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null
            }
        }
    });

    return {
        shortUrl: link.short_url,
        imageUrl: link.short_url,
        amount: amountDue,
        expiresAt: link.expire_by ? new Date(link.expire_by * 1000) : null
    };
}

export async function getPaymentStatus(orderId, deliveryPartnerId) {
    const order = await FoodOrder.findById(orderId).select('payment dispatch').lean();
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch?.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()) throw new ForbiddenError('Not your order');
    return { payment: order.payment };
}

// ----- Admin -----
export async function listOrdersAdmin(query) {
    const { page, limit, skip } = buildPaginationOptions(query);
    const filter = {};
    const [docs, total] = await Promise.all([
        FoodOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodOrder.countDocuments(filter)
    ]);
    return buildPaginatedResult({ docs, total, page, limit });
}

export async function assignDeliveryPartnerAdmin(orderId, deliveryPartnerId, adminId) {
    const order = await FoodOrder.findById(orderId);
    if (!order) throw new ValidationError('Order not found');
    if (order.dispatch.status === 'accepted') throw new ValidationError('Order already accepted by partner');

    const partner = await FoodDeliveryPartner.findById(deliveryPartnerId).select('status').lean();
    if (!partner || partner.status !== 'approved') throw new ValidationError('Delivery partner not available');

    order.dispatch.status = 'assigned';
    order.dispatch.deliveryPartnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    order.dispatch.assignedAt = new Date();
    pushStatusHistory(order, { byRole: 'ADMIN', byId: adminId, from: order.dispatch.status, to: 'assigned' });
    await order.save();
    return order.toObject();
}
