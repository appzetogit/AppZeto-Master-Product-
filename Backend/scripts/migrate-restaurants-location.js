import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { FoodRestaurant } from '../src/modules/food/restaurant/models/restaurant.model.js';

const toStr = (v) => (v != null ? String(v).trim() : '');

const buildLocationPatch = (doc) => {
    const loc = doc.location && typeof doc.location === 'object' ? doc.location : {};
    const coords = Array.isArray(loc.coordinates) ? loc.coordinates : null;
    const lng = coords && Number.isFinite(coords[0]) ? coords[0] : undefined;
    const lat = coords && Number.isFinite(coords[1]) ? coords[1] : undefined;

    const formattedAddress = toStr(loc.formattedAddress || loc.address || '');
    const addressLine1 = toStr(loc.addressLine1 || doc.addressLine1 || formattedAddress);
    const addressLine2 = toStr(loc.addressLine2 || doc.addressLine2);
    const area = toStr(loc.area || doc.area);
    const city = toStr(loc.city || doc.city);
    const state = toStr(loc.state || doc.state);
    const pincode = toStr(loc.pincode || doc.pincode);
    const landmark = toStr(loc.landmark || doc.landmark);

    const patch = {
        location: {
            ...(loc || {}),
            type: 'Point',
            ...(coords ? { coordinates: coords } : {}),
            ...(typeof loc.latitude === 'number' ? {} : (typeof lat === 'number' ? { latitude: lat } : {})),
            ...(typeof loc.longitude === 'number' ? {} : (typeof lng === 'number' ? { longitude: lng } : {})),
            ...(formattedAddress ? { formattedAddress } : {}),
            ...(loc.address || formattedAddress ? { address: toStr(loc.address || formattedAddress) } : {}),
            ...(addressLine1 ? { addressLine1 } : {}),
            ...(addressLine2 ? { addressLine2 } : {}),
            ...(area ? { area } : {}),
            ...(city ? { city } : {}),
            ...(state ? { state } : {}),
            ...(pincode ? { pincode } : {}),
            ...(landmark ? { landmark } : {})
        }
    };

    return patch;
};

async function main() {
    const uri = config.mongodbUri;
    if (!uri) {
        throw new Error('MONGO_URI/MONGODB_URI is missing in env');
    }

    await mongoose.connect(uri);

    const cursor = FoodRestaurant.find({}).select('location addressLine1 addressLine2 area city state pincode landmark').lean().cursor();

    const ops = [];
    let scanned = 0;
    let updated = 0;

    for await (const doc of cursor) {
        scanned += 1;
        const patch = buildLocationPatch(doc);

        // Only update when location object would gain any address fields or lat/lng.
        const nextLoc = patch.location || {};
        const hasUseful =
            nextLoc.addressLine1 ||
            nextLoc.addressLine2 ||
            nextLoc.area ||
            nextLoc.city ||
            nextLoc.state ||
            nextLoc.pincode ||
            nextLoc.landmark ||
            typeof nextLoc.latitude === 'number' ||
            typeof nextLoc.longitude === 'number';
        if (!hasUseful) continue;

        ops.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: patch }
            }
        });

        if (ops.length >= 500) {
            const res = await FoodRestaurant.bulkWrite(ops, { ordered: false });
            updated += res.modifiedCount || 0;
            ops.length = 0;
        }
    }

    if (ops.length) {
        const res = await FoodRestaurant.bulkWrite(ops, { ordered: false });
        updated += res.modifiedCount || 0;
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ scanned, updated }, null, 2));
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

