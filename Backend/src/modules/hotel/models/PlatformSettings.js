import mongoose from 'mongoose';
import { prefixedCollection } from './collectionPrefix.js';

const platformSettingsSchema = new mongoose.Schema(
  {
    platformOpen: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    bookingDisabledMessage: {
      type: String,
      default: 'Bookings are temporarily disabled. Please try again later.'
    },
    maintenanceTitle: {
      type: String,
      default: 'We will be back soon.'
    },
    maintenanceMessage: {
      type: String,
      default: 'The platform is under scheduled maintenance. Please check back in some time.'
    },
    defaultCommission: {
      type: Number,
      default: 10 // Percentage
    },
    taxRate: {
      type: Number,
      default: 12 // Percentage (GST)
    }
  },
  { timestamps: true }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const PlatformSettings = mongoose.model('HotelPlatformSettings', platformSettingsSchema, prefixedCollection('platformsettings'));

export default PlatformSettings;

