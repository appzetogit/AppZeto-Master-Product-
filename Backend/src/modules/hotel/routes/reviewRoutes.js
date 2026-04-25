import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getPropertyReviews, createReview, getPartnerReviewStats, getPartnerReviews, replyToReview, toggleHelpful } from '../controllers/reviewController.js';

const router = express.Router();

router.get('/partner/stats', protect, getPartnerReviewStats);
router.get('/partner/all', protect, getPartnerReviews);
router.post('/:reviewId/reply', protect, replyToReview);
router.post('/:reviewId/helpful', protect, toggleHelpful);

router.get('/:propertyId', getPropertyReviews);
router.post('/', protect, createReview);

export default router;
