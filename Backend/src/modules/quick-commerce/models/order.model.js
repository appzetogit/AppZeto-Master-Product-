import mongoose from 'mongoose';

const quickOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', index: true },
  sessionId: { type: String, index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'quick_product', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  }],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 25 },
  total: { type: Number, required: true },
  status: { type: String, default: 'placed' },
}, { timestamps: true });

export const QuickOrder = mongoose.model('quick_order', quickOrderSchema, 'quick_orders');
