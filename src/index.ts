import App from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // Create app instance
    const appInstance = new App();

    // Initialize database
    await appInstance.initializeDatabase();

    // Start server
    const server = appInstance.app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📚 Swagger docs available at http://localhost:${env.PORT}/api-docs`);
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

