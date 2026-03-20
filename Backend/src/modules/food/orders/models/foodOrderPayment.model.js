import mongoose from 'mongoose';

/**
 * Append-only payment ledger for food orders.
 * Order document keeps a denormalized `payment` snapshot for fast reads; this collection stores each event / audit row.
 */
const razorpaySnapshotSchema = new mongoose.Schema(
    {
        orderId: { type: String, default: '' },
        paymentId: { type: String, default: '' },
        signature: { type: String, default: '' }
    },
    { _id: false }
);

const qrSnapshotSchema = new mongoose.Schema(
    {
        qrId: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        paymentLinkId: { type: String, default: '' },
        shortUrl: { type: String, default: '' },
        status: { type: String, default: '' },
        expiresAt: { type: Date, default: null }
    },
    { _id: false }
);

/** Line items + fees at the time of the payment event (order snapshot). */
const pricingSnapshotSchema = new mongoose.Schema(
    {
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        packagingFee: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, default: 'INR', trim: true },
        couponCode: { type: String, default: '', trim: true }
    },
    { _id: false }
);

const foodOrderPaymentSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            index: true
        },
        /** Human-readable FOD-xxx (denormalized for support / exports) */
        orderReadableId: { type: String, trim: true, index: true },

        kind: {
            type: String,
            required: true,
            enum: [
                'order_placed',
                'razorpay_order_created',
                'online_payment_verified',
                'cod_collect_qr_created',
                'cod_marked_paid_on_delivery',
                'payment_snapshot_sync',
                'refund_requested',
                'refund_completed'
            ],
            index: true
        },

        method: {
            type: String,
            enum: ['cash', 'razorpay', 'razorpay_qr', 'wallet'],
            required: true
        },
        status: {
            type: String,
            enum: [
                'cod_pending',
                'created',
                'authorized',
                'paid',
                'failed',
                'refunded',
                'pending_qr'
            ],
            required: true
        },

        amount: { type: Number, min: 0 },
        currency: { type: String, default: 'INR', trim: true },

        amountDue: { type: Number, min: 0 },

        pricingSnapshot: { type: pricingSnapshotSchema, default: undefined },

        razorpay: { type: razorpaySnapshotSchema, default: undefined },
        qr: { type: qrSnapshotSchema, default: undefined },

        /** Small structured context (never store full PAN / card) */
        metadata: { type: mongoose.Schema.Types.Mixed, default: undefined },

        recordedByRole: {
            type: String,
            enum: ['USER', 'SYSTEM', 'DELIVERY_PARTNER', 'WEBHOOK', 'ADMIN'],
            default: 'SYSTEM'
        },
        recordedById: { type: mongoose.Schema.Types.ObjectId, default: undefined }
    },
    {
        collection: 'food_order_payments',
        timestamps: true
    }
);

foodOrderPaymentSchema.index({ orderId: 1, createdAt: -1 });
foodOrderPaymentSchema.index({ userId: 1, createdAt: -1 });

export const FoodOrderPayment = mongoose.model('FoodOrderPayment', foodOrderPaymentSchema);
