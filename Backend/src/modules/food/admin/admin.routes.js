import express from 'express';
import mongoose from 'mongoose';
import { FoodRestaurant } from '../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../delivery/models/deliveryPartner.model.js';
import { DeliverySupportTicket } from '../delivery/models/supportTicket.model.js';
import { FoodZone } from './models/zone.model.js';
import { AuthError } from '../../../core/auth/errors.js';

const router = express.Router();

// Middleware to ensure the requester is an authenticated admin
const requireAdmin = (req, _res, next) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
        return next(new AuthError('Admin access required'));
    }
    return next();
};

router.use(requireAdmin);

/** List restaurants for admin (dropdowns, reports, etc.). Query: limit, page, status */
router.get('/restaurants', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const skip = (page - 1) * limit;
        const status = req.query.status; // optional: pending, approved, rejected

        const filter = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const [restaurants, total] = await Promise.all([
            FoodRestaurant.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('restaurantName area city profileImage status ownerName ownerPhone')
                .lean(),
            FoodRestaurant.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            data: {
                restaurants,
                total,
                page,
                limit
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/restaurants/pending', async (_req, res, next) => {
    try {
        const pending = await FoodRestaurant.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            message: 'Pending restaurants fetched successfully',
            data: pending
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/restaurants/:id/approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await FoodRestaurant.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: 'approved',
                    approvedAt: new Date(),
                    rejectedAt: undefined,
                    rejectionReason: undefined
                }
            },
            { new: true, runValidators: false }
        ).lean();
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
});

router.patch('/restaurants/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await FoodRestaurant.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: 'rejected',
                    rejectedAt: new Date(),
                    rejectionReason: typeof reason === 'string' ? reason.trim() : undefined,
                    approvedAt: null
                }
            },
            { new: true, runValidators: false }
        ).lean();
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
});

// ----- Delivery partner join requests (admin) -----
router.get('/delivery/join-requests', async (req, res, next) => {
    try {
        const { status = 'pending', page = 1, limit = 1000, search, zone, vehicleType } = req.query;
        const filter = {};

        if (status === 'pending') {
            filter.status = 'pending';
        } else if (status === 'denied' || status === 'rejected') {
            filter.status = 'rejected';
        } else {
            filter.status = status;
        }

        const andParts = [];
        if (search && typeof search === 'string' && search.trim()) {
            const term = search.trim();
            andParts.push({
                $or: [
                    { name: { $regex: term, $options: 'i' } },
                    { phone: { $regex: term, $options: 'i' } }
                ]
            });
        }
        if (zone && zone.trim()) {
            const z = zone.trim();
            andParts.push({
                $or: [
                    { city: { $regex: z, $options: 'i' } },
                    { state: { $regex: z, $options: 'i' } },
                    { address: { $regex: z, $options: 'i' } }
                ]
            });
        }
        if (andParts.length) filter.$and = andParts;
        if (vehicleType && vehicleType.trim()) {
            filter.vehicleType = { $regex: vehicleType.trim(), $options: 'i' };
        }

        const skip = Math.max(0, (Number(page) || 1) - 1) * Math.max(1, Math.min(1000, Number(limit) || 100));
        const limitNum = Math.max(1, Math.min(1000, Number(limit) || 100));

        const list = await FoodDeliveryPartner.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const requests = list.map((doc, index) => ({
            _id: doc._id,
            sl: skip + index + 1,
            name: doc.name || '',
            email: doc.email || '',
            phone: doc.phone || '',
            zone: doc.city || doc.state || doc.address || '',
            jobType: doc.jobType || '',
            vehicleType: doc.vehicleType || '',
            status: doc.status === 'rejected' ? 'denied' : doc.status,
            rejectionReason: doc.rejectionReason || undefined,
            profilePhoto: doc.profilePhoto || null,
            profileImage: doc.profilePhoto ? { url: doc.profilePhoto } : null
        }));

        res.status(200).json({
            success: true,
            message: 'Delivery join requests fetched successfully',
            data: { requests }
        });
    } catch (error) {
        next(error);
    }
});

// Delivery boy wallets (stub – returns empty list until wallet feature is implemented)
router.get('/delivery/wallets', async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Wallets fetched successfully',
            data: {
                wallets: [],
                pagination: { page: 1, limit: 100, total: 0, pages: 0 }
            }
        });
    } catch (error) {
        next(error);
    }
});

// ----- Delivery support tickets (admin) -----
router.get('/delivery/support-tickets/stats', async (_req, res, next) => {
    try {
        const [open, inProgress, resolved, closed] = await Promise.all([
            DeliverySupportTicket.countDocuments({ status: 'open' }),
            DeliverySupportTicket.countDocuments({ status: 'in_progress' }),
            DeliverySupportTicket.countDocuments({ status: 'resolved' }),
            DeliverySupportTicket.countDocuments({ status: 'closed' })
        ]);
        res.status(200).json({
            success: true,
            message: 'Support ticket stats fetched successfully',
            data: {
                total: open + inProgress + resolved + closed,
                open,
                inProgress,
                resolved,
                closed
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/delivery/support-tickets', async (req, res, next) => {
    try {
        const { status, priority, search, page = 1, limit = 100 } = req.query;
        const filter = {};

        if (status && String(status).trim()) {
            filter.status = String(status).trim();
        }
        if (priority && String(priority).trim()) {
            filter.priority = String(priority).trim();
        }
        if (search && typeof search === 'string' && search.trim()) {
            const term = search.trim();
            filter.$or = [
                { subject: { $regex: term, $options: 'i' } },
                { description: { $regex: term, $options: 'i' } },
                { ticketId: { $regex: term, $options: 'i' } }
            ];
        }

        const skip = Math.max(0, (Number(page) || 1) - 1) * Math.max(1, Math.min(500, Number(limit) || 100));
        const limitNum = Math.max(1, Math.min(500, Number(limit) || 100));

        const [list, total] = await Promise.all([
            DeliverySupportTicket.find(filter)
                .populate('deliveryPartnerId', 'name phone email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            DeliverySupportTicket.countDocuments(filter)
        ]);

        const tickets = list.map((t) => ({
            _id: t._id,
            ticketId: t.ticketId,
            subject: t.subject,
            description: t.description,
            category: t.category,
            priority: t.priority,
            status: t.status,
            adminResponse: t.adminResponse,
            respondedAt: t.respondedAt,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            deliveryPartner: t.deliveryPartnerId
                ? {
                    _id: t.deliveryPartnerId._id,
                    name: t.deliveryPartnerId.name || '',
                    phone: t.deliveryPartnerId.phone || '',
                    email: t.deliveryPartnerId.email || ''
                }
                : null
        }));

        res.status(200).json({
            success: true,
            message: 'Support tickets fetched successfully',
            data: {
                tickets,
                pagination: {
                    page: Number(page) || 1,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum) || 1
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/delivery/support-tickets/:id', async (req, res, next) => {
    try {
        const ticket = await DeliverySupportTicket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }
        const { status, adminResponse } = req.body || {};
        if (status !== undefined) {
            const allowed = ['open', 'in_progress', 'resolved', 'closed'];
            if (allowed.includes(String(status))) {
                ticket.status = String(status);
            }
        }
        if (adminResponse !== undefined) {
            ticket.adminResponse = typeof adminResponse === 'string' ? adminResponse.trim() : '';
            if (ticket.adminResponse) {
                ticket.respondedAt = new Date();
            }
        }
        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Support ticket updated successfully',
            data: ticket.toObject()
        });
    } catch (error) {
        next(error);
    }
});

// List approved delivery partners (for Deliveryman List page)
router.get('/delivery/partners', async (req, res, next) => {
    try {
        const { page = 1, limit = 1000, search } = req.query;
        const filter = { status: 'approved' };

        if (search && typeof search === 'string' && search.trim()) {
            const term = search.trim();
            filter.$or = [
                { name: { $regex: term, $options: 'i' } },
                { phone: { $regex: term, $options: 'i' } },
                { email: { $regex: term, $options: 'i' } },
                { city: { $regex: term, $options: 'i' } },
                { state: { $regex: term, $options: 'i' } }
            ];
        }

        const skip = Math.max(0, (Number(page) || 1) - 1) * Math.max(1, Math.min(1000, Number(limit) || 100));
        const limitNum = Math.max(1, Math.min(1000, Number(limit) || 100));

        const [list, total] = await Promise.all([
            FoodDeliveryPartner.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            FoodDeliveryPartner.countDocuments(filter)
        ]);

        const deliveryPartners = list.map((doc, index) => ({
            _id: doc._id,
            sl: skip + index + 1,
            name: doc.name || '',
            email: doc.email || '',
            phone: doc.phone || '',
            zone: doc.city || doc.state || doc.address || '',
            vehicleType: doc.vehicleType || '',
            status: doc.status,
            profilePhoto: doc.profilePhoto || null,
            profileImage: doc.profilePhoto ? { url: doc.profilePhoto } : null
        }));

        res.status(200).json({
            success: true,
            message: 'Delivery partners fetched successfully',
            data: {
                deliveryPartners,
                pagination: {
                    page: Number(page) || 1,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum) || 1
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/delivery/:id', async (req, res, next) => {
    try {
        const partner = await FoodDeliveryPartner.findById(req.params.id).lean();
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        const deliveryId = partner._id
            ? `DP-${partner._id.toString().slice(-8).toUpperCase()}`
            : null;
        const delivery = {
            ...partner,
            email: partner.email || null,
            deliveryId,
            status: partner.status === 'rejected' ? 'blocked' : partner.status,
            profileImage: partner.profilePhoto ? { url: partner.profilePhoto } : null,
            documents: {
                aadhar: (partner.aadharPhoto || partner.aadharNumber) ? {
                    number: partner.aadharNumber || null,
                    document: partner.aadharPhoto || null
                } : null,
                pan: (partner.panPhoto || partner.panNumber) ? {
                    number: partner.panNumber || null,
                    document: partner.panPhoto || null
                } : null,
                drivingLicense: partner.drivingLicensePhoto ? {
                    document: partner.drivingLicensePhoto
                } : null,
                bankDetails: (partner.bankAccountHolderName || partner.bankAccountNumber || partner.bankIfscCode || partner.bankName) ? {
                    accountHolderName: partner.bankAccountHolderName || null,
                    accountNumber: partner.bankAccountNumber || null,
                    ifscCode: partner.bankIfscCode || null,
                    bankName: partner.bankName || null
                } : null
            },
            location: (partner.address || partner.city || partner.state) ? {
                addressLine1: partner.address,
                city: partner.city,
                state: partner.state
            } : null,
            vehicle: (partner.vehicleType || partner.vehicleName || partner.vehicleNumber) ? {
                type: partner.vehicleType,
                brand: partner.vehicleName,
                model: partner.vehicleName,
                number: partner.vehicleNumber
            } : null
        };
        res.status(200).json({
            success: true,
            message: 'Delivery partner fetched successfully',
            data: { delivery }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/delivery/:id/approve', async (req, res, next) => {
    try {
        const partner = await FoodDeliveryPartner.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        partner.status = 'approved';
        partner.approvedAt = new Date();
        partner.rejectedAt = undefined;
        partner.rejectionReason = undefined;
        await partner.save();

        res.status(200).json({
            success: true,
            message: 'Delivery partner approved successfully',
            data: partner.toObject()
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/delivery/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const reason = req.body?.reason != null ? String(req.body.reason).trim() : '';
        const partner = await FoodDeliveryPartner.findById(id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found'
            });
        }
        partner.status = 'rejected';
        partner.rejectedAt = new Date();
        partner.rejectionReason = reason || undefined;
        await partner.save();

        res.status(200).json({
            success: true,
            message: 'Delivery partner rejected successfully',
            data: partner.toObject()
        });
    } catch (error) {
        next(error);
    }
});

// ========== Zone CRUD (delivery zones for admin) ==========

/** List zones. Query: limit, page, isActive, search */
router.get('/zones', async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const skip = (page - 1) * limit;
        const isActive = req.query.isActive;
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

        const filter = {};
        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true' || isActive === '1';
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { zoneName: { $regex: search, $options: 'i' } },
                { serviceLocation: { $regex: search, $options: 'i' } },
                { country: { $regex: search, $options: 'i' } }
            ];
        }

        const [zones, total] = await Promise.all([
            FoodZone.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            FoodZone.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            message: 'Zones fetched successfully',
            data: { zones, total, page, limit }
        });
    } catch (error) {
        next(error);
    }
});

/** Get single zone by id */
router.get('/zones/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const zone = await FoodZone.findById(id).lean();
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
});

/** Create zone. Body: name, zoneName?, country?, unit?, coordinates, isActive? */
router.post('/zones', async (req, res, next) => {
    try {
        const body = req.body || {};
        const name = typeof body.name === 'string' ? body.name.trim() : (body.zoneName && body.zoneName.trim()) || '';
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Zone name is required'
            });
        }
        const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];
        if (coordinates.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'At least 3 coordinates (polygon points) are required'
            });
        }

        const normalized = coordinates.map((c) => ({
            latitude: Number(c.latitude) || 0,
            longitude: Number(c.longitude) || 0
        }));

        const zone = new FoodZone({
            name,
            zoneName: body.zoneName && body.zoneName.trim() ? body.zoneName.trim() : name,
            country: (body.country && body.country.trim()) || 'India',
            serviceLocation: (body.serviceLocation && body.serviceLocation.trim()) || name,
            unit: body.unit === 'miles' ? 'miles' : 'kilometer',
            coordinates: normalized,
            isActive: body.isActive !== false
        });
        await zone.save();

        res.status(201).json({
            success: true,
            message: 'Zone created successfully',
            data: { zone: zone.toObject() }
        });
    } catch (error) {
        next(error);
    }
});

/** Update zone. Body: name?, zoneName?, country?, unit?, coordinates?, isActive? */
router.patch('/zones/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const zone = await FoodZone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        if (body.name !== undefined) zone.name = String(body.name).trim();
        if (body.zoneName !== undefined) zone.zoneName = String(body.zoneName).trim();
        if (body.country !== undefined) zone.country = String(body.country).trim();
        if (body.serviceLocation !== undefined) zone.serviceLocation = String(body.serviceLocation).trim();
        if (body.unit !== undefined) zone.unit = body.unit === 'miles' ? 'miles' : 'kilometer';
        if (body.isActive !== undefined) zone.isActive = body.isActive !== false;
        if (Array.isArray(body.coordinates) && body.coordinates.length >= 3) {
            zone.coordinates = body.coordinates.map((c) => ({
                latitude: Number(c.latitude) || 0,
                longitude: Number(c.longitude) || 0
            }));
        }
        if (zone.name) zone.serviceLocation = zone.serviceLocation || zone.name;

        await zone.save();

        res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            data: { zone: zone.toObject() }
        });
    } catch (error) {
        next(error);
    }
});

/** Delete zone */
router.delete('/zones/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const zone = await FoodZone.findByIdAndDelete(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully',
            data: { id }
        });
    } catch (error) {
        next(error);
    }
});

export default router;

