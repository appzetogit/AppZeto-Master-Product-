import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            default: 'ADMIN'
        },
        servicesAccess: {
            type: [String],
            enum: ['zomato', 'quickCommerce', 'taxi'],
            default: ['zomato']
        }
    },
    {
        collection: 'food_admins',
        timestamps: true
    }
);

adminSchema.index({ servicesAccess: 1 });

adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

adminSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const ZomatoAdmin = mongoose.model('ZomatoAdmin', adminSchema);

