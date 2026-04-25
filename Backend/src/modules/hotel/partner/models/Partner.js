import mongoose from 'mongoose';
import { prefixedCollection } from '../../models/collectionPrefix.js';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'partner',
    enum: ['partner']
  },
  isPartner: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  partnerApprovalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  partnerSince: {
    type: Date,
    default: Date.now
  },
  fcmTokens: {
    app: { type: String, default: null },
    web: { type: String, default: null }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Owner Details
  ownerName: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  aadhaarFront: { type: String }, // URL
  aadhaarBack: { type: String }, // URL
  panNumber: { type: String, trim: true },
  panCardImage: { type: String }, // URL

  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },

  termsAccepted: { type: Boolean, default: false },

  // OTP for Login
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  profileImage: {
    type: String,
    default: null
  },
  profileImagePublicId: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Partner = mongoose.model('HotelPartner', partnerSchema, prefixedCollection('partners'));
export default Partner;
