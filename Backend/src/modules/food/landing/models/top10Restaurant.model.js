import mongoose from 'mongoose';

const zomatoTop10RestaurantSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ZomatoRestaurant',
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

zomatoTop10RestaurantSchema.index({ rank: 1 }, { unique: true });
zomatoTop10RestaurantSchema.index({ restaurantId: 1 });

export const ZomatoTop10Restaurant = mongoose.model('ZomatoTop10Restaurant', zomatoTop10RestaurantSchema);

