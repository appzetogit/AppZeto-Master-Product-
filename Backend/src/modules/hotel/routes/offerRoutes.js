import express from 'express';
import { getActiveOffers, createOffer, validateOffer, getAllOffers, updateOffer, deleteOffer } from '../controllers/offerController.js';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';

const router = express.Router();

router.get('/', optionalProtect, getActiveOffers);
router.post('/validate', protect, validateOffer);

// Admin Routes
router.get('/all', protect, authorizedRoles('admin', 'superadmin'), getAllOffers);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), createOffer);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), upload.single('image'), updateOffer);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteOffer);

export default router;
