import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodCategory } from '../../admin/models/category.model.js';
import { FoodItem } from '../../admin/models/food.model.js';

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));
const GLOBAL_CATEGORY_FILTER = [{ restaurantId: { $exists: false } }, { restaurantId: null }];

export async function listRestaurantCategories(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const includeInactive = query.includeInactive === 'true' || query.includeInactive === '1';
    const withCounts = query.withCounts === 'true' || query.withCounts === '1';
    const compact = query.compact === 'true' || query.compact === '1';
    const zoneIdRaw = typeof query.zoneId === 'string' ? query.zoneId.trim() : '';
    const restaurantObjectId = toObjectId(restaurantId);

    const filter = {};
    if (!includeInactive) filter.isActive = true;
    // Visibility rules:
    // - admin/global categories are shared only when approved
    // - restaurant-owned categories are visible only to their owner
    // `includePending` is intentionally no longer needed here because own categories
    // stay private to their creator and are therefore always visible to that restaurant.
    filter.$and = [{
        $or: [
            {
                $and: [
                    { $or: GLOBAL_CATEGORY_FILTER },
                    { isApproved: { $ne: false } }
                ]
            },
            { restaurantId: restaurantObjectId }
        ]
    }];
    if (search) {
        const term = escapeRegex(search.slice(0, 80));
        filter.$and.push({ name: { $regex: term, $options: 'i' } });
    }
    // Zone-aware listing:
    // - if zoneId is provided: return categories for that zone + global categories (zoneId missing)
    // - if zoneId is not provided: return only global categories (backward compatible default)
    if (zoneIdRaw && mongoose.Types.ObjectId.isValid(zoneIdRaw)) {
        filter.$and.push({
            $or: [
            { zoneId: new mongoose.Types.ObjectId(zoneIdRaw) },
            { zoneId: { $exists: false } },
            { zoneId: null }
            ]
        });
    } else {
        filter.$and.push({ $or: [{ zoneId: { $exists: false } }, { zoneId: null }] });
    }

    const [list, total] = await Promise.all([
        FoodCategory.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            // For item creation forms we only need id + name (fastest payload).
            .select(
                compact
                    ? 'name zoneId isApproved restaurantId'
                    : 'name image type zoneId isActive sortOrder createdAt updatedAt isApproved restaurantId'
            )
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
        ? list.map((c) => ({
            _id: c._id,
            id: c._id,
            name: c.name,
            isApproved: c.isApproved !== false
        }))
        : list.map((c) => ({
            _id: c._id,
            id: c._id,
            name: c.name,
            image: c.image || '',
            type: c.type || '',
            isActive: c.isActive !== false,
            status: c.isActive !== false,
            isApproved: c.isApproved !== false,
            restaurantId: c.restaurantId || null,
            zoneId: c.zoneId || null,
            sortOrder: c.sortOrder || 0,
            itemCount: withCounts ? (countsById.get(String(c._id)) || 0) : undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));

    return { categories, total, page, limit };
}

// Public categories listing (user app): approved + active, zone-aware, no auth required.
export async function listPublicCategories(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const zoneIdRaw = typeof query.zoneId === 'string' ? query.zoneId.trim() : '';

    const filter = { isActive: true };
    // Only approved admin/global categories are visible publicly.
    filter.$and = [
        { isApproved: { $ne: false } },
        { $or: GLOBAL_CATEGORY_FILTER }
    ];

    if (search) {
        const term = escapeRegex(search.slice(0, 80));
        filter.$and.push({ name: { $regex: term, $options: 'i' } });
    }

    if (zoneIdRaw && mongoose.Types.ObjectId.isValid(zoneIdRaw)) {
        filter.$and.push({
            $or: [
                { zoneId: new mongoose.Types.ObjectId(zoneIdRaw) },
                { zoneId: { $exists: false } },
                { zoneId: null }
            ]
        });
    } else {
        filter.$and.push({ $or: [{ zoneId: { $exists: false } }, { zoneId: null }] });
    }

    const [list, total] = await Promise.all([
        FoodCategory.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('name image type zoneId sortOrder createdAt updatedAt')
            .lean(),
        FoodCategory.countDocuments(filter)
    ]);

    const categories = (list || []).map((c) => ({
        _id: c._id,
        id: c._id,
        name: c.name,
        image: c.image || '',
        type: c.type || '',
        zoneId: c.zoneId || null,
        sortOrder: c.sortOrder || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
    }));

    return { categories, total, page, limit };
}

export async function createRestaurantCategory(restaurantId, body = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const restaurantObjectId = toObjectId(restaurantId);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Category name is required');
    if (name.length > 200) throw new ValidationError('Category name is too long');

    // Prevent duplicates against shared admin categories and this restaurant's own categories.
    const exact = `^${escapeRegex(name)}$`;
    const existsScoped = await FoodCategory.findOne({
        name: { $regex: exact, $options: 'i' },
        $or: [
            { restaurantId: restaurantObjectId },
            { $and: [{ $or: GLOBAL_CATEGORY_FILTER }, { isApproved: { $ne: false } }] }
        ]
    }).select('_id').lean();
    if (existsScoped?._id) {
        throw new ValidationError('Category already exists');
    }

    const doc = new FoodCategory({
        name,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        type: typeof body.type === 'string' ? body.type.trim() : '',
        isActive: body.isActive !== false,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        restaurantId: restaurantObjectId,
        isApproved: false
    });
    await doc.save();
    return doc.toObject();
}

export async function updateRestaurantCategory(restaurantId, id, body = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }
    const restaurantObjectId = toObjectId(restaurantId);
    const doc = await FoodCategory.findOne({ _id: id, restaurantId: restaurantObjectId });
    if (!doc) return null;

    if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw new ValidationError('Category name is required');
        if (name.length > 200) throw new ValidationError('Category name is too long');

        const exact = `^${escapeRegex(name)}$`;
        const duplicate = await FoodCategory.findOne({
            _id: { $ne: doc._id },
            name: { $regex: exact, $options: 'i' },
            $or: [
                { restaurantId: restaurantObjectId },
                { $and: [{ $or: GLOBAL_CATEGORY_FILTER }, { isApproved: { $ne: false } }] }
            ]
        }).select('_id').lean();
        if (duplicate?._id) {
            throw new ValidationError('Category already exists');
        }
        doc.name = name;
    }
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.type !== undefined) doc.type = String(body.type || '').trim();
    if (body.isActive !== undefined) doc.isActive = body.isActive !== false;
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    await doc.save();
    return doc.toObject();
}

export async function deleteRestaurantCategory(restaurantId, id) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }
    const restaurantObjectId = toObjectId(restaurantId);

    const category = await FoodCategory.findOne({ _id: id, restaurantId: restaurantObjectId }).select('_id').lean();
    if (!category?._id) return null;

    const inUse = await FoodItem.countDocuments({ categoryId: id, restaurantId: restaurantObjectId });
    if (inUse > 0) {
        throw new ValidationError('Cannot delete category while it has items');
    }

    const deleted = await FoodCategory.findOneAndDelete({ _id: id, restaurantId: restaurantObjectId }).lean();
    return deleted ? { id } : null;
}

