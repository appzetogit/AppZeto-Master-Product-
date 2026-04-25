import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.brandColor = '#0F766E'; // Teal-700 based on standard UI
    this.companyName = 'Rukkoo.in';
    this.logoUrl = 'https://res.cloudinary.com/dqowbjoxb/image/upload/v1738411000/rukkooin-logo-placeholder.png'; // Placeholder or Text fallback
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Generates a standardized HTML email template
   * @param {string} title - Main Heading
   * @param {string} body - HTML Body content
   * @param {string} subtitle - Optional Subtitle/Preheader
   */
  generateHtmlTemplate(title, body, subtitle = '') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
          .header { background-color: ${this.brandColor}; padding: 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
          .content { padding: 30px 20px; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: ${this.brandColor}; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .detail-row span.label { color: #666; font-weight: 500; }
          .detail-row span.value { color: #111; font-weight: 600; text-align: right; }
          .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
          .btn { display: inline-block; background-color: ${this.brandColor}; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; margin-top: 15px; }
          .footer a { color: ${this.brandColor}; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <!-- <h1>${this.companyName}</h1> -->
             <div style="font-size: 24px; font-weight: bold;">${this.companyName}</div>
             ${subtitle ? `<p style="margin:5px 0 0; opacity:0.9; font-size:14px;">${subtitle}</p>` : ''}
          </div>
          <div class="content">
            <h2 style="color: #111; margin-top:0;">${title}</h2>
            ${body}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</p>
            <p style="margin-top: 10px;">Sent with ❤️ from India</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!to) {
        console.warn(`[EmailService] Attempted to send email without a recipient for subject: '${subject}'. Email not sent.`);
        return { success: false, error: 'No recipients defined' };
      }

      console.log(`[EmailService] Sending to: '${to}', Subject: '${subject}'`);
      const info = await this.getTransporter().sendMail({
        from: `"${process.env.FROM_NAME || this.companyName}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // --- USER EMAILS ---

  async sendUserWelcomeEmail(user) {
    const title = `Welcome to ${this.companyName}!`;
    const body = `
      <p>Hi <strong>${user.name || 'Traveler'}</strong>,</p>
      <p>Welcome to the customized travel experience! We are thrilled to have you on board.</p>
      
      <div class="card">
        <h3>Your Profile Details</h3>
        <div class="detail-row"><span class="label">Name</span><span class="value">${user.name}</span></div>
        <div class="detail-row"><span class="label">Email</span><span class="value">${user.email}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${user.phone}</span></div>
      </div>
      
      <p>Start exploring amazing stays tailored just for you.</p>
      <div style="text-align: center;">
        <a href="https://rukkoo.in" class="btn">Explore Now</a>
      </div>
    `;
    const html = this.generateHtmlTemplate(title, body, 'Let the journey begin');
    return this.sendEmail({ to: user.email, subject: title, html, text: title });
  }

  async sendBookingConfirmationEmail(user, booking) {
    const property = booking.propertyId || {};
    const room = booking.roomTypeId || {};
    const subject = `Booking Confirmed! #${booking.bookingId}`;

    // Format Dates
    const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Great news! Your booking at <strong>${property.propertyName || property.name || 'your hotel'}</strong> is confirmed.</p>
      
      <div class="card">
        <h3>Booking Details (#${booking.bookingId})</h3>
        <div class="detail-row"><span class="label">Property</span><span class="value">${property.propertyName || property.name}</span></div>
        <div class="detail-row"><span class="label">Address</span><span class="value">${property.address?.city || 'India'}, ${property.address?.state || ''}</span></div>
        <div class="detail-row"><span class="label">Check-in</span><span class="value">${checkIn}</span></div>
        <div class="detail-row"><span class="label">Check-out</span><span class="value">${checkOut}</span></div>
        <div class="detail-row"><span class="label">Guests</span><span class="value">${booking.guests?.adults} Adults, ${booking.guests?.children} Children</span></div>
        <div class="detail-row"><span class="label">Rooms</span><span class="value">${booking.guests?.rooms || 1} x ${room.name || booking.bookingUnit || 'Room'}</span></div>
      </div>

      <div class="card">
        <h3>Payment Information</h3>
        <div class="detail-row"><span class="label">Total Amount</span><span class="value">₹${booking.totalAmount}</span></div>
        <div class="detail-row"><span class="label">Payment Status</span><span class="value" style="color: ${booking.paymentStatus === 'paid' ? 'green' : 'orange'}">${booking.paymentStatus.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Payment Method</span><span class="value">${booking.paymentMethod === 'pay_at_hotel' ? 'Pay at Hotel' : 'Online Payment'}</span></div>
        ${(booking.paymentMethod === 'pay_at_hotel' || booking.paymentStatus !== 'paid') ?
        `<p style="font-size: 13px; color: #666; font-style: italic; margin-top:10px;">Want to finish your payment online? Securely pay via our payment portal below:</p>
           <div style="text-align: center; margin-top: 15px; margin-bottom: 5px;">
             <a href="https://rukkoo.in/payment/${booking._id}" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now Securely</a>
           </div>`
        : ''}
      </div>

      <p>We look forward to hosting you!</p>
    `;

    const html = this.generateHtmlTemplate('Booking Confirmed', body, `Order #${booking.bookingId}`);
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendBookingCancellationEmail(user, booking, refundAmount) {
    const subject = `Booking Cancelled: #${booking.bookingId}`;
    const propertyName = booking.propertyId?.propertyName || booking.propertyId?.name || 'HotelProperty';

    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your booking at <strong>${propertyName}</strong> has been cancelled as requested.</p>

      <div class="card">
        <h3>Cancellation Summary</h3>
        <div class="detail-row"><span class="label">Booking ID</span><span class="value">${booking.bookingId}</span></div>
        <div class="detail-row"><span class="label">Property</span><span class="value">${propertyName}</span></div>
        <div class="detail-row"><span class="label">Refund Status</span><span class="value">${refundAmount > 0 ? 'Initiated' : 'N/A'}</span></div>
        ${refundAmount > 0 ? `<div class="detail-row"><span class="label">Refund Amount</span><span class="value">₹${refundAmount}</span></div>` : ''}
        <div class="detail-row"><span class="label">Reason</span><span class="value">${booking.cancellationReason || 'User Request'}</span></div>
      </div>

      <p>We hope to serve you better next time.</p>
    `;

    const html = this.generateHtmlTemplate('Booking Cancelled', body);
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendUserAccountStatusEmail(user, isBlocked) {
    const title = isBlocked ? 'Important: Your Account has been Suspended' : 'Welcome Back: Your Account is Active';
    const statusText = isBlocked ? 'Suspended / Blocked' : 'Active / Restored';
    const statusColor = isBlocked ? '#ef4444' : 'green';

    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>This is an official notification regarding your account status on ${this.companyName}.</p>
      
      <div class="card" style="border-left: 4px solid ${statusColor};">
        <h3>Account Status Update</h3>
        <div class="detail-row"><span class="label">New Status</span><span class="value" style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN')}</span></div>
      </div>
      
      <p>${isBlocked
        ? 'Your access to the platform has been temporarily restricted due to management policies or a violation of our terms of service.'
        : 'Good news! Your account access has been fully restored. You can now log in and continue exploring stays.'}</p>
      
      ${!isBlocked ? `
      <div style="text-align: center;">
        <a href="https://rukkoo.in" class="btn">Login to Your Account</a>
      </div>` : '<p>If you have any questions or would like to appeal this decision, please contact our support team.</p>'}
    `;

    const html = this.generateHtmlTemplate(title, body, 'Security Notification');
    return this.sendEmail({ to: user.email, subject: title, html, text: title });
  }

  async sendUserAccountDeletedEmail(user) {
    const subject = 'Account Deletion Confirmation';
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>This email confirms that your account with <strong>${this.companyName}</strong> has been permanently deleted.</p>
      
      <div class="card">
        <h3>Deletion Notice</h3>
        <p>Your profile data, booking history, and preferences have been removed from our active database.</p>
      </div>

      <p>We're sorry to see you go! If this action was not initiated by you or if you decide to travel with us again in the future, you are always welcome to create a new account.</p>
      <p>Thank you for being a part of our community.</p>
    `;

    const html = this.generateHtmlTemplate(subject, body, 'Farewell from RukkooIn');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendReviewReplyEmail(user, review, property, reply) {
    const subject = `New Reply to Your Review of ${property.propertyName}`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>The manager of <strong>${property.propertyName}</strong> has replied to your review.</p>
      
      <div class="card" style="background-color: #f0fdfa;">
        <p style="font-style: italic; color: #666; font-size: 14px; margin-bottom: 10px;">"Your Review: ${review.comment}"</p>
        <p><strong>Manager's Reply:</strong></p>
        <p style="color: #0d9488;">${reply}</p>
      </div>
      
      <p>Thank you for sharing your feedback with us!</p>
    `;

    const html = this.generateHtmlTemplate('A Partner Responded!', body, 'Feedback Thread');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendReviewStatusEmail(user, review, property, status, reason = '') {
    const isApproved = status === 'approved';
    const subject = `Review Moderation: ${property.propertyName}`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your recent review for <strong>${property.propertyName}</strong> has been ${isApproved ? 'Approved' : 'Rejected'} by our moderation team.</p>
      
      <div class="card" style="border-left: 4px solid ${isApproved ? 'green' : '#ef4444'};">
        <h3>Review Status: ${status.toUpperCase()}</h3>
        <p style="font-size: 14px; color: #666;">"${review.comment}"</p>
        ${!isApproved && reason ? `<p style="margin-top:10px; color: #ef4444;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      
      ${isApproved ? '<p>Your review is now live and helping other travelers make better choices!</p>' : '<p>Please ensure your reviews follow our community guidelines for helpful and respectful feedback.</p>'}
    `;

    const html = this.generateHtmlTemplate('Review Update', body, 'Content Policy');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendSecurityAlertEmail(user, actionType) {
    const subject = `Security Alert: Your ${actionType} was updated`;
    const body = `
      <p>Hi <strong>${user.name || 'HotelUser'}</strong>,</p>
      <p>This is an automated security alert to inform you that your <strong>${actionType}</strong> was recently changed on ${this.companyName}.</p>
      
      <div class="card" style="border-left: 4px solid orange;">
        <h3>Security Notification</h3>
        <p><strong>Action:</strong> Update ${actionType}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <p>If you performed this action, you can safely ignore this email.</p>
      <p><strong>If you did NOT do this, please contact our support team immediately or reset your password to secure your account.</strong></p>
    `;

    const html = this.generateHtmlTemplate('Security Alert', body, 'Account Protection');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendLoginAlertEmail(user, deviceInfo = 'New Browser/Device') {
    const subject = `New Login detected for your account`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>A new login was detected for your ${this.companyName} account.</p>
      
      <div class="card">
        <h3>Login Details</h3>
        <div class="detail-row"><span class="label">Device/Info</span><span class="value">${deviceInfo}</span></div>
        <div class="detail-row"><span class="label">Time</span><span class="value">${new Date().toLocaleString()}</span></div>
      </div>
      
      <p>If this was you, you're all set! If not, please secure your account immediately by changing your password.</p>
    `;

    const html = this.generateHtmlTemplate('Safety First', body, 'Account Activity');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendWithdrawalSettledEmail(partner, withdrawal) {
    const subject = `Payment Settled: ₹${withdrawal.amount} credited to your bank`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Good news! Your withdrawal request <strong>#${withdrawal.withdrawalId}</strong> has been successfully settled.</p>
      
      <div class="card" style="border-left: 4px solid green;">
        <p style="font-size: 20px; font-weight: bold; margin: 0; color: #0d9488;">₹${withdrawal.amount}</p>
        <p style="margin: 5px 0 0; color: #666;">Credited to Account: XXXX${withdrawal.bankDetails.accountNumber.slice(-4)}</p>
      </div>
      
      <p>The amount should reflect in your bank account shortly (depending on your bank's processing time).</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel/wallet" class="btn">View Wallet history</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Payout Successful', body, 'Finance Update');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendMonthlyEarningsEmail(partner, stats) {
    const subject = `Your Monthly Earnings Report: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Here is a summary of your property performance on ${this.companyName} for the last month.</p>
      
      <div class="card">
        <h3>Performance Highlights</h3>
        <div class="detail-row"><span class="label">Total Bookings</span><span class="value">${stats.totalBookings}</span></div>
        <div class="detail-row"><span class="label">Total Earnings</span><span class="value">₹${stats.totalEarnings}</span></div>
        <div class="detail-row"><span class="label">Avg Rating</span><span class="value">${stats.avgRating} ⭐</span></div>
      </div>
      
      <p>Keep up the great work! Providing excellent service leads to better reviews and more bookings.</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel/stats" class="btn">View Detailed Analytics</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Monthly Recap', body, 'Partner Insights');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendCheckInReminderEmail(user, booking, property) {
    const subject = `Your stay at ${property.propertyName} starts today!`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Are you excited? Your trip to <strong>${property.propertyName}</strong> begins today!</p>
      
      <div class="card">
        <h3>Check-in Details</h3>
        <div class="detail-row"><span class="label">Check-in Time</span><span class="value">${property.checkInTime || '12:00 PM'}</span></div>
        <div class="detail-row"><span class="label">Address</span><span class="value">${property.address.fullAddress}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${property.contactNumber}</span></div>
      </div>
      
      <p>Safe travels! If you need help with directions, you can find the property on Google Maps through our app.</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/bookings/${booking._id}" class="btn">View My Booking</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('See You Soon!', body, 'Trip Starting');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendReviewRequestEmail(user, booking, property) {
    const subject = `How was your stay at ${property.propertyName}?`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We hope you had a wonderful time at <strong>${property.propertyName}</strong>.</p>
      
      <p>Your feedback is very valuable to us and helps other travelers find the best stays.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
        <p style="margin-bottom: 15px; font-weight: bold;">How would you rate your experience?</p>
        <a href="https://rukkoo.in/review/${booking._id}" class="btn">Rate & Review Now</a>
      </div>
      
      <p>Thank you for choosing ${this.companyName}!</p>
    `;

    const html = this.generateHtmlTemplate('Welcome Back!', body, 'Share Your Feedback');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendReferralEarnedEmail(user, friendName, amount) {
    const subject = `Congratulations! You've earned ₹${amount} Referral Reward`;
    const body = `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Great news! Your friend <strong>${friendName}</strong> has completed their first stay, and you've earned a referral reward.</p>
      
      <div class="card" style="text-align: center; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: white;">
        <h3 style="color: white; margin: 0;">Referral Reward Earned</h3>
        <p style="font-size: 32px; font-weight: bold; margin: 10px 0;">₹${amount}</p>
        <p style="margin: 0; font-size: 14px;">Added to your wallet credits</p>
      </div>
      
      <p>Keep referring friends to earn more rewards for your future travels!</p>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://rukkoo.in/referral" class="btn">Invite More Friends</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Reward Alert!', body, 'Loyalty Milestone');
    return this.sendEmail({ to: user.email, subject, html, text: subject });
  }

  async sendBroadcastEmail(email, title, message) {
    const subject = title;
    const body = `
      <p>${message}</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    const html = this.generateHtmlTemplate(title, body, 'System Announcement');
    return this.sendEmail({ to: email, subject, html, text: title });
  }

  // --- PARTNER EMAILS ---

  async sendPartnerRegistrationEmail(partner) {
    const subject = `Welcome to the Partner Network - ${this.companyName}`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Thank you for choosing to partner with ${this.companyName}. We have successfully received your registration.</p>
      
      <div class="card">
        <h3>Application Summary</h3>
        <div class="detail-row"><span class="label">Partner ID</span><span class="value">${partner._id.toString().slice(-8).toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Name</span><span class="value">${partner.name}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${partner.phone}</span></div>
        <div class="detail-row"><span class="label">Status</span><span class="value" style="color: orange;">PENDING APPROVAL</span></div>
      </div>
      
      <p>Our verification team is currently reviewing your documents (Aadhaar/PAN). This process typically takes <strong>24 to 48 hours</strong>.</p>
      <p>Once verified, you'll be able to list your properties and start hosting travelers.</p>
    `;

    const html = this.generateHtmlTemplate('Partnership Request Received', body, 'Next Step: Document Verification');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerApprovedEmail(partner) {
    const subject = 'Your Partner Account is Approved! 🚀';
    const body = `
      <p>Congratulations <strong>${partner.name}</strong>!</p>
      <p>We are excited to inform you that your partner account has been <strong>Approved</strong>. Your documents have been verified, and you are now an official partner of ${this.companyName}.</p>
      
      <div class="card">
        <h3>Account Information</h3>
        <div class="detail-row"><span class="label">Partner Name</span><span class="value">${partner.name}</span></div>
        <div class="detail-row"><span class="label">Official Phone</span><span class="value">${partner.phone}</span></div>
        <div class="detail-row"><span class="label">Account Status</span><span class="value" style="color: green;">ACTIVE / VERIFIED</span></div>
      </div>
      
      <p>You can now log in to the partner dashboard to:</p>
      <ul>
        <li>Add and manage your properties (Hotels, Villas, PGs, etc.)</li>
        <li>Update room pricing and inventory</li>
        <li>View and manage bookings and earnings</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel" class="btn">Go to Partner Dashboard</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Welcome to RukkooIn Partners', body, 'You are now live!');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerRejectedEmail(partner, reason) {
    const subject = 'Update Regarding Your Partner Application';
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Thank you for your interest in partnering with ${this.companyName}.</p>
      
      <p>After carefully reviewing your application and documents, we regret to inform you that we cannot approve your account at this time.</p>
      
      <div class="card" style="border-left: 4px solid #ef4444;">
        <h3>Reason for Rejection</h3>
        <p style="color: #444;">${reason || 'The provided documents did not meet our verification criteria or are unclear.'}</p>
      </div>

      <p><strong>Next Steps:</strong></p>
      <p>You can re-upload clear copies of your Aadhaar or PAN card and update your profile details in the app/dashboard to resubmit for verification.</p>
      
      <p>If you have any questions, please reach out to our partner support team.</p>
    `;

    const html = this.generateHtmlTemplate('Application Status Update', body, 'Verification Not Successful');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerAccountStatusEmail(partner, isBlocked) {
    const subject = `Account Notification: ${isBlocked ? 'Access Restricted' : 'Access Restored'}`;
    const statusText = isBlocked ? 'Blocked / Terminated' : 'Active / Restored';
    const statusColor = isBlocked ? '#ef4444' : 'green';

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>This is an official notification regarding your partner account status on ${this.companyName}.</p>
      
      <div class="card" style="border-left: 4px solid ${statusColor};">
        <h3>New Account Status</h3>
        <div class="detail-row"><span class="label">Status</span><span class="value" style="color: ${statusColor}; font-weight: bold;">${statusText.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-IN')}</span></div>
      </div>
      
      <p>${isBlocked
        ? 'Your access to the partner dashboard and active property listings has been restricted due to management policies or terms of service violations.'
        : 'Your partner account access has been fully restored. You can now log in and manage your properties as usual.'}</p>
      
      ${!isBlocked ? `
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel" class="btn">Login to Account</a>
      </div>` : '<p>If you believe this is a mistake, please contact our administrative support team for clarification.</p>'}
    `;

    const html = this.generateHtmlTemplate('Account Status Update', body, 'Important Security Notification');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerAccountDeletedEmail(partner) {
    const subject = 'Account Permanently Deleted';
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>This is to confirm that your partner account with <strong>${this.companyName}</strong> has been permanently deleted as per administrative policy or your request.</p>
      
      <div class="card" style="border-left: 4px solid #6b7280;">
        <h3>Account Deletion Notice</h3>
        <p>All your property listings have been removed, and you will no longer have access to the partner dashboard.</p>
      </div>

      <p>If you were not expecting this or wish to re-join our platform, please contact our administrative team.</p>
      <p>We thank you for the time you spent as our partner.</p>
    `;

    const html = this.generateHtmlTemplate('Account Deletion Confirmation', body, 'Farewell from RukkooIn');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerPropertyAddedEmail(partner, property) {
    const subject = `Property Submitted: ${property.propertyName}`;
    const amenitiesHtml = property.amenities?.length
      ? `<p><strong>Amenities:</strong> ${property.amenities.slice(0, 8).join(', ')}${property.amenities.length > 8 ? '...' : ''}</p>`
      : '';

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Your property <strong>${property.propertyName}</strong> has been successfully submitted for review.</p>
      
      <div class="card">
        <h3>Property Details</h3>
        <div class="detail-row"><span class="label">Name</span><span class="value">${property.propertyName}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${property.propertyType.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Category</span><span class="value">${property.hotelCategory || property.pgType || property.resortType || 'N/A'}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}, ${property.address?.state}</span></div>
        <div class="detail-row"><span class="label">Status</span><span class="value" style="color: orange;">PENDING VERIFICATION</span></div>
      </div>

      <div class="card">
        <h3>Location & Contact</h3>
        <p style="font-size: 14px; color: #444; margin: 0;">${property.address?.fullAddress || 'Address details in dashboard'}</p>
        <p style="font-size: 14px; color: #444; margin: 5px 0 0;"><strong>Phone:</strong> ${property.contactNumber || 'N/A'}</p>
      </div>

      ${amenitiesHtml}
      
      <p>Our admin team will verify the documents and details provided. You will receive an email once it is approved and live.</p>
    `;

    const html = this.generateHtmlTemplate('Submission Received', body, 'Next Step: Verification');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerPropertyApprovedEmail(partner, property) {
    const subject = `Property Approved & Live: ${property.propertyName}`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Congratulations! Your property <strong>${property.propertyName}</strong> has been verified and is now <strong>LIVE</strong> on ${this.companyName}.</p>
      
      <div class="card">
        <h3>Property Summary</h3>
        <div class="detail-row"><span class="label">Property</span><span class="value">${property.propertyName}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${property.propertyType.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}</span></div>
        <div class="detail-row"><span class="label">Status</span><span class="value" style="color: green;">APPROVED & LIVE</span></div>
      </div>

      <div class="card">
        <h3>Active Policies</h3>
        <div class="detail-row"><span class="label">Check-in</span><span class="value">${property.checkInTime || 'Standard'}</span></div>
        <div class="detail-row"><span class="label">Check-out</span><span class="value">${property.checkOutTime || 'Standard'}</span></div>
        <div class="detail-row"><span class="label">Cancellation</span><span class="value">${property.cancellationPolicy || 'Standard'}</span></div>
      </div>
      
      <p>Travelers can now see and book your property. Make sure to keep your inventory and pricing updated.</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel/properties" class="btn">Manage Property</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Your Property is Live!', body, 'Success! Verification Complete');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerPropertyRejectedEmail(partner, property, reason) {
    const subject = `Action Required: Property Rejection - ${property.propertyName}`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>Your property <strong>${property.propertyName}</strong> submission was not approved at this time.</p>
      
      <div class="card" style="border-left: 4px solid #ef4444;">
        <h3>Rejection Reason</h3>
        <p>${reason || 'Please review the documents and ensure all details are accurate.'}</p>
      </div>

      <div class="card">
        <h3>Property Info</h3>
        <div class="detail-row"><span class="label">Property</span><span class="value">${property.propertyName}</span></div>
        <div class="detail-row"><span class="label">City</span><span class="value">${property.address?.city}</span></div>
      </div>
      
      <p>You can update the documents or details in your dashboard and resubmit for verification.</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel/properties" class="btn">Edit Property</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Property Review Update', body, 'Submission Update');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerPropertyDeletedEmail(partner, property, deletedBy = 'HotelAdmin') {
    const subject = `Property Deleted: ${property.propertyName}`;
    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>We are writing to inform you that the property <strong>${property.propertyName}</strong> has been deleted from ${this.companyName} by ${deletedBy}.</p>
      
      <div class="card" style="border-left: 4px solid #6b7280;">
        <h3>Removal Details</h3>
        <div class="detail-row"><span class="label">Property Name</span><span class="value">${property.propertyName}</span></div>
        <div class="detail-row"><span class="label">Property Type</span><span class="value">${property.propertyType}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}</span></div>
      </div>

      <p style="color: #666; font-size: 13px;">This property is no longer active and cannot be booked by travelers. Any upcoming bookings for this property may need to be managed manually.</p>
      
      <p>If you have any questions regarding this removal, please contact our support team.</p>
    `;

    const html = this.generateHtmlTemplate('Property Removal Notice', body, 'Account Update');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerPropertyStatusUpdateEmail(partner, property, status, isLive) {
    const isSuspended = status === 'rejected' || status === 'suspended' || (!isLive && status === 'approved');
    const subject = `Property Status Update: ${property.propertyName}`;

    let statusFlavor = isLive ? 'LIVE & ACTIVE' : 'SUSPENDED/HIDDEN';
    let statusColor = isLive ? 'green' : '#ef4444';
    let icon = isLive ? '✅' : '⚠️';

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>There has been a status update for your property <strong>${property.propertyName}</strong> by the administration team.</p>
      
      <div class="card" style="border-left: 4px solid ${statusColor};">
        <h3>Current Status ${icon}</h3>
        <div class="detail-row"><span class="label">New Status</span><span class="value" style="color: ${statusColor}; font-weight: bold;">${statusFlavor}</span></div>
        <div class="detail-row"><span class="label">Visibility</span><span class="value">${isLive ? 'Visible to Travelers' : 'Hidden from Search'}</span></div>
      </div>

      <div class="card">
        <h3>Property Details</h3>
        <div class="detail-row"><span class="label">Property</span><span class="value">${property.propertyName}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${property.propertyType.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}</span></div>
      </div>

      <p>${isLive
        ? 'Your property is now active. Travelers can search and book your stay again.'
        : 'Your property has been temporarily suspended or hidden. Please contact support or check your dashboard for more details.'}</p>
      
      <div style="text-align: center;">
        <a href="https://rukkoo.in/hotel/properties" class="btn">${isLive ? 'View Property' : 'Check Dashboard'}</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('Property Status Update', body, 'System Notification');
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  // --- ADMIN EMAILS ---

  async sendAdminNewPropertyEmail(adminEmail, property) {
    const subject = 'New Property Listed';
    const body = `
      <p>Admin,</p>
      <p>A new property has been added and requires verification.</p>
      
      <div class="card">
        <h3>Property Details</h3>
        <div class="detail-row"><span class="label">Name</span><span class="value">${property.propertyName || property.name}</span></div>
        <div class="detail-row"><span class="label">Code</span><span class="value">${property.propertyType}</span></div>
        <div class="detail-row"><span class="label">Location</span><span class="value">${property.address?.city}</span></div>
      </div>
      
      <p><a href="https://rukkoo.in/admin">Go to Admin Panel</a></p>
    `;

    const html = this.generateHtmlTemplate(subject, body, 'Action Required');
    return this.sendEmail({ to: adminEmail, subject, html, text: subject });
  }

  async sendAdminSupportQueryEmail(adminEmail, contact) {
    const subject = `Support: ${contact.subject || 'New Message'}`;
    const body = `
      <p>New support message received.</p>
      
      <div class="card">
        <h3>Message Details</h3>
        <div class="detail-row"><span class="label">From</span><span class="value">${contact.name}</span></div>
        <div class="detail-row"><span class="label">Email</span><span class="value">${contact.email}</span></div>
        <div class="detail-row"><span class="label">Phone</span><span class="value">${contact.phone || 'N/A'}</span></div>
      </div>
      
      <div style="background: #f1f5f9; padding: 15px; border-radius: 5px;">
        <strong>Message:</strong><br/>
        ${contact.message}
      </div>
    `;

    const html = this.generateHtmlTemplate('New Support Query', body);
    return this.sendEmail({ to: adminEmail, subject, html, text: subject });
  }

  // --- PARTNER BOOKING EMAILS ---

  async sendPartnerNewBookingEmail(partner, user, booking) {
    const property = booking.propertyId || {};
    const room = booking.roomTypeId || {};
    const subject = `New Booking Received! #${booking.bookingId}`;

    const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>You have received a new booking for <strong>${property.propertyName || property.name}</strong>.</p>
      
      <div class="card">
        <h3>Booking Details (#${booking.bookingId})</h3>
        <div class="detail-row"><span class="label">Guest Name</span><span class="value">${user.name}</span></div>
        <div class="detail-row"><span class="label">Check-in</span><span class="value">${checkIn}</span></div>
        <div class="detail-row"><span class="label">Check-out</span><span class="value">${checkOut}</span></div>
        <div class="detail-row"><span class="label">Guests</span><span class="value">${booking.guests?.adults} Adults, ${booking.guests?.children} Children</span></div>
        <div class="detail-row"><span class="label">Rooms</span><span class="value">${booking.guests?.rooms || 1} x ${room.name || booking.bookingUnit || 'Room'}</span></div>
      </div>

      <div class="card">
        <h3>Payment Information</h3>
        <div class="detail-row"><span class="label">Total Amount</span><span class="value">₹${booking.totalAmount}</span></div>
        <div class="detail-row"><span class="label">Payment Status</span><span class="value" style="color: ${booking.paymentStatus === 'paid' ? 'green' : 'orange'}">${booking.paymentStatus.toUpperCase()}</span></div>
        <div class="detail-row"><span class="label">Payment Method</span><span class="value">${booking.paymentMethod === 'pay_at_hotel' ? 'Pay at Hotel' : 'Online Payment'}</span></div>
      </div>

      <div style="text-align: center; margin-top: 15px;">
        <a href="https://rukkoo.in/hotel/bookings/${booking._id}" class="btn" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Booking</a>
      </div>
    `;

    const html = this.generateHtmlTemplate('New Booking', body, `Order #${booking.bookingId}`);
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerBookingCancelledEmail(partner, booking) {
    const subject = `Booking Cancelled: #${booking.bookingId}`;
    const propertyName = booking.propertyId?.propertyName || booking.propertyId?.name || 'HotelProperty';

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>A booking at <strong>${propertyName}</strong> has been cancelled.</p>

      <div class="card">
        <h3>Cancellation Details</h3>
        <div class="detail-row"><span class="label">Booking ID</span><span class="value">${booking.bookingId}</span></div>
        <div class="detail-row"><span class="label">Cancelled By</span><span class="value">Guest / System</span></div>
      </div>

      <p>Your inventory has been automatically updated.</p>
    `;

    const html = this.generateHtmlTemplate('Booking Cancelled', body, `Order #${booking.bookingId}`);
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }

  async sendPartnerBookingStatusUpdateEmail(partner, booking, status) {
    const subject = `Booking Update: ${status} - #${booking.bookingId}`;
    const propertyName = booking.propertyId?.propertyName || booking.propertyId?.name || 'HotelProperty';

    const body = `
      <p>Hi <strong>${partner.name}</strong>,</p>
      <p>The status of booking <strong>#${booking.bookingId}</strong> at <strong>${propertyName}</strong> has been updated to <strong>${status.toUpperCase()}</strong>.</p>
      
      <p>If you have any questions, please contact our support team.</p>
    `;

    const html = this.generateHtmlTemplate('Booking Status Update', body, `Order #${booking.bookingId}`);
    return this.sendEmail({ to: partner.email, subject, html, text: subject });
  }
}

export default new EmailService();
