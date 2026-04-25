import Wallet from '../models/Wallet.js';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import PaymentConfig from '../config/payment.config.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
import Joi from 'joi';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';

// Initialize Razorpay
let razorpay;
try {
  console.log("Razorpay Keys Debug:", {
    keyId: PaymentConfig.razorpayKeyId ? "Present" : "Missing",
    keySecret: PaymentConfig.razorpayKeySecret ? "Present" : "Missing",
    accNumber: PaymentConfig.razorpayAccountNumber ? "Present" : "Missing"
  });

  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  } else {
    // For Development without Keys
    console.warn("⚠️ Razorpay Keys missing. Payment features will fail if used.");
    razorpay = {
      orders: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      payments: {
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized")),
        refund: () => Promise.reject(new Error("Razorpay Not Initialized"))
      },
      contacts: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      fundAccount: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      payouts: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      isMock: true
    };
  }
} catch (err) {
  console.error("Razorpay Init Failed:", err.message);
}

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner)
 */

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner/User)
 */
// Helper to get wallet role based on user role and query preference
const getWalletRole = (req, viewAs) => {
  // 1. Explicit preference from query (Admins/Partners can switch)
  if (viewAs === 'user') return 'user';
  if (viewAs === 'partner') return 'partner';
  if (viewAs === 'admin') return 'admin';

  // 2. Default based on authenticated user role
  const userRole = req.user?.role?.toLowerCase();
  if (userRole === 'admin' || userRole === 'superadmin') return 'admin';
  return userRole || 'user';
};

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner/User)
 */
export const getWallet = async (req, res) => {
  try {
    const { viewAs, ownerId } = req.query;
    const role = getWalletRole(req, viewAs);

    const userQueryId = req.query.ownerId || req.query.partnerId || req.query.userId;
    const userRoleStr = req.user.role?.toLowerCase();
    const isAdmin = userRoleStr === 'admin' || userRoleStr === 'superadmin';
    const targetUserId = (isAdmin && userQueryId) ? userQueryId : req.user._id;

    console.log(`[getWallet] AuthUser: ${req.user.name}, AuthRole: ${req.user.role}, isAdmin: ${isAdmin}, queryId: ${userQueryId}, target: ${targetUserId}, viewAs: ${viewAs}`);

    if (isAdmin && userQueryId) {
      console.log(`[getWallet] Admin viewing specific wallet for user: ${userQueryId}`);
    }

    let wallet = await Wallet.findOne({ partnerId: targetUserId, role });

    // Create wallet if doesn't exist (only if it's the user themselves or admin creating for them)
    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: targetUserId,
        role,
        balance: 0
      });
    }

    // Role-based response
    if (role === 'user') {
      return res.json({
        success: true,
        wallet: {
          balance: wallet.balance,
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingClearance: 0,
          lastTransactionAt: wallet.lastTransactionAt
        }
      });
    }

    // Partner/Admin Response
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingClearance: wallet.pendingClearance,
        lastTransactionAt: wallet.lastTransactionAt,
        bankDetails: wallet.bankDetails
      }
    });

  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet details' });
  }
};

/**
 * @desc    Get wallet transactions (Merged with Bookings for Users)
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, viewAs } = req.query;
    const skip = (page - 1) * limit;
    const role = getWalletRole(req, viewAs);

    // Determine whose transactions to fetch
    const userQueryId = req.query.ownerId || req.query.partnerId || req.query.userId;
    const userRoleStr = req.user.role?.toLowerCase();
    const isAdmin = userRoleStr === 'admin' || userRoleStr === 'superadmin';
    const targetUserId = (isAdmin && userQueryId) ? userQueryId : req.user._id;

    console.log(`[getTransactions] AuthRole: ${userRoleStr}, isAdmin: ${isAdmin}, queryId: ${userQueryId}, target: ${targetUserId}`);

    // Find the specific wallet first to get its ID
    const wallet = await Wallet.findOne({ partnerId: targetUserId, role });

    console.log(`[getTransactions] Found Wallet: ${wallet?._id || 'NONE'} for TargetUser: ${targetUserId} with Role: ${role}`);

    // 1. Fetch Wallet Transactions (Top-ups, etc) linked to this specific WALLET
    const txQuery = { walletId: wallet?._id };
    if (type) txQuery.type = type;

    let walletTransactions = [];
    if (wallet) {
      console.log(`[getTransactions] Querying transactions for walletId: ${wallet._id}`);
      walletTransactions = await Transaction.find(txQuery)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    let mergedList = [...walletTransactions];

    // 2. If User, Fetch Bookings as "Transactions"
    if (role === 'user') {
      const bookingQuery = {
        userId: targetUserId,
        paymentStatus: { $in: ['paid', 'refunded', 'partial'] }
      };

      const bookings = await Booking.find(bookingQuery)
        .populate('propertyId', 'propertyName')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Map bookings to transaction-like objects
      const bookingTransactions = bookings.map(b => ({
        _id: b._id,
        bookingId: b.bookingId, // Add Booking ID
        type: b.paymentStatus === 'refunded' ? 'credit' : 'debit',
        amount: b.totalAmount,
        description: `Booking: ${b.propertyId?.propertyName || 'Hotel Stay'}`,
        status: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        isBooking: true,
        checkInDate: b.checkInDate, // Add Check-in
        checkOutDate: b.checkOutDate, // Add Check-out
        createdAt: b.createdAt
      }));
      mergedList = [...mergedList, ...bookingTransactions];
    }

    // 3. Sort & Paginate Merged List
    mergedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginatedList = mergedList.slice(skip, skip + Number(limit));
    const total = mergedList.length;

    res.json({
      success: true,
      transactions: paginatedList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

/**
 * @desc    Request withdrawal
 * @route   POST /api/wallet/withdraw
 * @access  Private (Partner)
 */
/**
 * @desc    Request withdrawal (Manual Approval Flow)
 * @route   POST /api/wallet/withdraw
 * @access  Private (Partner)
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const role = getWalletRole(req, 'partner');

    // Validation
    if (!amount || amount < PaymentConfig.minWithdrawalAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ₹${PaymentConfig.minWithdrawalAmount}`
      });
    }

    if (amount > PaymentConfig.maxWithdrawalAmount) {
      return res.status(400).json({
        message: `Maximum withdrawal amount is ₹${PaymentConfig.maxWithdrawalAmount}`
      });
    }

    // Get specific wallet
    const wallet = await Wallet.findOne({ partnerId: req.user._id, role });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check bank details
    if (!wallet.bankDetails?.accountNumber || !wallet.bankDetails?.ifscCode) {
      return res.status(400).json({
        message: 'Please update your bank details before withdrawing.'
      });
    }

    // Generate IDs
    const withdrawalId = 'WD' + Date.now() + Math.floor(Math.random() * 1000);

    // Create Withdrawal Record (Status: Pending for Admin to Approve)
    const withdrawal = await Withdrawal.create({
      withdrawalId,
      partnerId: req.user._id,
      walletId: wallet._id,
      amount,
      bankDetails: wallet.bankDetails,
      status: 'pending', // Manual approval required
      processingDetails: {
        initiatedAt: new Date(),
        remarks: 'Waiting for admin approval'
      }
    });

    // Deduct amount from wallet immediately (Lock funds)
    wallet.balance -= amount;
    wallet.totalWithdrawals += amount; // We count it, if rejected we'll reverse
    await wallet.save();

    // Create Debit Transaction
    const transaction = await Transaction.create({
      walletId: wallet._id,
      partnerId: req.user._id,
      modelType: 'HotelPartner',
      type: 'debit',
      category: 'withdrawal',
      amount,
      balanceAfter: wallet.balance,
      description: `Withdrawal Request (${withdrawal.withdrawalId})`,
      reference: withdrawal.withdrawalId,
      status: 'pending',
      metadata: {
        withdrawalId: withdrawal.withdrawalId
      }
    });

    withdrawal.transactionId = transaction._id;
    await withdrawal.save();

    // NOTIFICATION: To Partner
    notificationService.sendToPartner(req.user._id, {
      title: 'Withdrawal Requested ⏳',
      body: `Your request for ₹${amount} is pending approval.`
    }, { type: 'withdrawal_pending', withdrawalId: withdrawal._id }).catch(e => console.error(e));

    // NOTIFICATION: To Admin
    notificationService.sendToAdmins({
      title: 'New Withdrawal Request',
      body: `Partner ${req.user.name} requested ₹${amount}.`
    }, { type: 'withdrawal_request', partnerId: req.user._id, amount }).catch(e => console.error(e));

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      withdrawal: {
        id: withdrawal.withdrawalId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        txnId: transaction._id
      }
    });

  } catch (error) {
    console.error('Request Withdrawal Error:', error);
    res.status(500).json({ message: error.message || 'Failed to process withdrawal' });
  }
};

/**
 * @desc    Get withdrawal history
 * @route   GET /api/wallet/withdrawals
 * @access  Private (Partner/Admin)
 */
export const getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, viewAs } = req.query;

    const userRoleStr = req.user.role?.toLowerCase();
    const isAdmin = userRoleStr === 'admin' || userRoleStr === 'superadmin';
    const userQueryId = req.query.ownerId || req.query.partnerId || req.query.userId;

    // Filter Logic:
    // 1. If Admin & No specific user requested -> Show ALL (for finance dashboard)
    // 2. If Admin & Specific user -> Show that user's withdrawals
    // 3. If Partner -> Show only their own

    let query = {};

    if (isAdmin && !userQueryId) {
      // Show all, maybe filter by status
    } else {
      const targetUserId = (isAdmin && userQueryId) ? userQueryId : req.user._id;
      query.partnerId = targetUserId;
    }

    if (status && status !== 'All Status') query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .populate('partnerId', 'name email phone') // Populate partner details for Admin
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Withdrawals Error:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
};

/**
 * @desc    Update withdrawal status (Admin)
 * @route   PUT /api/admin/withdrawals/:id
 * @access  Private (Admin)
 */
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, transactionHash } = req.body; // status: 'completed' | 'rejected'

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "completed" or "rejected".' });
    }

    const withdrawal = await Withdrawal.findById(id).populate('partnerId');
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: `Withdrawal is already ${withdrawal.status}` });
    }

    const wallet = await Wallet.findById(withdrawal.walletId);
    if (!wallet) {
      return res.status(404).json({ message: 'Associated wallet not found' });
    }

    const transaction = await Transaction.findById(withdrawal.transactionId);

    if (status === 'completed') {
      // 1. Mark Withdrawal as Completed
      withdrawal.status = 'completed';
      withdrawal.processingDetails = {
        ...withdrawal.processingDetails,
        processedAt: new Date(),
        completedAt: new Date(),
        utrNumber: transactionHash,
        remarks: remarks || 'Processed by Admin'
      };
      await withdrawal.save();

      // 2. Update Transaction Status
      if (transaction) {
        transaction.status = 'completed';
        transaction.metadata.bankTransferUTR = transactionHash;
        await transaction.save();
      }

      // Notify Partner
      notificationService.sendToPartner(withdrawal.partnerId._id, {
        title: 'Withdrawal Successful ✅',
        body: `Your withdrawal of ₹${withdrawal.amount} has been processed.`
      }, { type: 'withdrawal_completed', withdrawalId: withdrawal._id });

    } else if (status === 'rejected') {
      // 1. Mark Withdrawal as Failed/Rejected
      withdrawal.status = 'failed';
      withdrawal.processingDetails = {
        ...withdrawal.processingDetails,
        failedAt: new Date(),
        remarks: remarks || 'Rejected by Admin'
      };
      await withdrawal.save();

      // 2. Mark Original Debit Transaction as Failed
      if (transaction) {
        transaction.status = 'failed';
        await transaction.save();
      }

      // 3. REFUND THE AMOUNT (Create Credit Transaction)
      wallet.balance += withdrawal.amount;
      wallet.totalWithdrawals -= withdrawal.amount; // Adjust total withdrawals stats
      await wallet.save();

      await Transaction.create({
        walletId: wallet._id,
        partnerId: withdrawal.partnerId._id,
        modelType: 'HotelPartner',
        type: 'credit',
        category: 'refund',
        amount: withdrawal.amount,
        balanceAfter: wallet.balance,
        description: `Refund: Withdrawal Rejected (${withdrawal.withdrawalId})`,
        reference: withdrawal.withdrawalId,
        status: 'completed'
      });

      // Notify Partner
      notificationService.sendToPartner(withdrawal.partnerId._id, {
        title: 'Withdrawal Rejected ❌',
        body: `Your withdrawal of ₹${withdrawal.amount} was rejected. Amount refunded.`
      }, { type: 'withdrawal_rejected', withdrawalId: withdrawal._id });
    }

    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });

  } catch (error) {
    console.error('Update Withdrawal Status Error:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

/**
 * @desc    Update bank details
 * @route   PUT /api/wallet/bank-details
 * @access  Private (Partner)
 */
export const updateBankDetails = async (req, res) => {
  try {
    const role = getWalletRole(req, 'partner');

    // Validation Schema
    const bankSchema = Joi.object({
      accountNumber: Joi.string()
        .pattern(/^[0-9]{9,18}$/)
        .required()
        .messages({
          'string.pattern.base': 'Account number must be 9-18 digits'
        }),
      ifscCode: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid IFSC code format (e.g. HDFC0001234)'
        }),
      accountHolderName: Joi.string()
        .min(3)
        .max(100)
        .required(),
      bankName: Joi.string()
        .min(2)
        .max(100)
        .required()
    });

    const { error } = bankSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;
    let wallet = await Wallet.findOne({ partnerId: req.user._id, role });

    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: req.user._id,
        role,
        balance: 0
      });
    }

    wallet.bankDetails = {
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      bankName,
      verified: true // Auto-verify for test flow, typically false
    };

    // Reset Fund Account ID so it gets recreated with new details on next withdrawal
    wallet.razorpayFundAccountId = undefined;

    await wallet.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully.',
      bankDetails: wallet.bankDetails
    });

  } catch (error) {
    console.error('Update Bank Details Error:', error);
    res.status(500).json({ message: 'Failed to update bank details' });
  }
};

/**
 * @desc    Delete bank details
 * @route   DELETE /api/wallet/bank-details
 * @access  Private (Partner)
 */
export const deleteBankDetails = async (req, res) => {
  try {
    const role = getWalletRole(req, 'partner');
    const wallet = await Wallet.findOne({ partnerId: req.user._id, role });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.bankDetails = undefined;
    wallet.razorpayFundAccountId = undefined; // Force strict re-creation if added again
    // We keep razorpayContactId as the partner is the same person

    await wallet.save();

    res.json({
      success: true,
      message: 'Bank details removed successfully.'
    });

  } catch (error) {
    console.error('Delete Bank Details Error:', error);
    res.status(500).json({ message: 'Failed to remove bank details' });
  }
};

/**
 * @desc    Get wallet statistics
 * @route   GET /api/wallet/stats
 * @access  Private (Partner)
 */
export const getWalletStats = async (req, res) => {
  try {
    const { viewAs } = req.query;
    const role = getWalletRole(req, viewAs);

    // Determine whose stats to fetch
    const userQueryId = req.query.ownerId || req.query.partnerId || req.query.userId;
    const userRoleStr = req.user.role?.toLowerCase();
    const isAdmin = userRoleStr === 'admin' || userRoleStr === 'superadmin';
    const targetUserId = (isAdmin && userQueryId) ? userQueryId : req.user._id;

    console.log(`[getWalletStats] AuthRole: ${userRoleStr}, isAdmin: ${isAdmin}, queryId: ${userQueryId}, target: ${targetUserId}`);

    console.log(`[getWalletStats] Target User ID: ${targetUserId}, Role: ${role}, ViewAs: ${req.query.viewAs}`);

    const wallet = await Wallet.findOne({ partnerId: targetUserId, role });
    console.log(`[getWalletStats] Wallet found:`, wallet ? `Yes, Balance: ${wallet.balance}` : 'No');

    // Handle No Wallet Case
    if (!wallet) {
      console.log(`[getWalletStats] No wallet found, returning zero balance`);
      return res.json({
        success: true,
        stats: {
          totalEarnings: 0,
          totalWithdrawals: 0,
          currentBalance: 0,
          pendingClearance: 0,
          thisMonthEarnings: 0,
          transactionCount: 0
        }
      });
    }

    // USER Role: Return simple balance & transaction count
    if (role === 'user') {
      const walletTxCount = await Transaction.countDocuments({ walletId: wallet._id }); // Use walletId
      const bookingCount = await Booking.countDocuments({ userId: targetUserId });

      console.log(`[getWalletStats] User wallet - Balance: ${wallet.balance}, Tx: ${walletTxCount}, Bookings: ${bookingCount}`);

      return res.json({
        success: true,
        stats: {
          currentBalance: wallet.balance,
          transactionCount: walletTxCount + bookingCount,
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingClearance: 0,
          thisMonthEarnings: 0
        }
      });
    }

    // PARTNER Role: Calculate stats EXCLUSIVELY from Transaction history
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const statsData = await Transaction.aggregate([
      {
        $match: {
          walletId: wallet._id
        }
      },
      {
        $facet: {
          totalEarnings: [
            {
              $match: {
                type: 'credit',
                category: 'booking_payment',
                status: 'completed'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          thisMonthEarnings: [
            {
              $match: {
                type: 'credit',
                category: 'booking_payment',
                status: 'completed',
                createdAt: { $gte: startOfMonth }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          totalWithdrawals: [
            {
              $match: {
                type: 'debit',
                category: 'withdrawal',
                status: 'completed'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          pendingClearance: [
            {
              $match: {
                status: 'pending'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          txCount: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = statsData[0];

    const totalEarnings = result.totalEarnings[0]?.total || 0;
    const thisMonthEarnings = result.thisMonthEarnings[0]?.total || 0;
    const totalWithdrawals = result.totalWithdrawals[0]?.total || 0;
    const pendingClearance = result.pendingClearance[0]?.total || 0;
    const transactionCount = result.txCount[0]?.count || 0;

    res.json({
      success: true,
      stats: {
        totalEarnings,
        totalWithdrawals,
        currentBalance: wallet.balance,
        pendingClearance,
        thisMonthEarnings,
        transactionCount
      }
    });

  } catch (error) {
    console.error('Get Wallet Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet statistics' });
  }
};

/**
 * @desc    Create Add Money Order (Razorpay)
 * @route   POST /api/wallet/add-money
 * @access  Private (Partner)
 */
export const createAddMoneyOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 10) { // Minimum 10rs
      return res.status(400).json({ message: 'Minimum amount is ₹10' });
    }

    const options = {
      amount: Math.round(amount * 100), // in paise
      currency: PaymentConfig.currency,
      notes: {
        userId: req.user._id.toString(),
        type: 'wallet_topup',
        role: req.user.role // Add role to notes for potential debugging or hooks
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: PaymentConfig.razorpayKeyId
      }
    });

  } catch (error) {
    console.error('Create Add Money Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

/**
 * @desc    Verify Add Money Payment
 * @route   POST /api/wallet/verify-add-money
 * @access  Private (Partner)
 */
export const verifyAddMoneyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, viewAs } = req.body;
    const role = getWalletRole(req, viewAs);

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', PaymentConfig.razorpayKeySecret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Determine whose wallet to credit: ownerId (if admin) or current user
    const userRole = req.user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const targetUserId = (isAdmin && req.body.ownerId) ? req.body.ownerId : req.user._id;

    // Find correct wallet based on ROLE
    let wallet = await Wallet.findOne({ partnerId: targetUserId, role });
    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: targetUserId,
        role,
        balance: 0
      });
    }

    // Credit wallet
    await wallet.credit(
      Number(amount),
      `Wallet Top-up`,
      razorpay_payment_id,
      'topup'
    );

    // NOTIFICATION: Notify User/Partner/Admin
    const notificationTargetId = targetUserId;
    const notificationRole = role; // Use wallet role (user/partner/admin) directly for consistency

    notificationService.sendToUser(notificationTargetId, {
      title: 'Wallet Topped Up! 💰',
      body: `₹${amount} has been added to your wallet successfully.`
    }, { type: 'wallet_topup', amount }, notificationRole).catch(e => console.error('Topup push failed:', e));

    res.json({
      success: true,
      message: 'Wallet credited successfully',
      newBalance: wallet.balance
    });

  } catch (error) {
    console.error('Verify Add Money Error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

/**
 * @desc    Adjust wallet (Admin only)
 * @route   POST /api/admin/wallet/adjust
 * @access  Private (Admin)
 */
export const adminAdjustWallet = async (req, res) => {
  try {
    const { targetUserId, action, amount, reason, viewAs } = req.body; // action: 'credit' | 'debit'

    // 1. Validation
    if (!targetUserId || !action || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Missing or invalid parameters' });
    }

    if (!['credit', 'debit'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "credit" or "debit"' });
    }

    const role = viewAs === 'partner' ? 'partner' : 'user';
    const amountNum = parseFloat(amount);

    // 2. Find Wallet
    let wallet = await Wallet.findOne({ partnerId: targetUserId, role });
    if (!wallet) {
      // Create wallet if it doesn't exist for adjustments
      wallet = await Wallet.create({
        partnerId: targetUserId,
        role,
        balance: 0
      });
    }

    // 3. Perform Adjustment using existing model methods
    const description = `Admin Adjustment: ${reason || 'No reason provided'}`;
    const reference = `ADJ-${Date.now()}`;

    if (action === 'credit') {
      await wallet.credit(amountNum, description, reference, 'admin_adjustment');
    } else {
      await wallet.debit(amountNum, description, reference, 'admin_adjustment');
    }

    // 4. Notifications
    const notificationPayload = {
      title: action === 'credit' ? 'Wallet Credited 💰' : 'Wallet Debited 💸',
      body: `${action === 'credit' ? '₹' + amountNum + ' added to' : '₹' + amountNum + ' deducted from'} your wallet. Reason: ${reason || 'Admin adjustment'}.`
    };

    if (role === 'partner') {
      notificationService.sendToPartner(targetUserId, notificationPayload, { type: 'admin_wallet_adjustment', action }).catch(e => console.error(e));
    } else {
      notificationService.sendToUser(targetUserId, notificationPayload, { type: 'admin_wallet_adjustment', action }).catch(e => console.error(e));
    }

    res.json({
      success: true,
      message: `Wallet ${action}ed successfully`,
      newBalance: wallet.balance
    });

  } catch (error) {
    console.error('Admin Adjust Wallet Error:', error);
    res.status(500).json({ message: error.message || 'Failed to adjust wallet balance' });
  }
};
