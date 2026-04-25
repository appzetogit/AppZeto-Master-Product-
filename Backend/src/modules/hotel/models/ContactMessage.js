import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const contactMessageSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['user', 'partner'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new'
    },
    meta: {
      type: Object
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'audienceModel'
    },
    audienceModel: {
      type: String,
      enum: ['HotelUser', 'HotelPartner', 'HotelAdmin']
    }
  },
  { timestamps: true }
);

contactMessageSchema.pre('save', async function () {
  // If we have a userId but no audienceModel was set manually
  if (this.userId && !this.audienceModel) {
    // Default based on audience if not specified
    this.audienceModel = this.audience === 'partner' ? 'HotelPartner' : 'HotelUser';
  }
});

const ContactMessage = mongoose.model('HotelContactMessage', contactMessageSchema, prefixedCollection('contactmessages'));
export default ContactMessage;

