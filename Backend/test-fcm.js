import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, ".env") });

import { FoodUser } from "./src/core/users/user.model.js";
import { sendPushNotification } from "./src/core/notifications/firebase.service.js";
import { connectDB, disconnectDB } from "./src/config/db.js";

async function run() {
  console.log("Connecting to DB...");
  await connectDB();

  console.log("\nFetching users with FCM tokens...");
  const users = await FoodUser.find({
    $or: [
      { fcmTokens: { $exists: true, $not: { $size: 0 } } },
      { fcmTokenMobile: { $exists: true, $not: { $size: 0 } } },
    ],
  }).lean();

  console.log(`Found ${users.length} users with tokens.`);

  if (users.length === 0) {
    console.log(
      "❌ No users with FCM tokens found in DB. The frontend is not successfully saving the token.",
    );
    process.exit(1);
  }

  const user = users[users.length - 1]; // Get latest user
  const tokens = [...(user.fcmTokens || []), ...(user.fcmTokenMobile || [])];

  console.log(`\nTesting push to user ${user.phone} with tokens:`, tokens);

  try {
    const res = await sendPushNotification(tokens, {
      title: "Direct Script Test",
      body: "Testing FCM from script directly",
      data: { test: "true" },
    });

    console.log("\nResult:");
    console.log(JSON.stringify(res, null, 2));

    if (res.successCount > 0) {
      console.log("\n✅ Push sent successfully to Firebase!");
    } else {
      console.log("\n❌ Push failed. Firebase rejected the tokens.");
    }
  } catch (e) {
    console.error("❌ Send failed:", e);
  }

  await disconnectDB();
  process.exit(0);
}

run();
