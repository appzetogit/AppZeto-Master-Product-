import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const transactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HotelWallet',
    required: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'modelType'
  },
  modelType: {
    type: String,
    required: true,
    enum: ['HotelUser', 'HotelPartner', 'HotelAdmin'],
    default: 'HotelUser'
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'booking_payment',
      'commission_deduction',
      'withdrawal',
      'refund',
      'adjustment',
      'topup',
      'commission_tax',
      'commission_refund',
      'refund_deduction',
      'no_show_penalty',
      'no_show_credit',
      'booking',
      'referral_bonus',
      'referral_penalty',
      'admin_adjustment'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String, // Booking ID, Withdrawal ID, etc.
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  metadata: {
    bookingId: String,
    withdrawalId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpayPayoutId: String,
    bankTransferUTR: String,
    notes: String
  }
}, { timestamps: true });

// Indexes
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ partnerId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

const Transaction = mongoose.model('HotelTransaction', transactionSchema, prefixedCollection('transactions'));
export default Transaction;
