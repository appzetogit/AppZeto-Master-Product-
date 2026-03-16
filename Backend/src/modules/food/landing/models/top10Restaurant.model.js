import mongoose from 'mongoose';

const foodTop10RestaurantSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true
        },
        rank: {
            type: Number,
            required: true,
            min: 1,
            max: 10
        },
        featuredFrom: {
            type: Date
        },
        featuredTo: {
            type: Date
        },
        notes: {
            type: String
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        collection: 'food_top10_restaurants',
        timestamps: true
    }
);

foodTop10RestaurantSchema.index({ rank: 1 }, { unique: true });
foodTop10RestaurantSchema.index({ restaurantId: 1 });

export const FoodTop10Restaurant = mongoose.model('FoodTop10Restaurant', foodTop10RestaurantSchema);

