import mongoose from 'mongoose';

const referralRewardBucketSchema = new mongoose.Schema(
    {
        referrerReward: { type: Number, min: 0, default: 0 },
        refereeReward: { type: Number, min: 0, default: 0 },
        limit: { type: Number, min: 0, default: 0 }
    },
    { _id: false }
);

const referralSettingsSchema = new mongoose.Schema(
    {
        user: {
            type: referralRewardBucketSchema,
            default: () => ({})
        },
        delivery: {
            type: referralRewardBucketSchema,
            default: () => ({})
        },
        isActive: { type: Boolean, default: true, index: true }
    },
    { collection: 'food_referral_settings', timestamps: true, strict: true }
);

referralSettingsSchema.index({ isActive: 1, createdAt: -1 });

export const FoodReferralSettings = mongoose.model('FoodReferralSettings', referralSettingsSchema, 'food_referral_settings');
