import { Server } from 'socket.io';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../core/auth/token.util.js';
import { getFirebaseDB } from './firebase.js';

let io = null;

function getTokenFromHandshake(socket) {
    const authToken = socket?.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const header = socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.substring(7).trim();
    const queryToken = socket?.handshake?.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim();
    return null;
}

const roomNames = {
    restaurant: (id) => `restaurant:${String(id)}`,
    user: (id) => `user:${String(id)}`,
    delivery: (id) => `delivery:${String(id)}`,
    tracking: (orderId) => `tracking:${String(orderId)}`
};

/**
 * Initializes Socket.IO with the provided HTTP server.
 * When REDIS_ENABLED=true and REDIS_URL is set, attaches Redis adapter for horizontal scaling.
 * @param {import('http').Server} server
 * @returns {Promise<Server>}
 */
export const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: config.socketCorsOrigin,
            methods: ['GET', 'POST']
        }
    });

    // Socket auth middleware (Bearer token).
    io.use((socket, next) => {
        try {
            const token = getTokenFromHandshake(socket);
            if (!token) {
                logger.warn(`Socket auth failed: token missing for socket ${socket.id}`);
                return next(new Error('AUTH_MISSING'));
            }
            const decoded = verifyAccessToken(token);
            socket.user = { userId: decoded.userId, role: decoded.role };
            logger.info(`Socket auth success: ${decoded.role}:${decoded.userId} for socket ${socket.id}`);
            return next();
        } catch (err) {
            logger.error(`Socket auth failed for socket ${socket.id}: ${err.message}`);
            return next(new Error('AUTH_INVALID'));
        }
    });

    if (config.redisEnabled && config.redisUrl) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { createClient } = await import('redis');
            const pubClient = createClient({ url: config.redisUrl });
            const subClient = pubClient.duplicate();
            pubClient.on('error', (err) => logger.error(`Socket.IO Redis pub client: ${err.message}`));
            subClient.on('error', (err) => logger.error(`Socket.IO Redis sub client: ${err.message}`));
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter attached for horizontal scaling');
        } catch (err) {
            logger.warn(`Socket.IO Redis adapter skipped (using in-memory): ${err.message}`);
        }
    }

    io.on('connection', (socket) => {
        const userId = socket.user?.userId;
        const role = socket.user?.role;
        logger.info(`Socket client connected: ${socket.id} (${role || 'UNKNOWN'}:${userId || '-'})`);

        // Auto-join role rooms (lets us emit without a custom join).
        if (userId && role) {
            if (role === 'RESTAURANT') socket.join(roomNames.restaurant(userId));
            if (role === 'USER') socket.join(roomNames.user(userId));
            if (role === 'DELIVERY_PARTNER') socket.join(roomNames.delivery(userId));
        }

        // Explicit join (used by existing restaurant client hook).
        socket.on('join-restaurant', (restaurantId) => {
            if (socket.user?.role !== 'RESTAURANT') return;
            // Security: only join your own restaurant room.
            if (String(socket.user?.userId) !== String(restaurantId)) return;
            socket.join(roomNames.restaurant(restaurantId));
            socket.emit('restaurant-room-joined', { room: roomNames.restaurant(restaurantId), restaurantId: String(restaurantId) });
        });

        // Explicit join (used by existing delivery client hook).
        socket.on('join-delivery', (deliveryPartnerId) => {
            if (socket.user?.role !== 'DELIVERY_PARTNER') return;
            // Security: only join your own delivery room.
            if (String(socket.user?.userId) !== String(deliveryPartnerId)) return;
            socket.join(roomNames.delivery(deliveryPartnerId));
            socket.emit('delivery-room-joined', { room: roomNames.delivery(deliveryPartnerId), deliveryPartnerId: String(deliveryPartnerId) });
        });

        // ─── Live Tracking Events ───────────────────────────────────────

        // Users / restaurants subscribe to an order's real-time tracking room.
        socket.on('join-tracking', (orderId) => {
            if (!orderId) return;
            const role = socket.user?.role;
            if (role !== 'USER' && role !== 'RESTAURANT' && role !== 'DELIVERY_PARTNER') return;
            const room = roomNames.tracking(orderId);
            socket.join(room);
            logger.info(`Socket ${socket.id} (${role}:${userId}) joined tracking room ${room}`);
            socket.emit('tracking-room-joined', { room, orderId: String(orderId) });
        });

        // Delivery partner emits live GPS location for an active order.
        // Broadcasts to the tracking room so users see the bike move in real time.
        const _lastLocationBroadcast = {};
        socket.on('update-location', (data) => {
            if (socket.user?.role !== 'DELIVERY_PARTNER') return;
            if (!data || !data.orderId) return;

            const lat = Number(data.lat);
            const lng = Number(data.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

            const heading = Number.isFinite(Number(data.heading)) ? Number(data.heading) : 0;
            const speed = Number.isFinite(Number(data.speed)) ? Number(data.speed) : 0;
            const accuracy = Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : null;

            // Throttle: max one broadcast per 2s per orderId
            const now = Date.now();
            const lastTS = _lastLocationBroadcast[data.orderId] || 0;
            if (now - lastTS < 2000) return;
            _lastLocationBroadcast[data.orderId] = now;

            const payload = {
                orderId: String(data.orderId),
                deliveryPartnerId: String(userId),
                lat,
                lng,
                boy_lat: lat, // Add boy_lat/lng for compatibility
                boy_lng: lng,
                riderLocation: [lat, lng], // Add array format for safety
                heading,
                speed,
                accuracy,
                timestamp: now
            };

            // Broadcast to tracking room (all users watching this order)
            const trackingRoom = roomNames.tracking(data.orderId);
            socket.to(trackingRoom).emit('location-update', payload);

            // Also emit to the specific user room if userId is provided
            if (data.userId) {
                socket.to(roomNames.user(data.userId)).emit('location-update', payload);
            }

            // Also broadcast to the restaurant room if provided
            if (data.restaurantId) {
                socket.to(roomNames.restaurant(data.restaurantId)).emit('location-update', payload);
            }

            // ─── Firebase Realtime Database Sync (Cost Optimization) ───
            try {
                const db = getFirebaseDB();
                if (db) {
                    // 1. Update order-specific tracking node
                    const orderRef = db.ref(`active_orders/${data.orderId}`);
                    orderRef.update({
                        lat,
                        lng,
                        boy_lat: lat,
                        boy_lng: lng,
                        heading,
                        speed,
                        accuracy,
                        last_updated: now,
                        status: data.status || 'on_the_way'
                    }).catch(e => logger.error(`Firebase orderRef update error: ${e.message}`));

                    // 2. Update global delivery boy status node
                    const boyRef = db.ref(`delivery_boys/${userId}`);
                    boyRef.update({
                        lat,
                        lng,
                        accuracy,
                        last_updated: now,
                        status: 'online'
                    }).catch(e => logger.error(`Firebase boyRef update error: ${e.message}`));
                }
            } catch (err) {
                // Silently skip if Firebase not initialized yet
                logger.debug(`Firebase RTDB sync skipped: ${err.message}`);
            }
        });

        // Leave tracking room on user navigation away.
        socket.on('leave-tracking', (orderId) => {
            if (!orderId) return;
            const room = roomNames.tracking(orderId);
            socket.leave(room);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket client disconnected: ${socket.id}`);
        });
    });

    logger.info('Socket.IO infrastructure initialized');
    return io;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server | null}
 */
export const getIO = () => {
    if (!io) {
        logger.warn('Socket.IO not initialized');
    }
    return io;
};

export const rooms = roomNames;
