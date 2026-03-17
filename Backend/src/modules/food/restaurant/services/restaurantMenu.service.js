import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';

const buildMenuFromFoods = (foods = []) => {
    const byCategory = new Map();
    for (const f of foods) {
        const cat = (f.categoryName || f.category || 'Menu').trim() || 'Menu';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push({
            id: String(f._id),
            _id: f._id,
            name: f.name,
            description: f.description || '',
            price: f.price ?? 0,
            image: f.image || '',
            foodType: f.foodType || 'Non-Veg',
            isAvailable: f.isAvailable !== false,
            approvalStatus: f.approvalStatus || 'approved',
            rejectionReason: f.rejectionReason || '',
            requestedAt: f.requestedAt,
            approvedAt: f.approvedAt,
            rejectedAt: f.rejectedAt,
            preparationTime: f.preparationTime || ''
        });
    }

    const names = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b));
    const sections = names.map((name, idx) => ({
        id: `section-${idx}`,
        name,
        items: (byCategory.get(name) || []).sort((a, b) => {
            const at = new Date(a.requestedAt || a.createdAt || 0).getTime();
            const bt = new Date(b.requestedAt || b.createdAt || 0).getTime();
            return bt - at;
        }),
        subsections: []
    }));
    return { sections };
};

export async function getRestaurantMenu(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const foods = await FoodItem.find({ restaurantId })
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();
    return buildMenuFromFoods(foods);
}

export async function updateRestaurantMenu(restaurantId, body = {}) {
    // Option A: single source of truth (food_items). Menu layout snapshots are disabled.
    // Keep endpoint for backward compatibility, but make it explicit.
    throw new ValidationError('Menu editing is disabled. Menu is generated from food items.');
}

export async function getPublicApprovedRestaurantMenu(restaurantIdOrSlug) {
    const value = String(restaurantIdOrSlug || '').trim();
    if (!value) throw new ValidationError('Restaurant id is required');

    let restaurant = null;
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
        restaurant = await FoodRestaurant.findOne({ _id: value, status: 'approved' })
            .select('_id status')
            .lean();
    } else {
        const normalized = value.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
        restaurant = await FoodRestaurant.findOne({ restaurantNameNormalized: normalized, status: 'approved' })
            .select('_id status')
            .lean();
    }

    if (!restaurant?._id) {
        return null;
    }
    const foods = await FoodItem.find({ restaurantId: restaurant._id, approvalStatus: 'approved' })
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();
    return buildMenuFromFoods(foods);
}

export async function syncMenuItemApprovalStatus(restaurantId, itemId, status, rejectionReason = '') {
    // No-op in Option A (menu snapshots removed). Approval status lives only in food_items.
    // Kept to avoid breaking admin approval flows that call this helper.
    return;
}

