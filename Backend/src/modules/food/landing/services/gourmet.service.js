import { ZomatoGourmetRestaurant } from '../models/gourmetRestaurant.model.js';
import { ZomatoRestaurant } from '../../restaurant/models/restaurant.model.js';

export const getPublicGourmetRestaurants = async () => {
    const docs = await ZomatoGourmetRestaurant.find({ isActive: true })
        .sort({ priority: 1, createdAt: -1 })
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

