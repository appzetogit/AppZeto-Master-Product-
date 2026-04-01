import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodCategory } from '../../admin/models/category.model.js';

const toStr = (v) => (v != null ? String(v).trim() : '');
const GLOBAL_CATEGORY_FILTER = [{ restaurantId: { $exists: false } }, { restaurantId: null }];

const normalizeFoodType = (v) => {
    const t = String(v || '').trim();
    if (!t) return 'Non-Veg';
    if (t === 'Veg') return 'Veg';
    if (t === 'Non-Veg') return 'Non-Veg';
    // UI has "Egg" but DB model only supports Veg/Non-Veg.
    if (t === 'Egg') return 'Non-Veg';
    return 'Non-Veg';
};

const getAccessibleCategoryFilter = (restaurantId) => {
    const restaurantObjectId = new mongoose.Types.ObjectId(String(restaurantId));
    return {
        $or: [
            { restaurantId: restaurantObjectId },
            {
                $and: [
                    { $or: GLOBAL_CATEGORY_FILTER },
                    { isApproved: { $ne: false } }
                ]
            }
        ]
    };
};

const resolveCategoryForRestaurant = async (restaurantId, body = {}) => {
    const categoryIdRaw = toStr(body.categoryId);
    const categoryNameRaw = toStr(body.categoryName);

    if (!categoryIdRaw && !categoryNameRaw) {
        return { categoryObjectId: undefined, categoryName: '' };
    }

    const baseFilter = {
        ...getAccessibleCategoryFilter(restaurantId),
        isActive: { $ne: false }
    };

    let category = null;
    if (categoryIdRaw) {
        if (!mongoose.Types.ObjectId.isValid(categoryIdRaw)) {
            throw new ValidationError('Invalid category id');
        }

        category = await FoodCategory.findOne({
            _id: new mongoose.Types.ObjectId(categoryIdRaw),
            ...baseFilter
        })
            .select('_id name')
            .lean();
    } else {
        const exact = `^${String(categoryNameRaw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
        category = await FoodCategory.findOne({
            ...baseFilter,
            name: { $regex: exact, $options: 'i' }
        })
            .select('_id name')
            .lean();
    }

    if (!category?._id) {
        throw new ValidationError('Category not found for this restaurant');
    }

    return {
        categoryObjectId: category._id,
        categoryName: category.name || ''
    };
};

export async function createRestaurantFood(restaurantId, body = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }

    const name = toStr(body.name);
    if (!name) throw new ValidationError('Item name is required');
    if (name.length > 200) throw new ValidationError('Item name is too long');

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new ValidationError('Price is invalid');

    const description = toStr(body.description);
    const image = toStr(body.image);
    const isAvailable = body.isAvailable !== false;
    const foodType = normalizeFoodType(body.foodType);
    const preparationTime = toStr(body.preparationTime);
    const { categoryObjectId, categoryName } = await resolveCategoryForRestaurant(restaurantId, body);

    const doc = await FoodItem.create({
        restaurantId,
        categoryId: categoryObjectId,
        categoryName: categoryName || '',
        name,
        description,
        price,
        image,
        foodType,
        isAvailable,
        preparationTime,
        // Restaurant-created items should go through approval flow.
        approvalStatus: 'pending',
        requestedAt: new Date()
    });

    try {
        const { notifyAdminsSafely } = await import('../../../../core/notifications/firebase.service.js');
        void notifyAdminsSafely({
            title: 'New Product Approval Request 🍔',
            body: `Restaurant has submitted a new item "${doc.name}" for approval.`,
            data: {
                type: 'approval_request',
                subType: 'food',
                id: String(doc._id)
            }
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to notify admins of new food approval request:', e);
    }

    return doc.toObject();
}

export async function updateRestaurantFood(restaurantId, foodId, body = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    if (!foodId || !mongoose.Types.ObjectId.isValid(String(foodId))) {
        throw new ValidationError('Invalid food id');
    }

    const update = {};

    if (body.name !== undefined) {
        const name = toStr(body.name);
        if (!name) throw new ValidationError('Item name is required');
        if (name.length > 200) throw new ValidationError('Item name is too long');
        update.name = name;
    }
    if (body.description !== undefined) update.description = toStr(body.description);
    if (body.image !== undefined) update.image = toStr(body.image);
    if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) throw new ValidationError('Price is invalid');
        update.price = price;
    }
    if (body.isAvailable !== undefined) update.isAvailable = body.isAvailable !== false;
    if (body.foodType !== undefined) update.foodType = normalizeFoodType(body.foodType);
    if (body.preparationTime !== undefined) update.preparationTime = toStr(body.preparationTime);

    if (body.categoryId !== undefined || body.categoryName !== undefined) {
        const { categoryObjectId, categoryName } = await resolveCategoryForRestaurant(restaurantId, body);
        update.categoryId = categoryObjectId;
        update.categoryName = categoryName || '';
    }

    // One write; keep approvalStatus as-is unless explicitly allowed later.
    const updated = await FoodItem.findOneAndUpdate(
        { _id: foodId, restaurantId },
        { $set: update },
        { new: true }
    ).lean();

    return updated;
}
