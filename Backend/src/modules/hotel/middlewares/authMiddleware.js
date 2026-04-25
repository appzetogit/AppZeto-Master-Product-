import jwt from 'jsonwebtoken';
import User from '../user/models/User.js';
import Partner from '../partner/models/Partner.js';
import Admin from '../admin/models/Admin.js';

const getDecodedUserId = (decoded) => decoded?.id || decoded?.userId || decoded?.sub;

const normalizeHotelRole = (role) => {
  const value = String(role || '').trim().toLowerCase();

  if (value === 'user') return 'user';
  if (value === 'admin') return 'admin';
  if (value === 'superadmin' || value === 'super_admin') return 'superadmin';
  if (value === 'partner' || value === 'restaurant' || value === 'seller') return 'partner';

  return value;
};

const attachHotelUser = (req, user) => {
  const base = typeof user.toObject === 'function' ? user.toObject() : user;
  req.user = {
    ...base,
    _id: user._id,
    id: String(user._id),
    role: normalizeHotelRole(user.role),
    rawRole: user.role
  };
};

const findTokenOwner = async (decodedUserId) => {
  let user = await User.findById(decodedUserId);
  if (!user) user = await Partner.findById(decodedUserId);
  if (!user) user = await Admin.findById(decodedUserId);
  return user;
};

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    const decodedUserId = getDecodedUserId(decoded);

    if (!decodedUserId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await findTokenOwner(decodedUserId);

    if (!user) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    if (user.isBlocked || user.isActive === false) {
      return res.status(403).json({
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    attachHotelUser(req, user);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorizedRoles = (...roles) => {
  const allowed = roles.map(normalizeHotelRole);

  return (req, res, next) => {
    const role = normalizeHotelRole(req.user?.role);

    if (!allowed.includes(role)) {
      return res.status(403).json({ message: `User role ${role} is not authorized to access this route` });
    }

    next();
  };
};

export const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
      const decodedUserId = getDecodedUserId(decoded);
      const user = decodedUserId ? await findTokenOwner(decodedUserId) : null;

      if (user && !user.isBlocked && user.isActive !== false) {
        attachHotelUser(req, user);
      }
    }

    next();
  } catch (error) {
    next();
  }
};
