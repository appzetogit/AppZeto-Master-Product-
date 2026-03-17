/**
 * One-time migration:
 * Mark existing categories as "global" by ensuring `zoneId` is unset/null.
 *
 * Usage:
 *   node scripts/backfill-categories-zone-global.js
 *
 * Requires MONGO_URI (or MONGODB_URI) in environment.
 */

import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { FoodCategory } from '../src/modules/food/admin/models/category.model.js';

const run = async () => {
  if (!config.mongodbUri) {
    throw new Error('Missing MONGO_URI / MONGODB_URI');
  }

  await mongoose.connect(config.mongodbUri);
  const res = await FoodCategory.updateMany(
    { zoneId: { $exists: true } },
    { $unset: { zoneId: '' } }
  );

  // eslint-disable-next-line no-console
  console.log('✅ backfill-categories-zone-global done', {
    matched: res.matchedCount ?? res.n ?? null,
    modified: res.modifiedCount ?? res.nModified ?? null,
  });

  await mongoose.disconnect();
};

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('❌ backfill-categories-zone-global failed', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

