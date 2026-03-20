import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { FoodUser } from '../src/core/users/user.model.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../src/modules/food/delivery/models/deliveryPartner.model.js';
import { FoodAdmin } from '../src/core/admin/admin.model.js';
import { logger } from '../src/utils/logger.js';

const OWNER_MODELS = {
    USER: FoodUser,
    RESTAURANT: FoodRestaurant,
    DELIVERY_PARTNER: FoodDeliveryPartner,
    ADMIN: FoodAdmin
};

const TOKEN_FIELD_BY_PLATFORM = {
    web: 'fcmTokens',
    mobile: 'fcmTokenMobile'
};

const normalize = (value) => String(value || '').trim();
const unique = (items) => [...new Set(items.map(normalize).filter(Boolean))];

async function run() {
    await connectDB();

    const collection = mongoose.connection.collection('firebase_device_tokens');
    const docs = await collection.find({}).toArray();

    if (!docs.length) {
        logger.info('No legacy FCM token documents found. Nothing to migrate.');
        await disconnectDB();
        return;
    }

    const grouped = new Map();
    for (const doc of docs) {
        const ownerType = String(doc.ownerType || '').toUpperCase();
        const ownerId = String(doc.ownerId || '').trim();
        const platform = doc.platform === 'mobile' ? 'mobile' : 'web';
        const token = normalize(doc.token);
        const model = OWNER_MODELS[ownerType];
        if (!model || !ownerId || !token) continue;

        const key = `${ownerType}:${ownerId}`;
        const current = grouped.get(key) || { ownerType, ownerId, web: [], mobile: [] };
        current[platform].push(token);
        grouped.set(key, current);
    }

    let updatedOwners = 0;
    for (const entry of grouped.values()) {
        const model = OWNER_MODELS[entry.ownerType];
        if (!model) continue;
        const doc = await model.findById(entry.ownerId);
        if (!doc) continue;

        for (const platform of ['web', 'mobile']) {
            const field = TOKEN_FIELD_BY_PLATFORM[platform];
            const merged = unique([
                ...(Array.isArray(doc[field]) ? doc[field] : []),
                ...(entry[platform] || [])
            ]);
            doc[field] = merged.slice(-10);
        }

        await doc.save();
        updatedOwners += 1;
    }

    logger.info(`Migrated FCM tokens for ${updatedOwners} owner profiles from firebase_device_tokens.`);
    logger.info('Legacy firebase_device_tokens collection was left intact. Review and drop it manually if desired.');

    await disconnectDB();
}

run().catch(async (error) => {
    logger.error(`FCM token migration failed: ${error.message}`);
    try {
        await disconnectDB();
    } catch {}
    process.exit(1);
});
