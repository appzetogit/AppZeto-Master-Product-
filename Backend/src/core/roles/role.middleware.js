import { sendError } from '../../utils/response.js';

export const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return sendError(res, 401, 'Not authenticated');
        }

        if (!allowedRoles.includes(req.user.role)) {
            return sendError(res, 403, 'Forbidden: insufficient permissions');
        }

        next();
    };
};

