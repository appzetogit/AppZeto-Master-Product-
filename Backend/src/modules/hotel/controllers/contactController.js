import ContactMessage from '../models/ContactMessage.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';
import Admin from '../admin/models/Admin.js';
import mongoose from 'mongoose';

export const createContactMessage = async (req, res) => {
  try {
    const { audience } = req.params;
    const { name, email, phone, subject, message } = req.body;

    console.log(`[ContactController] New contact message from ${audience}:`, { name, email, subject });

    if (!['user', 'partner'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!name || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Name, subject and message are required' });
    }

    // Determine the user ID and model if authenticated
    let userId = undefined;
    let audienceModel = undefined;

    if (req.user) {
      userId = req.user._id;
      // Map role to Model name
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        audienceModel = 'HotelAdmin';
      } else if (req.user.role === 'partner') {
        audienceModel = 'HotelPartner';
      } else {
        audienceModel = 'HotelUser';
      }
    }

    const doc = await ContactMessage.create({
      audience,
      name,
      email,
      phone,
      subject,
      message,
      userId,
      audienceModel
    });

    console.log(`[ContactController] Message saved to DB: ${doc._id}`);

    // NOTIFICATION: Notify Admin via Push
    notificationService.sendToAdmins({
      title: `New Support Message: ${subject}`,
      body: `From: ${name} (${audience}).`
    }, {
      type: 'support_message',
      messageId: doc._id.toString(),
      audience: audience
    }).catch(e => console.error('[ContactController] Admin push notification failed:', e.message));

    // EMAIL: Notify Admin via Email
    try {
      const activeAdmins = await Admin.find({ isActive: true });
      for (const admin of activeAdmins) {
        if (admin.email) {
          emailService.sendAdminSupportQueryEmail(admin.email, doc).catch(e =>
            console.error(`[ContactController] Email to admin ${admin.email} failed:`, e.message)
          );
        }
      }
    } catch (emailErr) {
      console.error('[ContactController] Admin email notification process failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      contact: doc
    });

  } catch (error) {
    console.error('❌ [ContactController] Error in createContactMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

