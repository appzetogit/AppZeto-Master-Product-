import mongoose from 'mongoose';
import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { DeliverySupportTicket } from '../models/supportTicket.model.js';
import { DeliveryBonusTransaction } from '../../admin/models/deliveryBonusTransaction.model.js';
import { FoodOrder } from '../../orders/order.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { getDeliveryCashLimitSettings } from '../../admin/services/admin.service.js';

export const registerDeliveryPartner = async (payload, files) => {
    const { name, phone, email, countryCode, address, city, state, vehicleType, vehicleName, vehicleNumber, panNumber, aadharNumber } =
        payload;

    const existing = await FoodDeliveryPartner.findOne({ phone }).lean();
    if (existing) {
        throw new ValidationError('Delivery partner with this phone already exists');
    }

    const images = {};

    if (files?.profilePhoto?.[0]) {
        images.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'food/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        images.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'food/delivery/aadhar');
    }
    if (files?.panPhoto?.[0]) {
        images.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'food/delivery/pan');
    }
    if (files?.drivingLicensePhoto?.[0]) {
        images.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'food/delivery/license'
        );
    }

    const partner = await FoodDeliveryPartner.create({
        name,
        phone,
        email: email && String(email).trim() ? String(email).trim() : undefined,
        countryCode,
        address,
        city,
        state,
        vehicleType,
        vehicleName,
        vehicleNumber,
        panNumber,
        aadharNumber,
        status: 'pending',
        ...images
    });

    return partner.toObject();
};

export const updateDeliveryPartnerProfile = async (userId, payload, files) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }

    const {
        name, countryCode, address, city, state,
        vehicleType, vehicleName, vehicleNumber, panNumber, aadharNumber
    } = payload;

    if (name) partner.name = name;
    if (countryCode !== undefined) partner.countryCode = countryCode;
    if (address !== undefined) partner.address = address;
    if (city !== undefined) partner.city = city;
    if (state !== undefined) partner.state = state;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleName !== undefined) partner.vehicleName = vehicleName;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (panNumber !== undefined) partner.panNumber = panNumber;
    if (aadharNumber !== undefined) partner.aadharNumber = aadharNumber;

    let updatedDocsRequiringReapproval = false;

    if (files?.profilePhoto?.[0]) {
        partner.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'food/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        partner.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'food/delivery/aadhar');
        updatedDocsRequiringReapproval = true;
    }
    if (files?.panPhoto?.[0]) {
        partner.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'food/delivery/pan');
        updatedDocsRequiringReapproval = true;
    }
    if (files?.drivingLicensePhoto?.[0]) {
        partner.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'food/delivery/license'
        );
        updatedDocsRequiringReapproval = true;
    }

    if (updatedDocsRequiringReapproval && String(partner.status).toLowerCase() === 'approved') {
        partner.status = 'pending';
        partner.approvedAt = undefined;
    }

    await partner.save();
    return {
        partner: partner.toObject(),
        requiresReapproval: Boolean(updatedDocsRequiringReapproval)
    };
};

export const updateDeliveryPartnerDetails = async (userId, payload) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }

    const vehicle = payload?.vehicle;
    if (vehicle && typeof vehicle === 'object') {
        if (vehicle.number !== undefined) partner.vehicleNumber = String(vehicle.number || '').trim();
        if (vehicle.type !== undefined) partner.vehicleType = String(vehicle.type || '').trim();
        if (vehicle.brand !== undefined) partner.vehicleName = String(vehicle.brand || '').trim();
        if (vehicle.model !== undefined) partner.vehicleName = String(vehicle.model || '').trim();
    }

    await partner.save();
    return partner.toObject();
};

export const updateDeliveryPartnerProfilePhotoBase64 = async (userId, payload) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }
    const base64 = payload?.base64;
    const mimeType = payload?.mimeType || 'image/jpeg';
    if (!base64 || typeof base64 !== 'string') {
        throw new ValidationError('base64 is required');
    }
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer || !buffer.length) {
        throw new ValidationError('Invalid base64 image');
    }
    if (buffer.length > 8 * 1024 * 1024) {
        throw new ValidationError('Image too large (max 8MB)');
    }
    // uploadImageBuffer expects raw bytes; mimeType is ignored by current implementation, but buffer is valid.
    partner.profilePhoto = await uploadImageBuffer(buffer, 'food/delivery/profile');
    await partner.save();
    return partner.toObject();
};

export const updateDeliveryPartnerBankDetails = async (userId, payload) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }
    const docs = payload?.documents;
    if (docs?.bankDetails) {
        const b = docs.bankDetails;
        if (b.accountHolderName !== undefined) partner.bankAccountHolderName = b.accountHolderName ? String(b.accountHolderName).trim() : '';
        if (b.accountNumber !== undefined) partner.bankAccountNumber = b.accountNumber ? String(b.accountNumber).trim() : '';
        if (b.ifscCode !== undefined) partner.bankIfscCode = b.ifscCode ? String(b.ifscCode).trim().toUpperCase() : '';
        if (b.bankName !== undefined) partner.bankName = b.bankName ? String(b.bankName).trim() : '';
    }
    if (docs?.pan?.number !== undefined) {
        partner.panNumber = docs.pan.number ? String(docs.pan.number).trim().toUpperCase() : '';
    }
    await partner.save();
    return partner.toObject();
};

function generateTicketId() {
    const n = Date.now().toString(36).slice(-6).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TKT-${n}${r}`;
}

export const listSupportTicketsByPartner = async (deliveryPartnerId) => {
    const list = await DeliverySupportTicket.find({ deliveryPartnerId })
        .sort({ createdAt: -1 })
        .lean();
    return list;
};

export const createSupportTicket = async (deliveryPartnerId, payload) => {
    const { subject, description, category = 'other', priority = 'medium' } = payload;
    if (!subject || !description || subject.trim().length < 3) {
        throw new ValidationError('Subject is required (min 3 characters)');
    }
    if (description.trim().length < 10) {
        throw new ValidationError('Description must be at least 10 characters');
    }
    let ticketId = generateTicketId();
    let exists = await DeliverySupportTicket.findOne({ ticketId }).lean();
    while (exists) {
        ticketId = generateTicketId();
        exists = await DeliverySupportTicket.findOne({ ticketId }).lean();
    }
    const ticket = await DeliverySupportTicket.create({
        deliveryPartnerId,
        ticketId,
        subject: subject.trim(),
        description: description.trim(),
        category: ['payment', 'account', 'technical', 'order', 'other'].includes(category) ? category : 'other',
        priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
        status: 'open'
    });
    return ticket.toObject();
};

export const getSupportTicketByIdAndPartner = async (ticketId, deliveryPartnerId) => {
    const ticket = await DeliverySupportTicket.findOne({
        _id: ticketId,
        deliveryPartnerId
    }).lean();
    return ticket;
};

export const updateDeliveryAvailability = async (userId, payload) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }
    const { status, latitude, longitude } = payload || {};
    const validStatus = status === 'online' || status === 'offline' ? status : 'offline';
    partner.availabilityStatus = validStatus;
    if (typeof latitude === 'number' && latitude >= -90 && latitude <= 90) {
        partner.lastLat = latitude;
    }
    if (typeof longitude === 'number' && longitude >= -180 && longitude <= 180) {
        partner.lastLng = longitude;
    }
    await partner.save();
    return { availabilityStatus: partner.availabilityStatus };
};

// ----- Delivery partner wallet (Pocket / requests page) -----
export const getDeliveryPartnerWallet = async (deliveryPartnerId) => {
    if (!deliveryPartnerId || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
        throw new ValidationError('Delivery partner not found');
    }
    const partner = await FoodDeliveryPartner.findById(deliveryPartnerId).lean();
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }

    const cashLimitSettings = await getDeliveryCashLimitSettings();
    const totalCashLimit = Number(cashLimitSettings.deliveryCashLimit) || 0;
    const deliveryWithdrawalLimit = Number(cashLimitSettings.deliveryWithdrawalLimit) || 100;

    const bonusAgg = await DeliveryBonusTransaction.aggregate([
        { $match: { deliveryPartnerId: new mongoose.Types.ObjectId(deliveryPartnerId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalBonus = bonusAgg[0] ? Number(bonusAgg[0].total) : 0;

    const partnerId = new mongoose.Types.ObjectId(deliveryPartnerId);
    const bonusTxList = await DeliveryBonusTransaction.find({ deliveryPartnerId: partnerId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    const transactions = (bonusTxList || []).map((t) => ({
        _id: t._id,
        type: 'bonus',
        amount: t.amount,
        status: 'Completed',
        date: t.createdAt,
        createdAt: t.createdAt,
        description: t.reference ? `Bonus - ${t.reference}` : 'Bonus'
    }));

    const totalBalance = totalBonus;
    const cashInHand = 0;
    const totalWithdrawn = 0;
    const totalEarned = 0;
    const availableCashLimit = Math.max(0, totalCashLimit - cashInHand);

    return {
        totalBalance,
        pocketBalance: totalBalance,
        cashInHand,
        totalWithdrawn,
        totalEarned,
        totalCashLimit,
        availableCashLimit,
        deliveryWithdrawalLimit,
        transactions,
        joiningBonusClaimed: false,
        joiningBonusAmount: 0
    };
};

// ----- Delivery partner earnings summary (Pocket / requests page) -----
export const getDeliveryPartnerEarnings = async (deliveryPartnerId, query = {}) => {
    if (!deliveryPartnerId || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
        throw new ValidationError('Delivery partner not found');
    }
    const period = query.period || 'week';
    const date = query.date ? new Date(query.date) : new Date();
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 1000);

    const summary = {
        totalEarnings: 0,
        totalOrders: 0
    };

    return {
        summary,
        period,
        date: date.toISOString(),
        pagination: { page, limit, total: 0 }
    };
};

const normalizeStatusFilter = (status) => {
    if (!status) return null;
    const s = String(status || '').trim();
    if (!s || s.toUpperCase() === 'ALL TRIPS') return null;
    // UI uses Completed/Cancelled/Pending
    return s;
};

const toStartOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const toEndOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
};

const getWeekRange = (anchorDate) => {
    const d = new Date(anchorDate);
    const start = toStartOfDay(d);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    const end = toEndOfDay(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
};

const getMonthRange = (anchorDate) => {
    const d = new Date(anchorDate);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const computeRange = (period, date) => {
    const p = String(period || 'daily').toLowerCase();
    const anchor = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    if (p === 'weekly' || p === 'week') return getWeekRange(anchor);
    if (p === 'monthly' || p === 'month') return getMonthRange(anchor);
    // daily
    return { start: toStartOfDay(anchor), end: toEndOfDay(anchor) };
};

const toTripDto = (order) => {
    const createdAt = order?.createdAt || null;
    const deliveredAt = order?.deliveredAt || order?.completedAt || null;
    const dateForUi = deliveredAt || createdAt;
    const time = dateForUi
        ? new Date(dateForUi).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';
    return {
        id: order?._id,
        _id: order?._id,
        orderId: order?.orderId || order?._id,
        status: order?.status || 'Pending',
        restaurantName: order?.restaurantName || '',
        restaurant: order?.restaurantName || '',
        items: order?.items || order?.orderItems || [],
        orderItems: order?.orderItems || order?.items || [],
        paymentMethod: order?.paymentMethod || '',
        totalAmount: order?.totalAmount || 0,
        orderTotal: order?.totalAmount || 0,
        codAmount: order?.codAmount || 0,
        codCollectedAmount: order?.codAmount || 0,
        deliveryEarning: order?.deliveryEarning || 0,
        earningAmount: order?.deliveryEarning || 0,
        createdAt: order?.createdAt,
        deliveredAt: order?.deliveredAt,
        completedAt: order?.completedAt,
        date: dateForUi,
        time
    };
};

export const getDeliveryPartnerTripHistory = async (deliveryPartnerId, query = {}) => {
    if (!deliveryPartnerId || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
        throw new ValidationError('Delivery partner not found');
    }
    const period = query.period || 'daily';
    const date = query.date ? new Date(query.date) : new Date();
    const statusFilter = normalizeStatusFilter(query.status);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 1000);

    const { start, end } = computeRange(period, date);

    const match = {
        deliveryPartnerId: new mongoose.Types.ObjectId(deliveryPartnerId),
        createdAt: { $gte: start, $lte: end }
    };

    // If completed filter, use deliveredAt window when available.
    if (statusFilter && String(statusFilter).toLowerCase() === 'completed') {
        delete match.createdAt;
        match.status = 'Completed';
        match.deliveredAt = { $gte: start, $lte: end };
    } else if (statusFilter) {
        match.status = statusFilter;
    }

    const orders = await FoodOrder.find(match)
        .sort({ deliveredAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

    return {
        period,
        date: (date || new Date()).toISOString(),
        range: { start: start.toISOString(), end: end.toISOString() },
        trips: (orders || []).map(toTripDto)
    };
};

export const getDeliveryPocketDetails = async (deliveryPartnerId, query = {}) => {
    if (!deliveryPartnerId || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
        throw new ValidationError('Delivery partner not found');
    }
    const date = query.date ? new Date(query.date) : new Date();
    const { start, end } = getWeekRange(date);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 2000);

    const partnerId = new mongoose.Types.ObjectId(deliveryPartnerId);

    const orders = await FoodOrder.find({
        deliveryPartnerId: partnerId,
        status: 'Completed',
        deliveredAt: { $gte: start, $lte: end }
    })
        .sort({ deliveredAt: -1 })
        .limit(limit)
        .lean();

    const bonusTxList = await DeliveryBonusTransaction.find({
        deliveryPartnerId: partnerId,
        createdAt: { $gte: start, $lte: end }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const trips = (orders || []).map(toTripDto);

    const paymentTransactions = (orders || []).map((o) => ({
        _id: o._id,
        type: 'payment',
        amount: Number(o.deliveryEarning) || 0,
        status: 'Completed',
        date: o.deliveredAt || o.completedAt || o.createdAt,
        createdAt: o.deliveredAt || o.completedAt || o.createdAt,
        orderId: o.orderId || String(o._id),
        metadata: { orderId: o.orderId || String(o._id) },
        description: o.restaurantName ? `Order earning - ${o.restaurantName}` : 'Order earning'
    }));

    const bonusTransactions = (bonusTxList || []).map((t) => ({
        _id: t._id,
        type: 'bonus',
        amount: Number(t.amount) || 0,
        status: 'Completed',
        date: t.createdAt,
        createdAt: t.createdAt,
        metadata: { reference: t.reference || '' },
        description: t.reference ? `Bonus - ${t.reference}` : 'Bonus'
    }));

    const totalEarning = paymentTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalBonus = bonusTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
        week: { start: start.toISOString(), end: end.toISOString() },
        summary: { totalEarning, totalBonus, grandTotal: totalEarning + totalBonus },
        trips,
        transactions: {
            payment: paymentTransactions,
            bonus: bonusTransactions
        }
    };
};

