import { logger } from '../../utils/logger.js';

/**
 * Placeholder processor for payment jobs. No business logic connected yet.
 * @param {import('bullmq').Job} job
 */
export const processPaymentJob = async (job) => {
    logger.info(`Processing payment job ${job.id}`);
    return { processed: true, jobId: job.id };
};
