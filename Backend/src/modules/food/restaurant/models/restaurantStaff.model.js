import mongoose from 'mongoose';

const restaurantStaffSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        role: {
            type: String,
            enum: ['staff', 'manager'],
            required: true,
            index: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 254
        },
        phone: {
            type: String,
            trim: true
        },
        phoneDigits: {
            type: String,
            trim: true
        },
        phoneLast10: {
            type: String,
            trim: true
        },
        profilePhoto: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['active', 'removed'],
            default: 'active',
            index: true
        },
        removedAt: {
            type: Date
        }
    },
    {
        collection: 'food_restaurant_staff',
        timestamps: true
    }
);

restaurantStaffSchema.pre('validate', function normalize(next) {
    if (typeof this.email === 'string') {
        this.email = this.email.trim().toLowerCase();
    }
    const phoneRaw = typeof this.phone === 'string' || typeof this.phone === 'number' ? String(this.phone) : '';
    const digits = phoneRaw.replace(/\D/g, '').slice(-15);
    this.phoneDigits = digits || undefined;
    this.phoneLast10 = digits ? digits.slice(-10) : undefined;
    next();
});

// Efficient listing per restaurant + role
restaurantStaffSchema.index({ restaurantId: 1, role: 1, status: 1, createdAt: -1 });

// Prevent duplicates within the same restaurant (partial to allow missing fields)
restaurantStaffSchema.index(
    { restaurantId: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: { email: { $type: 'string', $ne: '' }, status: 'active' }
    }
);
restaurantStaffSchema.index(
    { restaurantId: 1, phoneLast10: 1 },
    {
        unique: true,
        partialFilterExpression: { phoneLast10: { $type: 'string' }, status: 'active' }
    }
);

export const FoodRestaurantStaff = mongoose.model('FoodRestaurantStaff', restaurantStaffSchema);

