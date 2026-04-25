import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';

import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * @desc    Get active offers for users
 * @route   GET /api/offers
 * @access  Public (Optional Auth)
 */
export const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } }
      ]
    }).sort({ createdAt: -1 });

    // Filter by userLimit if user is logged in
    if (req.user) {
      const filteredOffers = [];
      for (const offer of offers) {
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });

        if (userUsageCount < (offer.userLimit || 1)) {
          filteredOffers.push(offer);
        }
      }
      return res.json(filteredOffers);
    }

    res.json(offers);
  } catch (error) {
    console.error('Get Offers Error:', error);
    res.status(500).json({ message: 'Server error fetching offers' });
  }
};

/**
 * @desc    Validate an offer code
 * @route   POST /api/offers/validate
 * @access  Private
 */
export const validateOffer = async (req, res) => {
  try {
    const { code, bookingAmount } = req.body;

    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true,
      offerType: 'coupon'
    });

    if (!offer) {
      return res.status(404).json({ message: "Invalid coupon code or expired" });
    }

    // 1. Date Check
    const now = new Date();
    if (offer.startDate > now || (offer.endDate && new Date(offer.endDate).setHours(23, 59, 59, 999) < now.getTime())) {
      return res.status(400).json({ message: "Coupon has expired or is not yet active" });
    }

    // 2. Min Amount Check
    if (bookingAmount < offer.minBookingAmount) {
      return res.status(400).json({ message: `Minimum booking amount should be ₹${offer.minBookingAmount}` });
    }

    // 3. Overall Usage Limit
    if (offer.usageCount >= offer.usageLimit) {
      return res.status(400).json({ message: "Coupon limit reached" });
    }

    // 4. User Usage Limit
    const userUsageCount = await Booking.countDocuments({
      userId: req.user._id,
      couponCode: offer.code,
      bookingStatus: { $nin: ['cancelled', 'rejected'] }
    });

    if (userUsageCount >= (offer.userLimit || 1)) {
      return res.status(400).json({ message: `You have reached the usage limit for this coupon (${offer.userLimit || 1} time(s))` });
    }

    // Calculate Discount
    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (bookingAmount * offer.discountValue) / 100;
      if (offer.maxDiscount && discount > offer.maxDiscount) {
        discount = offer.maxDiscount;
      }
    } else {
      discount = offer.discountValue;
    }

    res.json({
      success: true,
      offerCode: offer.code,
      discount: Math.floor(discount),
      finalAmount: Math.floor(bookingAmount - discount),
      description: offer.description || offer.subtitle
    });

  } catch (error) {
    console.error('Validate Offer Error:', error);
    res.status(500).json({ message: 'Server error validating offer' });
  }
};

/**
 * @desc    Create an offer (Admin)
 */
export const createOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };
    const { offerType, title, startDate, endDate, code, discountValue } = offerData;

    // Common validations
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: "Title, Start date and End date are required" });
    }

    // Coupon specific validations
    if (offerType === 'coupon' || !offerType) {
      if (!code) return res.status(400).json({ message: "Coupon code is required for promotions" });
      if (discountValue === undefined || discountValue === null) return res.status(400).json({ message: "Discount value is required for promotions" });
    } else if (offerType === 'banner') {
      // For banners, we might generate a fake code or just leave it empty if uniqueness is not required
      // But adding a random one avoids issues if our schema still has unique constraint somehow
      offerData.code = `BANNER_${Date.now()}`;
    }

    // If a file was uploaded via multer, upload to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'offers');
      offerData.image = result.url;
    } else if (!offerData.image) {
      return res.status(400).json({ message: "Banner/Offer image is required" });
    }

    const offer = new Offer(offerData);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    console.error('Create Offer Error:', error);
    res.status(400).json({ message: error.message || 'Error creating offer' });
  }
};

/**
 * @desc    Get all offers for Admin
 */
export const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers' });
  }
};

/**
 * @desc    Update an offer (Admin)
 */
export const updateOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'offers');
      offerData.image = result.url;
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, offerData, { new: true });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error updating offer' });
  }
};

/**
 * @desc    Delete an offer (Admin)
 */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting offer' });
  }
};
