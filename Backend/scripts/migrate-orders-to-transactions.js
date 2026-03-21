import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../src/modules/food/orders/models/foodTransaction.model.js';
import { createInitialTransaction } from '../src/modules/food/orders/services/foodTransaction.service.js';
import mongoose from 'mongoose';

async function migrate() {
    try {
        console.log('--- Starting Food Payment Migration ---');
        await connectDB();
        
        // Find orders that don't have a transactionId linked yet
        const orders = await FoodOrder.find({ transactionId: { $exists: false } });
        console.log(`Found ${orders.length} orders lacking transaction logs.`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const order of orders) {
            try {
                // Double check if a transaction with this orderId already exists in the new collection
                const existingTransaction = await FoodTransaction.findOne({ orderId: order._id });
                
                if (existingTransaction) {
                    // Just link the existing transaction to the order
                    await FoodOrder.updateOne({ _id: order._id }, { $set: { transactionId: existingTransaction._id } });
                    skippedCount++;
                    process.stdout.write('.');
                } else {
                    // Create new authoritative transaction record from order data
                    await createInitialTransaction(order);
                    migratedCount++;
                    process.stdout.write('+');
                }

                if ((migratedCount + skippedCount) % 50 === 0) {
                    console.log(`\nProcessed ${migratedCount + skippedCount} orders...`);
                }
            } catch (err) {
                console.error(`\n[ERROR] Order ${order.orderId}: ${err.message}`);
                errorCount++;
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total Orders Processed: ${orders.length}`);
        console.log(`New Transactions Created: ${migratedCount}`);
        console.log(`Existing Transactions Linked: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('-------------------------');

    } catch (err) {
        console.error('Migration crashed:', err);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

migrate();
