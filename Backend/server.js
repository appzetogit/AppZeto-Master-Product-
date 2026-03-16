import http from 'http';
import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import { initSocket } from './src/config/socket.js';
import { initializeQueues } from './src/queues/index.js';

import { logger } from './src/utils/logger.js';

const startServer = async () => {
    try {
        // 1. Connect to Database (MongoDB)
        await connectDB();

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // 3. Initialize Socket.IO with the HTTP server
        initSocket(httpServer);

        // 4. Conditionally connect Redis (only if REDIS_ENABLED=true)
        if (config.redisEnabled) {
            await connectRedis();
        }

        // 5. Conditionally initialize BullMQ queues (only if BULLMQ_ENABLED=true). Workers run separately.
        if (config.bullmqEnabled) {
            initializeQueues();
        }

        // 6. Start the HTTP server
        const server = httpServer.listen(config.port, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use. Please kill the process or use a different port.`);
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err.message}`);
            server.close(() => process.exit(1));
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
