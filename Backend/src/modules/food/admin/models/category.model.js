import mongoose from 'mongoose';

const foodCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, index: true },
        image: { type: String, trim: true, default: '' },
        type: { type: String, trim: true, default: '' },
        /**
         * Optional zone binding.
         * - When set: category is visible only for that zone.
         * - When null/undefined: category is global (visible for all zones).
         */
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', index: true, default: undefined },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0, index: true }
    },
    {
        collection: 'food_categories',
        timestamps: true
    }
);

export const FoodCategory = mongoose.model('FoodCategory', foodCategorySchema);

