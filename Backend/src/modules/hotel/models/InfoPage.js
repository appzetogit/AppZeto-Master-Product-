import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const infoPageSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['user', 'partner'],
      required: true
    },
    slug: {
      type: String,
      enum: ['terms', 'privacy', 'about', 'contact'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HotelUser'
    }
  },
  { timestamps: true }
);

infoPageSchema.index({ audience: 1, slug: 1 }, { unique: true });

const InfoPage = mongoose.model('HotelInfoPage', infoPageSchema, prefixedCollection('infopages'));
export default InfoPage;

