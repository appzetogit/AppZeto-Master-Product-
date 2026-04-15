import { ApiError } from '../../../utils/ApiError.js';
import { resolveTaxiIdentityFromToken } from '../user/services/masterUserBridge.service.js';

const attachResolvedAuth = (req, payload) => {
  req.auth = {
    sub: payload.sub,
    role: payload.role,
    authType: payload.authType || 'taxi',
    masterUserId: payload.masterUserId || null,
  };
};

export const authenticate = (allowedRoles = []) => async (req, _res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const [, token] = authorization.split(' ');

    if (!token) {
      throw new ApiError(401, 'Authorization token is required');
    }

    const identity = await resolveTaxiIdentityFromToken(token, allowedRoles);
    attachResolvedAuth(req, identity);

    next();
  } catch (error) {
    next(error);
  }
};

export const authenticateOrResolveUser = (allowedRoles = ['user']) => authenticate(allowedRoles);
