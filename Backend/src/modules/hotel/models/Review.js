import mongoose from "mongoose";
import { prefixedCollection } from "./collectionPrefix.js";

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "HotelUser", required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "HotelProperty", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "HotelBooking" },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  reply: { type: String }, // Partner's reply
  replyAt: { type: Date },
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "HotelUser" }], // Array of user IDs who found this helpful
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" }
}, { timestamps: true });

export default mongoose.model(
  "HotelReview",
  reviewSchema,
  prefixedCollection("reviews")
);
