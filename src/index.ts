import App from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // Create app instance
    const appInstance = new App();

    // Initialize database (skip if connection fails for testing)
    try {
      await appInstance.initializeDatabase();
    } catch (dbError) {
      logger.warn('⚠️ Database connection failed, running without database');
    }

    // Start server
    const server = appInstance.app.listen(env.PORT || 8080, () => {
      logger.info(`🚀 Server running on port ${env.PORT || 8080}`);
      logger.info(`📚 Swagger docs available at http://localhost:${env.PORT || 8080}/docs`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Closing server gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

