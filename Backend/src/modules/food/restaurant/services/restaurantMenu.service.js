import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurantMenu } from '../models/restaurantMenu.model.js';

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

