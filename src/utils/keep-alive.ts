import axios from 'axios';
import { logger } from './logger';

const KEEP_ALIVE_URL = 'https://dudu-backend-rbi3.onrender.com/';
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Keep-alive service to prevent Render from sleeping
 * Pings the specified URL every 10 minutes
 */
export class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the keep-alive service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Keep-alive service is already running');
      return;
    }

    logger.info(`🔄 Starting keep-alive service: pinging ${KEEP_ALIVE_URL} every 10 minutes`);
    
    // Make initial ping immediately
    this.ping();

    // Set up interval for subsequent pings
    this.intervalId = setInterval(() => {
      this.ping();
    }, INTERVAL_MS);

    this.isRunning = true;
  }

  /**
   * Stop the keep-alive service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      logger.info('🛑 Keep-alive service stopped');
    }
  }

  /**
   * Ping the keep-alive URL
   */
  private async ping(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await axios.get(KEEP_ALIVE_URL, {
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500, // Accept any status < 500 as success
      });
      const duration = Date.now() - startTime;
      
      logger.info(`✅ Keep-alive ping successful: ${response.status} (${duration}ms)`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.warn(`⚠️ Keep-alive ping failed: ${error.message}`);
      } else {
        logger.warn(`⚠️ Keep-alive ping failed: ${error}`);
      }
    }
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();

