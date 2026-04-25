import mongoose from "mongoose";
import { prefixedCollection } from "./collectionPrefix.js";

const availabilityLedgerSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HotelProperty",
    required: true
  },
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HotelRoomType"
  },
  inventoryType: {
    type: String,
    enum: ["room", "bed", "entire"],
    required: true
  },
  source: {
    type: String,
    enum: ["platform", "walk_in", "external", "manual_block"],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  externalPlatform: String,
  externalReference: String,
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  units: {
    type: Number,
    required: true,
    min: 1
  },
  notes: String,
  createdBy: {
    type: String,
    enum: ["system", "partner"],
    default: "system"
  }
}, { timestamps: true });

availabilityLedgerSchema.index({ propertyId: 1, roomTypeId: 1, startDate: 1, endDate: 1 });
availabilityLedgerSchema.index({ source: 1, referenceId: 1 });

export default mongoose.model(
  "HotelAvailabilityLedger",
  availabilityLedgerSchema,
  prefixedCollection("availabilityledgers")
);

