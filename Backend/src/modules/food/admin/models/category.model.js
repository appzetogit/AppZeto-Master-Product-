import mongoose from 'mongoose';

const foodCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, index: true },
        image: { type: String, trim: true, default: '' },
        type: { type: String, trim: true, default: '' },
        /**
         * Restaurant-created categories request approval.
         * - When restaurantId is set and isApproved=false: pending request (visible only to that restaurant + admin).
         * - When isApproved=true: category is globally usable by all restaurants.
         *
         * Note: existing categories (created by admin historically) should be treated as approved.
         */
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', index: true, default: undefined },
        isApproved: { type: Boolean, default: true, index: true },
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

foodCategorySchema.index({ isApproved: 1, createdAt: -1 });
foodCategorySchema.index({ restaurantId: 1, isApproved: 1, createdAt: -1 });

export const FoodCategory = mongoose.model('FoodCategory', foodCategorySchema);

