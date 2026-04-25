import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      refPath: 'userModel',
      index: true
    },
    userType: {
      type: String,
      enum: ['user', 'partner', 'admin'],
      default: 'user',
      required: true
    },
    userModel: {
      type: String,
      required: true,
      enum: ['HotelUser', 'HotelAdmin', 'HotelPartner'],
      default: 'HotelUser'
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    type: {
      type: String,
      default: 'general'
    },
    fcmMessageId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, userType: 1, isRead: 1, createdAt: -1 });

// Pre-save hook to set userModel based on userType
notificationSchema.pre('save', async function () {
  if (this.userType === 'admin') {
    this.userModel = 'HotelAdmin';
  } else if (this.userType === 'partner') {
    this.userModel = 'HotelPartner';
  } else {
    this.userModel = 'HotelUser';
  }
});

const Notification = mongoose.model('HotelNotification', notificationSchema, prefixedCollection('notifications'));
export default Notification;
