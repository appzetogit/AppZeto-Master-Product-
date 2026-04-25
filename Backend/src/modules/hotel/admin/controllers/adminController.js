import mongoose from 'mongoose';
import User from '../../user/models/User.js';
import Partner from '../../partner/models/Partner.js';
import InfoPage from '../../models/InfoPage.js';
import ContactMessage from '../../models/ContactMessage.js';
import PlatformSettings from '../../models/PlatformSettings.js';
import Property from '../../models/Property.js';
import RoomType from '../../models/RoomType.js';
import Booking from '../../models/Booking.js';
import PropertyDocument from '../../models/PropertyDocument.js';
import Review from '../../models/Review.js';
import AvailabilityLedger from '../../models/AvailabilityLedger.js';
import Notification from '../../models/Notification.js';
import emailService from '../../services/emailService.js';
import notificationService from '../../services/notificationService.js';
import Wallet from '../../models/Wallet.js';
import Transaction from '../../models/Transaction.js';
import Admin from '../models/Admin.js';
import { uploadToCloudinary } from '../../utils/cloudinary.js';

const buildObjectIdMap = (documents = []) =>
  documents.reduce((acc, document) => {
    if (document?._id) {
      acc[String(document._id)] = document;
    }
    return acc;
  }, {});

const attachBookingRelations = async (bookings) => {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return [];
  }

  const userIds = [];
  const partnerIds = [];
  const propertyIds = [];
  const roomTypeIds = [];

  bookings.forEach((booking) => {
    const bookingObject = typeof booking.toObject === 'function' ? booking.toObject() : booking;
    const userId = bookingObject?.userId ? String(bookingObject.userId) : null;
    const propertyId = bookingObject?.propertyId ? String(bookingObject.propertyId) : null;
    const roomTypeId = bookingObject?.roomTypeId ? String(bookingObject.roomTypeId) : null;

    if (userId) {
      if (bookingObject.userModel === 'HotelPartner') {
        partnerIds.push(bookingObject.userId);
      } else if (bookingObject.userModel === 'HotelUser') {
        userIds.push(bookingObject.userId);
      }
    }

    if (propertyId) {
      propertyIds.push(bookingObject.propertyId);
    }

    if (roomTypeId) {
      roomTypeIds.push(bookingObject.roomTypeId);
    }
  });

  const [users, partners, properties, roomTypes] = await Promise.all([
    userIds.length > 0
      ? User.find({ _id: { $in: userIds } }).select('name email phone').lean()
      : [],
    partnerIds.length > 0
      ? Partner.find({ _id: { $in: partnerIds } }).select('name email phone').lean()
      : [],
    propertyIds.length > 0
      ? Property.find({ _id: { $in: propertyIds } }).select('propertyName address').lean()
      : [],
    roomTypeIds.length > 0
      ? RoomType.find({ _id: { $in: roomTypeIds } }).select('name').lean()
      : []
  ]);

  const userMap = buildObjectIdMap(users);
  const partnerMap = buildObjectIdMap(partners);
  const propertyMap = buildObjectIdMap(properties);
  const roomTypeMap = buildObjectIdMap(roomTypes);

  return bookings.map((booking) => {
    const bookingObject = typeof booking.toObject === 'function' ? booking.toObject() : booking;
    const userId = bookingObject?.userId ? String(bookingObject.userId) : null;
    const propertyId = bookingObject?.propertyId ? String(bookingObject.propertyId) : null;
    const roomTypeId = bookingObject?.roomTypeId ? String(bookingObject.roomTypeId) : null;

    const relatedUser =
      bookingObject.userModel === 'HotelPartner'
        ? partnerMap[userId] || null
        : userMap[userId] || null;

    return {
      ...bookingObject,
      userId: relatedUser,
      propertyId: propertyMap[propertyId] || null,
      roomTypeId: roomTypeMap[roomTypeId] || null
    };
  });
};



export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Helper for percentage change
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // 1. KPI Counts & Trends
    const [
      totalUsers, usersLastMonth,
      totalPartners,
      totalHotels,
      pendingHotels,
      totalBookings, bookingsLastMonth,
      currentRevenueData, lastMonthRevenueData
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $lt: startOfThisMonth } }), // Approximation for trend base
      Partner.countDocuments({}),
      Property.countDocuments({}),
      Property.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ bookingStatus: { $ne: 'awaiting_payment' } }),
      Booking.countDocuments({ bookingStatus: { $ne: 'awaiting_payment' }, createdAt: { $lt: startOfThisMonth } }), // trend base
      Booking.aggregate([
        { $match: { bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Booking.aggregate([ // Revenue before this month
        {
          $match: {
            bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
            paymentStatus: { $in: ['paid', 'partial'] },
            createdAt: { $lt: startOfThisMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = currentRevenueData[0]?.total || 0;
    const prevRevenue = lastMonthRevenueData[0]?.total || 0;

    // Calculate trends (Simple approx based on total vs total-this-month isn't perfect for "vs last month", 
    // but better: Calculate created in THIS month vs created in LAST month)

    const usersNewThisMonth = await User.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const usersNewLastMonth = await User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

    const bookingsThisMonth = await Booking.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const bookingsLastMonthCount = await Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

    // Revenue This Month vs Last Month
    const revThisMonthAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: startOfThisMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const revLastMonthAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const incomeThisMonth = revThisMonthAgg[0]?.total || 0;
    const incomeLastMonth = revLastMonthAgg[0]?.total || 0;

    const trends = {
      users: calculateGrowth(usersNewThisMonth, usersNewLastMonth),
      bookings: calculateGrowth(bookingsThisMonth, bookingsLastMonthCount),
      revenue: calculateGrowth(incomeThisMonth, incomeLastMonth)
    };

    // 2. Charts Data

    // Revenue Chart (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          amount: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Booking Status Distribution
    const bookingStatusStats = await Booking.aggregate([
      { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
    ]);

    // Format for frontend
    const revenueChart = monthlyRevenue.map(item => {
      const [year, month] = item._id.split('-');
      const date = new Date(year, month - 1);
      return {
        name: date.toLocaleString('default', { month: 'short' }),
        value: item.amount
      };
    });

    const statusChart = bookingStatusStats.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count
    }));

    // 3. Lists
    const recentBookingsRaw = await Booking.find({ bookingStatus: { $ne: 'awaiting_payment' } })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentBookings = await attachBookingRelations(recentBookingsRaw);

    const recentPropertyRequests = await Property.find({ status: 'pending' })
      .populate('partnerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPartners,
        totalHotels,
        pendingHotels,
        totalBookings,
        totalRevenue,
        trends
      },
      charts: {
        revenue: revenueChart,
        status: statusChart
      },
      recentBookings,
      recentPropertyRequests
    });
  } catch (error) {
    console.error('Get Admin Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isBlocked = status === 'blocked';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, users, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

export const getAllPartners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, approvalStatus, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (approvalStatus) {
      query.partnerApprovalStatus = approvalStatus;
    }

    if (status) {
      if (status === 'blocked') {
        query.isBlocked = true;
      } else if (status === 'active') {
        query.isBlocked = false;
      }
    }

    const total = await Partner.countDocuments(query);
    const partners = await Partner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, partners, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching partners' });
  }
};

export const getAllHotels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status, type } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.propertyType = String(type).toLowerCase();
    }

    const total = await Property.countDocuments(query);

    let hotels = await Property.find(query)
      .populate('partnerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch Wallet Balances for each Partner
    const partnerIds = hotels.map(h => h.partnerId?._id).filter(id => id != null);
    const wallets = await Wallet.find({ 
      partnerId: { $in: partnerIds },
      role: 'partner'
    }).select('balance partnerId');

    const walletMap = wallets.reduce((acc, w) => {
      acc[w.partnerId.toString()] = w.balance;
      return acc;
    }, {});

    // Attach balance to each hotel object
    hotels = hotels.map(h => {
      const hotelObj = h.toObject();
      if (hotelObj.partnerId && hotelObj.partnerId._id) {
        hotelObj.partnerWalletBalance = walletMap[hotelObj.partnerId._id.toString()] || 0;
      }
      return hotelObj;
    });

    res.status(200).json({ success: true, hotels, total, page, limit });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching hotels' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};

    if (status) {
      query.bookingStatus = status;
    } else {
      // By default, hide bookings that haven't completed the initial payment process
      query.bookingStatus = { $ne: 'awaiting_payment' };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // 1. Find matching Users and Partners
      const [users, partners] = await Promise.all([
        User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
        }).select('_id'),
        Partner.find({
          $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
        }).select('_id')
      ]);
      const userIds = [...users, ...partners].map((user) => user._id);

      // 2. Find matching Properties
      const properties = await Property.find({ propertyName: searchRegex }).select('_id');
      const propertyIds = properties.map(p => p._id);

      // 3. Construct OR query
      const searchConditions = [
        { bookingId: searchRegex },
        { userId: { $in: userIds } },
        { propertyId: { $in: propertyIds } }
      ];

      // Merge with existing query
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }
    const [
      bookingsRaw,
      total,
      totalAll,
      confirmed,
      pending,
      cancelled,
      completed,
      checked_in,
      checked_out
    ] = await Promise.all([
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
      Booking.countDocuments({}),
      Booking.countDocuments({ bookingStatus: 'confirmed' }),
      Booking.countDocuments({ bookingStatus: 'pending' }),
      Booking.countDocuments({ bookingStatus: 'cancelled' }),
      Booking.countDocuments({ bookingStatus: 'completed' }),
      Booking.countDocuments({ bookingStatus: 'checked_in' }),
      Booking.countDocuments({ bookingStatus: 'checked_out' })
    ]);
    const bookings = await attachBookingRelations(bookingsRaw);

    res.status(200).json({
      success: true,
      bookings,
      total,
      page,
      limit,
      stats: {
        total: totalAll,
        confirmed,
        pending,
        cancelled,
        completed,
        checked_in,
        checked_out
      }
    });
  } catch (e) {
    console.error('Get All Bookings Error:', e);
    res.status(500).json({ success: false, message: 'Server error fetching bookings' });
  }
};

export const getPropertyRequests = async (req, res) => {
  try {
    const hotels = await Property.find({ status: 'pending' })
      .populate('partnerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, hotels });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching property requests' });
  }
};

export const updateHotelStatus = async (req, res) => {
  try {
    const { propertyId, hotelId, status, isLive } = req.body;

    const id = propertyId || hotelId;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Property id is required' });
    }

    const update = {};
    if (status) {
      update.status = status;
      if (status === 'approved') {
        update.isLive = true;
      }
      if (status === 'rejected' || status === 'suspended' || status === 'draft') {
        update.isLive = false;
      }
    }

    if (typeof isLive === 'boolean') {
      update.isLive = isLive;
    }
    
    if (typeof req.body.isVerified === 'boolean') {
      update.isVerified = req.body.isVerified;
    }

    if (req.body.customUrgencyMessage !== undefined) {
      update.customUrgencyMessage = req.body.customUrgencyMessage;
    }

    if (req.body.fakePrice !== undefined) {
      update.fakePrice = Number(req.body.fakePrice) || 0;
    }

    const hotel = await Property.findByIdAndUpdate(id, update, { new: true });
    if (!hotel) return res.status(404).json({ success: false, message: 'Property not found' });

    // NOTIFICATION: Notify Partner
    if (status || typeof isLive === 'boolean') {
      const msg = status === 'approved' || update.isLive === true
        ? `Your property "${hotel.propertyName}" is now ${status || 'Live'}!`
        : `Management update: "${hotel.propertyName}" status changed to ${status || (update.isLive ? 'Live' : 'Hidden')}.`;

      notificationService.sendToPartner(hotel.partnerId, {
        title: 'Property Status Update 🏢',
        body: msg
      }, {
        type: 'property_status_updated',
        propertyId: hotel._id,
        status: hotel.status,
        isLive: hotel.isLive
      }).catch(e => console.error('Partner status update push failed:', e));

      // EMAIL: Property Status Change (Suspended / Unsuspended)
      Partner.findById(hotel.partnerId).then(partner => {
        if (partner && partner.email) {
          emailService.sendPartnerPropertyStatusUpdateEmail(partner, hotel, status || hotel.status, hotel.isLive).catch(e => console.error(e));
        }
      });
    }

    res.status(200).json({ success: true, hotel });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error updating hotel status' });
  }
};

export const verifyPropertyDocuments = async (req, res) => {
  try {
    const { propertyId, action, adminRemark } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const docs = await PropertyDocument.findOne({ propertyId });
    if (!docs) return res.status(404).json({ success: false, message: 'Documents not found' });

    if (action === 'approve') {
      docs.verificationStatus = 'verified';
      docs.adminRemark = undefined;
      docs.verifiedAt = new Date();
      property.status = 'approved';
      property.isLive = true;

      // NOTIFICATION: Property Live
      notificationService.sendToPartner(property.partnerId, {
        title: 'Property Live!',
        body: `Your property ${property.propertyName} is LIVE now!`
      }, { type: 'property_verified', propertyId: property._id }).catch(e => console.error(e));

      // EMAIL: Property Approved
      Partner.findById(property.partnerId).then(partner => {
        if (partner && partner.email) {
          emailService.sendPartnerPropertyApprovedEmail(partner, property).catch(e => console.error(e));
        }
      });

    } else if (action === 'reject') {
      docs.verificationStatus = 'rejected';
      docs.adminRemark = adminRemark;
      docs.verifiedAt = new Date();
      property.status = 'rejected';
      property.isLive = false;

      // Notify Rejection?
      notificationService.sendToPartner(property.partnerId, {
        title: 'Property Documents Rejected',
        body: `Your property ${property.propertyName} documents were rejected. reason: ${adminRemark || 'Review needed'}`
      }, { type: 'property_rejected', propertyId: property._id }).catch(e => console.error(e));

      // EMAIL: Property Rejected
      Partner.findById(property.partnerId).then(partner => {
        if (partner && partner.email) {
          emailService.sendPartnerPropertyRejectedEmail(partner, property, adminRemark).catch(e => console.error(e));
        }
      });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    await docs.save();
    await property.save();
    res.status(200).json({ success: true, property, documents: docs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error verifying documents' });
  }
};

export const getReviewModeration = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.status(200).json({ success: true, reviews, total, page, limit });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching reviews' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.body;
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const agg = await Review.aggregate([
      { $match: { propertyId: review.propertyId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const stats = agg[0];
    if (stats) {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: stats.avg, totalReviews: stats.count });
    } else {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: 0, totalReviews: 0 });
    }
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error deleting review' });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId, status } = req.body;
    const review = await Review.findById(reviewId).populate('userId').populate('propertyId');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.status = status;
    await review.save();

    const agg = await Review.aggregate([
      { $match: { propertyId: review.propertyId._id, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const stats = agg[0];
    if (stats) {
      await Property.findByIdAndUpdate(review.propertyId._id, { avgRating: stats.avg, totalReviews: stats.count });
    } else {
      await Property.findByIdAndUpdate(review.propertyId._id, { avgRating: 0, totalReviews: 0 });
    }

    // NOTIFICATION: Notify User (Push + Email)
    if (review.userId) {
      const user = review.userId;
      const property = review.propertyId;
      const reason = req.body.reason || (status === 'rejected' ? 'Did not meet community guidelines.' : '');

      // Push
      notificationService.sendToUser(user._id, {
        title: `Review ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
        body: `Your review for "${property.propertyName}" has been ${status}.`
      }, { type: 'review_moderation', status, reviewId: review._id }, 'user').catch(e => console.error(e));

      // Email
      if (user.email) {
        emailService.sendReviewStatusEmail(user, review, property, status, reason).catch(e => console.error(e));
      }
    }

    res.status(200).json({ success: true, message: `Review status updated to ${status}`, review });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error updating review status' });
  }
};

export const updatePartnerStatus = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const partner = await Partner.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    // NOTIFICATION: Notify Partner
    notificationService.sendToPartner(partner._id, {
      title: isBlocked ? 'Account Blocked ⚠️' : 'Account Unblocked ✅',
      body: isBlocked
        ? 'Your partner account has been blocked by administration.'
        : 'Your partner account has been unblocked. You can now access your dashboard.'
    }, { type: 'partner_status_update', isBlocked }).catch(e => console.error('Partner status update push failed:', e));

    // EMAIL: Notify Partner of block/unblock
    if (partner.email) {
      emailService.sendPartnerAccountStatusEmail(partner, isBlocked).catch(e => console.error(e));
    }

    // NOTIFICATION: Notify Admin for audit log
    notificationService.sendToAdmins({
      title: `Partner ${isBlocked ? 'Blocked' : 'Unblocked'}`,
      body: `Partner ${partner.name} has been ${isBlocked ? 'blocked' : 'unblocked'} by admin.`
    }, { type: 'partner_status_change', partnerId: partner._id, isBlocked }).catch(console.error);

    res.status(200).json({ success: true, message: `Partner ${isBlocked ? 'blocked' : 'unblocked'} successfully`, partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating partner status' });
  }
};

export const deletePartner = async (req, res) => {
  try {
    const { userId } = req.body;
    const partner = await Partner.findByIdAndDelete(userId);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    // NOTIFICATION: Notify Admin
    notificationService.sendToAdmins({
      title: 'Partner Account Deleted 🗑️',
      body: `Partner account for ${partner.name} has been permanently deleted.`
    }, { type: 'partner_deleted', partnerId: userId }).catch(console.error);

    // EMAIL: Notify Partner
    if (partner.email) {
      emailService.sendPartnerAccountDeletedEmail(partner).catch(e => console.error(e));
    }

    res.status(200).json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting partner' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // NOTIFICATION: Notify User
    notificationService.sendToUser(user._id, {
      title: isBlocked ? 'Account Suspended ⚠️' : 'Account Active ✅',
      body: isBlocked
        ? 'Your account has been suspended by administration. Contact support for assistance.'
        : 'Your account has been reactivated. Welcome back!'
    }, { type: 'user_status_update', isBlocked }, 'user').catch(console.error);

    // NOTIFICATION: Notify Admin
    notificationService.sendToAdmins({
      title: `User ${isBlocked ? 'Suspended' : 'Activated'}`,
      body: `User ${user.name} (${user.phone}) has been ${isBlocked ? 'suspended' : 'activated'} by admin.`
    }, { type: 'user_status_change', userId: user._id, isBlocked }).catch(console.error);

    // EMAIL: Notify User
    if (user.email) {
      emailService.sendUserAccountStatusEmail(user, isBlocked).catch(e => console.error(e));
    }

    res.status(200).json({ success: true, message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating user status' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // NOTIFICATION: Notify Admin
    notificationService.sendToAdmins({
      title: 'User Account Deleted 🗑️',
      body: `User account for ${user.name} has been deleted.`
    }, { type: 'user_deleted', userId }).catch(console.error);

    // EMAIL: Notify User
    if (user.email) {
      emailService.sendUserAccountDeletedEmail(user).catch(e => console.error(e));
    }

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};

export const deleteHotel = async (req, res) => {
  try {
    const { propertyId, hotelId } = req.body;
    const id = propertyId || hotelId;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Property id is required' });
    }

    const hotel = await Property.findById(id);
    if (!hotel) return res.status(404).json({ success: false, message: 'Property not found' });

    const partner = await Partner.findById(hotel.partnerId);

    const del = await Property.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ success: false, message: 'Property not found' });

    await PropertyDocument.deleteMany({ propertyId: id });
    await RoomType.deleteMany({ propertyId: id });

    // EMAIL: Notify Partner of deletion
    if (partner && partner.email) {
      emailService.sendPartnerPropertyDeletedEmail(partner, hotel, 'SuperAdmin').catch(e => console.error(e));
    }

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error deleting property' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId, status, reason = 'Cancelled by Administrator' } = req.body;
    const booking = await Booking.findById(bookingId).populate('propertyId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const previousStatus = booking.bookingStatus;
    booking.bookingStatus = status;

    let walletStatus = null;

    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason;

      // --- FINANCIAL REVERSALS (do before releasing inventory so we can abort on failure) ---
      console.log(`[AdminController] Processing cancellation financials for Booking: ${booking.bookingId} (${booking.paymentMethod})`);

      // Case A: Pay at Hotel (Reverse Commission Deduction)
      if (booking.paymentMethod === 'pay_at_hotel' && booking.paymentStatus === 'paid') {
        const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);
        console.log(`[AdminController] Pay at Hotel Refund Calculation: ₹${refundAmount} (Tax: ${booking.taxes}, Commission: ${booking.adminCommission})`);

        if (refundAmount > 0 && booking.propertyId?.partnerId) {
          const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminModel = (await import('../models/Admin.js')).default;
            const firstAdmin = await AdminModel.findOne({ isActive: true });
            if (firstAdmin) adminWallet = await Wallet.findOne({ partnerId: firstAdmin._id, role: 'admin' });
          }

          if (!partnerWallet || !adminWallet) {
            return res.status(400).json({
              success: false,
              message: 'Cannot process cancellation: required wallet(s) missing. Partner wallet: ' + (partnerWallet ? 'OK' : 'missing') + ', Admin wallet: ' + (adminWallet ? 'OK' : 'missing')
            });
          }

          await partnerWallet.credit(refundAmount, `Refund (Admin Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
          await adminWallet.debit(refundAmount, `Refund (Admin Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
          walletStatus = { partnerRefunded: refundAmount, adminDebited: refundAmount };
          console.log(`[AdminController] Pay at Hotel financial reversal complete.`);
        }
      }

      // Case B: Paid Bookings (Wallet/Online - Refund User & Reverse Payouts)
      if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'partial') {
        console.log(`[AdminController] Processing Case B (Paid/Partial) refund for ${booking.totalAmount}`);

        let userWallet = await Wallet.findOne({ partnerId: booking.userId, role: 'user' });
        if (!userWallet) {
          userWallet = await Wallet.create({ partnerId: booking.userId, role: 'user', balance: 0 });
        }

        if (booking.partnerPayout > 0 && booking.propertyId?.partnerId) {
          const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
          if (!partnerWallet) {
            return res.status(400).json({
              success: false,
              message: 'Cannot process cancellation: partner wallet not found. Refund to user was not applied.'
            });
          }
        }

        const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
        if (adminDeduction > 0) {
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminModel = (await import('../models/Admin.js')).default;
            const firstAdmin = await AdminModel.findOne({ isActive: true });
            if (firstAdmin) adminWallet = await Wallet.findOne({ partnerId: firstAdmin._id, role: 'admin' });
          }
          if (!adminWallet) {
            return res.status(400).json({
              success: false,
              message: 'Cannot process cancellation: admin wallet not found. Refund to user was not applied.'
            });
          }
        }

        await userWallet.credit(booking.totalAmount, `Refund (Admin Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'refund');

        if (booking.partnerPayout > 0 && booking.propertyId?.partnerId) {
          const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
          await partnerWallet.debit(booking.partnerPayout, `Reversal (Admin Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'refund_deduction');
        }

        if (adminDeduction > 0) {
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminModel = (await import('../models/Admin.js')).default;
            const firstAdmin = await AdminModel.findOne({ isActive: true });
            if (firstAdmin) adminWallet = await Wallet.findOne({ partnerId: firstAdmin._id, role: 'admin' });
          }
          await adminWallet.debit(adminDeduction, `Reversal (Admin Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'refund_deduction');
        }

        booking.paymentStatus = 'refunded';
        walletStatus = {
          userRefunded: booking.totalAmount,
          partnerDeducted: booking.partnerPayout || 0,
          adminDeducted: adminDeduction
        };
        console.log(`[AdminController] Case B financials complete.`);
      }

      // Release inventory only after wallet operations succeed
      await AvailabilityLedger.deleteMany({
        source: 'platform',
        referenceId: booking._id
      });
    }

    await booking.save();

    // Trigger Notifications (non-blocking; do not fail response on notification errors)
    const ut = booking.userModel ? booking.userModel.toLowerCase() : 'user';

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: `Your booking #${booking.bookingId} at ${booking.propertyId?.propertyName || 'Hotel'} has been ${status}.`
      }, { type: 'booking_update', bookingId: booking._id, status }, ut).catch(console.error);

      if (status === 'cancelled') {
        User.findById(booking.userId).then(user => {
          if (user && user.email) {
            emailService.sendBookingCancellationEmail(user, booking, booking.paymentStatus === 'refunded' ? booking.totalAmount : 0).catch(console.error);
          }
        });
      }
    }

    if (booking.propertyId?.partnerId) {
      notificationService.sendToPartner(booking.propertyId.partnerId, {
        title: `Booking Update Alert`,
        body: `Booking #${booking.bookingId} status updated to ${status} by Administrator.`
      }, { type: 'booking_update', bookingId: booking._id, status }).catch(console.error);
    }

    notificationService.sendToAdmins({
      title: 'Booking Status Updated',
      body: `Booking #${booking.bookingId} status changed to ${status} by ${req.user.name || 'HotelAdmin'}.`
    }, { type: 'booking_update', bookingId: booking._id }).catch(console.error);

    res.status(200).json({ success: true, booking, walletStatus });
  } catch (e) {
    console.error('Update Booking Status Error:', e);
    res.status(500).json({ success: false, message: 'Server error updating booking status' });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const bookings = await Booking.find({ userId: id })
      .populate('propertyId', 'propertyName name address')
      .sort({ createdAt: -1 })
      .lean();

    const wallet = await Wallet.findOne({ partnerId: id, role: 'user' });
    let walletTransactions = wallet
      ? await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 }).lean()
      : [];

    const bookingTransactions = bookings
      .filter(b => ['paid', 'refunded', 'partial'].includes(b.paymentStatus))
      .map(b => ({
        _id: b._id,
        bookingId: b.bookingId,
        type: b.paymentStatus === 'refunded' ? 'credit' : 'debit',
        amount: b.totalAmount,
        description: `Booking: ${b.propertyId?.propertyName || b.propertyId?.name || 'Hotel Stay'}`,
        status: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        isBooking: true,
        createdAt: b.createdAt
      }));

    const transactions = [...walletTransactions, ...bookingTransactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, user, bookings, wallet, transactions });
  } catch (error) {
    console.error('Get User Details Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
};

export const getPartnerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    const properties = await Property.find({ partnerId: id });
    res.status(200).json({ success: true, partner, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching partner details' });
  }
};

export const getHotelDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).populate('partnerId', 'name email phone');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const roomTypes = await RoomType.find({ propertyId: id, isActive: true });
    const documents = await PropertyDocument.findOne({ propertyId: id });

    const bookings = await Booking.find({ propertyId: id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      hotel: {
        ...property.toObject(),
        rooms: roomTypes
      },
      bookings,
      documents
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching hotel details' });
  }
};

export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName name address location coverImage')
      .populate('roomTypeId', 'name type');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.status(200).json({ success: true, booking });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching booking details' });
  }
};

export const updatePartnerApprovalStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid partner approval status' });
    }
    const partner = await Partner.findById(userId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }
    partner.partnerApprovalStatus = status;
    if (status === 'approved') {
      partner.isPartner = true;
      if (!partner.partnerSince) {
        partner.partnerSince = new Date();
      }

      // NOTIFICATION: Approved
      if (partner.email) emailService.sendPartnerApprovedEmail(partner).catch(e => console.error(e));
      notificationService.sendToPartner(partner._id, {
        title: 'You are approved!',
        body: 'You are approved! Start listing your properties.'
      }, { type: 'partner_approved' }).catch(e => console.error(e));

    } else if (status === 'rejected') { // Explicit 'rejected' check or else clause
      partner.isPartner = false;

      // NOTIFICATION: Rejected
      const reason = req.body.reason || 'Criteria not met';
      if (partner.email) emailService.sendPartnerRejectedEmail(partner, reason).catch(e => console.error(e));

      notificationService.sendToPartner(partner._id, {
        title: 'Application Update',
        body: `Your partner application has been rejected. Reason: ${reason}`
      }, { type: 'partner_rejected', reason }).catch(e => console.error(e));

    } else {
      partner.isPartner = false;
    }

    await partner.save();
    res.status(200).json({ success: true, message: `Partner status updated to ${status}`, partner });
  } catch (error) {
    console.error('Update Partner Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating partner approval status' });
  }
};

export const getLegalPages = async (req, res) => {
  try {
    const { audience } = req.query;
    const query = {};

    if (audience) {
      query.audience = audience;
    }

    const pages = await InfoPage.find(query).sort({ audience: 1, slug: 1 });

    res.status(200).json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching legal pages' });
  }
};

export const upsertLegalPage = async (req, res) => {
  try {
    const { audience, slug, title, content, isActive } = req.body;

    if (!['user', 'partner'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!['terms', 'privacy', 'about', 'contact'].includes(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page type' });
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const update = {
      audience,
      slug,
      title,
      content
    };

    if (typeof isActive === 'boolean') {
      update.isActive = isActive;
    }

    const page = await InfoPage.findOneAndUpdate(
      { audience, slug },
      update,
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error saving legal page' });
  }
};

export const getContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { audience, status } = req.query;

    const query = {};

    if (audience) {
      query.audience = audience;
    }

    if (status) {
      query.status = status;
    }

    const total = await ContactMessage.countDocuments(query);
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, messages, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching contact messages' });
  }
};

export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated successfully', contact: message });

    // NOTIFICATION: Notify User
    if (message.userId) {
      const ut = message.audience === 'partner' ? 'partner' : 'user';
      notificationService.sendToUser(message.userId, {
        title: 'Support Update 🛠️',
        body: `Your message "${message.subject}" is now ${status.replace('_', ' ')}.`
      }, { type: 'support_update', messageId: message._id, status }, ut).catch(e => console.error(e));
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating contact status' });
  }
};

export const getPlatformSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching platform settings' });
  }
};

export const updatePlatformSettings = async (req, res) => {
  try {
    const { platformOpen, maintenanceMode, bookingDisabledMessage, maintenanceTitle, maintenanceMessage } = req.body;
    const settings = await PlatformSettings.getSettings();

    if (typeof platformOpen === 'boolean') {
      settings.platformOpen = platformOpen;
    }
    if (typeof maintenanceMode === 'boolean') {
      settings.maintenanceMode = maintenanceMode;
    }
    if (typeof bookingDisabledMessage === 'string') {
      settings.bookingDisabledMessage = bookingDisabledMessage;
    }
    if (typeof maintenanceTitle === 'string') {
      settings.maintenanceTitle = maintenanceTitle;
    }
    if (typeof maintenanceMessage === 'string') {
      settings.maintenanceMessage = maintenanceMessage;
    }

    if (req.body.defaultCommission !== undefined) {
      settings.defaultCommission = Number(req.body.defaultCommission);
    }
    if (req.body.taxRate !== undefined) {
      settings.taxRate = Number(req.body.taxRate);
    }

    await settings.save();
    
    // Fallback sync to ensure dynamically added schema paths persist correctly
    await PlatformSettings.findOneAndUpdate({}, {
      $set: {
        defaultCommission: settings.defaultCommission,
        taxRate: settings.taxRate
      }
    });

    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating platform settings' });
  }
};

export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide FCM token'
      });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';
    const tokenField = `hotelFcmTokens.${targetPlatform}`;

    // 1. DEDUPLICATION: Clear this token from any OTHER Admin document only.
    // Admins, Users, and Partners are separate auth systems.
    // A token registered on the admin panel can never legitimately exist in the User/Partner collections.
    await Admin.updateMany(
      { [tokenField]: fcmToken, _id: { $ne: req.user._id } },
      { $set: { [tokenField]: null } }
    );

    // 2. Update the token for the current admin
    const admin = await Admin.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (!admin.hotelFcmTokens) admin.hotelFcmTokens = { app: null, web: null };
    admin.hotelFcmTokens[targetPlatform] = fcmToken;
    await admin.save();

    console.log(`[FCM] Admin ${admin._id} ${targetPlatform} token updated.`);

    res.json({
      success: true,
      message: `FCM token updated successfully for ${targetPlatform} platform`,
      data: { platform: targetPlatform, tokenUpdated: true }
    });

  } catch (error) {
    console.error('Update Admin FCM Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// NOTIFICATION CONTROLLERS
// ==========================================

export const getAdminNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      userType: 'admin'
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      meta: {
        total,
        page,
        limit,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get Admin Notifications Error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const createBroadcastNotification = async (req, res) => {
  try {
    const { title, body, targetAudience, type = 'general', sendEmail = false, image, url } = req.body; // targetAudience: 'users', 'partners', 'all' || 'everyone'

    if (!title || !body || !targetAudience) {
      return res.status(400).json({ message: 'Title, Body and Target Audience are required' });
    }

    let recipients = [];

    // 1. Fetch Users
    if (targetAudience === 'users' || targetAudience === 'everyone' || targetAudience === 'all') {
      const users = await User.find({ isBlocked: { $ne: true } }).select('_id email');
      recipients.push(...users.map(u => ({ id: u._id, type: 'user', email: u.email })));
    }

    // 2. Fetch Partners
    if (targetAudience === 'partners' || targetAudience === 'everyone' || targetAudience === 'all') {
      const partners = await Partner.find({ isBlocked: { $ne: true } }).select('_id email');
      recipients.push(...partners.map(p => ({ id: p._id, type: 'partner', email: p.email })));
    }

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No active recipients found for this audience' });
    }

    console.log(`Sending Broadcast: "${title}" to ${recipients.length} recipients.`);

    // 3. Send via Notification Service (Handles DB Save + FCM Push)
    // Using simple loop to avoid excessive parallel load if many recipients
    let sentCount = 0;

    // Helper function to process in chunks to avoid overwhelming the server/firebase
    const chunkSize = 50;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (recipient) => {
        try {
          // Push
          await notificationService.sendToUser(
            recipient.id,
            { title, body },
            { 
              type: 'broadcast', 
              broadcastId: Date.now().toString(),
              image,
              url
            },
            recipient.type
          );

          // Email (if requested)
          if (sendEmail && recipient.email) {
            emailService.sendBroadcastEmail(recipient.email, title, body).catch(e => console.error(e));
          }
          sentCount++;
        } catch (err) {
          console.error(`Failed to send broadcast to ${recipient.type} ${recipient.id}:`, err);
        }
      }));
    }

    // 4. Log for Admin (Sent Tab)
    await Notification.create({
      userId: req.user._id,
      userType: 'admin',
      userModel: 'HotelAdmin', // Assuming Admin model handles this
      title: `Broadcast Sent: ${title}`,
      body: `Sent to ${targetAudience} (${sentCount}/${recipients.length} recipients). Content: ${body}`,
      type: 'broadcast_log',
      isRead: true,
      data: { 
        originalTitle: title, 
        originalBody: body, 
        targetAudience, 
        recipientCount: sentCount,
        image,
        url
      }
    });

    res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${sentCount} recipients.`
    });

  } catch (error) {
    console.error('Create Broadcast Error:', error);
    res.status(500).json({ message: 'Server error sending broadcast' });
  }
};

export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, userType: 'admin', isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAdminNotifications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    await Notification.deleteMany({
      _id: { $in: ids },
      userId: req.user._id,
      userType: 'admin'
    });

    res.status(200).json({ success: true, message: 'Notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFinanceStats = async (req, res) => {
  try {


    // 2. Aggregate Booking Financials
    // Include:
    // 1. Paid bookings (Online/Wallet) -> Commission & Tax settled.
    // 2. Pay At Hotel bookings (Confirmed) -> Commission & Tax deducted from Partner Wallet upfront.
    const matchStage = {
      $or: [
        {
          paymentStatus: 'paid',
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }
        },
        {
          paymentMethod: 'pay_at_hotel',
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }
        }
      ]
    };

    const financialsOr = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$adminCommission' },
          totalTax: { $sum: '$taxes' },
          totalPayout: { $sum: '$partnerPayout' }
        }
      }
    ]);

    const financials = financialsOr[0] || {
      totalGross: 0,
      totalCommission: 0,
      totalTax: 0,
      totalPayout: 0
    };

    // 3. Fetch Transaction List (Bookings Breakdown)
    const transactions = await Booking.find(matchStage)
      .select('bookingId createdAt totalAmount adminCommission taxes partnerPayout bookingStatus paymentStatus userId propertyId')
      .populate('userId', 'name email')
      .populate({
        path: 'propertyId',
        select: 'propertyName partnerId',
        populate: { path: 'partnerId', select: 'name email' } // Get Partner Info
      })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 for now

    // Correct Admin Balance: Sum of Commission + Taxes from all valid financial transactions
    const derivedAdminBalance = (financials.totalCommission || 0) + (financials.totalTax || 0);

    res.status(200).json({
      success: true,
      stats: {
        adminBalance: derivedAdminBalance, // Derived from transactions
        totalRevenue: financials.totalGross, // Total Booking Value
        totalEarnings: financials.totalCommission, // Actual Platform Income
        totalTax: financials.totalTax,
        totalPayouts: financials.totalPayout
      },
      transactions
    });

  } catch (error) {
    console.error('Get Finance Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching finance stats' });
  }
};

export const adminUpdateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // List of fields that can be updated in Property model (Everything)
    const updatableFields = [
      'propertyName', 'contactNumber',
      'hostLivesOnProperty', 'suitability',
      'starRating', 'activities', 'shortDescription', 'partnerId', 'address',
      'location', 'nearbyPlaces', 'coverImage', 'propertyImages',
      'checkInTime', 'checkOutTime', 'cancellationPolicy',
      'status', 'isLive', 'avgRating', 'totalReviews', 'fakePrice'
    ];

    updatableFields.forEach(field => {
      if (updateData[field] !== undefined) {
        property[field] = updateData[field];
      }
    });

    await property.save();

    // Handle Rooms Update & Deletion
    if (updateData.rooms && Array.isArray(updateData.rooms)) {
      // Filter out temporary IDs (e.g., 'new-123') to avoid CastError in $nin
      const validIncomingIds = updateData.rooms
        .filter(r => r._id && mongoose.Types.ObjectId.isValid(r._id))
        .map(r => new mongoose.Types.ObjectId(r._id));

      // Delete rooms that are NOT in the incoming request
      await RoomType.deleteMany({
        propertyId: id,
        _id: { $nin: validIncomingIds }
      });

      // Update existing rooms or create new ones
      for (const roomData of updateData.rooms) {
        if (roomData._id && mongoose.Types.ObjectId.isValid(roomData._id)) {
          await RoomType.findByIdAndUpdate(roomData._id, {
            name: roomData.name,
            inventoryType: roomData.inventoryType,
            roomCategory: roomData.roomCategory,
            maxAdults: roomData.maxAdults,
            maxChildren: roomData.maxChildren,
            totalInventory: roomData.totalInventory,
            pricePerNight: roomData.pricePerNight,
            extraAdultPrice: roomData.extraAdultPrice,
            extraChildPrice: roomData.extraChildPrice,
            bedsPerRoom: roomData.bedsPerRoom,
            // amenities: roomData.amenities, // Make read-only as requested
            images: roomData.images,
            isActive: roomData.isActive
          });
        } else {
          // Create new RoomType
          const { amenities: _, ...restOfRoomData } = roomData;
          const newRoom = new RoomType({
            ...restOfRoomData,
            propertyId: id,
            _id: undefined // Let mongoose generate id
          });
          await newRoom.save();
        }
      }
    }

    // Handle Documents Update
    if (updateData.documents && Array.isArray(updateData.documents)) {
      await PropertyDocument.findOneAndUpdate(
        { propertyId: id },
        {
          documents: updateData.documents,
          verificationStatus: updateData.documentVerificationStatus || 'pending',
          adminRemark: updateData.adminRemark,
          verifiedAt: updateData.documentVerificationStatus === 'verified' ? new Date() : undefined
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Property updated successfully by Admin',
      property
    });
  } catch (error) {
    console.error('Admin Property Update Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating property' });
  }
};

export const uploadPropertyImage = async (req, res) => {
  try {
    const filesToUpload = req.files || (req.file ? [req.file] : []);

    if (!filesToUpload || filesToUpload.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let folder = 'hotels';
    if (req.body.type === 'room') {
      folder = 'rooms';
    } else if (req.body.type === 'document') {
      folder = 'documents';
    }

    const uploadPromises = filesToUpload.map(file =>
      uploadToCloudinary(file.path, folder)
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    res.status(200).json({
      success: true,
      files,
      url: files[0].url, // Backwards compatibility for single upload
      message: `${req.body.type === 'document' ? 'Document' : 'Image'}(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Admin Image Upload Error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};
