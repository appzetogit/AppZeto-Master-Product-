import express from 'express';
import { upload } from '../../../middleware/upload.js';
import {
  getCategories,
  getCoupons,
  applyCoupon,
  getHomeData,
  getOffers,
  getProductById,
  getProductReviews,
  submitProductReview,
  getProducts,
} from '../controllers/catalog.controller.js';
import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from '../controllers/cart.controller.js';
import { cancelOrder, getMyOrders, getOrderById, placeOrder } from '../controllers/order.controller.js';
import { addToWishlist, getWishlist, removeFromWishlist, toggleWishlist } from '../controllers/wishlist.controller.js';
import {
  approveAdminSellerRequest,
  getAdminSellerRequests,
  createCategory,
  createProduct,
  getAdminCategories,
  getAdminOrders,
  deleteAdminOrder,
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
  getAdminExperienceSections,
  createAdminExperienceSection,
  updateAdminExperienceSection,
  deleteAdminExperienceSection,
  reorderAdminExperienceSections,
  getAdminHeroConfig,
  setAdminHeroConfig,
  getAdminOfferSections,
  createAdminOfferSection,
  updateAdminOfferSection,
  deleteAdminOfferSection,
  reorderAdminOfferSections,
} from '../controllers/admin.controller.js';
import {
  getSellerCommissionBootstrap,
  getSellerCommissions,
  getSellerCommissionById,
  createSellerCommission,
  updateSellerCommission,
  deleteSellerCommission,
  toggleSellerCommissionStatus,
} from '../controllers/adminCommission.controller.js';

import { authMiddleware } from '../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../core/roles/role.middleware.js';
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
const adminOnly = [authMiddleware, requireRoles('ADMIN')];

router.get('/health', (_req, res) => res.json({ success: true, module: 'quick-commerce', status: 'ok' }));

router.get('/home', getHomeData);
router.get('/experience', getHomeData); // Bridge experience to home data for now
router.get('/experience/hero', getHomeData); // Bridge hero to home data for now
router.get('/offer-sections', getHomeData); // Bridge offer-sections
router.get('/offers', getOffers);
router.get('/coupons', getCoupons);
router.post('/coupons/apply', applyCoupon);
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/reviews', optionalAuth, submitProductReview);
router.get('/products/:productId', getProductById);
router.get('/zones/public', listPublicZones);

router.get('/cart', optionalAuth, getCart);
router.post('/cart/add', optionalAuth, addToCart);
router.put('/cart/update', optionalAuth, updateCartItem);
router.delete('/cart/remove/:productId', optionalAuth, removeCartItem);
router.delete('/cart/clear', optionalAuth, clearCart);

router.post('/orders', optionalAuth, placeOrder);
router.get('/orders', optionalAuth, getMyOrders);
router.get('/orders/:orderId', optionalAuth, getOrderById);
router.post('/orders/:orderId/cancel', optionalAuth, cancelOrder);

router.get('/wishlist', optionalAuth, getWishlist);
router.post('/wishlist/add', optionalAuth, addToWishlist);
router.delete('/wishlist/remove/:productId', optionalAuth, removeFromWishlist);
router.post('/wishlist/toggle', optionalAuth, toggleWishlist);

// Admin endpoints (quick-commerce dashboard)
router.get('/admin/stats', ...adminOnly, getAdminStats);
router.get('/admin/categories', ...adminOnly, getAdminCategories);
router.post('/admin/categories', ...adminOnly, upload.single('image'), createCategory);
router.put('/admin/categories/:categoryId', ...adminOnly, upload.single('image'), updateCategory);
router.delete('/admin/categories/:categoryId', ...adminOnly, removeCategory);
router.get('/admin/products', ...adminOnly, getAdminProducts);
router.post('/admin/products', ...adminOnly, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 8 },
]), createProduct);
router.put('/admin/products/:productId', ...adminOnly, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 8 },
]), updateProduct);
router.delete('/admin/products/:productId', ...adminOnly, removeProduct);
router.get('/admin/orders', ...adminOnly, getAdminOrders);
router.delete('/admin/orders/:orderId', ...adminOnly, deleteAdminOrder);
router.get('/admin/seller-requests', ...adminOnly, getAdminSellerRequests);
router.put('/admin/seller-requests/:sellerId/approve', ...adminOnly, approveAdminSellerRequest);
router.put('/admin/seller-requests/:sellerId/reject', ...adminOnly, rejectAdminSellerRequest);
router.get('/admin/zones', ...adminOnly, getAdminZones);
router.get('/admin/zones/:zoneId', ...adminOnly, getAdminZoneById);
router.post('/admin/zones', ...adminOnly, createAdminZone);
router.patch('/admin/zones/:zoneId', ...adminOnly, updateAdminZone);
router.delete('/admin/zones/:zoneId', ...adminOnly, deleteAdminZone);

// Experience Sections Management
router.get('/admin/experience/sections', ...adminOnly, getAdminExperienceSections);
router.post('/admin/experience/sections', ...adminOnly, createAdminExperienceSection);
router.put('/admin/experience/sections/:id', ...adminOnly, updateAdminExperienceSection);
router.delete('/admin/experience/sections/:id', ...adminOnly, deleteAdminExperienceSection);
router.post('/admin/experience/sections/reorder', ...adminOnly, reorderAdminExperienceSections);

router.get('/admin/experience/hero', ...adminOnly, getAdminHeroConfig);
router.post('/admin/experience/hero', ...adminOnly, setAdminHeroConfig);

// Offer Sections Management
router.get('/admin/offer-sections', ...adminOnly, getAdminOfferSections);
router.post('/admin/offer-sections', ...adminOnly, createAdminOfferSection);
router.put('/admin/offer-sections/:id', ...adminOnly, updateAdminOfferSection);
router.delete('/admin/offer-sections/:id', ...adminOnly, deleteAdminOfferSection);
router.post('/admin/offer-sections/reorder', ...adminOnly, reorderAdminOfferSections);

// Seller Commission Management
router.get('/admin/seller-commissions/bootstrap', ...adminOnly, getSellerCommissionBootstrap);
router.get('/admin/seller-commissions', ...adminOnly, getSellerCommissions);
router.get('/admin/seller-commissions/:id', ...adminOnly, getSellerCommissionById);
router.post('/admin/seller-commissions', ...adminOnly, createSellerCommission);
router.put('/admin/seller-commissions/:id', ...adminOnly, updateSellerCommission);
router.delete('/admin/seller-commissions/:id', ...adminOnly, deleteSellerCommission);
router.patch('/admin/seller-commissions/:id/toggle-status', ...adminOnly, toggleSellerCommissionStatus);

export default router;
