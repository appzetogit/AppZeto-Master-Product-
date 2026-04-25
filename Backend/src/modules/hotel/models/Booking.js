// models/Booking.js
import mongoose from "mongoose";
import { prefixedCollection } from "./collectionPrefix.js";

const guestSchema = new mongoose.Schema({
  adults: { type: Number, required: true },
  children: { type: Number, default: 0 }
});

const bookingSchema = new mongoose.Schema({

  // USER
  userModel: {
    type: String,
    required: true,
    enum: ['HotelUser', 'HotelPartner'],
    default: 'HotelUser'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },

  bookingId: {
    type: String,
    required: true,
    unique: true
  },

  // PROPERTY
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HotelProperty",
    required: true
  },

  propertyType: {
    type: String,
    enum: ["villa", "resort", "hotel", "hostel", "pg", "homestay"],
    required: true
  },

  // ROOM / INVENTORY (REQUIRED FOR ALL)
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HotelRoomType",
    required: true
  },

  bookingUnit: {
    type: String,
    enum: ["entire", "room", "bed"],
    required: true
  },

  // STAY DETAILS
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  totalNights: { type: Number, required: true },

  guests: guestSchema,

  // PRICING (PER NIGHT LOGIC)
  pricePerNight: { type: Number, required: true },
  baseAmount: { type: Number, required: true }, // pricePerNight * nights

  extraAdultPrice: { type: Number, default: 0 },
  extraChildPrice: { type: Number, default: 0 },

  extraCharges: { type: Number, default: 0 }, // extra guests * nights

  taxes: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: String,

  adminCommission: { type: Number, default: 0 },
  partnerPayout: { type: Number, default: 0 },

  totalAmount: { type: Number, required: true },

  // PAYMENT
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded", "partial"],
    default: "pending"
  },

  paymentId: String,
  paymentMethod: String,
  
  // PREPAID FEATURE
  prepaidDiscount: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },

  // BOOKING STATUS
  bookingStatus: {
    type: String,
    enum: ["pending", "awaiting_payment", "confirmed", "checked_in", "checked_out", "cancelled", "no_show", "rejected", "completed"],
    default: "pending"
  },

  cancellationReason: String,
  cancelledAt: Date,

  // AUDIT
  createdBy: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // NOTIFICATION FLAGS
  notificationsSent: {
    checkInReminder: { type: Boolean, default: false },
    checkOutReviewRequest: { type: Boolean, default: false },
    paymentExpiryWarning: { type: Boolean, default: false }
  }

}, { timestamps: true });

export default mongoose.model(
  "HotelBooking",
  bookingSchema,
  prefixedCollection("bookings")
);
