import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';

async function main() {
    const uri = config.mongodbUri;
    if (!uri) {
        throw new Error('MONGO_URI/MONGODB_URI is missing in env');
    }

    await mongoose.connect(uri);

    // Only cleanup documents that already have a location object (so we don't lose address data).
    const filter = { location: { $type: 'object' } };
    const unset = {
        addressLine1: 1,
        addressLine2: 1,
        area: 1,
        city: 1,
        state: 1,
        pincode: 1,
        landmark: 1
    };

    const res = await FoodRestaurant.updateMany(filter, { $unset: unset });

    // eslint-disable-next-line no-console
    console.log(
        JSON.stringify(
            {
                matched: res.matchedCount ?? res.n ?? 0,
                modified: res.modifiedCount ?? res.nModified ?? 0
            },
            null,
            2
        )
    );

    await mongoose.disconnect();
}

main().catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
        await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
});

