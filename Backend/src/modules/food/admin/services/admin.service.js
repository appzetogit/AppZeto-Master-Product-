import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { DeliverySupportTicket } from '../../delivery/models/supportTicket.model.js';
import { FoodZone } from '../models/zone.model.js';
import { FoodCategory } from '../models/category.model.js';
import { FoodItem } from '../models/food.model.js';
import { FoodOffer } from '../models/offer.model.js';

// ----- Restaurants -----
export async function getRestaurants(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const status = query.status;
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
    return { restaurants, total, page, limit };
}

export async function getRestaurantById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return FoodRestaurant.findById(id).select('-__v').lean();
}

export async function getRestaurantMenuById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id).select('menu').lean();
    if (!doc) return null;
    return doc.menu || { sections: [] };
}

export async function updateRestaurantMenuById(id, menu) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id);
    if (!doc) return null;
    const sections = Array.isArray(menu?.sections) ? menu.sections : [];
    doc.menu = { sections };
    await doc.save();
    return doc.menu || { sections: [] };
}

export async function getPendingRestaurants() {
    return FoodRestaurant.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
}

// ----- Categories -----
export async function getCategories(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim();
        filter.$or = [{ name: { $regex: term, $options: 'i' } }];
    }

    const [list, total] = await Promise.all([
        FoodCategory.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodCategory.countDocuments(filter)
    ]);

    const categories = list.map((c) => ({
        id: c._id,
        name: c.name,
        image: c.image || '',
        type: c.type || '',
        status: c.isActive !== false,
        isActive: c.isActive !== false,
        sortOrder: c.sortOrder || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
    }));

    return { categories, total, page, limit };
}

export async function createCategory(body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Category name is required');
    const doc = new FoodCategory({
        name,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        type: typeof body.type === 'string' ? body.type.trim() : '',
        isActive: body.isActive !== false,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    });
    await doc.save();
    return doc.toObject();
}

export async function updateCategory(id, body) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;
    if (body.name !== undefined) doc.name = String(body.name || '').trim();
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.type !== undefined) doc.type = String(body.type || '').trim();
    if (body.isActive !== undefined) doc.isActive = body.isActive !== false;
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    await doc.save();
    return doc.toObject();
}

export async function deleteCategory(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await FoodCategory.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

export async function toggleCategoryStatus(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;
    doc.isActive = !doc.isActive;
    await doc.save();
    return doc.toObject();
}

// ----- Foods (separate collection) -----
export async function getFoods(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const filter = {};

    if (query.restaurantId && mongoose.Types.ObjectId.isValid(query.restaurantId)) {
        filter.restaurantId = query.restaurantId;
    }
    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim();
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { categoryName: { $regex: term, $options: 'i' } }
        ];
    }
    if (query.approvalStatus && ['pending', 'approved', 'rejected'].includes(String(query.approvalStatus))) {
        filter.approvalStatus = String(query.approvalStatus);
    }

    const [list, total] = await Promise.all([
        FoodItem.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodItem.countDocuments(filter)
    ]);

    const restaurantIds = Array.from(new Set(list.map((f) => String(f.restaurantId)).filter(Boolean)));
    const restaurants = restaurantIds.length
        ? await FoodRestaurant.find({ _id: { $in: restaurantIds } }).select('restaurantName').lean()
        : [];
    const restaurantMap = new Map(restaurants.map((r) => [String(r._id), r.restaurantName]));

    const foods = list.map((f) => ({
        id: f._id,
        _id: f._id,
        restaurantId: f.restaurantId,
        restaurantName: restaurantMap.get(String(f.restaurantId)) || 'Unknown Restaurant',
        categoryId: f.categoryId || null,
        categoryName: f.categoryName || '',
        name: f.name,
        description: f.description || '',
        price: f.price || 0,
        image: f.image || '',
        foodType: f.foodType || 'Non-Veg',
        isAvailable: f.isAvailable !== false,
        preparationTime: f.preparationTime || '',
        approvalStatus: f.approvalStatus || 'approved',
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
    }));

    return { foods, total, page, limit };
}

export async function createFood(body) {
    const restaurantId = body.restaurantId;
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new ValidationError('Valid restaurantId is required');
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Food name is required');
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) throw new ValidationError('Price must be greater than 0');

    let categoryId = null;
    let categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : '';
    if (body.categoryId && mongoose.Types.ObjectId.isValid(body.categoryId)) {
        categoryId = body.categoryId;
        const cat = await FoodCategory.findById(categoryId).select('name').lean();
        if (cat?.name) categoryName = cat.name;
    }
    if (!categoryName && typeof body.category === 'string') categoryName = body.category.trim();
    if (!categoryName) throw new ValidationError('Category is required');

    const doc = new FoodItem({
        restaurantId,
        categoryId,
        categoryName,
        name,
        description: typeof body.description === 'string' ? body.description.trim() : '',
        price,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        foodType: body.foodType === 'Veg' ? 'Veg' : 'Non-Veg',
        isAvailable: body.isAvailable !== false,
        preparationTime: typeof body.preparationTime === 'string' ? body.preparationTime.trim() : '',
        approvalStatus: 'approved'
    });
    await doc.save();
    return doc.toObject();
}

export async function updateFood(id, body) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodItem.findById(id);
    if (!doc) return null;
    if (body.name !== undefined) doc.name = String(body.name || '').trim();
    if (body.description !== undefined) doc.description = String(body.description || '').trim();
    if (body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0) throw new ValidationError('Price must be greater than 0');
        doc.price = price;
    }
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.foodType !== undefined) doc.foodType = body.foodType === 'Veg' ? 'Veg' : 'Non-Veg';
    if (body.isAvailable !== undefined) doc.isAvailable = body.isAvailable !== false;
    if (body.preparationTime !== undefined) doc.preparationTime = String(body.preparationTime || '').trim();
    if (body.categoryId !== undefined && mongoose.Types.ObjectId.isValid(body.categoryId)) {
        doc.categoryId = body.categoryId;
        const cat = await FoodCategory.findById(body.categoryId).select('name').lean();
        if (cat?.name) doc.categoryName = cat.name;
    } else if (body.categoryName !== undefined) {
        doc.categoryName = String(body.categoryName || '').trim();
    } else if (body.category !== undefined) {
        doc.categoryName = String(body.category || '').trim();
    }
    await doc.save();
    return doc.toObject();
}

export async function deleteFood(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await FoodItem.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

/** Admin creates a restaurant (JSON body with image URLs already uploaded). Single API. */
export async function createRestaurantByAdmin(body) {
    const loc = body.location || {};
    const toStr = (v) => (v != null && v !== undefined ? String(v).trim() : '');
    const toUrl = (v) => (v && (typeof v === 'string' ? v : v.url)) ? (typeof v === 'string' ? v : v.url) : undefined;
    const menuUrls = Array.isArray(body.menuImages)
        ? body.menuImages.map((m) => toUrl(m)).filter(Boolean)
        : [];

    const doc = {
        restaurantName: toStr(body.restaurantName) || toStr(body.name),
        ownerName: toStr(body.ownerName),
        ownerEmail: toStr(body.ownerEmail),
        ownerPhone: toStr(body.ownerPhone),
        primaryContactNumber: toStr(body.primaryContactNumber) || toStr(body.ownerPhone),
        addressLine1: toStr(loc.addressLine1),
        addressLine2: toStr(loc.addressLine2),
        area: toStr(loc.area),
        city: toStr(loc.city),
        state: toStr(loc.state),
        pincode: toStr(loc.pincode),
        landmark: toStr(loc.landmark),
        cuisines: Array.isArray(body.cuisines) ? body.cuisines : [],
        openingTime: toStr(body.openingTime) || '09:00',
        closingTime: toStr(body.closingTime) || '22:00',
        openDays: Array.isArray(body.openDays) ? body.openDays : [],
        panNumber: toStr(body.panNumber),
        nameOnPan: toStr(body.nameOnPan),
        gstRegistered: Boolean(body.gstRegistered),
        gstNumber: toStr(body.gstNumber),
        gstLegalName: toStr(body.gstLegalName),
        gstAddress: toStr(body.gstAddress),
        fssaiNumber: toStr(body.fssaiNumber),
        fssaiExpiry: body.fssaiExpiry ? new Date(body.fssaiExpiry) : undefined,
        accountNumber: toStr(body.accountNumber),
        ifscCode: toStr(body.ifscCode),
        accountHolderName: toStr(body.accountHolderName),
        accountType: toStr(body.accountType),
        menuImages: menuUrls,
        profileImage: toUrl(body.profileImage),
        panImage: toUrl(body.panImage),
        gstImage: toUrl(body.gstImage),
        fssaiImage: toUrl(body.fssaiImage),
        estimatedDeliveryTime: toStr(body.estimatedDeliveryTime),
        featuredDish: toStr(body.featuredDish),
        featuredPrice: typeof body.featuredPrice === 'number' ? body.featuredPrice : (parseFloat(body.featuredPrice) || undefined),
        offer: toStr(body.offer),
        diningSettings: body.diningSettings && typeof body.diningSettings === 'object'
            ? {
                isEnabled: Boolean(body.diningSettings.isEnabled),
                maxGuests: Math.max(1, parseInt(body.diningSettings.maxGuests, 10) || 6),
                diningType: toStr(body.diningSettings.diningType) || 'family-dining'
            }
            : undefined,
        status: 'approved',
        approvedAt: new Date()
    };

    if (!doc.restaurantName || !doc.ownerName) {
        throw new ValidationError('Restaurant name and owner name are required');
    }
    if (!doc.ownerPhone && !doc.primaryContactNumber) {
        throw new ValidationError('Owner phone or primary contact number is required');
    }

    const restaurant = await FoodRestaurant.create(doc);
    return restaurant.toObject();
}

export async function approveRestaurant(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return FoodRestaurant.findByIdAndUpdate(
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
}

export async function rejectRestaurant(id, reason) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return FoodRestaurant.findByIdAndUpdate(
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
}

// ----- Offers & Coupons -----
export async function getAllOffers(_query = {}) {
    const list = await FoodOffer.find({})
        .sort({ createdAt: -1 })
        .populate({ path: 'restaurantId', select: 'restaurantName' })
        .lean();

    const offers = list.map((o, index) => {
        const restaurantName =
            o.restaurantScope === 'selected'
                ? (o.restaurantId?.restaurantName || 'Selected Restaurant')
                : 'All Restaurants';

        const discountPercentage = o.discountType === 'percentage' ? Number(o.discountValue) : 0;

        // UI expects dish-level fields; for admin-created coupons we treat as "All Items".
        const originalPrice = o.discountType === 'flat-price' ? Number(o.discountValue) : 0;
        const discountedPrice = 0;

        return {
            sl: index + 1,
            offerId: String(o._id),
            dishId: 'all',
            restaurantName,
            dishName: 'All Items',
            couponCode: o.couponCode,
            customerGroup: o.customerScope === 'first-time' ? 'new' : 'all',
            discountType: o.discountType,
            discountPercentage,
            originalPrice,
            discountedPrice,
            status: o.status || 'active',
            showInCart: o.showInCart !== false,
            endDate: o.endDate || null
        };
    });

    return { offers };
}

export async function createAdminOffer(body) {
    const existing = await FoodOffer.findOne({ couponCode: body.couponCode }).lean();
    if (existing) {
        throw new ValidationError('Coupon code already exists');
    }

    const doc = await FoodOffer.create({
        couponCode: body.couponCode,
        discountType: body.discountType,
        discountValue: body.discountValue,
        customerScope: body.customerScope,
        restaurantScope: body.restaurantScope,
        restaurantId: body.restaurantScope === 'selected' ? body.restaurantId : undefined,
        endDate: body.endDate,
        status: 'active',
        showInCart: true
    });
    return doc.toObject();
}

export async function updateAdminOfferCartVisibility(offerId, itemId, showInCart) {
    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) return null;
    // We currently store a single showInCart flag per coupon; itemId is kept for frontend compatibility.
    if (!itemId) return null;
    const updated = await FoodOffer.findByIdAndUpdate(
        offerId,
        { $set: { showInCart: Boolean(showInCart) } },
        { new: true }
    ).lean();
    return updated;
}

// ----- Delivery join requests -----
export async function getDeliveryJoinRequests(query) {
    const { status = 'pending', page = 1, limit = 1000, search, zone, vehicleType } = query;
    const filter = {};
    if (status === 'pending') filter.status = 'pending';
    else if (status === 'denied' || status === 'rejected') filter.status = 'rejected';
    else filter.status = status;

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

    return { requests };
}

export function getDeliveryWalletsStub() {
    return {
        wallets: [],
        pagination: { page: 1, limit: 100, total: 0, pages: 0 }
    };
}

// ----- Support tickets -----
export async function getSupportTicketStats() {
    const [open, inProgress, resolved, closed] = await Promise.all([
        DeliverySupportTicket.countDocuments({ status: 'open' }),
        DeliverySupportTicket.countDocuments({ status: 'in_progress' }),
        DeliverySupportTicket.countDocuments({ status: 'resolved' }),
        DeliverySupportTicket.countDocuments({ status: 'closed' })
    ]);
    return {
        total: open + inProgress + resolved + closed,
        open,
        inProgress,
        resolved,
        closed
    };
}

export async function getSupportTickets(query) {
    const { status, priority, search, page = 1, limit = 100 } = query;
    const filter = {};
    if (status && String(status).trim()) filter.status = String(status).trim();
    if (priority && String(priority).trim()) filter.priority = String(priority).trim();
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

    return {
        tickets,
        pagination: {
            page: Number(page) || 1,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1
        }
    };
}

export async function updateSupportTicket(id, body) {
    const ticket = await DeliverySupportTicket.findById(id);
    if (!ticket) return null;
    const { status, adminResponse } = body || {};
    if (status !== undefined) {
        const allowed = ['open', 'in_progress', 'resolved', 'closed'];
        if (allowed.includes(String(status))) ticket.status = String(status);
    }
    if (adminResponse !== undefined) {
        ticket.adminResponse = typeof adminResponse === 'string' ? adminResponse.trim() : '';
        if (ticket.adminResponse) ticket.respondedAt = new Date();
    }
    await ticket.save();
    return ticket.toObject();
}

// ----- Delivery partners (approved list) -----
export async function getDeliveryPartners(query) {
    const { page = 1, limit = 1000, search } = query;
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

    return {
        deliveryPartners,
        pagination: {
            page: Number(page) || 1,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum) || 1
        }
    };
}

export async function getDeliveryPartnerById(id) {
    const partner = await FoodDeliveryPartner.findById(id).lean();
    if (!partner) return null;
    const deliveryId = partner._id ? `DP-${partner._id.toString().slice(-8).toUpperCase()}` : null;
    return {
        ...partner,
        email: partner.email || null,
        deliveryId,
        status: partner.status === 'rejected' ? 'blocked' : partner.status,
        profileImage: partner.profilePhoto ? { url: partner.profilePhoto } : null,
        documents: {
            aadhar: (partner.aadharPhoto || partner.aadharNumber)
                ? { number: partner.aadharNumber || null, document: partner.aadharPhoto || null }
                : null,
            pan: (partner.panPhoto || partner.panNumber)
                ? { number: partner.panNumber || null, document: partner.panPhoto || null }
                : null,
            drivingLicense: partner.drivingLicensePhoto ? { document: partner.drivingLicensePhoto } : null,
            bankDetails:
                partner.bankAccountHolderName || partner.bankAccountNumber || partner.bankIfscCode || partner.bankName
                    ? {
                        accountHolderName: partner.bankAccountHolderName || null,
                        accountNumber: partner.bankAccountNumber || null,
                        ifscCode: partner.bankIfscCode || null,
                        bankName: partner.bankName || null
                    }
                    : null
        },
        location: (partner.address || partner.city || partner.state)
            ? { addressLine1: partner.address, city: partner.city, state: partner.state }
            : null,
        vehicle: (partner.vehicleType || partner.vehicleName || partner.vehicleNumber)
            ? {
                type: partner.vehicleType,
                brand: partner.vehicleName,
                model: partner.vehicleName,
                number: partner.vehicleNumber
            }
            : null
    };
}

export async function approveDeliveryPartner(id) {
    const partner = await FoodDeliveryPartner.findById(id);
    if (!partner) return null;
    partner.status = 'approved';
    partner.approvedAt = new Date();
    partner.rejectedAt = undefined;
    partner.rejectionReason = undefined;
    await partner.save();
    return partner.toObject();
}

export async function rejectDeliveryPartner(id, reason) {
    const partner = await FoodDeliveryPartner.findById(id);
    if (!partner) return null;
    partner.status = 'rejected';
    partner.rejectedAt = new Date();
    partner.rejectionReason = reason || undefined;
    await partner.save();
    return partner.toObject();
}

// ----- Zones CRUD -----
export async function getZones(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const isActive = query.isActive;
    const search = typeof query.search === 'string' ? query.search.trim() : '';

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
    return { zones, total, page, limit };
}

export async function getZoneById(id) {
    return FoodZone.findById(id).lean();
}

export async function createZone(body) {
    const name = typeof body.name === 'string' ? body.name.trim() : (body.zoneName && body.zoneName.trim()) || '';
    if (!name) return { error: 'Zone name is required' };
    const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];
    if (coordinates.length < 3) return { error: 'At least 3 coordinates (polygon points) are required' };

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
    return { zone: zone.toObject() };
}

export async function updateZone(id, body) {
    const zone = await FoodZone.findById(id);
    if (!zone) return null;

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
    return { zone: zone.toObject() };
}

export async function deleteZone(id) {
    const zone = await FoodZone.findByIdAndDelete(id);
    return zone ? { id } : null;
}
