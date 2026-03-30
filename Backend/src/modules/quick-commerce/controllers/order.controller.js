import { QuickOrder } from '../models/order.model.js';
import { QuickCart } from '../models/cart.model.js';
import { QuickProduct } from '../models/product.model.js';

const resolveId = (req) => {
  if (req.user?.userId) return { userId: req.user.userId };
  const sessionId = String(req.headers['x-quick-session'] || req.body.sessionId || req.query.sessionId || '').trim();
  return sessionId ? { sessionId } : null;
};

export const placeOrder = async (req, res) => {
  const idQuery = resolveId(req);

  if (!idQuery) {
    return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
  }

  const cart = await QuickCart.findOne(idQuery).lean();
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await QuickProduct.find({ _id: { $in: productIds }, isActive: true }).lean();
  const productMap = products.reduce((acc, product) => {
    acc[String(product._id)] = product;
    return acc;
  }, {});

  const items = cart.items
    .map((item) => {
      const product = productMap[String(item.productId)];
      if (!product) return null;
      return {
        productId: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
      };
    })
    .filter(Boolean);

  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid items found in cart' });
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 25;
  const total = subtotal + deliveryFee;
  const orderNumber = `QC${Date.now().toString().slice(-8)}`;

  const order = await QuickOrder.create({
    ...idQuery,
    orderNumber,
    items,
    subtotal,
    deliveryFee,
    total,
    status: 'placed',
  });

  await QuickCart.findOneAndUpdate(idQuery, { $set: { items: [] } }, { upsert: true });

  return res.status(201).json({
    success: true,
    result: {
      id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    },
  });
};

export const getMyOrders = async (req, res) => {
  const idQuery = resolveId(req);

  if (!idQuery) {
    return res.status(400).json({ success: false, message: 'sessionId or userId is required' });
  }

  const orders = await QuickOrder.find(idQuery).sort({ createdAt: -1 }).lean();

  return res.json({
    success: true,
    result: orders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    })),
  });
};

