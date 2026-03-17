import express from 'express';
import { AuthError } from '../../../../core/auth/errors.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

const requireAdmin = (req, _res, next) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
        return next(new AuthError('Admin access required'));
    }
    return next();
};

router.use(requireAdmin);

// ----- Restaurants -----
router.get('/restaurants', adminController.getRestaurants);
router.get('/restaurants/pending', adminController.getPendingRestaurants);
router.get('/restaurants/:id', adminController.getRestaurantById);
router.get('/restaurants/:id/menu', adminController.getRestaurantMenuById);
router.post('/restaurants', adminController.createRestaurant);
router.patch('/restaurants/:id/menu', adminController.updateRestaurantMenuById);
router.patch('/restaurants/:id/approve', adminController.approveRestaurant);
router.patch('/restaurants/:id/reject', adminController.rejectRestaurant);

// ----- Categories -----
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.patch('/categories/:id/toggle', adminController.toggleCategoryStatus);

// ----- Foods -----
router.get('/foods', adminController.getFoods);
router.post('/foods', adminController.createFood);
router.patch('/foods/:id', adminController.updateFood);
router.delete('/foods/:id', adminController.deleteFood);

// ----- Offers & Coupons -----
router.get('/offers', adminController.getAllOffers);
router.post('/offers', adminController.createAdminOffer);
router.patch('/offers/:id/cart-visibility', adminController.updateAdminOfferCartVisibility);

// ----- Delivery -----
router.get('/delivery/join-requests', adminController.getDeliveryJoinRequests);
router.get('/delivery/wallets', adminController.getDeliveryWallets);
router.get('/delivery/bonus-transactions', adminController.getDeliveryPartnerBonusTransactions);
router.post('/delivery/bonus', adminController.addDeliveryPartnerBonus);
router.get('/delivery/earning-addons', adminController.getEarningAddons);
router.post('/delivery/earning-addons', adminController.createEarningAddon);
router.patch('/delivery/earning-addons/:id', adminController.updateEarningAddon);
router.delete('/delivery/earning-addons/:id', adminController.deleteEarningAddon);
router.patch('/delivery/earning-addons/:id/status', adminController.toggleEarningAddonStatus);
router.get('/delivery/earning-addon-history', adminController.getEarningAddonHistory);
router.post('/delivery/earning-addon-history/:id/credit', adminController.creditEarningToWallet);
router.post('/delivery/earning-addon-history/:id/cancel', adminController.cancelEarningAddonHistory);
router.post('/delivery/earning-addon-completions/check', adminController.checkEarningAddonCompletions);
router.get('/delivery/support-tickets/stats', adminController.getSupportTicketStats);
router.get('/delivery/support-tickets', adminController.getSupportTickets);
router.patch('/delivery/support-tickets/:id', adminController.updateSupportTicket);
router.get('/delivery/partners', adminController.getDeliveryPartners);
router.get('/delivery/:id', adminController.getDeliveryPartnerById);
router.patch('/delivery/:id/approve', adminController.approveDeliveryPartner);
router.patch('/delivery/:id/reject', adminController.rejectDeliveryPartner);

// ----- Zones -----
router.get('/zones', adminController.getZones);
router.get('/zones/:id', adminController.getZoneById);
router.post('/zones', adminController.createZone);
router.patch('/zones/:id', adminController.updateZone);
router.delete('/zones/:id', adminController.deleteZone);

export default router;
