import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import PDFDocument from 'pdfkit';
import Offer from '../models/Offer.js';
import PlatformSettings from '../models/PlatformSettings.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Razorpay from 'razorpay';
import PaymentConfig from '../config/payment.config.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import referralService from '../services/referralService.js';
import User from '../user/models/User.js';
import whatsappService from '../utils/whatsappService.js';

// Initialize Razorpay instance for refunds
let razorpayInstance;
try {
  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpayInstance = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  }
} catch (err) {
  console.error("Razorpay Init Failed in bookingController:", err.message);
}

// Helper: Check if cancellation is allowed (24 hours before check-in)
const isCancellationAllowed = (checkInDate, checkInTime) => {
  try {
    const now = new Date();
    const checkIn = new Date(checkInDate);

    // Parse check-in time (format: "12:00 PM" or "12:00")
    let hours = 12; // Default to 12 PM if not provided
    let minutes = 0;

    if (checkInTime) {
      const timeStr = checkInTime.trim().toUpperCase();
      const isPM = timeStr.includes('PM');
      const timeMatch = timeStr.match(/(\d+):(\d+)/);

      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);

        if (isPM && hours !== 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
      }
    }

    // Set check-in date and time
    checkIn.setHours(hours, minutes, 0, 0);

    // Calculate difference in milliseconds
    const diffMs = checkIn.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Allow cancellation only if at least 24 hours before check-in
    return diffHours >= 24;
  } catch (error) {
    console.error('Error checking cancellation policy:', error);
    // If error parsing, allow cancellation (fail-safe)
    return true;
  }
};

// Helper: Trigger Notifications
const triggerBookingNotifications = async (booking) => {
  try {
    const fullBooking = await Booking.findById(booking._id)
      .populate('userId')
      .populate('propertyId');

    const userType = fullBooking.userModel ? fullBooking.userModel.toLowerCase() : 'user';
    const user = fullBooking.userId;
    const property = fullBooking.propertyId;

    // 1. User Email
    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user, fullBooking).catch(err => console.error('Email trigger failed:', err));
    }

    // 2. User Push
    if (user) {
      notificationService.sendToUser(user._id, {
        title: 'Booking Confirmed! 🎉',
        body: `Your booking at ${property ? property.propertyName : 'HotelProperty'} is confirmed. ID: ${fullBooking.bookingId}`
      }, { type: 'booking', bookingId: fullBooking._id }, userType).catch(err => console.error('User Push failed:', err));
    }

    // 3. Partner Notifications
    if (property && property.partnerId) {
      notificationService.sendToPartner(property.partnerId, {
        title: 'New Booking Alert! 🏨',
        body: `New booking for ${property.propertyName}. Guest: ${user?.name || 'Customer'}, ID: ${fullBooking.bookingId}`
      }, { type: 'new_booking', bookingId: fullBooking._id }).catch(err => console.error('Partner Push failed:', err));

      mongoose.model('HotelPartner').findById(property.partnerId).then(partner => {
        if (partner && partner.email) {
          emailService.sendPartnerNewBookingEmail(partner, user, fullBooking).catch(e => console.error('Partner Email error', e));
        }
      }).catch(e => console.error('Partner fetch error for email', e));
    }

    // 4. Admin Notifications
    notificationService.sendToAdmins({
      title: 'New Booking Confirmed 💰',
      body: `Booking #${fullBooking.bookingId} at ${property?.propertyName || 'HotelProperty'}. Amount: ₹${fullBooking.totalAmount}.`
    }, { type: 'new_booking', bookingId: fullBooking._id }).catch(err => console.error('Admin Push failed:', err));

    // 5. WhatsApp Notification (User)
    if (fullBooking.bookingStatus === 'confirmed') {
      whatsappService.sendBookingConfirmation(fullBooking).catch(err => console.error('WhatsApp trigger failed:', err));
    }

  } catch (err) {
    console.error('Trigger Notification Error:', err);
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      propertyId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guests,
      paymentMethod,
      paymentDetails,
      bookingUnit,
      couponCode,
      useWallet,
      walletDeduction
    } = req.body;

    // Basic Validation
    if (!propertyId || !roomTypeId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    // Fetch Property and RoomType
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    // Fetch Settings
    const settings = await PlatformSettings.getSettings();
    const gstRate = settings.taxRate ?? 12;
    const commissionRate = settings.defaultCommission ?? 10;

    // Calculate Nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (totalNights <= 0) {
      return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
    }

    // Check Availability
    const requiredUnits = guests.rooms || 1;
    const ledgerEntries = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: new mongoose.Types.ObjectId(propertyId),
          roomTypeId: new mongoose.Types.ObjectId(roomTypeId),
          startDate: { $lt: checkOut },
          endDate: { $gt: checkIn }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blockedUnits = ledgerEntries.length > 0 ? ledgerEntries[0].blockedUnits : 0;
    let totalInventory = roomType.totalInventory || 0;
    if (roomType.inventoryType === 'bed') {
      totalInventory = totalInventory * (roomType.bedsPerRoom || 1);
    }

    if (totalInventory - blockedUnits < requiredUnits) {
      return res.status(400).json({ message: `Only ${Math.max(0, totalInventory - blockedUnits)} units available for selected dates` });
    }

    // Calculate Base Amount
    const units = requiredUnits; // Use validated units
    const pricePerNight = roomType.pricePerNight || 0;
    const baseAmount = pricePerNight * totalNights * units;

    // Calculate Extra Charges
    const extraAdults = guests.extraAdults || 0;
    const extraChildren = guests.extraChildren || 0;
    const extraAdultPrice = (roomType.extraAdultPrice || 0) * extraAdults * totalNights;
    const extraChildPrice = (roomType.extraChildPrice || 0) * extraChildren * totalNights;
    const extraCharges = extraAdultPrice + extraChildPrice;

    // Gross Amount
    const grossAmount = baseAmount + extraCharges;

    // Calculate Discount
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const offer = await Offer.findOne({ code: couponCode, isActive: true });
      if (offer) {
        // Validate Offer Constraints
        const isValidDate = (!offer.startDate || new Date() >= offer.startDate) &&
          (!offer.endDate || new Date() <= offer.endDate);
        const isValidAmount = grossAmount >= (offer.minBookingAmount || 0);

        // User Usage Limit
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });
        const isUnderUserLimit = userUsageCount < (offer.userLimit || 1);

        if (isValidDate && isValidAmount && isUnderUserLimit) {
          if (offer.discountType === 'percentage') {
            discountAmount = (grossAmount * offer.discountValue) / 100;
            if (offer.maxDiscount) {
              discountAmount = Math.min(discountAmount, offer.maxDiscount);
            }
          } else {
            discountAmount = offer.discountValue;
          }
          discountAmount = Math.floor(discountAmount);
          discountAmount = Math.min(discountAmount, grossAmount); // Cannot exceed gross
          appliedCoupon = offer.code;
        }
      }
    }

    // Calculate Tax (On Gross Amount as per Frontend logic)
    const commissionableAmount = grossAmount;
    const taxes = Math.round((commissionableAmount * gstRate) / 100);

    // Calculate Total Amount (User Pays)
    // User Pays = (Gross - Discount) + Tax
    const taxableAmount = grossAmount - discountAmount;
    let totalAmount = taxableAmount + taxes;
    
    // Calculate Prepaid Discount
    let prepaidDiscountAmount = 0;
    let advanceAmount = 0;
    let remainingAmount = 0;
    
    if (paymentMethod === 'prepaid') {
      prepaidDiscountAmount = Math.floor(totalAmount * 0.05);
      totalAmount = totalAmount - prepaidDiscountAmount;
      advanceAmount = Math.floor(totalAmount * 0.30);
      remainingAmount = totalAmount - advanceAmount;
    }

    // Calculate Commission (On Gross Amount)
    let adminCommission = Math.round((grossAmount * commissionRate) / 100);
    if (adminCommission < PaymentConfig.minCommission) {
      adminCommission = PaymentConfig.minCommission;
    }

    // Calculate Partner Payout
    // Partner Payout = (Gross - Discount) - Commission
    // Verification: TotalAmount - Tax - Commission = ((Gross - Discount) + Tax) - Tax - Commission = Gross - Discount - Commission.
    const partnerPayout = Math.floor(totalAmount - taxes - adminCommission);

    const bookingId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Determine User Model based on mongoose document model name
    const userModel = req.user.constructor.modelName;

    // Create Booking Object
    const booking = new Booking({
      bookingId,
      userModel,
      userId: req.user._id,
      propertyId,
      propertyType: property.propertyType.toLowerCase(),
      roomTypeId,
      bookingUnit: bookingUnit || 'room',
      checkInDate,
      checkOutDate,
      totalNights,
      guests: {
        adults: guests.adults || 1,
        children: guests.children || 0
      },
      pricePerNight,
      baseAmount,
      extraAdultPrice,
      extraChildPrice,
      extraCharges,
      taxes,
      adminCommission,
      partnerPayout,
      discount: discountAmount,
      couponCode: appliedCoupon,
      totalAmount,
      prepaidDiscount: prepaidDiscountAmount,
      amountPaid: paymentMethod === 'wallet' ? totalAmount : 0,
      remainingAmount: totalAmount, // For Online/Prepaid/PayAtHotel, the whole amount is remaining until verified/settled
      paymentMethod,
      bookingStatus: 'confirmed', // Default confirmed for pay_at_hotel/wallet, pending for razorpay
      paymentStatus: paymentMethod === 'pay_at_hotel' ? 'pending' : 'paid'
    });

    // Handle Wallet Payment (Partial or Full)
    if (paymentMethod === 'wallet' || (useWallet && walletDeduction > 0)) {
      const wallet = await Wallet.findOne({ partnerId: req.user._id, role: 'user' });
      const deductionAmount = walletDeduction || totalAmount;

      if (!wallet || wallet.balance < deductionAmount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      await wallet.debit(deductionAmount, `Booking #${bookingId}`, bookingId, 'booking');

      // Update booking paid amount since wallet was used
      booking.amountPaid = (booking.amountPaid || 0) + deductionAmount;
      booking.remainingAmount = Math.max(0, booking.remainingAmount - deductionAmount);

      if (paymentMethod === 'wallet' || (['online', 'razorpay', 'prepaid'].includes(paymentMethod) && (totalAmount - (walletDeduction || 0) <= 0))) {
        booking.paymentStatus = 'paid'; // If prepaid is fully paid by wallet, there is still remaining amount for hotel.
        if (paymentMethod === 'prepaid') {
           booking.paymentStatus = 'partial';
        }

        // --- DISTRIBUTE TO PARTNER & ADMIN (Settlement) ---

        // 1. Process Partner Transactions (Hiding Tax)
        if (property.partnerId) {
          let partnerWallet = await Wallet.findOne({ partnerId: property.partnerId, role: 'partner' });
          if (!partnerWallet) {
            partnerWallet = await Wallet.create({
              partnerId: property.partnerId,
              role: 'partner',
              balance: 0
            });
          }

          // A. Credit Partner the Taxable Amount (Booking Price - Discount, excluding Tax)
          // taxableAmount is (grossAmount - discountAmount)
          await partnerWallet.credit(taxableAmount, `Payment for Booking #${bookingId}`, bookingId, 'booking_payment');

          // B. Debit Partner the Admin Commission only
          if (adminCommission > 0) {
            await partnerWallet.debit(adminCommission, `Platform Commission for Booking #${bookingId}`, bookingId, 'commission_deduction');
          }

          // NOTIFICATION: Wallet Update
          notificationService.sendToPartner(property.partnerId, {
            title: 'New Booking Settlement',
            body: `Booking #${bookingId} settled. Payout: ₹${booking.partnerPayout}`
          }, { type: 'wallet_update', bookingId: booking._id }).catch(e => console.error(e));
        }

        // 2. Credit Admin (Commission + Tax)
        const totalAdminCredit = (adminCommission || 0) + (taxes || 0);
        if (totalAdminCredit > 0) {
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminUser = mongoose.model('HotelUser');
            const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(totalAdminCredit, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        }

        // REFERRAL: Trigger Referral Reward (Immediate Wallet Payment)
        referralService.processBookingCompletion(req.user._id, booking._id).catch(e => console.error('Referral Trigger Error (Wallet):', e));
      }
    }

    // Handle Online Payment (Razorpay)
    let razorpayOrder = null;
    if (['razorpay', 'online', 'prepaid'].includes(paymentMethod)) {
      if (paymentDetails && paymentDetails.paymentId) {
        // Already paid (Legacy check)
        booking.paymentStatus = paymentMethod === 'prepaid' ? 'partial' : 'paid';
        booking.paymentId = paymentDetails.paymentId;
      } else {
        // Initiate New Payment
        booking.bookingStatus = 'pending'; // Pending until payment
        booking.paymentStatus = 'pending';

        // Calculate amount to pay via Gateway
        let payableViaGateway = paymentMethod === 'prepaid' ? advanceAmount : totalAmount;
        const amountToPay = payableViaGateway - (useWallet ? (walletDeduction || 0) : 0);

        if (amountToPay > 0) {
          try {
            const instance = new Razorpay({
              key_id: PaymentConfig.razorpayKeyId,
              key_secret: PaymentConfig.razorpayKeySecret,
            });

            const options = {
              amount: Math.round(amountToPay * 100), // amount in paisa
              currency: PaymentConfig.currency || "INR",
              receipt: bookingId,
              notes: {
                bookingId: booking._id.toString(),
                userId: req.user._id.toString(),
                propertyId: propertyId.toString(),
                roomTypeId: roomTypeId.toString(),
                bookingUnit: (bookingUnit || 'room').toString(),
                rooms: units.toString(), // Pass rooms count for ledger
                // Store financial info for verification consistency
                checkInDate: checkInDate.toString(),
                checkOutDate: checkOutDate.toString(),
                totalNights: totalNights.toString(),
                guests: JSON.stringify({ adults: guests.adults || 1, children: guests.children || 0 }),
                adminCommission: adminCommission.toString(),
                partnerPayout: partnerPayout.toString(),
                pricePerNight: pricePerNight.toString(),
                baseAmount: baseAmount.toString(),
                extraCharges: extraCharges.toString(),
                taxes: taxes.toString(),
                discount: discountAmount.toString(),
                totalAmount: totalAmount.toString(),
                prepaidDiscountAmount: prepaidDiscountAmount.toString(),
                advanceAmount: advanceAmount.toString(),
                remainingAmount: remainingAmount.toString(),
                paymentMethod: paymentMethod, // Pass method to safely handle in verify
                type: 'booking_init'
              }
            };

            razorpayOrder = await instance.orders.create(options);

            // Set status to awaiting_payment so it doesn't show in user's list until paid
            booking.bookingStatus = 'awaiting_payment';
            booking.paymentStatus = 'pending';
          } catch (error) {
            console.error("Razorpay Order Creation Failed:", error);
            return res.status(500).json({ message: "Failed to initiate payment gateway" });
          }
        } else {
          // Fully paid by wallet (Covered by loop above, but double check status)
          booking.paymentStatus = paymentMethod === 'prepaid' ? 'partial' : 'paid';
          booking.bookingStatus = 'confirmed';
        }
      }
    }

    // Handle Pay at Hotel (No immediate deduction, settlement happens when marked as paid)
    if (paymentMethod === 'pay_at_hotel') {
      console.log(`[Booking] Pay at Hotel selected for #${bookingId}. Settlement deferred.`);
    }

    await booking.save();

    // Update Inventory (Block Room) - Only if confirmed (Pay at Hotel or Paid)
    // If Razorpay pending, we still block inventory to avoid race conditions? 
    // Usually yes, with a timeout. For now, we block it.
    await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: booking.bookingUnit || 'room',
      source: 'platform',
      referenceId: booking._id,
      startDate: new Date(checkInDate),
      endDate: new Date(checkOutDate),
      units: units, // Use 'units' here (rooms count)
      createdBy: 'system'
    });

    // Increment Offer Usage if applied and confirmed
    if (appliedCoupon && booking.bookingStatus === 'confirmed') {
      await Offer.findOneAndUpdate({ code: appliedCoupon }, { $inc: { usageCount: 1 } });
    }

    // Trigger Notifications (only if confirmed)
    if (booking.bookingStatus === 'confirmed') {
      triggerBookingNotifications(booking);
    }

    // Populate booking details for frontend confirmation page (partnerId.phone for Contact Property)
    const populatedBooking = await Booking.findById(booking._id)
      .populate({ path: 'propertyId', populate: { path: 'partnerId', select: 'phone' } })
      .populate('roomTypeId');

    res.status(201).json({
      success: true,
      booking: populatedBooking,
      paymentRequired: !!razorpayOrder,
      order: razorpayOrder,
      key: PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'upcoming', 'ongoing', 'completed', 'cancelled'
    const query = { userId: req.user._id };

    if (type === 'upcoming') {
      // Upcoming: Confirmed. NOT checked-in.
      // Hiding 'pending'/'awaiting_payment' to ensure only finalized bookings appear
      query.bookingStatus = { $in: ['confirmed'] };
    } else if (type === 'ongoing') {
      // Ongoing: Checked In
      query.bookingStatus = 'checked_in';
    } else if (type === 'completed') {
      // Completed: Checked Out (and legacy completed)
      query.bookingStatus = { $in: ['completed', 'checked_out'] };
    } else if (type === 'cancelled') {
      // Cancelled, No Show, Rejected
      query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
    }

    const bookings = await Booking.find(query)
      .populate({ path: 'propertyId', select: 'propertyName address location coverImage avgRating contactNumber', populate: { path: 'partnerId', select: 'phone' } })
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (e) {
    console.error('Get My Bookings Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'propertyId', populate: { path: 'partnerId', select: 'phone' } })
      .populate('roomTypeId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow User (Owner) or Admin/Partner (if needed, but separate endpoints exist usually)
    // For this specific 'user' endpoint, strictly check ownership
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (e) {
    console.error('Get Booking Detail Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerBookings = async (req, res) => {
  try {
    // 1. Find all properties owned by this partner
    const properties = await Property.find({ partnerId: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // 2. Find bookings for these properties
    const { status } = req.query;
    const query = { propertyId: { $in: propertyIds } };

    if (status) {
      if (status === 'upcoming') {
        // Upcoming: Confirmed guests arriving in future.
        query.bookingStatus = { $in: ['confirmed'] };
      } else if (status === 'in_house') {
        // In-House: Active guests (Checked In)
        query.bookingStatus = 'checked_in';
      } else if (status === 'completed') {
        // Completed: Guests checked out
        query.bookingStatus = { $in: ['completed', 'checked_out'] };
      } else if (status === 'cancelled') {
        query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
      } else {
        // Direct status match fallback
        query.bookingStatus = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName address location coverImage')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get Partner Bookings Error:', error);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

export const getPartnerBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('propertyId') // Need full property for partnerId check
      .populate('roomTypeId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership
    // Ensure propertyId is populated and has partnerId
    if (!booking.propertyId || !booking.propertyId.partnerId) {
      // Fallback or error if data consistency issue
      return res.status(403).json({ message: 'Booking data invalid (property link missing)' });
    }

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get Partner Booking Detail Error:', error);
    res.status(500).json({ message: 'Server error fetching booking details' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('propertyId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow user to cancel or admin/partner
    const isOwner = booking.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isPartner = req.user.role === 'partner' && booking.propertyId?.partnerId?.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isPartner) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // --- 24-HOUR CANCELLATION POLICY CHECK ---
    // Industry Standard: Cancellation must be at least 24 hours before check-in time
    const property = booking.propertyId;
    const checkInTime = property?.checkInTime || '12:00 PM'; // Default to 12 PM if not set
    
    // Skip policy check for admins
    const isAllowed = isAdmin || isCancellationAllowed(booking.checkInDate, checkInTime);

    if (!isAllowed) {
      const checkInDate = new Date(booking.checkInDate);
      const checkInDateTime = new Date(checkInDate);

      // Parse check-in time
      const timeStr = checkInTime.trim().toUpperCase();
      const isPM = timeStr.includes('PM');
      const timeMatch = timeStr.match(/(\d+):(\d+)/);
      let hours = 12;
      let minutes = 0;
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        if (isPM && hours !== 12) hours += 12;
        else if (!isPM && hours === 12) hours = 0;
      }
      checkInDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const diffMs = checkInDateTime.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

      return res.status(400).json({
        message: `Cancellation is only allowed at least 24 hours before check-in. Check-in is in ${diffHours} hours.`,
        code: 'CANCELLATION_POLICY_VIOLATION',
        hoursRemaining: diffHours
      });
    }

    // Update Status
    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = req.body.reason || 'User cancelled';
    booking.cancelledAt = new Date();

    // Will update paymentStatus after refund processing if needed

    // --- PAYMENT GATEWAY REFUND (Razorpay/Online) ---
    // Process Razorpay refund FIRST before wallet operations
    let razorpayRefundProcessed = false;
    let razorpayRefundAmount = 0;

    if ((booking.paymentMethod === 'razorpay' || booking.paymentMethod === 'online') &&
      booking.paymentStatus === 'paid' &&
      booking.paymentId) {
      try {
        if (!razorpayInstance) {
          throw new Error('Razorpay not initialized');
        }

        // Process full refund through Razorpay
        const refundAmountInPaise = Math.round(booking.totalAmount * 100);
        const refund = await razorpayInstance.payments.refund(booking.paymentId, {
          amount: refundAmountInPaise,
          notes: {
            reason: booking.cancellationReason || 'User cancelled',
            bookingId: booking.bookingId || booking._id.toString()
          }
        });

        razorpayRefundProcessed = true;
        razorpayRefundAmount = refund.amount / 100; // Convert back to rupees

        // Update payment status to refunded
        booking.paymentStatus = 'refunded';

        console.log(`[CancelBooking] Razorpay refund processed: ${refund.id}, Amount: ₹${razorpayRefundAmount}`);
      } catch (razorpayError) {
        console.error('[CancelBooking] Razorpay refund failed:', razorpayError.message);
        // If Razorpay refund fails, still proceed with wallet credit as fallback
        // This ensures user gets refunded even if gateway fails
        // Log error but don't block cancellation
      }
    }

    // Save booking status update
    await booking.save();

    // --- WALLET REVERSAL LOGIC ---
    // Pay at Hotel: Reverse Commission Deduction (Refund Partner, Debit Admin)
    if (booking.paymentMethod === 'pay_at_hotel') {
      const wasPaid = booking.paymentStatus === 'paid';
      const refundAmount = wasPaid ? ((booking.taxes || 0) + (booking.adminCommission || 0)) : 0;

      // Fetch full booking for partnerId
      const fullBooking = await Booking.findById(booking._id).populate('propertyId').populate('userId');

      if (wasPaid && refundAmount > 0 && fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner (Refund)
          await partnerWallet.credit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin (Refund)
          await adminWallet.debit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }

      // Release Inventory
      await AvailabilityLedger.deleteMany({ referenceId: booking._id });

      // Trigger Cancellation Notifications
      if (fullBooking) {
        if (fullBooking.userId && fullBooking.userId.email) {
          emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, 0)
            .catch(e => console.error('Cancel Email failed', e));
        }

        const ut = fullBooking.userModel ? fullBooking.userModel.toLowerCase() : 'user';

        // Notify User
        if (fullBooking.userId) {
          notificationService.sendToUser(fullBooking.userId._id, {
            title: 'Booking Cancelled',
            body: `Your booking #${fullBooking.bookingId} has been cancelled successfully.`
          }, { type: 'booking_cancelled', bookingId: booking._id }, ut).catch(e => console.error('User Cancel Push failed', e));
        }

        if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
          notificationService.sendToPartner(fullBooking.propertyId.partnerId, {
            title: 'Booking Cancelled',
            body: `Booking #${fullBooking.bookingId} Cancelled by User. Inventory released.`
          }, { type: 'booking_cancelled', bookingId: booking._id }).catch(e => console.error('Partner Cancel Push failed', e));

          mongoose.model('HotelPartner').findById(fullBooking.propertyId.partnerId).then(partner => {
            if (partner && partner.email) {
              emailService.sendPartnerBookingCancelledEmail(partner, fullBooking).catch(e => console.error(e));
            }
          }).catch(e => console.error(e));
        }

        // Notify Admin
        notificationService.sendToAdmins({
          title: 'Booking Cancelled',
          body: `Booking #${fullBooking.bookingId} at ${fullBooking.propertyId?.propertyName} has been cancelled.`
        }, { type: 'booking_cancelled', bookingId: booking._id }).catch(e => console.error('Admin Cancel Push failed', e));
      }

      return res.json({ 
        success: true, 
        message: `Booking cancelled successfully${wasPaid ? ' (Pay at Hotel - Commission Refunded)' : ''}`, 
        booking 
      });
    }

    // 1. Refund User (If paid and Razorpay refund NOT processed)
    // If Razorpay refund was successful, skip wallet credit (refund already processed)
    // If Razorpay refund failed or payment method is wallet, credit user wallet
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') {
      // Only credit wallet if:
      // - Payment method is wallet (always credit wallet)
      // - OR Razorpay refund failed (fallback)
      // - OR payment method is not Razorpay/online
      const shouldCreditWallet = booking.paymentMethod === 'wallet' ||
        !razorpayRefundProcessed ||
        !['razorpay', 'online'].includes(booking.paymentMethod);

      if (shouldCreditWallet) {
        let userWallet = await Wallet.findOne({ partnerId: booking.userId, role: 'user' });

        // Auto-create wallet if it doesn't exist
        if (!userWallet) {
          userWallet = await Wallet.create({
            partnerId: booking.userId,
            role: 'user',
            balance: 0
          });
        }

        await userWallet.credit(
          booking.totalAmount,
          `Refund for Booking #${booking.bookingId}${razorpayRefundProcessed ? ' (Razorpay refund failed, wallet credited as fallback)' : ''}`,
          booking.bookingId,
          'refund'
        );
      }
    }

    // 2. Deduct Partner (If payout was credited)
    // Only reverse if booking was actually paid (not pay_at_hotel)
    // Check if Partner Payout > 0 and payment was processed
    if (booking.partnerPayout > 0 &&
      (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') &&
      booking.paymentMethod !== 'pay_at_hotel') {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        if (partnerWallet) {
          try {
            await partnerWallet.debit(
              booking.partnerPayout,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Partner Refund Deduction Failed:", err.message);
            // Don't throw - log and continue
          }
        }
      }
    }

    // 3. Deduct Admin (Commission + Tax)
    // Only reverse if booking was actually paid (not pay_at_hotel)
    if ((booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') &&
      booking.paymentMethod !== 'pay_at_hotel') {
      const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
      if (adminDeduction > 0) {
        const adminWallet = await Wallet.findOne({ role: 'admin' });
        if (adminWallet) {
          try {
            await adminWallet.debit(
              adminDeduction,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Admin Refund Deduction Failed:", err.message);
            // Don't throw - log and continue
          }
        }
      }
    }

    // Trigger Cancellation Notifications
    const fullBooking = await Booking.findById(booking._id).populate('userId').populate('propertyId');
    if (fullBooking) {
      const ut = fullBooking.userModel ? fullBooking.userModel.toLowerCase() : 'user';

      if (fullBooking.userId && fullBooking.userId.email) {
        // Determine refund amount for email
        let refundAmount = 0;
        if (razorpayRefundProcessed) {
          refundAmount = razorpayRefundAmount;
        } else if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') {
          refundAmount = booking.totalAmount;
        }

        emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, refundAmount)
          .catch(e => console.error('Cancel Email failed', e));
      }

      // Notify User
      if (fullBooking.userId) {
        notificationService.sendToUser(fullBooking.userId._id, {
          title: 'Booking Cancelled',
          body: `Your booking #${fullBooking.bookingId} at ${fullBooking.propertyId?.propertyName} has been cancelled.`
        }, { type: 'booking_cancelled', bookingId: booking._id }, ut).catch(e => console.error('User Cancel Push failed', e));
      }

      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        notificationService.sendToPartner(fullBooking.propertyId.partnerId, {
          title: 'Booking Cancelled',
          body: `Booking #${fullBooking.bookingId} at ${fullBooking.propertyId?.propertyName} has been cancelled.`
        }, { type: 'booking_cancelled', bookingId: booking._id }).catch(e => console.error('Partner Cancel Push failed', e));
      }

      // Notify Admin
      notificationService.sendToAdmins({
        title: 'Booking Cancelled',
        body: `Booking #${fullBooking.bookingId} at ${fullBooking.propertyId?.propertyName} has been cancelled.`
      }, { type: 'booking_cancelled', bookingId: booking._id }).catch(e => console.error('Admin Cancel Push failed', e));
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    // Prepare response message
    let responseMessage = 'Booking cancelled successfully';
    if (razorpayRefundProcessed) {
      responseMessage += `. Refund of ₹${razorpayRefundAmount.toLocaleString()} processed through payment gateway.`;
    } else if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded') {
      if (booking.paymentMethod === 'wallet') {
        responseMessage += `. Refund of ₹${booking.totalAmount.toLocaleString()} credited to your wallet.`;
      } else {
        responseMessage += `. Refund of ₹${booking.totalAmount.toLocaleString()} will be processed.`;
      }
    }

    res.json({
      success: true,
      message: responseMessage,
      booking,
      refundProcessed: razorpayRefundProcessed,
      refundAmount: razorpayRefundProcessed ? razorpayRefundAmount : (booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded' ? booking.totalAmount : 0)
    });
  } catch (e) {
    console.error('Cancel Booking Error:', e);
    res.status(500).json({ message: e.message });
  }
};

// Mark Booking as Paid (Pay at Hotel)
export const markBookingAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as paid.', booking });
    }

    // Update Status and Payment tracking
    booking.paymentStatus = 'paid';
    booking.amountPaid = booking.totalAmount;
    booking.remainingAmount = 0;
    await booking.save();

    // --- WALLET SETTLEMENT (Pay at Hotel) ---
    // The partner collected totalAmount (including tax) at the hotel.
    // However, as per requirements, we hide the tax from their payout view.
    // They keep the tax which we then deduct along with commission.

    const adminCommission = booking.adminCommission || 0;
    const taxes = booking.taxes || 0;
    const totalDeduction = adminCommission + taxes;

    if (totalDeduction > 0 && booking.propertyId.partnerId) {
      try {
        let partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
        if (!partnerWallet) {
          partnerWallet = await Wallet.create({
            partnerId: booking.propertyId.partnerId,
            role: 'partner',
            balance: 0
          });
        }

        // Debit Partner for the Platform's cut (Commission + the Tax they collected but doesn't belong to them)
        // Description only mentions Commission to keep things simple for partner
        const amountWithoutTax = booking.totalAmount - booking.taxes;
        await partnerWallet.debit(
          totalDeduction,
          `Platform Commission for Booking #${booking.bookingId} (Booking Amount: ₹${amountWithoutTax})`,
          booking.bookingId,
          'commission_deduction'
        );

        // Credit Admin (Both commission and tax collected by partner are now in system)
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          const AdminUser = mongoose.model('HotelUser');
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
          if (adminUser) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }
        }

        if (adminWallet) {
          await adminWallet.credit(totalDeduction, `Comm & Tax (PayAtHotel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_tax');
        }

      } catch (err) {
        console.error("Wallet Settlement Failed during Mark as Paid:", err.message);
      }
    }

    // Trigger Notification
    if (booking.userId) {
      const ut = booking.userModel ? booking.userModel.toLowerCase() : 'user';
      notificationService.sendToUser(booking.userId, {
        title: 'Payment Received ✔️',
        body: `Your payment for booking #${booking.bookingId} has been confirmed by the hotel.`
      }, { type: 'payment_received', bookingId: booking._id }, ut).catch(console.error);

      // Notify Partner (for other devices)
      if (booking.propertyId && booking.propertyId.partnerId) {
        notificationService.sendToPartner(booking.propertyId.partnerId, {
          title: 'Payment Confirmed',
          body: `Payment for Booking #${booking.bookingId} marked as received.`
        }, { type: 'payment_confirmed', bookingId: booking._id }).catch(console.error);
      }

      // Notify Admin
      notificationService.sendToAdmins({
        title: 'Payment Confirmed 💰',
        body: `Payment of ₹${booking.totalAmount} confirmed for Booking #${booking.bookingId} at ${booking.propertyId?.propertyName}.`
      }, { type: 'payment_confirmed', bookingId: booking._id }).catch(console.error);
    }

    // REFERRAL: Trigger Referral Reward (Pay At Hotel Marked Paid)
    if (booking.userId) {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error (PayAtHotel):', e));
    }

    res.json({ success: true, message: 'Marked as Paid', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Mark as No Show
export const markBookingNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'no_show') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as No Show.', booking });
    }

    booking.bookingStatus = 'no_show';
    // If No Show, should we cancel payment status? 
    // Usually No Show means they didn't come.
    await booking.save();

    // REVERSE DEDUCTION (Pay At Hotel - Only if previously marked as Paid)
    if (booking.paymentMethod === 'pay_at_hotel' && booking.paymentStatus === 'paid') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      if (refundAmount > 0 && booking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner
          await partnerWallet.credit(refundAmount, `Refund (No Show reversal) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin
          await adminWallet.debit(refundAmount, `Refund (No Show reversal) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }
    }
    // HANDLE PAY NOW / ONLINE / WALLET (Partner Earning Deducted -> Admin Credit)
    else if (['online', 'razorpay', 'wallet'].includes(booking.paymentMethod) && booking.paymentStatus === 'paid') {
      const deductionAmount = booking.partnerPayout || 0;

      if (deductionAmount > 0 && booking.propertyId.partnerId) {
        let partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });

        // Ensure Admin Wallet
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          const AdminUser = mongoose.model('HotelUser');
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
          if (adminUser) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }
        }

        if (partnerWallet && adminWallet) {
          try {
            // Debit Partner (Earning Reversal/Penalty)
            await partnerWallet.debit(deductionAmount, `No Show Penalty for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_penalty');

            // Credit Admin (Funds retained by platform)
            await adminWallet.credit(deductionAmount, `No Show Credit (from Partner) for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_credit');

          } catch (err) {
            console.error("No Show Wallet Deduction Failed (Pay Now):", err.message);
          }
        }
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    // Trigger Notifications
    if (booking.userId) {
      const ut = booking.userModel ? booking.userModel.toLowerCase() : 'user';
      notificationService.sendToUser(booking.userId, {
        title: 'Booking Status: No Show',
        body: `You didn't check-in for your booking #${booking.bookingId}. The booking has been marked as No Show.`
      }, { type: 'no_show', bookingId: booking._id }, ut).catch(console.error);
    }

    if (booking.propertyId && booking.propertyId.partnerId) {
      notificationService.sendToPartner(booking.propertyId.partnerId, {
        title: 'No Show Marked',
        body: `Booking #${booking.bookingId} has been marked as No Show. Inventory released.`
      }, { type: 'no_show', bookingId: booking._id }).catch(console.error);

      mongoose.model('HotelPartner').findById(booking.propertyId.partnerId).then(partner => {
        if (partner && partner.email) emailService.sendPartnerBookingStatusUpdateEmail(partner, booking, 'No Show').catch(console.error);
      }).catch(console.error);
    }

    notificationService.sendToAdmins({
      title: 'No Show Reported',
      body: `Booking #${booking.bookingId} at ${booking.propertyId?.propertyName} marked as No Show.`
    }, { type: 'no_show', bookingId: booking._id }).catch(console.error);

    res.json({ success: true, message: 'Marked as No Show. Inventory released and commission refunded.', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Check-In Booking
export const markCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Booking must be confirmed to check in.' });
    }

    booking.bookingStatus = 'checked_in';
    await booking.save();

    if (booking.userId) {
      const ut = booking.userModel ? booking.userModel.toLowerCase() : 'user';
      notificationService.sendToUser(booking.userId, {
        title: 'Checked In Successfully 👋',
        body: `Welcome to ${booking.propertyId?.propertyName || 'Hotel'}. Enjoy your stay!`
      }, { type: 'check_in', bookingId: booking._id }, ut).catch(console.error);

      // Notify Partner (for other devices or confirmation)
      if (booking.propertyId && booking.propertyId.partnerId) {
        notificationService.sendToPartner(booking.propertyId.partnerId, {
          title: 'Guest Checked In',
          body: `Guest for Booking #${booking.bookingId} has been checked in.`
        }, { type: 'check_in', bookingId: booking._id }).catch(console.error);

        mongoose.model('HotelPartner').findById(booking.propertyId.partnerId).then(partner => {
          if (partner && partner.email) emailService.sendPartnerBookingStatusUpdateEmail(partner, booking, 'Checked In').catch(console.error);
        }).catch(console.error);
      }

      // Notify Admin
      notificationService.sendToAdmins({
        title: 'Guest Checked In 🛎️',
        body: `Guest for Booking #${booking.bookingId} has checked in at ${booking.propertyId?.propertyName}.`
      }, { type: 'check_in', bookingId: booking._id }).catch(console.error);
    }

    res.json({ success: true, message: 'Checked In Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check-Out Booking
export const markCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'checked_in') {
      return res.status(400).json({ message: 'Booking must be checked-in to check out.' });
    }

    // Determine if payment is required
    if (booking.paymentStatus !== 'paid') {
      // Allow Partner to override? Or strict? 
      // Let's go strict for now but allow if query param ?force=true
      if (req.query.force !== 'true') {
        return res.status(400).json({ message: 'Payment Pending. Please Mark Paid first.', requirePayment: true });
      }
    }

    booking.bookingStatus = 'checked_out';
    // booking.actualCheckOutDate = new Date(); // Ideally add to schema
    await booking.save();

    // --- RELEASE INVENTORY (Early Checkout) ---
    try {
      const ledger = await AvailabilityLedger.findOne({ referenceId: booking._id });
      if (ledger) {
        const now = new Date();
        // If checking out earlier than the blocked end date, free up the rest
        if (now < new Date(ledger.endDate)) {
          ledger.endDate = now;
          await ledger.save();
          console.log(`[Inventory] Released inventory for Booking ${booking.bookingId} (Early Checkout)`);
        }
      }
    } catch (invErr) {
      console.error('Inventory Release Failed during Check-out:', invErr);
    }

    if (booking.userId) {
      const ut = booking.userModel ? booking.userModel.toLowerCase() : 'user';
      notificationService.sendToUser(booking.userId, {
        title: 'Checked Out Successfully 👋',
        body: `Thank you for staying at ${booking.propertyId?.propertyName || 'Hotel'}. Have a safe trip!`
      }, { type: 'check_out', bookingId: booking._id }, ut).catch(console.error);

      // Notify Partner
      if (booking.propertyId && booking.propertyId.partnerId) {
        notificationService.sendToPartner(booking.propertyId.partnerId, {
          title: 'Guest Checked Out',
          body: `Guest for Booking #${booking.bookingId} has been checked out.`
        }, { type: 'check_out', bookingId: booking._id }).catch(console.error);

        mongoose.model('HotelPartner').findById(booking.propertyId.partnerId).then(partner => {
          if (partner && partner.email) emailService.sendPartnerBookingStatusUpdateEmail(partner, booking, 'Checked Out').catch(console.error);
        }).catch(console.error);
      }

      // Notify Admin
      notificationService.sendToAdmins({
        title: 'Guest Checked Out 🚪',
        body: `Guest for Booking #${booking.bookingId} has checked out from ${booking.propertyId?.propertyName}.`
      }, { type: 'check_out', bookingId: booking._id }).catch(console.error);
    }

    // Referral Trigger (if not already done)
    if (booking.userId && booking.paymentStatus === 'paid') {
      console.log(`[REFERRAL_DEBUG] Triggering booking completion for user: ${booking.userId}, Booking: ${booking._id}`);
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('[REFERRAL_DEBUG] Referral Trigger Error:', e));
    }

    res.json({ success: true, message: 'Checked Out Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadReceipt = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('roomTypeId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Security Check
    const userRole = req.user.role;
    const userId = req.user._id.toString();
    const isOwner = booking.userId?._id.toString() === userId || booking.userId.toString() === userId;
    const isPartner = booking.propertyId?.partnerId?.toString() === userId;
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    if (!isOwner && !isPartner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to download this receipt' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${booking.bookingId}.pdf`);

    doc.pipe(res);

    // --- COLORS & STYLES ---
    const primaryColor = '#1f2937'; // slate-800
    const secondaryColor = '#6b7280'; // gray-500
    const accentColor = '#3b82f6'; // blue-500
    const boxBgColor = '#f9fafb'; // gray-50
    const borderColor = '#e5e7eb'; // gray-200
    const titleStart = 50;

    // --- HEADER ---
    doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor).text('Rukkoo.in', 50, 40);
    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('Booking Receipt', 50, 65);

    // Draw Line
    doc.moveTo(50, 85).lineTo(550, 85).strokeColor(borderColor).lineWidth(1).stroke();

    // --- BOOKING SUMMARY CARD ---
    const summaryY = 100;

    // Booking ID Title
    doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text(`BOOKING #${booking.bookingId}`, 50, summaryY);

    // Status Badge (Simulated with text color for now)
    const status = (booking.bookingStatus || 'confirmed').toUpperCase();
    let statusColor = '#059669'; // green-600
    if (status === 'CANCELLED') statusColor = '#dc2626';
    if (status === 'PENDING') statusColor = '#d97706';

    doc.fontSize(10).font('Helvetica-Bold').fillColor(statusColor).text(status, 450, summaryY + 8, { align: 'right', width: 100 });

    // Booked On
    doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
      .text(`BOOKED ON ${new Date(booking.createdAt).toLocaleDateString()} • ${new Date(booking.createdAt).toLocaleTimeString()}`, 50, summaryY + 30);


    // --- GRID LAYOUT ---
    const col1X = 50;
    const col2X = 350; // Right Column Start
    let currentY = 160;

    // --- LEFT COLUMN: STAY DETAILS ---
    // Box Header
    doc.rect(col1X, currentY, 280, 25).fill(boxBgColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('STAY DETAILS', col1X + 10, currentY + 7);

    // Box Body Border
    doc.rect(col1X, currentY, 280, 160).stroke(borderColor);

    // Content Start
    let contentY = currentY + 40;

    // Check-in / Check-out Row
    doc.fontSize(8).font('Helvetica-Bold').fillColor(secondaryColor).text('CHECK-IN', col1X + 15, contentY);
    doc.text('CHECK-OUT', col1X + 150, contentY);

    contentY += 15;
    doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
      .text(new Date(booking.checkInDate).toLocaleDateString(), col1X + 15, contentY);
    doc.text(new Date(booking.checkOutDate).toLocaleDateString(), col1X + 150, contentY);

    contentY += 15;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(secondaryColor).text('AFTER 12:00 PM', col1X + 15, contentY);
    doc.text('BEFORE 11:00 AM', col1X + 150, contentY);

    // Hotel Details
    contentY += 30;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
      .text(`HOTEL: ${(booking.propertyId?.propertyName || 'Hotel').toUpperCase()}`, col1X + 15, contentY, { width: 250 });

    contentY += 15;
    doc.fontSize(8).font('Helvetica').fillColor(secondaryColor)
      .text((booking.propertyId?.address?.fullAddress || 'Address Not Available').toUpperCase(), col1X + 15, contentY, { width: 250 });

    // --- LEFT COLUMN: GUEST DETAILS ---
    currentY += 180; // Move down for next box

    // Box Header
    doc.rect(col1X, currentY, 280, 25).fill(boxBgColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('GUEST INFORMATION', col1X + 10, currentY + 7);

    // Box Body Border
    doc.rect(col1X, currentY, 280, 100).stroke(borderColor);

    contentY = currentY + 40;

    // Guest Avatar Circle (Placeholder)
    doc.circle(col1X + 30, contentY + 15, 20).fill('#000000');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff')
      .text((booking.userId?.name?.charAt(0) || 'G').toUpperCase(), col1X + 22, contentY + 8);

    // Guest Info Text
    doc.fillColor(primaryColor).fontSize(12).text((booking.userId?.name || 'Guest').toUpperCase(), col1X + 60, contentY);

    contentY += 20;
    doc.fontSize(8).font('Helvetica').fillColor(secondaryColor);
    doc.text((booking.userId?.email || 'NO EMAIL').toUpperCase(), col1X + 60, contentY);
    contentY += 12;
    doc.text((booking.userId?.phone || 'N/A'), col1X + 60, contentY);
    contentY += 12;
    doc.text(`${booking.guests?.adults || 1} ADULTS, ${booking.guests?.children || 0} CHILDREN`, col1X + 60, contentY);


    // --- RIGHT COLUMN: PAYMENT SUMMARY ---
    currentY = 160; // Reset Y for right col

    // Box Header
    doc.rect(col2X, currentY, 200, 25).fill(boxBgColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('PAYMENT SUMMARY', col2X + 10, currentY + 7);

    // Box Body Border
    doc.rect(col2X, currentY, 200, 280).stroke(borderColor);

    contentY = currentY + 40;
    const rightColWidth = 180;
    const labelX = col2X + 15;
    const valueX = col2X + 185; // Right aligned anchor

    // Helper for rows
    const drawRow = (label, value, isBold = false, color = primaryColor) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(secondaryColor).text(label.toUpperCase(), labelX, contentY);
      doc.fontSize(isBold ? 10 : 8).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color)
        .text(value, col2X, contentY, { align: 'right', width: rightColWidth });
      contentY += 25;
    };

    drawRow('Total Calculation', `Rs.${booking.totalAmount?.toLocaleString()}`, true);
    drawRow('Taxes & Fees', 'INCLUDED');
    drawRow('Payment Method', (booking.paymentMethod?.replace(/_/g, ' ') || 'N/A').toUpperCase());

    // Platform Commission (Admin/Partner Only - but User requested "same format" so we include it visually but maybe careful)
    // Assuming this is an admin receipt as per request context
    drawRow('Platform Commission', `Rs.${((booking.adminCommission || 0) + (booking.taxes || 0)).toLocaleString()}`, false, '#d97706'); // amber-600

    drawRow('Payment Status', (booking.paymentStatus || 'PENDING').toUpperCase(), true, booking.paymentStatus === 'paid' ? '#059669' : '#d97706');

    // Divider
    doc.moveTo(labelX, contentY).lineTo(col2X + rightColWidth, contentY).strokeColor(borderColor).stroke();
    contentY += 15;

    // Total
    doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor).text('TOTAL AMOUNT', labelX, contentY + 5);
    doc.fontSize(16).text(`Rs.${booking.totalAmount?.toLocaleString()}`, col2X, contentY, { align: 'right', width: rightColWidth });

    contentY += 40;

    // Payment Status Box within Payment Summary
    let statusText = 'AWAITING PAYMENT';
    let statusBg = '#fffbeb'; // amber-50
    let statusFg = '#b45309'; // amber-700

    if (booking.paymentStatus === 'paid') {
      statusText = 'PAYMENT VERIFIED';
      statusBg = '#ecfdf5'; // green-50
      statusFg = '#047857'; // green-700
    } else if (booking.paymentStatus === 'refunded') {
      statusText = 'AMOUNT REFUNDED';
      statusBg = '#f3f4f6'; // gray-50
      statusFg = '#374151'; // gray-700
    }

    // Draw status pill background manually since fillAndStroke is tricky for rounded rects in raw pdfkit without plugin sometimes, 
    // but we can try roundedRect
    doc.roundedRect(col2X + 15, contentY, 170, 25, 4).fill(statusBg);
    doc.fillColor(statusFg).fontSize(8).text(statusText, col2X + 15, contentY + 8, { align: 'center', width: 170 });


    // --- FOOTER NOTE ---
    const footerY = 500;
    doc.roundedRect(50, footerY, 500, 50, 8).fill('#eff6ff'); // blue-50
    doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold')
      .text('ADMIN NOTE', 65, footerY + 10);
    doc.font('Helvetica').text('SYSTEM VERIFIED BOOKING. THIS TRANSACTION IS SECURED AND FINAL. REVIEW ANY CANCELLATION POLICIES BEFORE MANUAL INTERVENTION.', 65, footerY + 25, { width: 470 });

    doc.end();

  } catch (error) {
    console.error('Download Receipt Error:', error);
    res.status(500).json({ message: 'Error generating receipt' });
  }
};
