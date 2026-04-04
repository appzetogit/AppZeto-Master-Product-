import mongoose from "mongoose";

const sellerTransactionSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Order Payment", "Withdrawal", "Adjustment"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Settled", "Rejected"],
      default: "Pending",
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    orderId: {
      type: String,
      trim: true,
      default: "",
    },
    customer: {
      type: String,
      trim: true,
      default: "",
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    collection: "seller_transactions",
    timestamps: true,
  },
);

sellerTransactionSchema.index({ sellerId: 1, createdAt: -1 });

export const SellerTransaction = mongoose.model(
  "SellerTransaction",
  sellerTransactionSchema,
);
