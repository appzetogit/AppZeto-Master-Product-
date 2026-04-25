import { sendOtp, verifyOtp, verifyPartnerOtp, adminLogin, getMe, updateProfile, updateAdminProfile, updateAdminPassword, registerPartner, uploadDocs, deleteDoc, uploadDocsBase64, checkExists } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';
import express from "express";

const router = express.Router();

router.post('/validate-exists', checkExists);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/partner/register', registerPartner);
router.post('/partner/verify-otp', verifyPartnerOtp);

// Upload routes for partner registration
router.post('/partner/upload-docs', uploadDocuments.array('images', 20), uploadDocs);
router.post('/partner/upload-docs-base64', uploadDocsBase64); // Flutter camera upload
router.post('/partner/delete-doc', deleteDoc);

router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/admin/update-profile', protect, updateAdminProfile);
router.put('/admin/update-password', protect, updateAdminPassword);

export default router;
