import { ZomatoTop10Restaurant } from '../models/top10Restaurant.model.js';
import { ZomatoRestaurant } from '../../restaurant/models/restaurant.model.js';

export const getPublicTop10Restaurants = async () => {
    const docs = await ZomatoTop10Restaurant.find({ isActive: true })
        .sort({ rank: 1 })
        .lean();

    const restaurantIds = docs.map((d) => d.restaurantId);
    const restaurants = await ZomatoRestaurant.find({ _id: { $in: restaurantIds } })
        .select('restaurantName area city profileImage')
        .lean();

    const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));

    return docs.map((item) => ({
        ...item,
        restaurant: restaurantMap.get(item.restaurantId.toString()) || null
    }));
};
