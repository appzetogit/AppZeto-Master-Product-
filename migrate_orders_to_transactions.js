import mongoose from 'mongoose';
import { FoodOrder } from './Backend/src/modules/food/orders/models/order.model.js';
import { FoodTransaction } from './Backend/src/modules/food/orders/models/foodTransaction.model.js';
import * as foodTransactionService from './Backend/src/modules/food/orders/services/foodTransaction.service.js';

// This script finds all FoodOrders that don't have a linked FoodTransaction
// and creates one for them based on the order's data.

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/appzeto');
        console.log('Connected to MongoDB');

        const orders = await FoodOrder.find({ 
            $or: [
                { transactionId: { $exists: false } },
                { transactionId: null }
            ]
        });

        console.log(`Found ${orders.length} orders without transactions.`);

        for (const order of orders) {
            console.log(`Migrating Order: ${order.orderId}...`);
            try {
                const transaction = await foodTransactionService.createInitialTransaction(order);
                console.log(`Created Transaction: ${transaction._id} for Order: ${order.orderId}`);
            } catch (err) {
                console.error(`Failed to migrate Order: ${order.orderId}`, err.message);
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
