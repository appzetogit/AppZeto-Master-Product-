import { sendResponse, sendError } from '../../../../utils/response.js';
import {
    addRestaurantStaff,
    listRestaurantStaff,
    removeRestaurantStaff
} from '../services/restaurantStaff.service.js';

export const addRestaurantStaffController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const staff = await addRestaurantStaff(restaurantId, req.body || {}, req.file);
        return sendResponse(res, 201, 'User added successfully', { staff });
    } catch (error) {
        next(error);
    }
};

export const listRestaurantStaffController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const staff = await listRestaurantStaff(restaurantId, req.query || {});
        return sendResponse(res, 200, 'Staff fetched successfully', { staff });
    } catch (error) {
        next(error);
    }
};

export const deleteRestaurantStaffController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const result = await removeRestaurantStaff(restaurantId, req.params.id);
        if (!result) {
            return sendError(res, 404, 'User not found');
        }
        return sendResponse(res, 200, 'User removed successfully', result);
    } catch (error) {
        next(error);
    }
};

