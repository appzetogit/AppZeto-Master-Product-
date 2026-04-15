import { verifyAccessToken } from '../../../../core/auth/token.util.js';
import { FoodUser as MasterFoodUser } from '../../../../core/users/user.model.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { Admin } from '../../admin/models/Admin.js';
import { Owner } from '../../admin/models/Owner.js';
import { Driver } from '../../driver/models/Driver.js';
import { User as TaxiUser } from '../models/User.js';

const TAXI_ROLE_MODEL_MAP = {
  admin: Admin,
  driver: Driver,
  owner: Owner,
  user: TaxiUser,
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const isDuplicateKeyError = (error) => Number(error?.code) === 11000;

const isMasterUserPayload = (payload) =>
  Boolean(payload?.userId) && String(payload?.role || '').trim().toUpperCase() === 'USER';

const isTaxiPayload = (payload) =>
  Boolean(payload?.sub) && Object.prototype.hasOwnProperty.call(TAXI_ROLE_MODEL_MAP, normalizeRole(payload?.role));

const buildTaxiUserPatch = (masterUser) => ({
  phone: String(masterUser.phone || '').trim(),
  countryCode: String(masterUser.countryCode || '+91').trim(),
  name: String(masterUser.name || 'AppZeto User').trim(),
  email: String(masterUser.email || '').trim().toLowerCase(),
  profileImage: String(masterUser.profileImage || '').trim(),
  addresses: Array.isArray(masterUser.addresses) ? masterUser.addresses : [],
  isVerified: masterUser.isVerified !== false,
  isActive: true,
  active: true,
  role: 'USER',
  deletedAt: null,
  deletion_reason: '',
  fcmTokens: Array.isArray(masterUser.fcmTokens) ? masterUser.fcmTokens : [],
  fcmTokenMobile: Array.isArray(masterUser.fcmTokenMobile) ? masterUser.fcmTokenMobile : [],
});

const assertTaxiEntityAccess = (role, entity) => {
  if (!entity) {
    throw new ApiError(401, 'Authenticated account no longer exists');
  }

  if (
    role === 'user' &&
    (entity.deletedAt || entity.isActive === false || entity.active === false)
  ) {
    throw new ApiError(401, 'User account is not active');
  }

  if (
    role === 'driver' &&
    (entity.approve === false || String(entity.status || '').toLowerCase() === 'pending')
  ) {
    throw new ApiError(403, 'Driver account is pending approval');
  }
};

export const syncMasterUserToTaxiUser = async (masterUserId) => {
  const masterUser = await MasterFoodUser.findById(masterUserId)
    .select('phone countryCode name email profileImage addresses isActive isVerified fcmTokens fcmTokenMobile')
    .lean();

  if (!masterUser) {
    throw new ApiError(404, 'Master user not found');
  }

  if (masterUser.isActive === false || !masterUser.phone) {
    throw new ApiError(401, 'User account is not active');
  }

  const patch = buildTaxiUserPatch(masterUser);
  let taxiUser;

  try {
    taxiUser = await TaxiUser.findOneAndUpdate(
      { masterUserId: masterUser._id },
      {
        $set: patch,
        $setOnInsert: {
          masterUserId: masterUser._id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    taxiUser = await TaxiUser.findOneAndUpdate(
      { phone: patch.phone },
      {
        $set: {
          ...patch,
          masterUserId: masterUser._id,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  if (!taxiUser) {
    throw new ApiError(500, 'Failed to synchronize taxi user');
  }

  if (taxiUser && String(taxiUser.phone || '') !== patch.phone) {
    try {
      taxiUser = await TaxiUser.findOneAndUpdate(
        { _id: taxiUser._id },
        {
          $set: patch,
        },
        {
          new: true,
          runValidators: true,
        },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      taxiUser = await TaxiUser.findOneAndUpdate(
        { phone: patch.phone },
        {
          $set: {
            ...patch,
            masterUserId: masterUser._id,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );
    }
  }

  if (taxiUser && (!taxiUser.masterUserId || String(taxiUser.masterUserId) !== String(masterUser._id))) {
    taxiUser = await TaxiUser.findOneAndUpdate(
      { _id: taxiUser._id },
      {
        $set: {
          masterUserId: masterUser._id,
        },
      },
      {
        new: true,
      },
    );
  }

  if (!taxiUser) {
    throw new ApiError(500, 'Failed to synchronize taxi user');
  }

  return taxiUser;
};

export const resolveTaxiIdentityFromToken = async (token, allowedRoles = []) => {
  if (!token) {
    throw new ApiError(401, 'Authorization token is required');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired authorization token');
  }

  if (isMasterUserPayload(payload)) {
    const resolvedRole = 'user';

    if (allowedRoles.length > 0 && !allowedRoles.includes(resolvedRole)) {
      throw new ApiError(403, 'Insufficient permissions for this resource');
    }

    const taxiUser = await syncMasterUserToTaxiUser(payload.userId);

    return {
      sub: String(taxiUser._id),
      role: resolvedRole,
      authType: 'food',
      masterUserId: String(payload.userId),
    };
  }

  if (!isTaxiPayload(payload)) {
    throw new ApiError(401, 'Unsupported auth role');
  }

  const resolvedRole = normalizeRole(payload.role);

  if (allowedRoles.length > 0 && !allowedRoles.includes(resolvedRole)) {
    throw new ApiError(403, 'Insufficient permissions for this resource');
  }

  const Model = TAXI_ROLE_MODEL_MAP[resolvedRole];
  const entity = await Model.findById(payload.sub);
  assertTaxiEntityAccess(resolvedRole, entity);

  return {
    sub: String(entity._id),
    role: resolvedRole,
    authType: 'taxi',
  };
};
