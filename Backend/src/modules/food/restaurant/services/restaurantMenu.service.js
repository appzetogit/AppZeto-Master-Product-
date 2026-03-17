import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurantMenu } from '../models/restaurantMenu.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';

const MAX_SECTIONS = 200;
const MAX_JSON_BYTES = 2_000_000; // ~2MB guardrail

const safeJsonSize = (v) => {
    try {
        return Buffer.byteLength(JSON.stringify(v), 'utf8');
    } catch {
        return Infinity;
    }
};

const normalizeSections = (sections) => {
    if (!Array.isArray(sections)) return [];
    return sections
        .filter((s) => s && typeof s === 'object')
        .slice(0, MAX_SECTIONS);
};

export async function getRestaurantMenu(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const doc = await FoodRestaurantMenu.findOne({ restaurantId })
        .select('sections updatedAt')
        .lean();
    return { sections: Array.isArray(doc?.sections) ? doc.sections : [] };
}

export async function updateRestaurantMenu(restaurantId, body = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const rawSections = body?.sections;
    if (!Array.isArray(rawSections)) {
        throw new ValidationError('sections must be an array');
    }

    const sections = normalizeSections(rawSections);
    const size = safeJsonSize(sections);
    if (size > MAX_JSON_BYTES) {
        throw new ValidationError('Menu is too large to save');
    }

    const doc = await FoodRestaurantMenu.findOneAndUpdate(
        { restaurantId },
        { $set: { sections } },
        { upsert: true, new: true, setDefaultsOnInsert: true, projection: 'sections updatedAt' }
    ).lean();

    return { sections: Array.isArray(doc?.sections) ? doc.sections : [] };
}

const toArray = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []));

const filterApprovedSections = (sections) => {
    const src = toArray(sections);
    return src
        .filter((s) => s && typeof s === 'object')
        .map((section) => {
            const items = toArray(section.items).filter((it) => {
                const status = String(it?.approvalStatus || 'approved').toLowerCase();
                return status === 'approved';
            });
            const subsections = toArray(section.subsections)
                .filter((sub) => sub && typeof sub === 'object')
                .map((sub) => ({
                    ...sub,
                    items: toArray(sub.items).filter((it) => {
                        const status = String(it?.approvalStatus || 'approved').toLowerCase();
                        return status === 'approved';
                    })
                }));
            return { ...section, items, subsections };
        })
        .filter((s) => (toArray(s.items).length || toArray(s.subsections).some((sub) => toArray(sub.items).length)));
};

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

    const doc = await FoodRestaurantMenu.findOne({ restaurantId: restaurant._id })
        .select('sections updatedAt')
        .lean();

    const fromSnapshot = filterApprovedSections(doc?.sections || []);
    if (fromSnapshot.length) {
        return { sections: fromSnapshot };
    }

    // Fallback: build menu from approved FoodItems.
    // This guarantees user app visibility even if snapshot isn't present yet.
    const foods = await FoodItem.find({ restaurantId: restaurant._id, approvalStatus: 'approved' })
        .sort({ createdAt: -1 })
        .limit(2000)
        .select('name description price image foodType isAvailable preparationTime categoryName')
        .lean();

    const byCategory = new Map();
    for (const f of foods) {
        const cat = (f.categoryName || 'Menu').trim() || 'Menu';
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
            preparationTime: f.preparationTime || '',
            approvalStatus: 'approved'
        });
    }

    const sections = Array.from(byCategory.entries()).map(([name, items], idx) => ({
        id: `section-${idx}`,
        name,
        items,
        subsections: []
    }));

    return { sections };
}

export async function syncMenuItemApprovalStatus(restaurantId, itemId, status, rejectionReason = '') {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) return;
    if (!itemId) return;
    const itemKey = String(itemId);
    const s = String(status || '').toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(s)) return;

    const set = {
        'sections.$[].items.$[it].approvalStatus': s,
        'sections.$[].subsections.$[].items.$[it].approvalStatus': s
    };
    // Optional metadata inside snapshot (UI reads these fields in some places).
    if (s === 'rejected') {
        set['sections.$[].items.$[it].rejectionReason'] = String(rejectionReason || '').trim();
        set['sections.$[].subsections.$[].items.$[it].rejectionReason'] = String(rejectionReason || '').trim();
    } else {
        set['sections.$[].items.$[it].rejectionReason'] = '';
        set['sections.$[].subsections.$[].items.$[it].rejectionReason'] = '';
    }

    await FoodRestaurantMenu.updateOne(
        { restaurantId },
        { $set: set },
        { arrayFilters: [{ 'it.id': itemKey }] }
    );
}

