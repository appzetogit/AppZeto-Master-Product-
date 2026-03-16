import { logger } from '../utils/logger.js';

/**
 * Logs API request method, path, status code, and response time.
 * Does not log body, headers, or any sensitive data.
 */
export const responseTimeLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
};
