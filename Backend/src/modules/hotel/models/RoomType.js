// models/RoomType.js
import mongoose from "mongoose";
import { prefixedCollection } from "./collectionPrefix.js";

const roomTypeSchema = new mongoose.Schema({

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HotelProperty",
    required: true
  },

  name: { type: String, required: true },

  inventoryType: {
    type: String,
    enum: ["room", "bed", "entire"],
    required: true
  },

  roomCategory: {
    type: String,
    enum: ["private", "shared", "entire"]
  },

  // CAPACITY
  baseAdults: { type: Number, default: 2 },
  baseChildren: { type: Number, default: 0 },
  maxAdults: { type: Number, required: true },
  maxChildren: { type: Number, default: 0 },

  // INVENTORY COUNT
  bedsPerRoom: {
    type: Number
  },
  totalInventory: {
    type: Number,
    required: true // villa = 1
  },

  // PRICING (PER NIGHT – SINGLE SOURCE OF TRUTH)
  pricePerNight: { type: Number, required: true },
  extraAdultPrice: { type: Number, default: 0 },
  extraChildPrice: { type: Number, default: 0 },

  // MEDIA
  images: {
    type: [String],
    validate: v => (Array.isArray(v) ? v.length >= 3 : true)
  },

  amenities: [String],

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model(
  "HotelRoomType",
  roomTypeSchema,
  prefixedCollection("roomtypes")
);
