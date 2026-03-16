import mongoose from 'mongoose';

const zomatoGourmetRestaurantSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ZomatoRestaurant',
            required: true
        },
        tags: {
            type: [String],
            default: []
        },
        priority: {
            type: Number,
            default: 0,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        collection: 'food_gourmet_restaurants',
        timestamps: true
    }
);

zomatoGourmetRestaurantSchema.index({ restaurantId: 1 });
zomatoGourmetRestaurantSchema.index({ isActive: 1, priority: 1 });

export const ZomatoGourmetRestaurant = mongoose.model('ZomatoGourmetRestaurant', zomatoGourmetRestaurantSchema);

