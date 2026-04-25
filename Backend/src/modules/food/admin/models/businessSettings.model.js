import mongoose from 'mongoose';

const businessSettingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true, default: 'Appzeto' },
        email: { type: String, required: true, default: 'admin@appzeto.com' },
        phone: {
            countryCode: { type: String, default: '+91' },
            number: { type: String, default: '' }
        },
        address: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        region: { type: String, default: 'India' },
        logo: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        favicon: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        themeColor: { type: String, default: '#0a0a0a' }
    },
    { timestamps: true }
);

export const FoodBusinessSettings = mongoose.model('FoodBusinessSettings', businessSettingsSchema);
