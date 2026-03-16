import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            trim: true
        },
        countryCode: {
            type: String,
            default: '+91'
        },
        name: {
            type: String
        },
        email: {
            type: String
        },
        referralCode: {
            type: String
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        role: {
            type: String,
            default: 'USER'
        }
    },
    {
        collection: 'food_users',
        timestamps: true
    }
);

userSchema.index({ phone: 1 }, { unique: true });

export const ZomatoUser = mongoose.model('ZomatoUser', userSchema);

