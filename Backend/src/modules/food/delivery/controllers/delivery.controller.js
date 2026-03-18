import { registerDeliveryPartner, updateDeliveryPartnerProfile, updateDeliveryPartnerBankDetails, listSupportTicketsByPartner, createSupportTicket, getSupportTicketByIdAndPartner, updateDeliveryPartnerDetails, updateDeliveryPartnerProfilePhotoBase64, updateDeliveryAvailability, getDeliveryPartnerWallet, getDeliveryPartnerEarnings, getDeliveryPartnerTripHistory, getDeliveryPocketDetails } from '../services/delivery.service.js';
import { getDeliveryCashLimitSettings, getDeliveryEmergencyHelp } from '../../admin/services/admin.service.js';
import { validateDeliveryRegisterDto, validateDeliveryProfileUpdateDto, validateDeliveryBankDetailsDto } from '../validators/delivery.validator.js';
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
        const result = await updateDeliveryPartnerProfile(userId, validated, req.files);
        return sendResponse(res, 200, 'Profile updated successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerDetailsController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const partner = await updateDeliveryPartnerDetails(userId, req.body || {});
        return sendResponse(res, 200, 'Profile updated successfully', { partner });
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerProfilePhotoBase64Controller = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const partner = await updateDeliveryPartnerProfilePhotoBase64(userId, req.body || {});
        return sendResponse(res, 200, 'Profile photo updated successfully', { partner });
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerBankDetailsController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const validated = validateDeliveryBankDetailsDto(req.body);
        const partner = await updateDeliveryPartnerBankDetails(userId, validated);
        const data = {
            bankDetails: {
                accountHolderName: partner.bankAccountHolderName,
                accountNumber: partner.bankAccountNumber,
                ifscCode: partner.bankIfscCode,
                bankName: partner.bankName
            },
            panNumber: partner.panNumber
        };
        return sendResponse(res, 200, 'Bank details updated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const listSupportTicketsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const tickets = await listSupportTicketsByPartner(deliveryPartnerId);
        return sendResponse(res, 200, 'Tickets fetched successfully', { tickets });
    } catch (error) {
        next(error);
    }
};

export const createSupportTicketController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const ticket = await createSupportTicket(deliveryPartnerId, req.body);
        return sendResponse(res, 201, 'Ticket created successfully', ticket);
    } catch (error) {
        next(error);
    }
};

export const getSupportTicketByIdController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const ticket = await getSupportTicketByIdAndPartner(req.params.id, deliveryPartnerId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        return sendResponse(res, 200, 'Ticket fetched successfully', ticket);
    } catch (error) {
        next(error);
    }
};

export const updateAvailabilityController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const data = await updateDeliveryAvailability(userId, req.body || {});
        return sendResponse(res, 200, 'Availability updated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getWalletController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const wallet = await getDeliveryPartnerWallet(deliveryPartnerId);
        return sendResponse(res, 200, 'Wallet fetched successfully', { wallet });
    } catch (error) {
        next(error);
    }
};

export const getEarningsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPartnerEarnings(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Earnings fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getTripHistoryController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPartnerTripHistory(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Trip history fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getPocketDetailsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPocketDetails(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Pocket details fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getEmergencyHelpController = async (req, res, next) => {
    try {
        const data = await getDeliveryEmergencyHelp();
        return sendResponse(res, 200, 'Emergency help fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getCashLimitController = async (req, res, next) => {
    try {
        const data = await getDeliveryCashLimitSettings();
        return sendResponse(res, 200, 'Cash limit fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

