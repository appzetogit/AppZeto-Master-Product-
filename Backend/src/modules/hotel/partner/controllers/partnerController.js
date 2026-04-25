import Notification from '../../models/Notification.js';
import Partner from '../models/Partner.js';
import Property from '../../models/Property.js';

/**
 * @desc    Update FCM Token for Partner
 * @route   PUT /api/v1/partners/fcm-token
 * @access  Private (Partners only — this endpoint is ONLY for the Partner model)
 *
 * The partner Flutter app wraps the partner web URL and sends the FCM token here.
 * We ONLY touch the Partner model. Users and Admins have their own separate endpoints
 * and their own models. Cross-model deduplication is incorrect because tokens are
 * generated per-app (user app vs partner app) and will never conflict.
 */
export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'Please provide FCM token' });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';
    const tokenField = `fcmTokens.${targetPlatform}`;

    // 1. DEDUPLICATION: Clear this token from any OTHER Partner document only.
    // We exclude the current partner's ID so we don't accidentally wipe the same doc we're about to write.
    await Partner.updateMany(
      { [tokenField]: fcmToken, _id: { $ne: req.user._id } },
      { $set: { [tokenField]: null } }
    );

    // 2. Update the token for the current partner
    const partner = await Partner.findById(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    if (!partner.fcmTokens) partner.fcmTokens = { app: null, web: null };
    partner.fcmTokens[targetPlatform] = fcmToken;
    await partner.save();

    console.log(`[FCM] Partner ${partner._id} ${targetPlatform} token updated.`);

    res.json({
      success: true,
      message: `Partner FCM token updated successfully for ${targetPlatform} platform`,
      data: { platform: targetPlatform, tokenUpdated: true }
    });

  } catch (error) {
    console.error('Update Partner FCM Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get partner notifications
 * @route   GET /api/v1/partners/notifications
 * @access  Private (Partner)
 */
export const getPartnerNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      userType: 'partner'
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
        pages: Math.ceil(total / limit),
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get Partner Notifications Error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

/**
 * @desc    Mark partner notification as read
 * @route   PUT /api/v1/partners/notifications/:id/read
 * @access  Private (Partner)
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id, userType: 'partner' },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Mark all partner notifications as read
 * @route   PUT /api/v1/partners/notifications/read-all
 * @access  Private (Partner)
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, userType: 'partner', isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark All Notifications Read Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete partner notifications
 * @route   DELETE /api/v1/partners/notifications
 * @access  Private (Partner)
 */
export const deleteNotifications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (ids && Array.isArray(ids)) {
      await Notification.deleteMany({
        _id: { $in: ids },
        userId: req.user._id,
        userType: 'partner'
      });
    } else if (req.query.id) {
      await Notification.deleteOne({
        _id: req.query.id,
        userId: req.user._id,
        userType: 'partner'
      });
    } else {
      return res.status(400).json({ message: 'Notification ID(s) required' });
    }

    res.json({ success: true, message: 'Notifications deleted' });
  } catch (error) {
    console.error('Delete Notifications Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
/**
 * @desc    Delete partner account (Soft Delete)
 * @route   DELETE /api/v1/partners/profile
 * @access  Private
 */
export const deletePartnerAccount = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    partner.isDeleted = true;
    partner.fcmTokens = { app: null, web: null };
    await partner.save();

    // Deactivate all properties linked to this partner
    await Property.updateMany(
      { partnerId: req.user._id },
      { $set: { status: 'cancelled', isLive: false } }
    );

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete Partner Account Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
