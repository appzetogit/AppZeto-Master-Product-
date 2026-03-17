import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodItem } from '../models/food.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { syncMenuItemApprovalStatus } from '../../restaurant/services/restaurantMenu.service.js';

const toRestaurantDisplayId = (mongoId) => {
    const s = String(mongoId || '');
    return s.length >= 5 ? s.slice(-5) : s;
};

export async function listPendingFoodApprovals(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 200, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { approvalStatus: 'pending' };
    if (query.restaurantId && mongoose.Types.ObjectId.isValid(String(query.restaurantId))) {
        filter.restaurantId = query.restaurantId;
    }
    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim().slice(0, 80);
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { categoryName: { $regex: term, $options: 'i' } }
        ];
    }

    const list = await FoodItem.find(filter)
        .sort({ requestedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('restaurantId categoryName name price image foodType approvalStatus requestedAt createdAt')
        .lean();

    const restaurantIds = Array.from(new Set(list.map((f) => String(f.restaurantId)).filter(Boolean)));
    const restaurants = restaurantIds.length
        ? await FoodRestaurant.find({ _id: { $in: restaurantIds } }).select('restaurantName').lean()
        : [];
    const restaurantMap = new Map(restaurants.map((r) => [String(r._id), r.restaurantName]));

    const requests = list.map((f) => ({
        _id: f._id,
        id: f._id,
        entityType: 'food',
        type: 'food',
        restaurantName: restaurantMap.get(String(f.restaurantId)) || 'Unknown Restaurant',
        restaurantId: toRestaurantDisplayId(f.restaurantId),
        category: f.categoryName || '',
        itemName: f.name,
        foodType: f.foodType || 'Non-Veg',
        sectionName: f.categoryName || '',
        subsectionName: '',
        approvalStatus: f.approvalStatus || 'pending',
        price: f.price ?? 0,
        image: f.image || '',
        images: f.image ? [f.image] : [],
        requestedAt: f.requestedAt || f.createdAt,
        isActionable: (f.approvalStatus || 'pending') === 'pending'
    }));

    return { requests, page, limit, total: requests.length };
}

export async function approveFoodItem(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
        throw new ValidationError('Invalid food id');
    }
    const updated = await FoodItem.findOneAndUpdate(
        { _id: id, approvalStatus: 'pending' },
        { $set: { approvalStatus: 'approved', approvedAt: new Date(), rejectedAt: null, rejectionReason: '' } },
        { new: true }
    ).lean();
    if (updated?.restaurantId) {
        // Single DB update; makes user-facing menu reflect approval immediately.
        await syncMenuItemApprovalStatus(updated.restaurantId, updated._id, 'approved', '');
    }
    return updated;
}

export async function rejectFoodItem(id, reason) {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
        throw new ValidationError('Invalid food id');
    }
    const r = typeof reason === 'string' ? reason.trim() : '';
    if (!r) throw new ValidationError('Rejection reason is required');
    if (r.length > 500) throw new ValidationError('Rejection reason is too long');

    const updated = await FoodItem.findOneAndUpdate(
        { _id: id, approvalStatus: 'pending' },
        { $set: { approvalStatus: 'rejected', rejectedAt: new Date(), rejectionReason: r, approvedAt: null } },
        { new: true }
    ).lean();
    if (updated?.restaurantId) {
        await syncMenuItemApprovalStatus(updated.restaurantId, updated._id, 'rejected', r);
    }
    return updated;
}

