import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../user/models/User.js';
import Notification from '../models/Notification.js';

class NotificationService {
  /**
   * Get all FCM tokens for a user (app + web).
   *
   * We send to ALL available tokens so the user gets notified on every device/platform:
   *  - `fcmTokens.app`  → notification delivered to their Flutter mobile app
   *  - `fcmTokens.web`  → notification delivered to their browser (desktop/laptop)
   *
   * WHY this no longer causes double notifications on the same device:
   *  1. Flutter WebViews no longer set a `web` token (firebase.js blocks web push
   *     registration when isWebView() is true). So a Flutter app user has ONLY an
   *     `app` token — no web duplicate.
   *  2. Real browser users only set a `web` token — no app token. So browser-only
   *     users get exactly one notification.
   *  3. A user who genuinely has both (mobile app + desktop browser) should receive
   *     the notification on BOTH devices — that is the correct behaviour.
   *  4. The service worker uses `notificationId` as the OS-level dedup `tag` to
   *     prevent the same browser notification showing twice if FCM delivers twice.
   */
  getUserFcmTokens(user) {
    const fcmTokens = user.hotelFcmTokens || user.fcmTokens;
    if (!fcmTokens || Array.isArray(fcmTokens)) return [];
    const tokens = new Set();
    if (fcmTokens.app) tokens.add(fcmTokens.app);
    if (fcmTokens.web) tokens.add(fcmTokens.web);
    return Array.from(tokens);
  }


  /**
   * Send notification to a single FCM token (Internal).
   * cleanupMeta: { userId, userType, notificationId? }
   */
  async sendToToken(fcmToken, notification, data = {}, cleanupMeta = null) {
    try {
      const admin = getFirebaseAdmin();
      if (!admin) throw new Error('Firebase Admin not initialized');

      const stringifiedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }

      // Include notificationId in data payload.
      // - Web service worker uses it as the notification `tag` to deduplicate at OS level.
      // - Flutter can use it to avoid showing the same notification twice.
      if (cleanupMeta?.notificationId) {
        stringifiedData.notificationId = String(cleanupMeta.notificationId);
      }

      const appUrl = process.env.FRONTEND_URL || 'https://rukkoo.in';
      const fallbackLink = (data.url && data.url.startsWith('http')) ? data.url : `${appUrl}${data.url || '/'}`;

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'Rukkoin',
          body: notification.body || 'New Notification',
          image: data.image || null, // Mobile/Android image field
        },
        data: {
          ...stringifiedData,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            image: data.image || null,
          },
        },
        apns: {
          payload: { 
            aps: { 
              sound: 'default', 
              badge: 1, 
              'mutable-content': 1,
              'content-available': 1
            } 
          },
          fcm_options: {
            image: data.image || null,
          }
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            image: data.image || null, // Web image field
            // tag is set via data.notificationId in the service worker
          },
          fcmOptions: { link: fallbackLink },
        },
      };

      const response = await admin.messaging().send(message);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending notification to token:', error.message || error);

      if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered' ||
        error.message?.includes('NotRegistered')) {

        if (cleanupMeta?.userId && cleanupMeta?.userType) {
          this.cleanupInvalidToken(cleanupMeta.userId, cleanupMeta.userType, fcmToken)
            .catch(e => console.error('[NotificationService] Pruning failed:', e.message));
        }

        return { success: false, error: 'Invalid or unregistered token', code: error.code || 'NotRegistered' };
      }
      throw error;
    }
  }


  /**
   * Removes an invalid FCM token from a user's record
   */
  async cleanupInvalidToken(userId, userType, token) {
    try {
      console.log(`[NotificationService] Pruning invalid token for ${userType} ${userId}...`);
      let Model;
      if (userType === 'admin') {
        Model = (await import('../admin/models/Admin.js')).default;
      } else if (userType === 'partner') {
        Model = (await import('../partner/models/Partner.js')).default;
      } else {
        Model = (await import('../user/models/User.js')).default;
      }

      const user = await Model.findById(userId);
      const tokenPath = userType === 'user' || userType === 'admin' ? 'hotelFcmTokens' : 'fcmTokens';
      const fcmTokens = user?.[tokenPath];
      if (user && fcmTokens && !Array.isArray(fcmTokens)) {
        let changed = false;
        if (fcmTokens.app === token) {
          fcmTokens.app = null;
          changed = true;
        }
        if (fcmTokens.web === token) {
          fcmTokens.web = null;
          changed = true;
        }
        if (changed) {
          await user.save();
          console.log(`[NotificationService] Successfully pruned dead ${userType} token.`);
        }
      }
    } catch (e) {
      console.error('[NotificationService] Cleanup Error:', e.message);
    }
  }

  /**
   * Send notification to a user, admin or partner by ID
   */
  async sendToUser(userId, notification, data = {}, userType = 'user') {
    try {
      console.log(`[NotificationService] Sending to User: ${userId} (${userType})`);
      let user;

      if (userType === 'admin') {
        const Admin = (await import('../admin/models/Admin.js')).default;
        user = await Admin.findById(userId);
      } else if (userType === 'partner') {
        const Partner = (await import('../partner/models/Partner.js')).default;
        user = await Partner.findById(userId);
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        console.warn(`[NotificationService] User not found: ${userId} (${userType})`);
        return { success: false, error: `${userType} not found` };
      }

      // 1. DEDUPLICATION: Save unique notification to DB
      let savedNotification;
      try {
        // Simple check: Don't save if same non-broadcast message to same user exists in last 2 seconds (debounce)
        const notifType = data.type || 'general';
        // Skip dedup for broadcast types — each call to sendToUser is for a unique recipient
        const recentMatch = notifType !== 'broadcast' && notifType !== 'broadcast_log' ? await Notification.findOne({
          userId: user._id,
          title: notification.title,
          body: notification.body,
          type: notifType,
          createdAt: { $gte: new Date(Date.now() - 2000) }
        }) : null;

        if (recentMatch) {
          console.log('[NotificationService] (DEDUPLICATION) Skipping duplicate notification call.');
          return { success: true, duplicated: true };
        }

        // Determine userModel from userType for the refPath to work
        const userModelMap = { admin: 'HotelAdmin', partner: 'HotelPartner', user: 'HotelUser' };
        savedNotification = await Notification.create({
          userId: user._id,
          userType: userType,
          userModel: userModelMap[userType] || 'HotelUser',
          title: notification.title || 'Rukkoin',
          body: notification.body || '',
          data: data || {},
          type: data.type || 'general',
        });
      } catch (dbError) {
        console.error('[NotificationService] [ERROR] Failed to save notification to database:', dbError);
      }

      // 2. Get all FCM tokens (Unique Set)
      const fcmTokens = this.getUserFcmTokens(user);
      console.log(`[NotificationService] Found ${fcmTokens.length} Unique FCM tokens for user.`);

      if (fcmTokens.length === 0) {
        return { success: false, error: 'No tokens', notificationId: savedNotification?._id };
      }

      // 3. Send to token (getUserFcmTokens returns max 1 token — app preferred over web)
      let successCount = 0;
      let lastResult = null;

      for (const token of fcmTokens) {
        try {
          const result = await this.sendToToken(token, notification, data, {
            userId,
            userType,
            notificationId: savedNotification?._id  // Used by service worker as dedup tag
          });
          if (result.success) {
            successCount++;
            lastResult = result;
          }
        } catch (err) {
          console.error('[NotificationService] FCM send exception:', err.message);
        }
      }

      if (successCount > 0 && savedNotification && lastResult?.messageId) {
        savedNotification.fcmMessageId = lastResult.messageId;
        await savedNotification.save().catch(() => { });
      }

      return { success: successCount > 0, successCount, notificationId: savedNotification?._id };
    } catch (error) {
      console.error('[NotificationService] Error in sendToUser:', error);
      throw error;
    }
  }

  /**
   * Send notification to a partner by ID
   * @param {string} partnerId - Partner ID
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>}
   */
  async sendToPartner(partnerId, notification, data = {}) {
    return this.sendToUser(partnerId, notification, data, 'partner');
  }

  /**
   * Send notification to all active admins
   * @param {Object} notification - Notification payload
   * @param {Object} data - Additional data payload
   * @returns {Promise<void>}
   */
  async sendToAdmins(notification, data = {}) {
    try {
      const Admin = (await import('../admin/models/Admin.js')).default;
      const activeAdmins = await Admin.find({ isActive: true });

      if (activeAdmins.length === 0) {
        console.warn('[NotificationService] No active admins found to notify.');
        return;
      }

      console.log(`[NotificationService] Notifying ${activeAdmins.length} admins.`);

      // Send to each admin (using sendToUser to handle DB logging and multi-token push)
      const notifyPromises = activeAdmins.map(admin =>
        this.sendToUser(admin._id, notification, data, 'admin')
          .catch(err => console.error(`[NotificationService] Failed to notify admin ${admin._id}:`, err))
      );

      await Promise.all(notifyPromises);
    } catch (error) {
      console.error('[NotificationService] Error in sendToAdmins:', error);
    }
  }

  /**
   * Broadcast notification to all users, all partners, or both — using FCM multicast batch.
   *
   * Instead of looping per user (N FCM API calls), this method:
   *  1. Fetches all recipients from DB in one query
   *  2. Bulk-inserts Notification records (one insertMany)
   *  3. Chunks all FCM tokens into batches of 500 (FCM hard limit per multicast call)
   *  4. Calls sendEachForMulticast once per chunk → max ceil(N/500) FCM API calls total
   *  5. Auto-cleans invalid/expired tokens identified in the FCM response
   *
   * @param {string} target - 'all_users' | 'all_partners' | 'all' (both)
   * @param {Object} notification - { title, body }
   * @param {Object} data - extra payload (url, type, etc.)
   */
  async broadcastToAll(target, notification, data = {}) {
    try {
      console.log(`[NotificationService] 📢 BROADCAST START — target: ${target}`);

      const adminLib = getFirebaseAdmin();
      if (!adminLib) throw new Error('Firebase Admin not initialized');

      // ── 1. Fetch recipients ────────────────────────────────────────────────
      let recipients = []; // [{ userId, userType, fcmTokens }]

      const Partner = (await import('../partner/models/Partner.js')).default;

      if (target === 'all_users' || target === 'all') {
        const users = await User.find({ isBlocked: { $ne: true } })
          .select('_id hotelFcmTokens').lean();
        users.forEach(u => recipients.push({ userId: u._id, userType: 'user', hotelFcmTokens: u.hotelFcmTokens }));
      }

      if (target === 'all_partners' || target === 'all') {
        const partners = await Partner.find({ isBlocked: { $ne: true }, partnerApprovalStatus: 'approved' })
          .select('_id fcmTokens').lean();
        partners.forEach(p => recipients.push({ userId: p._id, userType: 'partner', fcmTokens: p.fcmTokens }));
      }

      console.log(`[NotificationService] 📢 Total recipients fetched: ${recipients.length}`);

      if (recipients.length === 0) {
        console.warn('[NotificationService] Broadcast: no eligible recipients found.');
        return { success: false, error: 'No recipients' };
      }

      // ── 2. Build token list with metadata ─────────────────────────────────
      // Each entry maps a token → recipient so we can cleanup invalid ones later.
      // We collect app + web tokens following getUserFcmTokens priority.
      const tokenEntries = []; // [{ token, userId, userType }]

      for (const r of recipients) {
        const tokens = this.getUserFcmTokens(r); // returns [app?, web?] up to 2 tokens
        for (const token of tokens) {
          tokenEntries.push({ token, userId: r.userId, userType: r.userType });
        }
      }

      const totalTokens = tokenEntries.length;
      console.log(`[NotificationService] 📢 Total FCM tokens to send: ${totalTokens}`);

      if (totalTokens === 0) {
        console.warn('[NotificationService] Broadcast: no FCM tokens available across all recipients.');
        return { success: false, error: 'No tokens' };
      }

      // ── 3. Bulk-save Notification records (one DB call) ───────────────────
      const userModelMap = { admin: 'HotelAdmin', partner: 'HotelPartner', user: 'HotelUser' };
      const notifType = data.type || 'broadcast';
      const notifTitle = notification.title || 'Rukkoin';
      const notifBody = notification.body || '';

      try {
        const notifDocs = recipients.map(r => ({
          userId: r.userId,
          userType: r.userType,
          userModel: userModelMap[r.userType] || 'HotelUser',
          title: notifTitle,
          body: notifBody,
          data: data || {},
          type: notifType,
        }));
        await Notification.insertMany(notifDocs, { ordered: false });
        console.log(`[NotificationService] 📢 Saved ${notifDocs.length} Notification records to DB.`);
      } catch (dbErr) {
        // Non-fatal — still attempt FCM send even if DB save partially fails
        console.error('[NotificationService] Broadcast DB insertMany error (non-fatal):', dbErr.message);
      }

      // ── 4. Build FCM multicast message template ────────────────────────────
      const appUrl = process.env.FRONTEND_URL || 'https://rukkoo.in';
      const fallbackLink = (data.url && data.url.startsWith('http')) ? data.url : `${appUrl}${data.url || '/'}`;

      const stringifiedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }

      const buildMulticastMessage = (tokens) => ({
        tokens,
        notification: {
          title: notifTitle,
          body: notifBody,
          image: data.image || null,
        },
        data: { ...stringifiedData, click_action: 'FLUTTER_NOTIFICATION_CLICK', broadcast: 'true' },
        android: {
          priority: 'high',
          notification: {
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            image: data.image || null,
          },
        },
        apns: {
          payload: { 
            aps: { 
              sound: 'default', 
              badge: 1, 
              'mutable-content': 1,
              'content-available': 1
            } 
          },
          fcm_options: { image: data.image || null },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            image: data.image || null,
          },
          fcmOptions: { link: fallbackLink },
        },
      });

      // ── 5. Chunk into batches of 500 & sendEachForMulticast ───────────────
      const BATCH_SIZE = 500; // FCM hard limit per multicast call
      const chunks = [];
      for (let i = 0; i < tokenEntries.length; i += BATCH_SIZE) {
        chunks.push(tokenEntries.slice(i, i + BATCH_SIZE));
      }

      console.log(`[NotificationService] 📢 Sending in ${chunks.length} FCM batch(es) of up to ${BATCH_SIZE} tokens each.`);

      let totalSuccess = 0;
      let totalFailed = 0;
      const invalidTokens = []; // [{ token, userId, userType }]

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const tokens = chunk.map(e => e.token);

        try {
          const response = await adminLib.messaging().sendEachForMulticast(buildMulticastMessage(tokens));

          totalSuccess += response.successCount;
          totalFailed += response.failureCount;

          console.log(`[NotificationService] 📢 Batch ${ci + 1}/${chunks.length}: ` +
            `${response.successCount} sent, ${response.failureCount} failed.`);

          // ── 6. Identify invalid tokens from response ──────────────────────
          if (response.failureCount > 0) {
            response.responses.forEach((res, idx) => {
              if (!res.success) {
                const errorCode = res.error?.code || '';
                const isInvalid = errorCode.includes('invalid-registration-token') ||
                  errorCode.includes('registration-token-not-registered') ||
                  errorCode.includes('NotRegistered');

                if (isInvalid) {
                  invalidTokens.push(chunk[idx]);
                } else {
                  console.warn(`[NotificationService] FCM send failed for token index ${idx}:`, res.error?.message);
                }
              }
            });
          }
        } catch (batchErr) {
          console.error(`[NotificationService] Batch ${ci + 1} FCM error:`, batchErr.message);
          totalFailed += chunk.length;
        }
      }

      console.log(`[NotificationService] 📢 BROADCAST COMPLETE — ✓ ${totalSuccess} sent, ✗ ${totalFailed} failed.`);

      // ── 7. Async cleanup of invalid tokens (non-blocking) ─────────────────
      if (invalidTokens.length > 0) {
        console.log(`[NotificationService] 📢 Cleaning up ${invalidTokens.length} invalid token(s)...`);
        // Fire and forget — don't block the response
        Promise.allSettled(
          invalidTokens.map(({ token, userId, userType }) =>
            this.cleanupInvalidToken(userId, userType, token)
          )
        ).then(results => {
          const cleaned = results.filter(r => r.status === 'fulfilled').length;
          console.log(`[NotificationService] 📢 Cleaned up ${cleaned}/${invalidTokens.length} invalid tokens.`);
        });
      }

      return {
        success: totalSuccess > 0,
        totalRecipients: recipients.length,
        totalTokens,
        successCount: totalSuccess,
        failureCount: totalFailed,
        batchesUsed: chunks.length,
      };

    } catch (error) {
      console.error('[NotificationService] Broadcast failed:', error);
      throw error;
    }
  }
}

export default new NotificationService();
