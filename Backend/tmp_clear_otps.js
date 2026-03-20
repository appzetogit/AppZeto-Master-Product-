import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function clearOtps() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const db = mongoose.connection.db;
        const result = await db.collection('food_otps').deleteMany({});
        console.log(`Deleted ${result.deletedCount} OTP records.`);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

clearOtps();
