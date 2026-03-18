import mongoose from "mongoose";

const dayTimingSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    isOpen: { type: Boolean, default: true },
    openingTime: { type: String, trim: true, default: "09:00" }, // "HH:mm"
    closingTime: { type: String, trim: true, default: "22:00" }, // "HH:mm"
  },
  { _id: false },
);

const outletTimingsSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodRestaurant",
      required: true,
      unique: true,
      index: true,
    },
    timings: {
      type: [dayTimingSchema],
      default: [],
    },
  },
  {
    collection: "food_restaurant_outlet_timings",
    timestamps: true,
  },
);

export const FoodRestaurantOutletTimings = mongoose.model(
  "FoodRestaurantOutletTimings",
  outletTimingsSchema,
);
