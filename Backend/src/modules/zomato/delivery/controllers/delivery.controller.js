import { registerDeliveryPartner } from '../services/delivery.service.js';
import { validateDeliveryRegisterDto } from '../validators/delivery.validator.js';
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

