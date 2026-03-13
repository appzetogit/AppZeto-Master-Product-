import { Server } from 'socket.io';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let io = null;

/**
 * Initializes Socket.IO with the provided HTTP server.
 * @param {import('http').Server} server 
 * @returns {Server}
 */
export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: config.socketCorsOrigin,
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`🗣️ [SOCKET] Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 [SOCKET] Client disconnected: ${socket.id}`);
        });
    });

    logger.info('Socket.IO infrastructure initialized');
    return io;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server}
 */
export const getIO = () => {
    if (!io) {
        console.warn('Socket.IO not initialized!');
    }
    return io;
};
