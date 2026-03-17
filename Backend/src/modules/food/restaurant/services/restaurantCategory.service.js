import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodCategory } from '../../admin/models/category.model.js';
import { FoodItem } from '../../admin/models/food.model.js';

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listRestaurantCategories(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const includeInactive = query.includeInactive === 'true' || query.includeInactive === '1';
    const withCounts = query.withCounts === 'true' || query.withCounts === '1';
    const compact = query.compact === 'true' || query.compact === '1';
    const zoneIdRaw = typeof query.zoneId === 'string' ? query.zoneId.trim() : '';

    const filter = {};
    if (!includeInactive) filter.isActive = true;
    if (search) {
        const term = escapeRegex(search.slice(0, 80));
        filter.name = { $regex: term, $options: 'i' };
    }
    // Zone-aware listing:
    // - if zoneId is provided: return categories for that zone + global categories (zoneId missing)
    // - if zoneId is not provided: return only global categories (backward compatible default)
    if (zoneIdRaw && mongoose.Types.ObjectId.isValid(zoneIdRaw)) {
        filter.$or = [
            { zoneId: new mongoose.Types.ObjectId(zoneIdRaw) },
            { zoneId: { $exists: false } },
            { zoneId: null }
        ];
    } else {
        filter.$or = [{ zoneId: { $exists: false } }, { zoneId: null }];
    }

    const [list, total] = await Promise.all([
        FoodCategory.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            // For item creation forms we only need id + name (fastest payload).
            .select(compact ? 'name zoneId' : 'name image type zoneId isActive sortOrder createdAt updatedAt')
            .lean(),
        FoodCategory.countDocuments(filter)
    ]);

    let countsById = new Map();
    if (withCounts && !compact && list.length) {
        const ids = list.map((c) => c._id);
        const counts = await FoodItem.aggregate([
            { $match: { categoryId: { $in: ids } } },
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        countsById = new Map(counts.map((c) => [String(c._id), c.count]));
    }

    const categories = compact
        ? list.map((c) => ({ _id: c._id, id: c._id, name: c.name }))
        : list.map((c) => ({
            _id: c._id,
            id: c._id,
            name: c.name,
            image: c.image || '',
            type: c.type || '',
            isActive: c.isActive !== false,
            status: c.isActive !== false,
            zoneId: c.zoneId || null,
            sortOrder: c.sortOrder || 0,
            itemCount: withCounts ? (countsById.get(String(c._id)) || 0) : undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));

    return { categories, total, page, limit };
}

export async function createRestaurantCategory(body = {}) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Category name is required');
    if (name.length > 200) throw new ValidationError('Category name is too long');

    const doc = new FoodCategory({
        name,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        type: typeof body.type === 'string' ? body.type.trim() : '',
        isActive: body.isActive !== false,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    });
    await doc.save();
    return doc.toObject();
}

export async function updateRestaurantCategory(id, body = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;

    if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw new ValidationError('Category name is required');
        if (name.length > 200) throw new ValidationError('Category name is too long');
        doc.name = name;
    }
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.type !== undefined) doc.type = String(body.type || '').trim();
    if (body.isActive !== undefined) doc.isActive = body.isActive !== false;
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    await doc.save();
    return doc.toObject();
}

export async function deleteRestaurantCategory(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }

    const inUse = await FoodItem.countDocuments({ categoryId: id });
    if (inUse > 0) {
        throw new ValidationError('Cannot delete category while it has items');
    }

    const deleted = await FoodCategory.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

