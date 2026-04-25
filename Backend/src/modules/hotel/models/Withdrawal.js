import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: {
    type: String,
    required: true,
    unique: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HotelPartner',
    required: true
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HotelWallet',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 500 // Minimum withdrawal amount
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  processingDetails: {
    initiatedAt: Date,
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    utrNumber: String, // Bank transfer reference
    remarks: String
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HotelTransaction'
  },
  razorpayPayoutId: String,
  razorpayFundAccountId: String
}, { timestamps: true });

// Generate withdrawal ID
withdrawalSchema.pre('validate', async function () {
  if (!this.withdrawalId) {
    this.withdrawalId = 'WD' + Date.now() + Math.floor(Math.random() * 1000);
  }
});

// Indexes
withdrawalSchema.index({ partnerId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1 });

const Withdrawal = mongoose.model('HotelWithdrawal', withdrawalSchema, prefixedCollection('withdrawals'));
export default Withdrawal;
