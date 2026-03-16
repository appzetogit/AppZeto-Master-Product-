import mongoose from 'mongoose';

const zomatoHeroBannerSchema = new mongoose.Schema(
    {
        imageUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        },
        title: {
            type: String
        },
        ctaText: {
            type: String
        },
        ctaLink: {
            type: String
        },
        linkedRestaurantIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'ZomatoRestaurant',
            default: []
        },
        sortOrder: {
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
        collection: 'zomato_hero_banners',
        timestamps: true
    }
);

zomatoHeroBannerSchema.index({ isActive: 1, sortOrder: 1 });

export const ZomatoHeroBanner = mongoose.model('ZomatoHeroBanner', zomatoHeroBannerSchema);
