import { ZomatoDeliveryPartner } from '../models/deliveryPartner.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const registerDeliveryPartner = async (payload, files) => {
    const { name, phone, countryCode, address, city, state, vehicleType, vehicleName, vehicleNumber, panNumber, aadharNumber } =
        payload;

    const existing = await ZomatoDeliveryPartner.findOne({ phone }).lean();
    if (existing) {
        throw new ValidationError('Delivery partner with this phone already exists');
    }

    const images = {};

    if (files?.profilePhoto?.[0]) {
        images.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'zomato/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        images.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'zomato/delivery/aadhar');
    }
    if (files?.panPhoto?.[0]) {
        images.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'zomato/delivery/pan');
    }
    if (files?.drivingLicensePhoto?.[0]) {
        images.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'zomato/delivery/license'
        );
    }

    const partner = await ZomatoDeliveryPartner.create({
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
    const partner = await ZomatoDeliveryPartner.findById(userId);
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
        partner.profilePhoto = await uploadImageBuffer(files.profilePhoto[0].buffer, 'zomato/delivery/profile');
    }
    if (files?.aadharPhoto?.[0]) {
        partner.aadharPhoto = await uploadImageBuffer(files.aadharPhoto[0].buffer, 'zomato/delivery/aadhar');
    }
    if (files?.panPhoto?.[0]) {
        partner.panPhoto = await uploadImageBuffer(files.panPhoto[0].buffer, 'zomato/delivery/pan');
    }
    if (files?.drivingLicensePhoto?.[0]) {
        partner.drivingLicensePhoto = await uploadImageBuffer(
            files.drivingLicensePhoto[0].buffer,
            'zomato/delivery/license'
        );
    }

    await partner.save();
    return partner.toObject();
};

