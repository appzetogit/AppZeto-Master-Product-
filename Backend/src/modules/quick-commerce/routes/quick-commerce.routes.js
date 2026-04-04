import express from 'express';
import { upload } from '../../../middleware/upload.js';
import {
  getCategories,
  getCoupons,
  getHomeData,
  getOffers,
  getProductById,
  getProductReviews,
  getProducts,
} from '../controllers/catalog.controller.js';
import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from '../controllers/cart.controller.js';
import { getMyOrders, placeOrder } from '../controllers/order.controller.js';
import { addToWishlist, getWishlist, removeFromWishlist, toggleWishlist } from '../controllers/wishlist.controller.js';
import {
  approveAdminSellerRequest,
  getAdminSellerRequests,
  createCategory,
  createProduct,
  getAdminCategories,
  getAdminOrders,
  getAdminProducts,
  getAdminStats,
  rejectAdminSellerRequest,
  removeCategory,
  removeProduct,
  updateCategory,
  updateProduct,
  getAdminZones,
  getAdminZoneById,
  createAdminZone,
  updateAdminZone,
  deleteAdminZone,
  listPublicZones,
} from '../controllers/admin.controller.js';

import { verifyAccessToken } from '../../../core/auth/token.util.js';

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      req.user = { userId: decoded.userId, role: decoded.role };
    } catch (e) {
      // ignore guest
    }
  }
  next();
};

const router = express.Router();

router.get('/health', (_req, res) => res.json({ success: true, module: 'quick-commerce', status: 'ok' }));

router.get('/home', getHomeData);
router.get('/experience', getHomeData); // Bridge experience to home data for now
router.get('/experience/hero', getHomeData); // Bridge hero to home data for now
router.get('/offer-sections', getHomeData); // Bridge offer-sections
router.get('/offers', getOffers);
router.get('/coupons', getCoupons);
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:productId/reviews', getProductReviews);
router.get('/products/:productId', getProductById);
router.get('/zones/public', listPublicZones);

router.get('/cart', optionalAuth, getCart);
router.post('/cart/add', optionalAuth, addToCart);
router.put('/cart/update', optionalAuth, updateCartItem);
router.delete('/cart/remove/:productId', optionalAuth, removeCartItem);
router.delete('/cart/clear', optionalAuth, clearCart);

router.post('/orders', optionalAuth, placeOrder);
router.get('/orders', optionalAuth, getMyOrders);

router.get('/wishlist', optionalAuth, getWishlist);
router.post('/wishlist/add', optionalAuth, addToWishlist);
router.delete('/wishlist/remove/:productId', optionalAuth, removeFromWishlist);
router.post('/wishlist/toggle', optionalAuth, toggleWishlist);

// Admin endpoints (quick-commerce dashboard)
router.get('/admin/stats', getAdminStats);
router.get('/admin/categories', getAdminCategories);
router.post('/admin/categories', upload.single('image'), createCategory);
router.put('/admin/categories/:categoryId', upload.single('image'), updateCategory);
router.delete('/admin/categories/:categoryId', removeCategory);
router.get('/admin/products', getAdminProducts);
router.post('/admin/products', upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 8 },
]), createProduct);
router.put('/admin/products/:productId', upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 8 },
]), updateProduct);
router.delete('/admin/products/:productId', removeProduct);
router.get('/admin/orders', getAdminOrders);
router.get('/admin/seller-requests', getAdminSellerRequests);
router.put('/admin/seller-requests/:sellerId/approve', approveAdminSellerRequest);
router.put('/admin/seller-requests/:sellerId/reject', rejectAdminSellerRequest);
router.get('/admin/zones', getAdminZones);
router.get('/admin/zones/:zoneId', getAdminZoneById);
router.post('/admin/zones', createAdminZone);
router.patch('/admin/zones/:zoneId', updateAdminZone);
router.delete('/admin/zones/:zoneId', deleteAdminZone);

export default router;
