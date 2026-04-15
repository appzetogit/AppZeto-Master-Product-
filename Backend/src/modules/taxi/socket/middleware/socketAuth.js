import { ApiError } from '../../../../utils/ApiError.js';
import { resolveTaxiIdentityFromToken } from '../../user/services/masterUserBridge.service.js';

export const getIdentityFromSocket = async (socket) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    throw new ApiError(401, 'Socket token is required');
  }

  return resolveTaxiIdentityFromToken(token);
};

export const attachSocketAuth = (io) => {
  io.use(async (socket, next) => {
    try {
      socket.auth = await getIdentityFromSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });
};
