import mongoose from 'mongoose';

const foodTransactionSchema = new mongoose.Schema({
    // Identifiers
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', required: true, unique: true, index: true },
    orderReadableId: { type: String, required: true, index: true }, // e.g., FOD-123456
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', required: true, index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', required: true, index: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', index: true },

    // Core Payment Info
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'razorpay', 'razorpay_qr', 'wallet'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'authorized', 'captured', 'failed', 'refunded'], 
        default: 'pending',
        index: true 
    },
    currency: { type: String, default: 'INR' },

    // Financial Breakdown (The Split)
    amounts: {
        totalCustomerPaid: { type: Number, required: true, min: 0 },
        restaurantShare: { type: Number, required: true, min: 0 },
        restaurantCommission: { type: Number, required: true, min: 0 },
        riderShare: { type: Number, required: true, min: 0 },
        platformNetProfit: { type: Number, required: true, min: 0 },
        taxAmount: { type: Number, default: 0, min: 0 }
    },

    // Gateway / Provider Metadata
    gateway: {
        provider: { type: String, default: 'razorpay' },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        qrUrl: String,
        qrExpiresAt: Date
    },

    // Settlement Tracking
    settlement: {
        isRestaurantSettled: { type: Boolean, default: false },
        restaurantSettledAt: Date,
        isRiderSettled: { type: Boolean, default: false },
        riderSettledAt: Date
    },

    // Audit History (Replacing FoodOrderPayment ledger)
    history: [{
        kind: { type: String, required: true }, // 'created', 'authorized', 'captured', 'refunded', 'settled'
        amount: Number,
        at: { type: Date, default: Date.now },
        note: String,
        recordedBy: { 
            role: { type: String }, 
            id: { type: mongoose.Schema.Types.ObjectId }
        }
    }]
}, { 
    collection: 'food_transactions', 
    timestamps: true 
});

// Powerful indexes for Finance & Analytics
foodTransactionSchema.index({ createdAt: -1 });
foodTransactionSchema.index({ 'settlement.isRestaurantSettled': 1, restaurantId: 1 });
foodTransactionSchema.index({ 'status': 1, paymentMethod: 1 });

export const FoodTransaction = mongoose.model('FoodTransaction', foodTransactionSchema);
