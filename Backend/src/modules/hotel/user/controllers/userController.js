import User from '../models/User.js';
import Partner from '../../partner/models/Partner.js';
import bcrypt from 'bcryptjs';

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        partnerSince: user.partnerSince
      });
    } else {
      // Check if it's a partner
      const partner = await Partner.findById(req.user._id);
      if (partner) {
        res.json({
          _id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          role: partner.role,
          isPartner: partner.isPartner,
          partnerApprovalStatus: partner.partnerApprovalStatus,
          profileImage: partner.profileImage,
          createdAt: partner.createdAt,
          partnerSince: partner.partnerSince,
          address: partner.address,
          aadhaarNumber: partner.aadhaarNumber,
          panNumber: partner.panNumber
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    let isPartner = false;

    if (!user) {
      user = await Partner.findById(req.user._id);
      isPartner = true;
    }

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.email) user.email = req.body.email;
      if (req.body.phone) user.phone = req.body.phone;

      if (req.body.password) {
        user.password = await bcrypt.hash(req.body.password, 10);
      }

      if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;
      if (req.body.profileImagePublicId !== undefined) user.profileImagePublicId = req.body.profileImagePublicId;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isPartner: isPartner ? updatedUser.isPartner : user.isPartner,
        profileImage: updatedUser.profileImage,
        createdAt: updatedUser.createdAt,
        partnerSince: updatedUser.partnerSince,
        token: req.headers.authorization.split(' ')[1] // Keep existing token
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user's saved hotels
 * @route   GET /api/v1/users/saved-hotels
 * @access  Private
 */
export const getSavedHotels = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedHotels',
      select: 'propertyName address coverImage avgRating totalReviews minPrice propertyType status isLive',
      match: { status: 'approved' } // Only return approved hotels
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get minimum prices for these properties
    const savedHotelIds = user.savedHotels.map(h => h._id);
    const RoomType = (await import('../../models/RoomType.js')).default;

    const priceMap = await RoomType.aggregate([
      { $match: { propertyId: { $in: savedHotelIds }, isActive: true } },
      { $group: { _id: '$propertyId', minPrice: { $min: '$pricePerNight' } } }
    ]);

    const prices = {};
    priceMap.forEach(p => {
      prices[p._id.toString()] = p.minPrice;
    });

    // Format the response to match PropertyCard expectations
    const savedHotels = user.savedHotels.map(hotel => ({
      _id: hotel._id,
      propertyName: hotel.propertyName,
      address: hotel.address, // Pass full address object
      coverImage: hotel.coverImage,
      propertyType: hotel.propertyType,
      avgRating: hotel.avgRating,
      totalReviews: hotel.totalReviews,
      minPrice: prices[hotel._id.toString()] || hotel.minPrice || 0,
      status: hotel.status
    }));

    res.json({
      success: true,
      savedHotels
    });

  } catch (error) {
    console.error('Get Saved Hotels Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Toggle Saved Hotel (Wishlist)
 * @route   POST /api/v1/users/saved-hotels/:id
 * @access  Private
 */
export const toggleSavedHotel = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const user = await User.findById(req.user._id);

    // Check if hotel is already saved
    const isSaved = user.savedHotels.some(id => id.toString() === hotelId);

    if (isSaved) {
      // Remove
      user.savedHotels = user.savedHotels.filter(id => id.toString() !== hotelId);
    } else {
      // Add
      user.savedHotels.push(hotelId);
    }

    await user.save();

    res.json({
      success: true,
      message: isSaved ? 'Removed from saved' : 'Added to saved',
      savedHotels: user.savedHotels
    });

  } catch (error) {
    console.error('Toggle Saved Hotel Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update FCM Token
// @route   PUT /api/v1/users/fcm-token
// @access  Private (Users only — this endpoint is ONLY for the User model)
export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'Please provide FCM token' });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';
    const tokenField = `hotelFcmTokens.${targetPlatform}`;

    // 1. DEDUPLICATION: Clear this token from any OTHER User document
    // NOTE: We ONLY clear within the User model. Users, Partners, and Admins are
    // separate auth systems — a user token should never exist in Partner/Admin collections.
    await User.updateMany(
      { [tokenField]: fcmToken, _id: { $ne: req.user._id } },
      { $set: { [tokenField]: null } }
    );

    // 2. Update the token for the current user
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.hotelFcmTokens) user.hotelFcmTokens = { app: null, web: null };
    user.hotelFcmTokens[targetPlatform] = fcmToken;
    await user.save();

    console.log(`[FCM] User ${user._id} ${targetPlatform} token updated.`);

    res.json({
      success: true,
      message: `User FCM token updated successfully for ${targetPlatform} platform`,
      data: { platform: targetPlatform, tokenUpdated: true }
    });

  } catch (error) {
    console.error('Update User FCM Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/users/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const Notification = (await import('../../models/Notification.js')).default;

    // Create filter for the current user
    const filter = {
      userId: req.user._id,
      userType: req.user.role === 'partner' ? 'partner' : 'user'
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.json({
      success: true,
      notifications,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Initialize/Mark Notification as Read (optional, but requested implicitly functionality usually goes with this)
 * @route   PUT /api/v1/users/notifications/:id/read
 * @access  Private
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const Notification = (await import('../../models/Notification.js')).default;

    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete Notifications (Single or Bulk)
 * @route   DELETE /api/v1/users/notifications
 * @access  Private
 * @body    { ids: ["id1", "id2"] } or implicit query for single
 */
export const deleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    const Notification = (await import('../../models/Notification.js')).default;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No notification IDs provided' });
    }

    const result = await Notification.deleteMany({
      _id: { $in: ids },
      userId: req.user._id
    }); // end deleteMany

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Delete Notifications Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Mark All Notifications as Read
 * @route   PUT /api/v1/users/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const Notification = (await import('../../models/Notification.js')).default;

    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
/**
 * @desc    Delete user account (Soft Delete)
 * @route   DELETE /api/v1/users/profile
 * @access  Private
 */
export const deleteUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isDeleted = true;
    user.hotelFcmTokens = { app: null, web: null };
    await user.save();

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete User Account Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
