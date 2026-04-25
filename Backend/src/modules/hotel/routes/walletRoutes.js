import express from 'express';
import {
  getWallet,
  getTransactions,
  requestWithdrawal,
  getWithdrawals,
  updateBankDetails,
  getWalletStats,
  createAddMoneyOrder,
  verifyAddMoneyPayment,
  deleteBankDetails
} from '../controllers/walletController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get wallet balance and details
router.get('/', getWallet);

// Get wallet statistics
router.get('/stats', getWalletStats);

// Add Money (Razorpay)
router.post('/add-money', createAddMoneyOrder);
router.post('/verify-add-money', verifyAddMoneyPayment);

// Get transaction history
router.get('/transactions', getTransactions);

// Request withdrawal
router.post('/withdraw', requestWithdrawal);

// Get withdrawal history
router.get('/withdrawals', getWithdrawals);

// Update/Delete bank details
router.put('/bank-details', updateBankDetails);
router.delete('/bank-details', deleteBankDetails);

export default router;
