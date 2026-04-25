import User from '../user/models/User.js';
import Admin from '../admin/models/Admin.js';
import Otp from '../models/Otp.js';
import smsService from '../utils/smsService.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET);
};

// Generate OTP (6 digits)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Bypassed numbers and default OTP
const BYPASS_NUMBERS = ['9685974247', '9009925021', '6261096283', '9752275626', '8889948896'];
const DEFAULT_OTP = '123456';

/**
 * @desc    Send OTP for Login/Register
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res) => {
  try {
    const { phone, type } = req.body; // type: 'login' | 'register'

    if (!phone || phone.length !== 10) {
      return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
    }

    let user = await User.findOne({ phone });

    // Login Flow Validation
    if (type === 'login' && !user) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    // Register Flow Validation
    if (type === 'register' && user) {
      return res.status(409).json({ message: 'User already exists. Please login.' });
    }

    // Generate OTP
    const isBypassed = BYPASS_NUMBERS.includes(phone);
    const otp = isBypassed ? DEFAULT_OTP : generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    if (user) {
      // Existing User (Login)
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      // New User (Register) - Store in Otp Collection
      // Upsert to handle retries
      await Otp.findOneAndUpdate(
        { phone },
        { otp, expiresAt: otpExpires },
        { upsert: true, new: true }
      );
    }

    // Skip SMS for bypassed numbers
    if (isBypassed) {
      console.log(`🛡️ OTP Bypassed for ${phone} (${type}). Use: ${otp}`);
      return res.status(200).json({ message: 'OTP sent successfully (Bypassed)', success: true });
    }

    // Send SMS
    const smsResponse = await smsService.sendOTP(phone, otp, `${type}/verification`);

    if (!smsResponse.success) {
      console.log(`⚠️ SMS Failed. Use OTP: ${otp} for testing.`);
      return res.status(200).json({
        message: 'SMS Gateway Error. OTP generated for dev.',
        devOtp: otp,
        success: false
      });
    }

    res.status(200).json({ message: 'OTP sent successfully', success: true });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
};

/**
 * @desc    Verify OTP and Authenticate User (Login or Register)
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name, email } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    // 1. Check if it's an existing user (Login Flow)
    let user = await User.findOne({ phone }).select('+otp +otpExpires');
    let isRegistration = false;

    if (user) {
      // Verify Login OTP
      if (user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      if (user.otpExpires < Date.now()) {
        return res.status(400).json({ message: 'OTP has expired' });
      }

      // Clear OTP
      user.otp = undefined;
      user.otpExpires = undefined;

    } else {
      // 2. Check Otp Collection (Registration Flow)
      const otpRecord = await Otp.findOne({ phone });

      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid request or OTP expired. Please request OTP again.' });
      }

      if (otpRecord.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // For registration, 'name' is required
      if (!name) {
        return res.status(400).json({ message: 'Name is required for registration.' });
      }

      // Create New User
      user = new User({
        name,
        phone,
        email,
        isVerified: true,
        // Password is required by schema, setting a random hash for OTP-only users
        password: await bcrypt.hash(Math.random().toString(36), 10)
      });

      isRegistration = true;
      // Delete used OTP
      await Otp.deleteOne({ phone });
    }

    // Save/Update User
    if (isRegistration || name || email) {
      if (name) user.name = name;
      if (email) user.email = email;
      user.isVerified = true;
    }

    if (!isRegistration && user.role === 'partner') {
      if (user.partnerApprovalStatus === 'pending') {
        return res.status(403).json({ message: 'Your partner account is pending approval.' });
      }
      if (user.partnerApprovalStatus === 'rejected') {
        return res.status(403).json({ message: 'Your partner account was rejected. Please contact support.' });
      }
    }

    await user.save();

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
        isPartner: user.isPartner,
        partnerApprovalStatus: user.partnerApprovalStatus
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

/**
 * @desc    Register a new user (Traditional Email/Pass - if needed fallback)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  // ... Implement if needed, focusing on OTP first as per user request
  res.status(501).json({ message: 'Use OTP flow for registration' });
};

/**
 * @desc    Register Partner (Step 1 & 2: Details + Send OTP)
 * @route   POST /api/auth/partner/register
 * @access  Public
 */
export const registerPartner = async (req, res) => {
  try {
    const {
      full_name, email, phone, role, termsAccepted,
      owner_name, aadhaar_number, aadhaar_front, aadhaar_back,
      pan_number, pan_card_image, owner_address
    } = req.body;

    // Basic Validation
    if (!phone || !full_name) {
      return res.status(400).json({ message: 'Phone and Name are required' });
    }

    // Check if user exists
    let user = await User.findOne({ phone });

    if (user && user.isVerified) {
      return res.status(409).json({ message: 'User with this phone already exists. Please login.' });
    }

    if (email) {
      const emailUser = await User.findOne({ email });
      if (emailUser && emailUser.isVerified && (!user || emailUser._id.toString() !== user._id.toString())) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
    }

    // Generate OTP
    const isBypassed = BYPASS_NUMBERS.includes(phone);
    const otp = isBypassed ? DEFAULT_OTP : generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Prepare User Data
    const userData = {
      name: full_name,
      email: email,
      phone: phone,
      role: 'partner',
      isPartner: false,
      partnerApprovalStatus: 'pending',
      termsAccepted: termsAccepted,

      // Extended Partner Details
      // Note: mapping owner_name to existing logic if needed, or keeping it separate? 
      // User model usually stores the main name.
      aadhaarNumber: aadhaar_number,
      aadhaarFront: aadhaar_front,
      aadhaarBack: aadhaar_back,
      panNumber: pan_number,
      panCardImage: pan_card_image,

      address: owner_address ? {
        street: owner_address.street,
        city: owner_address.city,
        state: owner_address.state,
        zipCode: owner_address.zipCode,
        country: owner_address.country || 'India',
        coordinates: owner_address.coordinates
      } : undefined,

      otp: otp,
      otpExpires: otpExpires,
      isVerified: false
    };

    if (user) {
      Object.assign(user, userData);
      await user.save();
    } else {
      userData.password = await bcrypt.hash(Math.random().toString(36), 10);
      user = await User.create(userData);
    }

    // Send SMS
    if (isBypassed) {
      console.log(`🛡️ Partner OTP Bypassed for ${phone}: ${otp}`);
      return res.status(200).json({
        success: true,
        message: 'OTP sent (Bypassed)',
        phone
      });
    }

    const smsResponse = await smsService.sendOTP(phone, otp, 'partner-register');

    if (!smsResponse.success) {
      return res.status(200).json({
        success: false, // Frontend should treat as warning or handled dev mode
        message: 'SMS Failed. OTP generated for dev.',
        devOtp: otp
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to ' + phone
    });

  } catch (error) {
    console.error('Register Partner Error:', error);
    res.status(500).json({ message: 'Server error during partner registration' });
  }
};

/**
 * @desc    Verify OTP and Finalize Partner Registration
 * @route   POST /api/auth/partner/verify-otp
 * @access  Public
 */
export const verifyPartnerOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const user = await User.findOne({ phone }).select('+otp +otpExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register first.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    user.isPartner = false;
    user.partnerApprovalStatus = 'pending';

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Partner registration completed successfully. Your account is pending admin approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner,
        partnerApprovalStatus: user.partnerApprovalStatus
      }
    });

  } catch (error) {
    console.error('Verify Partner OTP Error:', error);
    res.status(500).json({ message: 'Server error verifying partner OTP' });
  }
};

/**
 * @desc    Login user (Traditional Email/Pass - if needed fallback)
 * @route   POST /api/auth/login
 * @access  Public
 */
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

    // Find admin by email and select password
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is deactivated' });
    }

    // Verify password
    const isMatched = await bcrypt.compare(password, admin.password);
    if (!isMatched) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

/**
 * @desc    Get Current User/Admin Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // First check in User collection
    let user = await User.findById(req.user.id);

    // If not found, check in Admin collection
    if (!user) {
      user = await Admin.findById(req.user.id);
    }

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
        address: user.address
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
    const { name, email, phone, address } = req.body;

    // Find user (not admin, as admins have separate management)
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      if (email !== user.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        user.email = email;
      }
    }
    if (phone) {
      // Check if phone is already taken by another user
      if (phone !== user.phone) {
        const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Phone number already in use' });
        }
        user.phone = phone;
      }
    }

    // Update address if provided
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

    await user.save();

    // Return updated user
    const updatedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPartner: user.isPartner || false,
      address: user.address
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
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

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    res.status(500).json({ message: 'Server error updating admin profile' });
  }
};

