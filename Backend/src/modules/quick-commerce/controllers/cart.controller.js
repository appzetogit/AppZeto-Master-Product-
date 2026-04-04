import mongoose from 'mongoose';
import { QuickCart } from '../models/cart.model.js';
import { QuickProduct } from '../models/product.model.js';
import { ensureQuickCommerceSeedData } from '../services/seed.service.js';

const approvedProductFilter = {
  isActive: true,
  $or: [
    { approvalStatus: { $exists: false } },
    { approvalStatus: 'approved' },
  ],
};

const resolveId = (req) => {
  if (req.user?.userId) return { userId: req.user.userId };
  const sessionId = String(req.headers['x-quick-session'] || req.query.sessionId || req.body.sessionId || '').trim();
  return sessionId ? { sessionId } : null;
};

const mapCart = async (idQuery) => {
  const cart = await QuickCart.findOne(idQuery).lean();
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return { items: [], subtotal: 0, total: 0 };
  }

  const productIds = cart.items
    .map((item) => item.productId)
    .filter((id) => mongoose.isValidObjectId(id));

  const products = await QuickProduct.find({ _id: { $in: productIds }, ...approvedProductFilter }).lean();
  const productMap = products.reduce((acc, product) => {
    acc[String(product._id)] = product;
    return acc;
  }, {});

  const items = cart.items
    .map((item) => {
      const product = productMap[String(item.productId)];
      if (!product) return null;
      return {
        id: String(product._id),
        productId: String(product._id),
        name: product.name,
        image: product.image,
        price: product.price,
        mrp: product.mrp,
        unit: product.unit,
        quantity: item.quantity,
        lineTotal: item.quantity * product.price,
      };
    })
    .filter(Boolean);

  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const deliveryFee = items.length > 0 ? 25 : 0;

  return {
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
};

export const getCart = async (req, res) => {
  await ensureQuickCommerceSeedData();
  const idQuery = resolveId(req);

  if (!idQuery) {
    return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
  }

  const cart = await mapCart(idQuery);
  return res.json({ success: true, result: cart });
};

export const addToCart = async (req, res) => {
  await ensureQuickCommerceSeedData();

  const idQuery = resolveId(req);
  const { productId } = req.body;
  const quantity = Number(req.body.quantity || 1);

  if (!idQuery || !productId) {
    return res.status(400).json({ success: false, message: 'sessionId/userId and productId are required' });
  }

  const product = await QuickProduct.findOne({ _id: productId, ...approvedProductFilter }).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const cart = await QuickCart.findOneAndUpdate(
    idQuery,
    { $setOnInsert: { ...idQuery, items: [] } },
    { upsert: true, new: true }
  );

  const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
  if (itemIndex >= 0) {
    cart.items[itemIndex].quantity = Math.max(1, cart.items[itemIndex].quantity + Math.max(1, quantity));
  } else {
    cart.items.push({ productId, quantity: Math.max(1, quantity) });
  }

  await cart.save();

  const result = await mapCart(idQuery);
  return res.json({ success: true, result });
};

export const updateCartItem = async (req, res) => {
  await ensureQuickCommerceSeedData();

  const idQuery = resolveId(req);
  const { productId, quantity } = req.body;

  if (!idQuery || !productId) {
    return res.status(400).json({ success: false, message: 'sessionId/userId and productId are required' });
  }

  const qty = Number(quantity);
  const cart = await QuickCart.findOne(idQuery);

  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  const itemIndex = cart.items.findIndex((item) => String(item.productId) === String(productId));
  if (itemIndex < 0) {
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = Math.floor(qty);
  }

  await cart.save();
  const result = await mapCart(idQuery);
  return res.json({ success: true, result });
};

export const removeCartItem = async (req, res) => {
  await ensureQuickCommerceSeedData();

  const idQuery = resolveId(req);
  const { productId } = req.params;

  if (!idQuery || !productId) {
    return res.status(400).json({ success: false, message: 'sessionId/userId and productId are required' });
  }

  const cart = await QuickCart.findOne(idQuery);
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
  await cart.save();

  const result = await mapCart(idQuery);
  return res.json({ success: true, result });
};

export const clearCart = async (req, res) => {
  await ensureQuickCommerceSeedData();

  const idQuery = resolveId(req);
  if (!idQuery) {
    return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
  }

  await QuickCart.findOneAndUpdate(idQuery, { $set: { items: [] } }, { upsert: true, new: true });
  return res.json({ success: true, result: { items: [], subtotal: 0, deliveryFee: 0, total: 0 } });
};

