import cron from 'node-cron';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import User from '../user/models/User.js';
import Partner from '../partner/models/Partner.js';
import emailService from './emailService.js';
import notificationService from './notificationService.js';
import mongoose from 'mongoose';

/**
 * Advanced Cron Service for RukkooIn
 * Handles: Check-in reminders, Review requests, Payment expiry warnings, and Monthly reports
 */
class CronService {
  constructor() {
    this.initCronJobs();
  }

  initCronJobs() {
    // 1. Run every 30 minutes: Booking Reminders & Expiry
    cron.schedule('*/30 * * * *', () => {
      console.log('⏰ Running Bookings Cron Job...');
      this.processBookingReminders();
    });

    // 2. Run daily at midnight: Property Recaps (Future)
    // cron.schedule('0 0 * * *', () => { ... });

    // 3. Run on the 1st of every month at 8:00 AM: Monthly Earnings Recap
    cron.schedule('0 8 1 * *', () => {
      console.log('📊 Running Monthly Partner Recap Cron...');
      this.sendMonthlyPartnerRecaps();
    });
  }

  async processBookingReminders() {
    try {
      const now = new Date();
      const checkInWindow = new Date(now.getTime() + 5 * 60 * 60 * 1000); // Next 5 hours
      const expiryWindow = new Date(now.getTime() - 15 * 60 * 1000); // Created 15 mins ago

      // A. Check-in Reminders (4 hours before)
      const upcomingStays = await Booking.find({
        bookingStatus: 'confirmed',
        checkInDate: { $lte: checkInWindow, $gt: now },
        'notificationsSent.checkInReminder': false
      }).populate('userId').populate('propertyId');

      for (const booking of upcomingStays) {
        const user = booking.userId;
        const property = booking.propertyId;
        if (!user || !property) continue;

        // Send Push
        notificationService.sendToUser(user._id, {
          title: 'Ready for your trip? 🎒',
          body: `Your stay at ${property.propertyName} starts today at ${property.checkInTime || '12:00 PM'}!`
        }, { type: 'checkin_reminder', bookingId: booking._id }, user.role === 'partner' ? 'partner' : 'user').catch(e => console.error(e));

        // Send Email
        if (user.email) {
          emailService.sendCheckInReminderEmail(user, booking, property).catch(e => console.error(e));
        }

        // Mark as sent
        booking.notificationsSent.checkInReminder = true;
        await booking.save();
        console.log(`[Cron] Check-in reminder sent for Booking: ${booking.bookingId}`);
      }

      // B. Review Requests (2 hours after Checkout)
      // For simplicity, we look for 'checked_out' or completed stays in the last 24 hours
      const recentCheckouts = await Booking.find({
        bookingStatus: { $in: ['checked_out', 'completed'] },
        checkOutDate: { $lte: now },
        'notificationsSent.checkOutReviewRequest': false
      }).populate('userId').populate('propertyId');

      for (const booking of recentCheckouts) {
        const user = booking.userId;
        const property = booking.propertyId;
        if (!user || !property) continue;

        // Wait 2 hours post-checkout logic: Since cron runs every 30m, 
        // if checkOutDate + 2h <= now, then send.
        const twoHoursAfterCheckout = new Date(booking.checkOutDate.getTime() + 2 * 60 * 60 * 1000);
        if (twoHoursAfterCheckout > now) continue;

        // Send Push
        notificationService.sendToUser(user._id, {
          title: 'How was your stay? ⭐',
          body: `Tell us about your experience at ${property.propertyName}. Rate it now!`
        }, { type: 'review_request', bookingId: booking._id }, user.role === 'partner' ? 'partner' : 'user').catch(e => console.error(e));

        // Send Email
        if (user.email) {
          emailService.sendReviewRequestEmail(user, booking, property).catch(e => console.error(e));
        }

        booking.notificationsSent.checkOutReviewRequest = true;
        await booking.save();
        console.log(`[Cron] Review request sent for Booking: ${booking.bookingId}`);
      }

      // C. Unpaid Booking Expiry (15 mins warning)
      // Assuming unpaid bookings should be paid within 30 minutes
      const pendingBookings = await Booking.find({
        paymentStatus: 'pending',
        bookingStatus: 'pending',
        'notificationsSent.paymentExpiryWarning': false,
        createdAt: { $lte: new Date(now.getTime() - 15 * 60 * 1000) } // Older than 15 mins
      }).populate('userId');

      for (const booking of pendingBookings) {
        const user = booking.userId;
        if (!user) continue;

        // Send Push Warning
        notificationService.sendToUser(user._id, {
          title: 'Booking Expiring Soon! ⏳',
          body: 'Complete your payment within 15 minutes to secure your room.'
        }, { type: 'payment_warning', bookingId: booking._id }, user.role === 'partner' ? 'partner' : 'user').catch(e => console.error(e));

        booking.notificationsSent.paymentExpiryWarning = true;
        await booking.save();
        console.log(`[Cron] Payment warning sent for Booking: ${booking.bookingId}`);
      }

    } catch (error) {
      console.error('[Cron Error] processBookingReminders failed:', error);
    }
  }

  async sendMonthlyPartnerRecaps() {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

      const partners = await Partner.find({ isVerified: true, partnerApprovalStatus: 'approved' });

      for (const partner of partners) {
        // Aggregate earnings for this partner
        const Transaction = mongoose.model('HotelTransaction');
        const Review = mongoose.model('HotelReview');

        const stats = await Transaction.aggregate([
          {
            $match: {
              partnerId: partner._id,
              type: 'credit',
              category: 'booking_payment',
              status: 'completed',
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$amount' },
              totalBookings: { $sum: 1 }
            }
          }
        ]);

        const reviewStats = await Review.aggregate([
          {
            $lookup: {
              from: 'properties',
              localField: 'propertyId',
              foreignField: '_id',
              as: 'property'
            }
          },
          { $unwind: '$property' },
          {
            $match: {
              'property.partnerId': partner._id,
              status: 'approved',
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            }
          },
          { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);

        const monthlyStats = {
          totalEarnings: stats[0]?.totalEarnings || 0,
          totalBookings: stats[0]?.totalBookings || 0,
          avgRating: reviewStats[0]?.avg?.toFixed(1) || 'N/A'
        };

        // Only send if there was some activity
        if (monthlyStats.totalBookings > 0) {
          emailService.sendMonthlyEarningsEmail(partner, monthlyStats).catch(e => console.error(e));
          console.log(`[Cron] Monthly recap sent to Partner: ${partner.name}`);
        }
      }
    } catch (error) {
      console.error('[Cron Error] sendMonthlyPartnerRecaps failed:', error);
    }
  }
}

export default new CronService();
