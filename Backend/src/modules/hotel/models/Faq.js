import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  audience: {
    type: String,
    enum: ['user', 'partner'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Faq = mongoose.model('HotelFaq', faqSchema, prefixedCollection('faqs'));
export default Faq;
