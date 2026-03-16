import mongoose from 'mongoose';

const zomatoDiningBannerSchema = new mongoose.Schema(
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
        diningType: {
            type: String
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
        collection: 'food_dining_banners',
        timestamps: true
    }
);

zomatoDiningBannerSchema.index({ isActive: 1, sortOrder: 1 });

export const ZomatoDiningBanner = mongoose.model('ZomatoDiningBanner', zomatoDiningBannerSchema);

