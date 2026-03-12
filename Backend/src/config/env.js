import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    mongodbUri: process.env.MONGODB_URI,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development'
};
