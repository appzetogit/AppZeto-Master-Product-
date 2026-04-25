import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Travel Guides', 'Stay Tips', 'Smart Booking'],
    default: 'Travel Guides'
  },
  readTime: {
    type: String,
    required: true,
    default: '5 min read'
  },
  badge: {
    type: String,
    required: true,
    enum: ['TRENDING', "EDITOR'S PICK", 'SAVE MORE', 'NEW'],
    default: 'NEW'
  },
  image: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: false // Optional for now, in case we want a full blog view later
  },
  slug: {
    type: String,
    unique: true,
    sparse: true // Ensures older records don't collide with undefined/empty strings if single item isn't filled
  },
  seoTitle: {
    type: String,
    default: ''
  },
  seoDescription: {
    type: String,
    default: ''
  },
  seoKeywords: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: () => {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const d = new Date();
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Blog = mongoose.model('HotelBlog', blogSchema, prefixedCollection('blogs'));

export default Blog;
