import { Server } from 'socket.io';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let io = null;

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
        logger.info(`Socket client connected: ${socket.id}`);

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
