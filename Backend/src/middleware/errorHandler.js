import { logger } from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Server Error';

    logger.error(
        `${req.method} ${req.originalUrl} ${statusCode} - ${err.name || 'Error'} - ${message}`
    );

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

export default errorHandler;
