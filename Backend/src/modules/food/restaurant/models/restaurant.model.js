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
        // Normalized fields for fast lookup + uniqueness guarantees.
        // These are derived from restaurantName/ownerPhone at write time.
        restaurantNameNormalized: {
            type: String,
            trim: true
        },
        ownerPhoneDigits: {
            type: String,
            trim: true
        },
        ownerPhoneLast10: {
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
        state: {
            type: String
        },
        pincode: {
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
        },
        estimatedDeliveryTime: { type: String },
        featuredDish: { type: String },
        featuredPrice: { type: Number },
        offer: { type: String },
        diningSettings: {
            isEnabled: { type: Boolean, default: false },
            maxGuests: { type: Number, default: 6 },
            diningType: { type: String, default: 'family-dining' }
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        approvedAt: {
            type: Date
        },
        rejectedAt: {
            type: Date
        },
        rejectionReason: {
            type: String,
            trim: true
        }
    },
    {
        collection: 'food_restaurants',
        timestamps: true
    }
);

restaurantSchema.pre('validate', function normalizeDerivedFields(next) {
    const name = typeof this.restaurantName === 'string' ? this.restaurantName : '';
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
    this.restaurantNameNormalized = normalizedName || undefined;

    const phoneRaw = typeof this.ownerPhone === 'string' || typeof this.ownerPhone === 'number' ? String(this.ownerPhone) : '';
    const digits = phoneRaw.replace(/\D/g, '').slice(-15); // guard against country prefixes
    this.ownerPhoneDigits = digits || undefined;
    this.ownerPhoneLast10 = digits ? digits.slice(-10) : undefined;
    next();
});

restaurantSchema.index({ ownerPhone: 1 });
restaurantSchema.index({ restaurantName: 1 });
restaurantSchema.index({ restaurantNameNormalized: 1 });
restaurantSchema.index({ city: 1 });
restaurantSchema.index({ restaurantName: 1, ownerPhone: 1 });
// Enforce uniqueness at the database level to avoid race conditions in registration.
// Uses partial filter to avoid blocking older documents that may not yet have normalized fields.
restaurantSchema.index(
    { restaurantNameNormalized: 1, ownerPhoneLast10: 1 },
    {
        unique: true,
        partialFilterExpression: {
            restaurantNameNormalized: { $type: 'string' },
            ownerPhoneLast10: { $type: 'string' }
        }
    }
);
restaurantSchema.index({ status: 1, createdAt: -1 });

export const FoodRestaurant = mongoose.model('FoodRestaurant', restaurantSchema);

