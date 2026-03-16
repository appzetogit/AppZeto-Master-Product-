import { Queue } from 'bullmq';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getBullMQConnection } from './connection.js';
import {
    OTP_QUEUE,
    NOTIFICATION_QUEUE,
    ORDER_QUEUE,
    PAYMENT_QUEUE,
    QUEUE_NAMES
} from './queue.constants.js';

/** @type {Map<string, Queue>} */
const queueInstances = new Map();

/**
 * Default job options: retry, backoff, cleanup.
 * Applied to all queues when BULLMQ_ENABLED=true.
 */
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000
    },
    removeOnComplete: {
        count: 1000
    },
    removeOnFail: {
        age: 24 * 3600
    }
};

/**
 * Create and cache a single queue by name.
 * @param {string} queueName
 * @returns {Queue | null}
 */
const createQueue = (queueName) => {
    const conn = getBullMQConnection();
    if (!conn) return null;
    const queue = new Queue(queueName, {
        connection: conn,
        defaultJobOptions
    });
    queueInstances.set(queueName, queue);
    return queue;
};

/**
 * Get or create a queue by name. Returns null if BullMQ is disabled or Redis unavailable.
 * @param {string} queueName
 * @returns {Queue | null}
 */
export const getQueue = (queueName) => {
    if (!config.bullmqEnabled) {
        return null;
    }
    if (queueInstances.has(queueName)) {
        return queueInstances.get(queueName);
    }
    return createQueue(queueName);
};

/**
 * Initialize all queue instances (for producer use). Does NOT start workers.
 * Workers run in separate processes and use workers/*.js.
 * @returns {{ initialized: boolean, queues: string[] }}
 */
export const initializeQueues = () => {
    if (!config.bullmqEnabled) {
        logger.info('BullMQ is disabled (BULLMQ_ENABLED is not true). Queues will not be initialized.');
        return { initialized: false, queues: [] };
    }

    const conn = getBullMQConnection();
    if (!conn) {
        logger.warn('BullMQ enabled but REDIS_URL missing or connection failed. Queues not initialized.');
        return { initialized: false, queues: [] };
    }

    for (const name of QUEUE_NAMES) {
        createQueue(name);
    }
    logger.info(`BullMQ queues initialized: ${QUEUE_NAMES.join(', ')}`);
    return { initialized: true, queues: [...QUEUE_NAMES] };
};

/**
 * Named queue getters for convenience.
 */
export const getOtpQueue = () => getQueue(OTP_QUEUE);
export const getNotificationQueue = () => getQueue(NOTIFICATION_QUEUE);
export const getOrderQueue = () => getQueue(ORDER_QUEUE);
export const getPaymentQueue = () => getQueue(PAYMENT_QUEUE);

export { OTP_QUEUE, NOTIFICATION_QUEUE, ORDER_QUEUE, PAYMENT_QUEUE, QUEUE_NAMES } from './queue.constants.js';
export { getBullMQConnection, closeBullMQConnection } from './connection.js';
