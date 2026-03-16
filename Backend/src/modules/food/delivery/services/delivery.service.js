import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { DeliverySupportTicket } from '../models/supportTicket.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

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

