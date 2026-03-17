import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodCategory } from '../../admin/models/category.model.js';

const toStr = (v) => (v != null ? String(v).trim() : '');

const normalizeFoodType = (v) => {
    const t = String(v || '').trim();
    if (!t) return 'Non-Veg';
    if (t === 'Veg') return 'Veg';
    if (t === 'Non-Veg') return 'Non-Veg';
    // UI has "Egg" but DB model only supports Veg/Non-Veg.
    if (t === 'Egg') return 'Non-Veg';
    return 'Non-Veg';
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

    const categoryId = toStr(body.categoryId);
    const categoryNameInput = toStr(body.categoryName);

    let categoryName = categoryNameInput;
    let categoryObjectId = undefined;

    if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            throw new ValidationError('Invalid category id');
        }
        categoryObjectId = new mongoose.Types.ObjectId(categoryId);
        // One small lookup to store a stable name; indexed by _id.
        const cat = await FoodCategory.findById(categoryObjectId).select('name').lean();
        if (!cat) throw new ValidationError('Category not found');
        categoryName = cat.name;
    }

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
        const categoryId = toStr(body.categoryId);
        const categoryNameInput = toStr(body.categoryName);
        let categoryName = categoryNameInput;
        let categoryObjectId = undefined;
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                throw new ValidationError('Invalid category id');
            }
            categoryObjectId = new mongoose.Types.ObjectId(categoryId);
            const cat = await FoodCategory.findById(categoryObjectId).select('name').lean();
            if (!cat) throw new ValidationError('Category not found');
            categoryName = cat.name;
        }
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

