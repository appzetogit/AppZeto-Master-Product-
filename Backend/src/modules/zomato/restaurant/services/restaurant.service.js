import { ZomatoRestaurant } from '../models/restaurant.model.js';
import { uploadImageBuffer } from '../../../../services/cloudinary.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const registerRestaurant = async (payload, files) => {
    const {
        restaurantName,
        ownerName,
        ownerEmail,
        ownerPhone,
        primaryContactNumber,
        addressLine1,
        addressLine2,
        area,
        city,
        landmark,
        cuisines,
        openingTime,
        closingTime,
        openDays,
        panNumber,
        nameOnPan,
        gstRegistered,
        gstNumber,
        gstLegalName,
        gstAddress,
        fssaiNumber,
        fssaiExpiry,
        accountNumber,
        ifscCode,
        accountHolderName,
        accountType
    } = payload;

    const existing = await ZomatoRestaurant.findOne({ restaurantName, ownerPhone }).lean();
    if (existing) {
        throw new ValidationError('Restaurant with this name and owner phone already exists');
    }

    const images = {};

    if (files?.profileImage?.[0]) {
        images.profileImage = await uploadImageBuffer(files.profileImage[0].buffer, 'zomato/restaurants/profile');
    }
    if (files?.panImage?.[0]) {
        images.panImage = await uploadImageBuffer(files.panImage[0].buffer, 'zomato/restaurants/pan');
    }
    if (files?.gstImage?.[0]) {
        images.gstImage = await uploadImageBuffer(files.gstImage[0].buffer, 'zomato/restaurants/gst');
    }
    if (files?.fssaiImage?.[0]) {
        images.fssaiImage = await uploadImageBuffer(files.fssaiImage[0].buffer, 'zomato/restaurants/fssai');
    }

    let menuImages = [];
    if (files?.menuImages?.length) {
        menuImages = await Promise.all(
            files.menuImages.map((file) => uploadImageBuffer(file.buffer, 'zomato/restaurants/menu'))
        );
    }

    const restaurant = await ZomatoRestaurant.create({
        restaurantName,
        ownerName,
        ownerEmail,
        ownerPhone,
        primaryContactNumber,
        addressLine1,
        addressLine2,
        area,
        city,
        landmark,
        cuisines: cuisines || [],
        openingTime,
        closingTime,
        openDays: openDays || [],
        panNumber,
        nameOnPan,
        gstRegistered,
        gstNumber,
        gstLegalName,
        gstAddress,
        fssaiNumber,
        fssaiExpiry,
        accountNumber,
        ifscCode,
        accountHolderName,
        accountType,
        menuImages,
        ...images
    });

    return restaurant.toObject();
};

