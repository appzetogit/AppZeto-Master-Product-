import mongoose from 'mongoose';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurantStaff } from '../models/restaurantStaff.model.js';

const normalizePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(-15);
    return {
        digits: digits || '',
        last10: digits ? digits.slice(-10) : ''
    };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toStaffDto = (doc) => ({
    _id: doc._id,
    id: doc._id,
    name: doc.name || '',
    email: doc.email || '',
    phone: doc.phoneDigits || doc.phone || '',
    role: doc.role,
    status: doc.status,
    profileImage: doc.profilePhoto ? { url: doc.profilePhoto } : null,
    addedAt: doc.createdAt
});

export async function addRestaurantStaff(restaurantId, body = {}, file) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }

    const name = String(body.name || '').trim();
    if (!name || name.length < 2) {
        throw new ValidationError('Name must be at least 2 characters');
    }
    if (name.length > 120) {
        throw new ValidationError('Name is too long');
    }

    const role = String(body.role || '').trim();
    if (!['staff', 'manager'].includes(role)) {
        throw new ValidationError('Invalid role');
    }

    const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : '';
    const phone = body.phone !== undefined ? String(body.phone || '').trim() : '';

    if (!email && !phone) {
        throw new ValidationError('Phone or email is required');
    }
    if (email && (!EMAIL_REGEX.test(email) || email.length > 254)) {
        throw new ValidationError('Email is invalid');
    }

    let phoneDigits = '';
    let phoneLast10 = '';
    if (phone) {
        const n = normalizePhone(phone);
        phoneDigits = n.digits;
        phoneLast10 = n.last10;
        // Frontend enforces 10 digits, but keep backend robust.
        if (!phoneLast10 || phoneLast10.length !== 10) {
            throw new ValidationError('Phone number must contain exactly 10 digits');
        }
    }

    let profilePhotoUrl = '';
    if (file?.buffer) {
        profilePhotoUrl = await uploadImageBuffer(file.buffer, 'food/restaurants/staff');
    }

    try {
        const doc = await FoodRestaurantStaff.create({
            restaurantId,
            name,
            role,
            email: email || undefined,
            phone: phoneDigits || undefined,
            phoneDigits: phoneDigits || undefined,
            phoneLast10: phoneLast10 || undefined,
            profilePhoto: profilePhotoUrl || undefined,
            status: 'active'
        });
        return toStaffDto(doc.toObject());
    } catch (err) {
        if (err && err.code === 11000) {
            throw new ValidationError('A user with this phone/email is already added');
        }
        throw err;
    }
}

export async function listRestaurantStaff(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }

    const role = query.role && ['staff', 'manager'].includes(String(query.role)) ? String(query.role) : null;
    const filter = { restaurantId, status: 'active' };
    if (role) filter.role = role;

    const list = await FoodRestaurantStaff.find(filter)
        .select('name email phoneDigits phone role status profilePhoto createdAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

    return list.map(toStaffDto);
}

export async function removeRestaurantStaff(restaurantId, staffId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    if (!staffId || !mongoose.Types.ObjectId.isValid(String(staffId))) {
        throw new ValidationError('Invalid staff id');
    }

    // Soft delete to preserve history and keep unique partial indexes correct via status.
    const doc = await FoodRestaurantStaff.findOneAndUpdate(
        { _id: staffId, restaurantId, status: 'active' },
        { $set: { status: 'removed', removedAt: new Date() } },
        { new: true }
    ).lean();

    return doc ? { id: doc._id } : null;
}

