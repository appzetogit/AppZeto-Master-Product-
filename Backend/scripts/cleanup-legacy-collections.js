import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db.js';
import mongoose from 'mongoose';

async function cleanup() {
    try {
        console.log('--- Database Collection Cleanup ---');
        await connectDB();
        
        const db = mongoose.connection.db;
        const legacyCollections = [
            'food_order_payments',
            'food_restaurant_commission_ledgers',
            'payments',
            'refunds',
            'settlements',
            'transactions'
        ];

        for (const collectionName of legacyCollections) {
            const collections = await db.listCollections({ name: collectionName }).toArray();
            if (collections.length > 0) {
                console.log(`Dropping collection: ${collectionName}...`);
                await db.dropCollection(collectionName);
                console.log(`✅ Collection ${collectionName} dropped successfully.`);
            } else {
                console.log(`ℹ️ Collection ${collectionName} does not exist. Skipping.`);
            }
        }

        console.log('--- Cleanup Finished ---');

    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

cleanup();
