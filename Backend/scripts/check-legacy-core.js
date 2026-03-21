import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/db.js';
import mongoose from 'mongoose';

async function check() {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        const names = ['payments', 'refunds', 'settlements', 'transactions'];
        for (const name of names) {
            const count = await db.collection(name).countDocuments();
            console.log(`${name}: ${count} docs`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}
check();
