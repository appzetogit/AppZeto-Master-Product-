import mongoose from 'mongoose';
import * as adminService from '../services/admin.service.js';
import { validateCategoryListQuery, validateCategoryUpsertDto } from '../validators/category.validator.js';
import { validateCreateOfferDto, validateUpdateOfferCartVisibilityDto } from '../validators/offer.validator.js';

// ----- Restaurants -----
export async function getRestaurants(req, res, next) {
    try {
        const data = await adminService.getRestaurants(req.query);
        res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const restaurant = await adminService.getRestaurantById(id);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant fetched successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantMenuById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const menu = await adminService.getRestaurantMenuById(id);
        if (!menu) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Menu fetched successfully', data: { menu } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantMenuById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const menu = await adminService.updateRestaurantMenuById(id, req.body || {});
        if (!menu) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Menu updated successfully', data: { menu } });
    } catch (error) {
        next(error);
    }
}

// ----- Foods -----
export async function getFoods(req, res, next) {
    try {
        const data = await adminService.getFoods(req.query || {});
        res.status(200).json({ success: true, message: 'Foods fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createFood(req, res, next) {
    try {
        const created = await adminService.createFood(req.body || {});
        res.status(201).json({ success: true, message: 'Food created successfully', data: { food: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateFood(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid food id' });
        }
        const updated = await adminService.updateFood(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }
        res.status(200).json({ success: true, message: 'Food updated successfully', data: { food: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteFood(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid food id' });
        }
        const result = await adminService.deleteFood(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }
        res.status(200).json({ success: true, message: 'Food deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

// ----- Categories -----
export async function getCategories(req, res, next) {
    try {
        const query = validateCategoryListQuery(req.query || {});
        const data = await adminService.getCategories(query);
        res.status(200).json({ success: true, message: 'Categories fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createCategory(req, res, next) {
    try {
        const body = validateCategoryUpsertDto(req.body || {});
        const created = await adminService.createCategory(body);
        res.status(201).json({ success: true, message: 'Category created successfully', data: { category: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const body = validateCategoryUpsertDto(req.body || {});
        const updated = await adminService.updateCategory(id, body);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category updated successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const result = await adminService.deleteCategory(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function toggleCategoryStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const updated = await adminService.toggleCategoryStatus(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category status updated successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

// ----- Offers & Coupons -----
export async function getAllOffers(req, res, next) {
    try {
        const data = await adminService.getAllOffers(req.query || {});
        res.status(200).json({ success: true, message: 'Offers fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createAdminOffer(req, res, next) {
    try {
        const body = validateCreateOfferDto(req.body || {});
        const created = await adminService.createAdminOffer(body);
        res.status(201).json({ success: true, message: 'Offer created successfully', data: { offer: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateAdminOfferCartVisibility(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid offer id' });
        }
        const body = validateUpdateOfferCartVisibilityDto(req.body || {});
        const updated = await adminService.updateAdminOfferCartVisibility(id, body.itemId, body.showInCart);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }
        res.status(200).json({ success: true, message: 'Offer updated successfully', data: { offer: updated } });
    } catch (error) {
        next(error);
    }
}

export async function getPendingRestaurants(req, res, next) {
    try {
        const pending = await adminService.getPendingRestaurants();
        res.status(200).json({
            success: true,
            message: 'Pending restaurants fetched successfully',
            data: pending
        });
    } catch (error) {
        next(error);
    }
}

export async function approveRestaurant(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await adminService.approveRestaurant(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant approved successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function createRestaurant(req, res, next) {
    try {
        const restaurant = await adminService.createRestaurantByAdmin(req.body || {});
        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function rejectRestaurant(req, res, next) {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await adminService.rejectRestaurant(id, reason);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant rejected successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

// ----- Delivery join requests -----
export async function getDeliveryJoinRequests(req, res, next) {
    try {
        const data = await adminService.getDeliveryJoinRequests(req.query);
        res.status(200).json({
            success: true,
            message: 'Delivery join requests fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getDeliveryWallets(req, res, next) {
    try {
        const data = adminService.getDeliveryWalletsStub();
        res.status(200).json({
            success: true,
            message: 'Wallets fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

// ----- Support tickets -----
export async function getSupportTicketStats(req, res, next) {
    try {
        const data = await adminService.getSupportTicketStats();
        res.status(200).json({
            success: true,
            message: 'Support ticket stats fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getSupportTickets(req, res, next) {
    try {
        const data = await adminService.getSupportTickets(req.query);
        res.status(200).json({
            success: true,
            message: 'Support tickets fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSupportTicket(req, res, next) {
    try {
        const ticket = await adminService.updateSupportTicket(req.params.id, req.body);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Support ticket updated successfully',
            data: ticket
        });
    } catch (error) {
        next(error);
    }
}

// ----- Delivery partners -----
export async function getDeliveryPartners(req, res, next) {
    try {
        const data = await adminService.getDeliveryPartners(req.query);
        res.status(200).json({
            success: true,
            message: 'Delivery partners fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getDeliveryPartnerById(req, res, next) {
    try {
        const delivery = await adminService.getDeliveryPartnerById(req.params.id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Delivery partner fetched successfully',
            data: { delivery }
        });
    } catch (error) {
        next(error);
    }
}

export async function approveDeliveryPartner(req, res, next) {
    try {
        const partner = await adminService.approveDeliveryPartner(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Delivery partner approved successfully',
            data: partner
        });
    } catch (error) {
        next(error);
    }
}

export async function rejectDeliveryPartner(req, res, next) {
    try {
        const reason = req.body?.reason != null ? String(req.body.reason).trim() : '';
        const partner = await adminService.rejectDeliveryPartner(req.params.id, reason);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Delivery partner rejected successfully',
            data: partner
        });
    } catch (error) {
        next(error);
    }
}

// ----- Zones -----
export async function getZones(req, res, next) {
    try {
        const data = await adminService.getZones(req.query);
        res.status(200).json({
            success: true,
            message: 'Zones fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getZoneById(req, res, next) {
    try {
        const zone = await adminService.getZoneById(req.params.id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone fetched successfully',
            data: { zone }
        });
    } catch (error) {
        next(error);
    }
}

export async function createZone(req, res, next) {
    try {
        const result = await adminService.createZone(req.body || {});
        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }
        res.status(201).json({
            success: true,
            message: 'Zone created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function updateZone(req, res, next) {
    try {
        const result = await adminService.updateZone(req.params.id, req.body || {});
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteZone(req, res, next) {
    try {
        const result = await adminService.deleteZone(req.params.id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}
