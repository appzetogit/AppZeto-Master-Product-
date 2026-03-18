import mongoose from 'mongoose';

/**
 * Minimal Food Order model.
 * This repo previously had empty stubs for orders; delivery-pocket screens require a real source of truth
 * for trips (delivered orders) + earnings mapping by orderId.
 */

const orderItemSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: '' },
        itemName: { type: String, trim: true, default: '' }, // fallback for legacy payloads
        quantity: { type: Number, default: 1, min: 0 },
        qty: { type: Number, default: undefined } // legacy
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderId: { type: String, trim: true, index: true },
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', index: true },
        restaurantName: { type: String, trim: true, default: '' },
        deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', index: true },

        status: { type: String, trim: true, default: 'Pending', index: true }, // Pending | Completed | Cancelled
        paymentMethod: { type: String, trim: true, default: 'Online' }, // Online | Cash | COD
        totalAmount: { type: Number, default: 0, min: 0 },
        codAmount: { type: Number, default: 0, min: 0 },

        deliveryEarning: { type: Number, default: 0 }, // earning credited for delivery partner

        items: { type: [orderItemSchema], default: [] },
        orderItems: { type: [orderItemSchema], default: [] }, // legacy field

        createdAt: { type: Date, default: Date.now, index: true },
        updatedAt: { type: Date, default: Date.now },
        deliveredAt: { type: Date, index: true },
        completedAt: { type: Date, index: true },
        cancelledAt: { type: Date, index: true }
    },
    { collection: 'food_orders', timestamps: true }
);

orderSchema.index({ deliveryPartnerId: 1, deliveredAt: -1 });
orderSchema.index({ deliveryPartnerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, deliveredAt: -1 });

export const FoodOrder = mongoose.model('FoodOrder', orderSchema);

