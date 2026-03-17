/**
 * One-time migration:
 * Set `zoneId` for existing categories that don't have one.
 *
 * Behavior:
 * - If ZONE_ID env var is provided and valid => uses that zone.
 * - Else => uses the first active zone (sorted by createdAt asc).
 * - Only updates categories where zoneId is missing/null (does not overwrite existing zoneId).
 *
 * Usage:
 *   node scripts/backfill-categories-zone-from-existing-zone.js
 *
 * Optional:
 *   ZONE_ID=<your_zone_object_id> node scripts/backfill-categories-zone-from-existing-zone.js
 */

import mongoose from "mongoose";
import { config } from "../src/config/env.js";
import { FoodCategory } from "../src/modules/food/admin/models/category.model.js";
import { FoodZone } from "../src/modules/food/admin/models/zone.model.js";

const run = async () => {
  if (!config.mongodbUri) {
    throw new Error("Missing MONGO_URI / MONGODB_URI");
  }

  await mongoose.connect(config.mongodbUri);

  const zoneIdRaw = String(process.env.ZONE_ID || "").trim();
  let zone = null;

  if (zoneIdRaw) {
    if (!mongoose.Types.ObjectId.isValid(zoneIdRaw)) {
      throw new Error("Invalid ZONE_ID");
    }
    zone = await FoodZone.findById(zoneIdRaw).lean();
    if (!zone) throw new Error("ZONE_ID not found");
  } else {
    zone = await FoodZone.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
    if (!zone) throw new Error("No active zone found. Create a zone first or pass ZONE_ID.");
  }

  const zid = new mongoose.Types.ObjectId(String(zone._id));

  const res = await FoodCategory.updateMany(
    { $or: [{ zoneId: { $exists: false } }, { zoneId: null }] },
    { $set: { zoneId: zid } }
  );

  // eslint-disable-next-line no-console
  console.log("✅ backfill-categories-zone-from-existing-zone done", {
    usedZoneId: String(zone._id),
    usedZoneName: zone.name || zone.zoneName || null,
    matched: res.matchedCount ?? res.n ?? null,
    modified: res.modifiedCount ?? res.nModified ?? null,
  });

  await mongoose.disconnect();
};

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error("❌ backfill-categories-zone-from-existing-zone failed", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

