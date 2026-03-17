import {
    listRestaurantCategories,
    createRestaurantCategory,
    updateRestaurantCategory,
    deleteRestaurantCategory
} from '../services/restaurantCategory.service.js';
import { sendResponse, sendError } from '../../../../utils/response.js';

export const listCategoriesController = async (req, res, next) => {
    try {
        const data = await listRestaurantCategories(req.query || {});
        return sendResponse(res, 200, 'Categories fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createCategoryController = async (req, res, next) => {
    try {
        const category = await createRestaurantCategory(req.body || {});
        return sendResponse(res, 201, 'Category created successfully', { category });
    } catch (error) {
        next(error);
    }
};

export const updateCategoryController = async (req, res, next) => {
    try {
        const category = await updateRestaurantCategory(req.params.id, req.body || {});
        if (!category) return sendError(res, 404, 'Category not found');
        return sendResponse(res, 200, 'Category updated successfully', { category });
    } catch (error) {
        next(error);
    }
};

export const deleteCategoryController = async (req, res, next) => {
    try {
        const result = await deleteRestaurantCategory(req.params.id);
        if (!result) return sendError(res, 404, 'Category not found');
        return sendResponse(res, 200, 'Category deleted successfully', result);
    } catch (error) {
        next(error);
    }
};

