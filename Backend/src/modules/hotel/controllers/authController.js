import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Admin from '../admin/models/Admin.js';
import User from '../user/models/User.js';
import Partner from '../partner/models/Partner.js';
import Otp from '../models/Otp.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import smsService from '../utils/smsService.js';
import referralService from '../services/referralService.js';
import { uploadToCloudinary, deleteFromCloudinary, uploadBase64ToCloudinary } from '../utils/cloudinary.js';
import { requestUserOtp, verifyUserOtpAndLogin } from '../../../core/auth/auth.service.js';

const generateToken = (id, role) => {
  // No expiresIn: tokens never expire; users only get logged out manually
  const tokenRole = String(role || '').toLowerCase() === 'user' ? 'USER' : role;
  return jwt.sign({ id, userId: id, role: tokenRole }, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
};

export const checkExists = async (req, res) => {
  try {
    const { phone, email, role = 'user' } = req.body;
    let Model = role === 'partner' ? Partner : User;

    if (phone) {
      const existingByPhone = await Model.findOne({ phone, isDeleted: false });
      if (existingByPhone) {
        return res.status(409).json({
          message: `${role.charAt(0).toUpperCase() + role.slice(1)} with this phone number already exists.`,
          requiresLogin: true
        });
      }
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingByEmail = await Model.findOne({ email: normalizedEmail, isDeleted: false });
      if (existingByEmail) {
        return res.status(409).json({
          message: `${role.charAt(0).toUpperCase() + role.slice(1)} with this email address already registered.`,
          requiresLogin: true
        });
      }
    }

    res.status(200).json({ success: true, message: 'Details available' });
  } catch (error) {
    console.error('Check Exists Error:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { phone, type, role = 'user', email: rawEmail } = req.body; // type: 'login' or 'register'
    const email = rawEmail ? rawEmail.trim().toLowerCase() : '';

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (role !== 'partner') {
      const result = await requestUserOtp(phone);
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 600,
        ...result
      });
    }

    let user;
    let Model = role === 'partner' ? Partner : User;

    // FOR LOGIN: Check if user exists & is not blocked BEFORE sending OTP
    if (type === 'login') {
      user = await Model.findOne({ phone });
      if (!user) {
        if (role === 'partner') {
          return res.status(404).json({ message: 'Partner account not found. Please register first.' });
        }
        return res.status(404).json({
          message: 'Account not found. Please create an account first.',
          requiresRegistration: true
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked by admin. Please contact support.',
          isBlocked: true
        });
      }

      if (user.isDeleted) {
        // We allow them to request OTP. Re-activation happens in verifyOtp.
        console.log(`[AUTH] Deleted account ${phone} requesting OTP for re-activation.`);
      }
    }

    // FOR REGISTER: Check if phone or email already exists
    if (type === 'register') {
      // Basic formatting check
      if (!phone || phone.length !== 10) {
        return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
      }

      // 1. Check Phone
      const existingByPhone = await Model.findOne({ phone, isDeleted: false });
      if (existingByPhone) {
        return res.status(409).json({
          message: `${role.charAt(0).toUpperCase() + role.slice(1)} with this phone number already exists. Please login instead.`,
          requiresLogin: true
        });
      }

      // 2. Check Email (if provided)
      if (email) {
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingByEmail = await Model.findOne({ email, isDeleted: false });
        if (existingByEmail) {
          return res.status(409).json({
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} with this email address already registered. Please use another email or login.`,
            requiresLogin: true
          });
        }
      }
    }

    // TEST NUMBERS - Bypass OTP with default 123456
    const testNumbers = ['9685974247', '9009925021', '6261096283', '9752275626', '8889948896', '7047716600', '6263322405', '6260491554'];
    const isTestNumber = testNumbers.includes(phone);

    // Generate OTP - Use 123456 for test numbers, random for others
    const otp = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      // Store in Otp collection for new/unregistered users
      await Otp.findOneAndUpdate(
        { phone },
        { phone, otp, expiresAt: otpExpires, tempData: { role, type } },
        { upsert: true, new: true }
      );
    }

    // Send SMS only for non-test numbers
    if (!isTestNumber) {
      await smsService.sendOTP(phone, otp);
    } else {
      console.log(`🧪 Test Number Detected: ${phone} - Using default OTP: 123456`);
    }

    res.status(200).json({
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
};

export const registerPartner = async (req, res) => {
  try {
    const {
      full_name,
      email: rawEmail,
      phone,
      aadhaar_number,
      aadhaar_front,
      aadhaar_back,
      pan_number,
      pan_card_image,
      termsAccepted
    } = req.body;

    console.log(`[AUTH] Partner Registration payload:`, { phone, email: rawEmail });

    const email = rawEmail ? rawEmail.trim().toLowerCase() : '';
    const getUrl = (val) => (val && typeof val === 'object' ? val.url : val);

    const aadhaarFrontUrl = getUrl(aadhaar_front);
    const aadhaarBackUrl = getUrl(aadhaar_back);
    const panImageUrl = getUrl(pan_card_image);

    // Validation
    if (!full_name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    if (!aadhaar_number || !aadhaarFrontUrl || !aadhaarBackUrl) {
      return res.status(400).json({ message: 'Aadhaar details and documents are required' });
    }

    if (!pan_number || !panImageUrl) {
      return res.status(400).json({ message: 'PAN details are required' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ message: 'You must accept terms and conditions' });
    }

    // Check if partner already exists
    let partner = await Partner.findOne({ $or: [{ email }, { phone }] });
    if (partner && !partner.isDeleted) {
      return res.status(409).json({ message: 'Partner with this email or phone already exists' });
    }

    const isRestoration = !!(partner && partner.isDeleted);

    // Generate random password for partner
    const randomPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    if (isRestoration) {
      // Re-fill the deleted record
      partner.isDeleted = false;
      partner.name = full_name;
      partner.email = email;
      partner.password = passwordHash;
      partner.role = 'partner';
      partner.isPartner = true;
      partner.partnerApprovalStatus = 'pending';
      partner.isVerified = false;
      partner.ownerName = full_name;
      partner.aadhaarNumber = aadhaar_number;
      partner.aadhaarFront = aadhaarFrontUrl;
      partner.aadhaarBack = aadhaarBackUrl;
      partner.panNumber = pan_number;
      partner.panCardImage = panImageUrl;
      partner.address = {};
      partner.termsAccepted = termsAccepted;
      console.log(`[AUTH] Deleted partner account ${partner._id} restored during registration.`);
    } else {
      // Create fresh record
      partner = new Partner({
        name: full_name,
        email,
        phone,
        password: passwordHash,
        role: 'partner',
        isPartner: true,
        partnerApprovalStatus: 'pending',
        isVerified: false,
        ownerName: full_name,
        aadhaarNumber: aadhaar_number,
        aadhaarFront: aadhaarFrontUrl,
        aadhaarBack: aadhaarBackUrl,
        panNumber: pan_number,
        panCardImage: panImageUrl,
        address: {},
        termsAccepted
      });
    }

    await partner.save();

    // Referral processing removed for partners

    // Partner referral code generation removed

    // Send notification to admins
    notificationService.sendToAdmins({
      title: 'New Partner Registration',
      body: `${full_name} has registered as a partner and is pending approval.`
    }, { type: 'partner_registration', partnerId: partner._id }).catch(err => console.error('Failed to notify admins:', err));

    // Send welcome email to partner
    if (email) {
      emailService.sendPartnerRegistrationEmail(partner).catch(err =>
        console.error('Failed to send partner registration email:', err)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval. You can login once approved.',
      partner: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        partnerApprovalStatus: partner.partnerApprovalStatus
      }
    });

  } catch (error) {
    console.error('Register Partner Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or Phone already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    // ... (existing verification logic)
    const { phone, otp, name, email, role = 'user', referralCode } = req.body;

    if (role !== 'partner') {
      const result = await verifyUserOtpAndLogin(
        phone,
        otp,
        referralCode,
        req.body.fcmToken,
        req.body.platform,
        name
      );

      const user = result.user || {};
      return res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Registration successful' : 'Login successful',
        token: result.accessToken,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: result.isNewUser,
        user: {
          ...user,
          id: user._id,
          role: user.role || 'USER'
        }
      });
    }

    // ... (logic to verify OTP)
    // Select Model based on Role
    let Model = role === 'partner' ? Partner : User;

    // 1. Find User (if any)
    let user = await Model.findOne({ phone }).select('+otp +otpExpires');
    
    // 2. Find registration-flow OTP Record (if any)
    const otpRecord = await Otp.findOne({ phone });

    let isRegistration = false;
    let verified = false;

    // Try verifying with User OTP (Existing User/Login Flow)
    if (user && user.otp && user.otp === otp && user.otpExpires >= Date.now()) {
      verified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      
      // If found but deleted, this is a direct login-based re-activation
      if (user.isDeleted) {
        user.isDeleted = false;
        console.log(`[AUTH] Account ${user._id} re-activated via Login flow.`);
      }
    } 
    // Try verifying with Otp Record (Registration Flow / Deleted Account Recovery)
    else if (otpRecord && otpRecord.otp === otp && otpRecord.expiresAt >= Date.now()) {
      if (otpRecord.tempData && otpRecord.tempData.role && otpRecord.tempData.role !== role) {
        return res.status(400).json({ message: 'Invalid role context.' });
      }
      verified = true;
      
      if (user) {
        // Exists but was deleted (handled via registration path)
        if (user.isDeleted) {
           user.isDeleted = false;
           console.log(`[AUTH] Account ${user._id} re-activated via Registration flow.`);
        }
      } else {
        // Truly a new user
        isRegistration = true;
      }
      
      await Otp.deleteOne({ phone });
    }

    if (!verified) {
      return res.status(400).json({ message: 'Invalid OTP or OTP has expired. Please request OTP again.' });
    }

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked by admin. Please contact support.',
          isBlocked: true
        });
      }
    } else {
      // Create new user (Truly first time)
      if (req.query.verifyOnly === 'true') {
        return res.status(200).json({ success: true, message: 'OTP verified successfully' });
      }

      // Check if this was a LOGIN attempt but user doesn't exist
      if (otpRecord.tempData?.type === 'login') {
        await Otp.deleteOne({ phone });
        return res.status(404).json({
          message: 'Account not found. Please create an account first.',
          requiresRegistration: true
        });
      }

      // REGISTRATION FLOW - Name is required
      if (!name) {
        return res.status(400).json({ message: 'Name is required for registration.' });
      }
      if (email) {
        const emailExists = await Model.findOne({ email });
        if (emailExists) return res.status(409).json({ message: 'Email already exists.' });
      }

      user = new User({
        name,
        phone,
        email,
        role: 'USER',
        isVerified: true,
        password: await bcrypt.hash(Math.random().toString(36), 10)
      });
      isRegistration = true;
      await Otp.deleteOne({ phone });
    }

    // Save/Update User
    if (isRegistration || (role === 'user' && (name || email))) {
      // ... (update name/email logic)
      if (name) user.name = name;
      if (email) {
        if (email !== user.email) {
          const emailExists = await Model.findOne({ email, _id: { $ne: user._id } });
          if (emailExists) return res.status(409).json({ message: 'Email already in use.' });
          user.email = email;
        }
      }
      user.isVerified = true;
    }

    // ... (partner check logic)

    await user.save();

    // NOTIFICATION: New Login Alert
    if (!isRegistration && user.email) {
      emailService.sendLoginAlertEmail(user, req.headers['user-agent'] || 'Rukkoin App/Web').catch(e => console.error(e));
    }

    // NOTIFICATION & EMAIL TRIGGERS (USER REGISTRATION)
    if (isRegistration && role === 'user') {
      // Send Welcome Email
      if (user.email) {
        emailService.sendUserWelcomeEmail(user).catch(err => console.error('Failed to send welcome email:', err));
      }

      // Send Welcome Notification (Stored + Push if token exists later)
      notificationService.sendToUser(user._id, {
        title: 'Welcome aboard!',
        body: 'Find your perfect stay today.'
      }, { type: 'welcome' }, 'user').catch(err => console.error('Failed to send welcome notification:', err));

      // REFERRAL: Process Signup Referral
      if (referralCode) {
        console.log(`[REFERRAL_DEBUG] User signup with code: ${referralCode}`);
        referralService.processReferralSignup(user, referralCode).catch(err => console.error('[REFERRAL_DEBUG] Referral Signup Error:', err));
      }

      // REFERRAL: Auto-generate code for new user
      referralService.generateCodeForUser(user).catch(err => console.error('Code Gen Error:', err));

      // NOTIFICATION: Notify Admin of new user
      notificationService.sendToAdmins({
        title: 'New User Registration 👤',
        body: `${user.name} has joined the platform.`
      }, { type: 'new_user_registration', userId: user._id }).catch(err => console.error('Admin User alert failed:', err));

    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: isRegistration ? 'Registration successful' : 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || (role === 'partner'),
        partnerApprovalStatus: user.partnerApprovalStatus,
        profileImage: user.profileImage,
        address: user.address,
        aadhaarNumber: user.aadhaarNumber,
        panNumber: user.panNumber,
        createdAt: user.createdAt,
        partnerSince: user.partnerSince,
        isBlocked: user.isBlocked,
        registrationStep: user.registrationStep
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

// ... (registerPartner)

export const verifyPartnerOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    // 1. Check OTP in Otp collection
    const otpRecord = await Otp.findOne({ phone });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid request or OTP expired. Please register again.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (otpRecord.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // 2. Find existing Partner (they were saved during registration)
    const partner = await Partner.findOne({ phone });
    if (!partner) {
      return res.status(404).json({ message: 'Partner registration not found. Please register again.' });
    }

    if (partner.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    if (partner.isVerified) {
      // Optional: allow re-verification or just proceed
    }

    // 3. Update Partner as Verified
    partner.isVerified = true;
    await partner.save();

    // 4. Cleanup OTP
    await Otp.deleteOne({ phone });

    // NOTIFICATION & EMAIL TRIGGERS (PARTNER REGISTRATION)
    if (partner.email) {
      emailService.sendPartnerRegistrationEmail(partner).catch(err => console.error('Failed to send partner confirmation email:', err));
    }

    // Notify Admins
    notificationService.sendToAdmins({
      title: `New Partner Registration: ${partner.name}`,
      body: 'Review needed.'
    }, { type: 'partner_registration', partnerId: partner._id }).catch(err => console.error('Failed to notify admins:', err));

    const token = generateToken(partner._id, partner.role);

    res.status(200).json({
      success: true,
      message: 'Partner registration completed successfully.',
      token,
      user: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        role: partner.role,
        isPartner: partner.isPartner,
        partnerApprovalStatus: partner.partnerApprovalStatus,
        profileImage: partner.profileImage,
        address: partner.address,
        aadhaarNumber: partner.aadhaarNumber,
        panNumber: partner.panNumber,
        createdAt: partner.createdAt,
        partnerSince: partner.partnerSince
      }
    });

  } catch (error) {
    console.error('Verify Partner OTP Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or Phone already exists for this role.' });
    }
    res.status(500).json({ message: 'Server error verifying partner OTP' });
  }
};

/**
 * @desc    Admin Login with Email & Password
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is deactivated' });
    }

    const isMatched = await bcrypt.compare(password, admin.password);
    if (!isMatched) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    // NOTIFICATION: Admin Login Alert
    emailService.sendLoginAlertEmail(admin, req.headers['user-agent'] || 'Admin Dashboard').catch(e => console.error(e));

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

/**
 * @desc    Get Current User/Admin/Partner Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // req.user is already populated by authMiddleware (which checks User, Partner, Admin)
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || false,
        partnerApprovalStatus: user.partnerApprovalStatus,
        address: user.address,
        profileImage: user.profileImage,
        aadhaarNumber: user.aadhaarNumber,
        panNumber: user.panNumber,
        partnerSince: user.partnerSince,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update User Profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, profileImage, profileImagePublicId } = req.body;
    const currentUser = req.user; // From middleware

    // Determine Model based on role
    let Model = currentUser.role === 'partner' ? Partner : User;
    if (['admin', 'superadmin'].includes(currentUser.role)) {
      // Admins use updateAdminProfile usually, but if they hit this:
      Model = Admin;
    }

    let user = await Model.findById(currentUser._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) {
      if (email !== user.email) {
        const existingUser = await Model.findOne({ email, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        user.email = email;
      }
    }
    if (phone) {
      if (phone !== user.phone) {
        const existingUser = await Model.findOne({ phone, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Phone number already in use' });
        }
        user.phone = phone;
      }
    }

    if (address) {
      user.address = {
        street: address.street || user.address?.street || '',
        city: address.city || user.address?.city || '',
        state: address.state || user.address?.state || '',
        zipCode: address.zipCode || user.address?.zipCode || '',
        country: address.country || user.address?.country || 'India',
        coordinates: {
          lat: address.coordinates?.lat || user.address?.coordinates?.lat,
          lng: address.coordinates?.lng || user.address?.coordinates?.lng
        }
      };
    }

    if (profileImage !== undefined) user.profileImage = profileImage;
    if (profileImagePublicId !== undefined) user.profileImagePublicId = profileImagePublicId;

    await user.save();

    // NOTIFICATION: Security alert for profile update
    if (user.email) {
      emailService.sendSecurityAlertEmail(user, 'Profile Details').catch(e => console.error(e));
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || false,
        address: user.address,
        profileImage: user.profileImage,
        partnerSince: user.partnerSince,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

/**
 * @desc    Update Admin Profile
 * @route   PUT /api/auth/admin/update-profile
 * @access  Private (Admin/Superadmin)
 */
export const updateAdminProfile = async (req, res) => {
  // ... (Keep existing implementation)
  try {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can update this profile' });
    }

    const { name, email, phone } = req.body;

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (name) {
      admin.name = name;
    }

    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      admin.email = email;
    }

    if (phone && phone !== admin.phone) {
      const existingPhone = await Admin.findOne({ phone, _id: { $ne: admin._id } });
      if (existingPhone) {
        return res.status(409).json({ message: 'Phone number already in use' });
      }
      admin.phone = phone;
    }

    await admin.save();

    // NOTIFICATION: Security alert for Admin
    if (admin.email) {
      emailService.sendSecurityAlertEmail(admin, 'Admin Profile Details').catch(e => console.error(e));
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage
      }
    });
  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    res.status(500).json({ message: 'Server error updating admin profile' });
  }
};

/**
 * @desc    Update Admin Password
 * @route   PUT /api/auth/admin/update-password
 * @access  Private (Admin/Superadmin)
 */
export const updateAdminPassword = async (req, res) => {
  try {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can update password' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const admin = await Admin.findById(req.user.id).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    // NOTIFICATION: Security alert for Admin Password Change
    if (admin.email) {
      emailService.sendSecurityAlertEmail(admin, 'Admin Password').catch(e => console.error(e));
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update Admin Password Error:', error);
    res.status(500).json({ message: 'Server error updating admin password' });
  }
};



/**
 * @desc    Upload Documents (Partner Registration)
 * @route   POST /api/auth/partner/upload-docs
 * @access  Public
 */
export const uploadDocs = async (req, res) => {
  try {
    // Handle both single file (req.file) and multiple files (req.files)
    const filesToUpload = req.files || (req.file ? [req.file] : []);

    console.log(`[Upload Docs] Received ${filesToUpload.length} files`);

    if (!filesToUpload || filesToUpload.length === 0) {
      return res.status(400).json({ message: 'No documents provided' });
    }

    const uploadPromises = filesToUpload.map(file =>
      uploadToCloudinary(file.path, 'partner-documents')
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    console.log(`[Upload Docs] Successfully uploaded ${files.length} documents`);

    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload Docs Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

/**
 * @desc    Delete Document from Cloudinary
 * @route   POST /api/auth/partner/delete-doc
 * @access  Public
 */
export const deleteDoc = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    const result = await deleteFromCloudinary(publicId);
    res.json(result);
  } catch (error) {
    console.error('Delete Doc Error:', error);
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
};

/**
 * @desc    Upload Documents via Base64 (Flutter Camera)
 * @route   POST /api/auth/partner/upload-docs-base64
 * @access  Public
 */
export const uploadDocsBase64 = async (req, res) => {
  try {
    let { images } = req.body;

    // Handle single image sent not in an array (Flutter bridge compatibility)
    if (images && !Array.isArray(images)) {
      images = [images];
    }

    console.log(`[Upload Docs Base64] Received ${images ? images.length : 0} image items`);

    if (!images || images.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = images.map(async (img, index) => {
      // Support both {base64: '...'} object and raw '...' base64 string
      const base64Data = typeof img === 'object' ? img.base64 : img;
      const fileName = typeof img === 'object' ? img.fileName : null;

      if (!base64Data) {
        throw new Error(`Image ${index + 1} missing base64 data`);
      }

      // Generate unique publicId with random suffix to prevent collisions during batch uploads
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const publicId = fileName
        ? `${Date.now()}-${randomSuffix}-${fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`
        : `${Date.now()}-${randomSuffix}-doc-${index}`;

      return uploadBase64ToCloudinary(base64Data, 'partner-documents', publicId);
    });

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    console.log(`[Upload Docs Base64] Successfully uploaded ${files.length} documents`);

    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload Docs Base64 Error:', error);
    res.status(500).json({ message: error.message || 'Base64 doc upload failed' });
  }
};
