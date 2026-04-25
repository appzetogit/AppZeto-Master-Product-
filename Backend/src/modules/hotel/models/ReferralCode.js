import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const referralCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'ownerType'
    },
    ownerType: {
        type: String,
        required: true,
        enum: ['HotelUser', 'HotelPartner', 'HotelAdmin']
    },
    referralProgramId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelReferralProgram'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isCustom: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Check to ensure one active code per user usually, but Schema allows multiple if needed.
// We will enforce single active code at service level.

const ReferralCode = mongoose.model('HotelReferralCode', referralCodeSchema, prefixedCollection('referralcodes'));
export default ReferralCode;
