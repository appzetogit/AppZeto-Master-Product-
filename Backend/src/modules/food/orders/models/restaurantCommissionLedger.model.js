import mongoose from 'mongoose';

/**
 * Append-only ledger for restaurant commission posted per order.
 * We store one row per orderId so finance can reliably sum payouts.
 *
 * Semantics (confirmed by user):
 * - Base for % = order.pricing.subtotal
 * - Restaurant commission = % of base (or fixed amount from admin)
 * - Restaurant payout shown in hub-finance = commissionAmount
 */
const restaurantCommissionLedgerSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true,
        },
        orderReadableId: { type: String, required: true, trim: true, index: true },

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true,
        },

        // Snapshot amounts at posting time
        baseAmount: { type: Number, default: 0, min: 0 }, // order.pricing.subtotal
        gstAmount: { type: Number, default: 0, min: 0 }, // order.pricing.tax
        platformFee: { type: Number, default: 0, min: 0 }, // order.pricing.platformFee
        deliveryFee: { type: Number, default: 0, min: 0 }, // order.pricing.deliveryFee
        deliveryEarning: { type: Number, default: 0, min: 0 }, // order.riderEarning

        // Commission snapshot (admin configured)
        commissionType: { type: String, enum: ['percentage', 'amount'], required: true },
        commissionValue: { type: Number, default: 0, min: 0 },
        commissionAmount: { type: Number, default: 0, min: 0 }, // computed

        // finance payout shown to restaurant
        payout: { type: Number, default: 0, min: 0 }, // == commissionAmount (for consistency)

        // order totals (for UI invoices)
        orderTotal: { type: Number, default: 0, min: 0 }, // order.pricing.total

        // Posting audit
        postedAt: { type: Date, default: Date.now, index: true },
        status: { type: String, enum: ['posted'], default: 'posted', index: true },
    },
    { collection: 'food_restaurant_commission_ledgers', timestamps: true }
);

restaurantCommissionLedgerSchema.index({ orderId: 1 }, { unique: true });

export const FoodRestaurantCommissionLedger = mongoose.model(
    'FoodRestaurantCommissionLedger',
    restaurantCommissionLedgerSchema
);

