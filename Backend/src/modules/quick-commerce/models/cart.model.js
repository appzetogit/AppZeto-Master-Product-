import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'quick_product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
}, { _id: false });

const quickCartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', index: true },
  sessionId: { type: String, unique: true, index: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true });

export const QuickCart = mongoose.model('quick_cart', quickCartSchema, 'quick_carts');
