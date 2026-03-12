import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';

const startServer = async () => {
    try {
        // Connect to Database
        await connectDB();

        const server = app.listen(config.port, () => {
            console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.log(`Error: ${err.message}`);
            server.close(() => process.exit(1));
        });

    } catch (error) {
        console.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
