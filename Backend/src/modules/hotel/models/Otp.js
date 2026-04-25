import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 10 * 60 * 1000 // 10 minutes
  },
  tempData: {
    type: Object, // Store temp registration data
    default: null
  }
}, { timestamps: true });

// Index for automatic expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('HotelOtp', otpSchema, prefixedCollection('otps'));
export default Otp;
