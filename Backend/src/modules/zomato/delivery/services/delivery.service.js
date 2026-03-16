import { FoodDeliveryPartner } from '../../food/delivery/models/deliveryPartner.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const registerDeliveryPartner = async (payload, files) => {
    const { name, phone, countryCode, address, city, state, vehicleType, vehicleName, vehicleNumber, panNumber, aadharNumber } =
        payload;

    const existing = await FoodDeliveryPartner.findOne({ phone }).lean();
    if (existing) {
        throw new ValidationError('Delivery partner with this phone already exists');
    }

    const images = {};

    if (files?.profilePhoto?.[0]) {
        images.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'food/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        images.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'food/delivery/aadhar');
    }
    if (files?.panPhoto?.[0]) {
        images.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'food/delivery/pan');
    }
    if (files?.drivingLicensePhoto?.[0]) {
        images.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'food/delivery/license'
        );
    }

    const partner = await FoodDeliveryPartner.create({
        name,
        phone,
        countryCode,
        address,
        city,
        state,
        vehicleType,
        vehicleName,
        vehicleNumber,
        panNumber,
        aadharNumber,
        status: 'pending',
        ...images
    });

    return partner.toObject();
};

export const updateDeliveryPartnerProfile = async (userId, payload, files) => {
    const partner = await FoodDeliveryPartner.findById(userId);
    if (!partner) {
        throw new ValidationError('Delivery partner not found');
    }

    const {
        name, countryCode, address, city, state,
        vehicleType, vehicleName, vehicleNumber, panNumber, aadharNumber
    } = payload;

    if (name) partner.name = name;
    if (countryCode !== undefined) partner.countryCode = countryCode;
    if (address !== undefined) partner.address = address;
    if (city !== undefined) partner.city = city;
    if (state !== undefined) partner.state = state;
    if (vehicleType !== undefined) partner.vehicleType = vehicleType;
    if (vehicleName !== undefined) partner.vehicleName = vehicleName;
    if (vehicleNumber !== undefined) partner.vehicleNumber = vehicleNumber;
    if (panNumber !== undefined) partner.panNumber = panNumber;
    if (aadharNumber !== undefined) partner.aadharNumber = aadharNumber;

    if (files?.profilePhoto?.[0]) {
        partner.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'food/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        partner.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'food/delivery/aadhar');
    }
    if (files?.panPhoto?.[0]) {
        partner.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'food/delivery/pan');
    }
    if (files?.drivingLicensePhoto?.[0]) {
        partner.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'food/delivery/license'
        );
    }

    await partner.save();
    return partner.toObject();
};

export const listDeliveryPartnerJoinRequests = async ({ status = 'pending', search, vehicleType, page = 1, limit = 100 }) => {
    const query = {};
    if (status === 'pending' || status === 'denied') {
        query.status = status === 'pending' ? 'pending' : 'rejected';
    }
    if (vehicleType) {
        query.vehicleType = vehicleType.toLowerCase();
    }
    if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [{ name: regex }, { phone: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
        FoodDeliveryPartner.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        FoodDeliveryPartner.countDocuments(query)
    ]);

    return { requests: items, total };
};

