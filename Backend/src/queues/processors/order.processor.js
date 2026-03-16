import { logger } from '../../utils/logger.js';

/**
 * Placeholder processor for order jobs. No business logic connected yet.
 * @param {import('bullmq').Job} job
 */
export const processOrderJob = async (job) => {
    logger.info(`Processing order job ${job.id}`);
    return { processed: true, jobId: job.id };
};
