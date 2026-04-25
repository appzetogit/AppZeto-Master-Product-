import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const walletSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['user', 'partner', 'admin'],
    default: 'partner',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  pendingClearance: {
    type: Number,
    default: 0,
    comment: 'Amount pending settlement'
  },
  lastTransactionAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  razorpayContactId: String,
  razorpayFundAccountId: String
}, { timestamps: true });

// Pre-save hook to set modelType based on role
walletSchema.pre('save', async function () {
  if (this.role === 'partner') {
    this.modelType = 'HotelPartner';
  } else if (this.role === 'admin') {
    this.modelType = 'HotelAdmin';
  } else {
    this.modelType = 'HotelUser';
  }
});

// Methods
walletSchema.methods.credit = async function (amount, description, reference, type = 'booking_payment') {
  this.balance += amount;
  // Only add to totalEarnings for actual earnings (bookings), not topups, refunds or admin adjustments
  if (type !== 'topup' && type !== 'refund' && type !== 'commission_refund' && type !== 'admin_adjustment') {
    this.totalEarnings += amount;
  }
  this.lastTransactionAt = new Date();
  await this.save();

  // Create transaction record
  const Transaction = mongoose.model('HotelTransaction');
  await Transaction.create({
    walletId: this._id,
    partnerId: this.partnerId,
    modelType: this.modelType,
    type: 'credit',
    category: type,
    amount,
    balanceAfter: this.balance,
    description,
    reference,
    status: 'completed'
  });

  return this;
};

walletSchema.methods.debit = async function (amount, description, reference, type = 'withdrawal') {
  // Allow overdraft for commission deductions, penalties, refunds, or admin adjustments
  const allowOverdraft = ['commission_deduction', 'no_show_penalty', 'refund_deduction', 'commission_refund', 'admin_adjustment'].includes(type);

  if (!allowOverdraft && this.balance < amount) {
    throw new Error('Insufficient balance');
  }

  this.balance -= amount;

  if (type === 'withdrawal') {
    this.totalWithdrawals += amount;
  }

  // If we are reversing a booking payment (refund_deduction), we should decrease totalEarnings
  if (type === 'refund_deduction' || type === 'no_show_penalty') {
    this.totalEarnings -= amount;
  }

  this.lastTransactionAt = new Date();
  await this.save();

  const Transaction = mongoose.model('HotelTransaction');
  await Transaction.create({
    walletId: this._id,
    partnerId: this.partnerId,
    modelType: this.modelType,
    type: 'debit',
    category: type,
    amount,
    balanceAfter: this.balance,
    description,
    reference,
    status: 'completed'
  });

  return this;
};

// Indexes
walletSchema.index({ createdAt: -1 });
walletSchema.index({ partnerId: 1, role: 1 }, { unique: true }); // Composite key

const Wallet = mongoose.model('HotelWallet', walletSchema, prefixedCollection('wallets'));
export default Wallet;
