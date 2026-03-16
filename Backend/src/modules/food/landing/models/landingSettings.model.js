import mongoose from 'mongoose';

const zomatoLandingSettingsSchema = new mongoose.Schema(
    {
        exploreMoreHeading: {
            type: String,
            default: 'Explore more'
        },
        recommendedRestaurantIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'ZomatoRestaurant',
            default: []
        },
        showHeroBanners: {
            type: Boolean,
            default: true
        },
        showUnder250: {
            type: Boolean,
            default: true
        },
        showDining: {
            type: Boolean,
            default: true
        },
        showExploreIcons: {
            type: Boolean,
            default: true
        },
        showTop10: {
            type: Boolean,
            default: true
        },
        showGourmet: {
            type: Boolean,
            default: true
        }
    },
    {
        collection: 'food_landing_settings',
        timestamps: true
    }
);

export const ZomatoLandingSettings = mongoose.model('ZomatoLandingSettings', zomatoLandingSettingsSchema);

