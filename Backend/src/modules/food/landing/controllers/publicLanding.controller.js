import { getPublicTop10Restaurants } from '../services/top10.service.js';
import { getPublicGourmetRestaurants } from '../services/gourmet.service.js';
import { getLandingSettings } from '../services/landingSettings.service.js';
import { ZomatoHeroBanner } from '../models/heroBanner.model.js';
import { ZomatoUnder250Banner } from '../models/under250Banner.model.js';
import { ZomatoDiningBanner } from '../models/diningBanner.model.js';
import { ZomatoExploreIcon } from '../models/exploreIcon.model.js';
import { sendResponse } from '../../../../utils/response.js';

export const getPublicHeroBannersController = async (req, res, next) => {
    try {
        const docs = await ZomatoHeroBanner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        return sendResponse(res, 200, 'Hero banners fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicUnder250BannersController = async (req, res, next) => {
    try {
        const docs = await ZomatoUnder250Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        return sendResponse(res, 200, 'Under 250 banners fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicDiningBannersController = async (req, res, next) => {
    try {
        const docs = await ZomatoDiningBanner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        return sendResponse(res, 200, 'Dining banners fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicExploreIconsController = async (req, res, next) => {
    try {
        const docs = await ZomatoExploreIcon.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        return sendResponse(res, 200, 'Explore icons fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicTop10Controller = async (req, res, next) => {
    try {
        const docs = await getPublicTop10Restaurants();
        return sendResponse(res, 200, 'Top 10 restaurants fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicGourmetController = async (req, res, next) => {
    try {
        const docs = await getPublicGourmetRestaurants();
        return sendResponse(res, 200, 'Gourmet restaurants fetched', docs);
    } catch (error) {
        next(error);
    }
};

export const getPublicLandingSettingsController = async (req, res, next) => {
    try {
        const settings = await getLandingSettings();
        return sendResponse(res, 200, 'Landing settings fetched', settings);
    } catch (error) {
        next(error);
    }
};

