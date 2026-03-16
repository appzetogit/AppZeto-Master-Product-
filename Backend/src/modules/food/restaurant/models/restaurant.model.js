import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
    {
        restaurantName: {
            type: String,
            required: true,
            trim: true
        },
        ownerName: {
            type: String,
            required: true,
            trim: true
        },
        ownerEmail: {
            type: String,
            trim: true
        },
        ownerPhone: {
            type: String,
            trim: true
        },
        primaryContactNumber: {
            type: String,
            trim: true
        },
        addressLine1: {
            type: String
        },
        addressLine2: {
            type: String
        },
        area: {
            type: String
        },
        city: {
            type: String
        },
        landmark: {
            type: String
        },
        cuisines: {
            type: [String],
            default: []
        },
        openingTime: {
            type: String
        },
        closingTime: {
            type: String
        },
        openDays: {
            type: [String],
            default: []
        },
        panNumber: {
            type: String
        },
        nameOnPan: {
            type: String
        },
        gstRegistered: {
            type: Boolean,
            default: false
        },
        gstNumber: {
            type: String
        },
        gstLegalName: {
            type: String
        },
        gstAddress: {
            type: String
        },
        fssaiNumber: {
            type: String
        },
        fssaiExpiry: {
            type: Date
        },
        accountNumber: {
            type: String
        },
        ifscCode: {
            type: String
        },
        accountHolderName: {
            type: String
        },
        accountType: {
            type: String
        },
        menuImages: {
            type: [String],
            default: []
        },
        profileImage: {
            type: String
        },
        panImage: {
            type: String
        },
        gstImage: {
            type: String
        },
        fssaiImage: {
            type: String
        }
    },
    {
        collection: 'food_restaurants',
        timestamps: true
    }
);

restaurantSchema.index({ ownerPhone: 1 });
restaurantSchema.index({ restaurantName: 1 });
restaurantSchema.index({ city: 1 });
restaurantSchema.index({ restaurantName: 1, ownerPhone: 1 });

export const ZomatoRestaurant = mongoose.model('ZomatoRestaurant', restaurantSchema);

