import { registerDeliveryPartner, updateDeliveryPartnerProfile, listDeliveryPartnerJoinRequests } from '../services/delivery.service.js';
import { validateDeliveryRegisterDto, validateDeliveryProfileUpdateDto } from '../validators/delivery.validator.js';
import { sendResponse } from '../../../../utils/response.js';

export const registerDeliveryPartnerController = async (req, res, next) => {
    try {
        const validated = validateDeliveryRegisterDto(req.body);
        const partner = await registerDeliveryPartner(validated, req.files);
        return sendResponse(res, 201, 'Delivery partner registered successfully', partner);
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerProfileController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const validated = validateDeliveryProfileUpdateDto(req.body);
        const partner = await updateDeliveryPartnerProfile(userId, validated, req.files);
        return sendResponse(res, 200, 'Profile updated successfully', partner);
    } catch (error) {
        next(error);
    }
};

export const getDeliveryPartnerJoinRequestsController = async (req, res, next) => {
    try {
        const { status, search, vehicleType, page, limit } = req.query;
        const result = await listDeliveryPartnerJoinRequests({ status, search, vehicleType, page, limit });
        return sendResponse(res, 200, 'Delivery partner join requests fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

