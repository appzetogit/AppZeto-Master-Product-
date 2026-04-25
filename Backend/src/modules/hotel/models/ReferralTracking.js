import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const referralTrackingSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'referrerModel'
    },
    referrerModel: {
        type: String,
        required: true,
        enum: ['HotelUser', 'HotelPartner', 'HotelAdmin']
    },
    referredUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'referredUserModel'
    },
    referredUserModel: {
        type: String,
        required: true,
        enum: ['HotelUser', 'HotelPartner'],
        default: 'HotelUser'
    },
    referralCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'HotelReferralCode'
    },
    referralProgramId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'HotelReferralProgram'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    rewardAmount: {
        type: Number,
        required: true
    },
    // When 'first_booking' is the trigger
    triggerBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelBooking'
    },
    completedAt: Date,
    ipAddress: String, // For fraud detection
    deviceInfo: String
}, { timestamps: true });

// Index for quick stats lookup
referralTrackingSchema.index({ referrerId: 1, status: 1 });
referralTrackingSchema.index({ referredUserId: 1, referredUserModel: 1 }, { unique: true });

const ReferralTracking = mongoose.model('HotelReferralTracking', referralTrackingSchema, prefixedCollection('referraltrackings'));
export default ReferralTracking;
