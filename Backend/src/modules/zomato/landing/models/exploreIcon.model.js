import mongoose from 'mongoose';

const zomatoExploreIconSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true
        },
        iconUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        },
        linkType: {
            type: String,
            enum: ['offers', 'gourmet', 'top-10', 'collections', 'custom'],
            default: 'custom'
        },
        targetPath: {
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
        collection: 'zomato_explore_icons',
        timestamps: true
    }
);

zomatoExploreIconSchema.index({ isActive: 1, sortOrder: 1 });

export const ZomatoExploreIcon = mongoose.model('ZomatoExploreIcon', zomatoExploreIconSchema);
