import express from 'express';
import { createFaq, getFaqs, getAllFaqsAdmin, updateFaq, deleteFaq } from '../controllers/faqController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route to fetch FAQs (e.g. /api/v1/faqs?audience=user)
router.get('/', getFaqs);

// Admin Routes
router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

router.get('/admin', getAllFaqsAdmin);
router.post('/', createFaq);
router.put('/:id', updateFaq);
router.delete('/:id', deleteFaq);

export default router;
