import { FoodTop10Restaurant } from '../models/top10Restaurant.model.js';
import { FoodGourmetRestaurant } from '../models/gourmetRestaurant.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { getPublicTop10Restaurants } from '../services/top10.service.js';
import { getPublicGourmetRestaurants } from '../services/gourmet.service.js';

/** GET /hero-banners/top-10 - list Top 10 (admin, all entries). Returns { success, data: { restaurants } } */
export const listTop10Admin = async (req, res, next) => {
    try {
        const docs = await FoodTop10Restaurant.find({}).sort({ rank: 1 }).lean();
        const restaurantIds = [...new Set(docs.map((d) => d.restaurantId))];
        const restaurants = await FoodRestaurant.find({ _id: { $in: restaurantIds } })
            .select('restaurantName area city profileImage')
            .lean();
        const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));
        const list = docs.map((d) => ({
            _id: d._id,
            restaurantId: d.restaurantId,
            rank: d.rank,
            order: d.rank,
            isActive: d.isActive,
            ...(restaurantMap.get(d.restaurantId?.toString()) || {})
        }));
        res.status(200).json({
            success: true,
            message: 'Top 10 restaurants fetched',
            data: { restaurants: list }
        });
    } catch (error) {
        next(error);
    }
};

/** POST /hero-banners/top-10 - add restaurant to Top 10. Body: { restaurantId, rank } */
export const createTop10Admin = async (req, res, next) => {
    try {
        const { restaurantId, rank } = req.body || {};
        if (!restaurantId) {
            return res.status(400).json({ success: false, message: 'restaurantId is required' });
        }
        const numRank = Math.min(10, Math.max(1, parseInt(rank, 10) || 1));
        const existing = await FoodTop10Restaurant.findOne({ restaurantId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Restaurant already in Top 10' });
        }
        const doc = await FoodTop10Restaurant.create({ restaurantId, rank: numRank });
        const list = await getPublicTop10Restaurants();
        const restaurants = (list || []).map((d) => ({
            ...(d.restaurant || {}),
            _id: d._id,
            restaurantId: d.restaurantId,
            rank: d.rank,
            isActive: d.isActive
        })).filter((r) => r && r._id);
        res.status(201).json({
            success: true,
            message: 'Restaurant added to Top 10',
            data: { restaurants, item: doc.toObject() }
        });
    } catch (error) {
        next(error);
    }
};

/** DELETE /hero-banners/top-10/:id */
export const deleteTop10Admin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await FoodTop10Restaurant.findByIdAndDelete(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Top 10 entry not found' });
        }
        res.status(200).json({ success: true, message: 'Restaurant removed from Top 10', data: { id } });
    } catch (error) {
        next(error);
    }
};

/** PATCH /hero-banners/top-10/:id/order - body: { order } */
export const updateTop10OrderAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = parseInt(req.body?.order, 10);
        if (Number.isNaN(order) || order < 1 || order > 10) {
            return res.status(400).json({ success: false, message: 'order must be 1-10' });
        }
        const doc = await FoodTop10Restaurant.findByIdAndUpdate(id, { rank: order }, { new: true });
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Top 10 entry not found' });
        }
        res.status(200).json({ success: true, message: 'Order updated', data: doc.toObject() });
    } catch (error) {
        next(error);
    }
};

/** PATCH /hero-banners/top-10/:id/rank - body: { rank } */
export const updateTop10RankAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const rank = parseInt(req.body?.rank, 10);
        if (Number.isNaN(rank) || rank < 1 || rank > 10) {
            return res.status(400).json({ success: false, message: 'rank must be 1-10' });
        }
        const doc = await FoodTop10Restaurant.findByIdAndUpdate(id, { rank }, { new: true });
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Top 10 entry not found' });
        }
        res.status(200).json({ success: true, message: 'Rank updated', data: doc.toObject() });
    } catch (error) {
        next(error);
    }
};

/** PATCH /hero-banners/top-10/:id/status - toggle isActive */
export const toggleTop10StatusAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await FoodTop10Restaurant.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Top 10 entry not found' });
        }
        doc.isActive = !doc.isActive;
        await doc.save();
        res.status(200).json({ success: true, message: doc.isActive ? 'Activated' : 'Deactivated', data: doc.toObject() });
    } catch (error) {
        next(error);
    }
};

/** GET /hero-banners/gourmet - list Gourmet (admin, all entries). Returns { success, data: { restaurants } } */
export const listGourmetAdmin = async (req, res, next) => {
    try {
        const docs = await FoodGourmetRestaurant.find({}).sort({ priority: 1, createdAt: -1 }).lean();
        const restaurantIds = [...new Set(docs.map((d) => d.restaurantId))];
        const restaurants = await FoodRestaurant.find({ _id: { $in: restaurantIds } })
            .select('restaurantName area city profileImage')
            .lean();
        const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));
        const list = docs.map((d) => ({
            _id: d._id,
            restaurantId: d.restaurantId,
            priority: d.priority,
            order: d.priority,
            isActive: d.isActive,
            ...(restaurantMap.get(d.restaurantId?.toString()) || {})
        }));
        res.status(200).json({
            success: true,
            message: 'Gourmet restaurants fetched',
            data: { restaurants: list }
        });
    } catch (error) {
        next(error);
    }
};

/** POST /hero-banners/gourmet - add restaurant. Body: { restaurantId } */
export const createGourmetAdmin = async (req, res, next) => {
    try {
        const { restaurantId } = req.body || {};
        if (!restaurantId) {
            return res.status(400).json({ success: false, message: 'restaurantId is required' });
        }
        const existing = await FoodGourmetRestaurant.findOne({ restaurantId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Restaurant already in Gourmet' });
        }
        const count = await FoodGourmetRestaurant.countDocuments();
        const doc = await FoodGourmetRestaurant.create({ restaurantId, priority: count });
        const list = await getPublicGourmetRestaurants();
        const restaurants = (list || []).map((d) => ({
            ...(d.restaurant || {}),
            _id: d._id,
            restaurantId: d.restaurantId,
            priority: d.priority,
            isActive: d.isActive
        })).filter((r) => r && r._id);
        res.status(201).json({
            success: true,
            message: 'Restaurant added to Gourmet',
            data: { restaurants, item: doc.toObject() }
        });
    } catch (error) {
        next(error);
    }
};

/** DELETE /hero-banners/gourmet/:id */
export const deleteGourmetAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await FoodGourmetRestaurant.findByIdAndDelete(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Gourmet entry not found' });
        }
        res.status(200).json({ success: true, message: 'Restaurant removed from Gourmet', data: { id } });
    } catch (error) {
        next(error);
    }
};

/** PATCH /hero-banners/gourmet/:id/order - body: { order } */
export const updateGourmetOrderAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = parseInt(req.body?.order, 10);
        if (Number.isNaN(order)) {
            return res.status(400).json({ success: false, message: 'order must be a number' });
        }
        const doc = await FoodGourmetRestaurant.findByIdAndUpdate(id, { priority: order }, { new: true });
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Gourmet entry not found' });
        }
        res.status(200).json({ success: true, message: 'Order updated', data: doc.toObject() });
    } catch (error) {
        next(error);
    }
};

/** PATCH /hero-banners/gourmet/:id/status - toggle isActive */
export const toggleGourmetStatusAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await FoodGourmetRestaurant.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Gourmet entry not found' });
        }
        doc.isActive = !doc.isActive;
        await doc.save();
        res.status(200).json({ success: true, message: doc.isActive ? 'Activated' : 'Deactivated', data: doc.toObject() });
    } catch (error) {
        next(error);
    }
};
