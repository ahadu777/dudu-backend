import { readFileSync } from 'fs';
import { join } from 'path';
import { mockStore } from './store';
import { logger } from '../../utils/logger';

/**
 * Load seed data from JSON files in /docs
 */
export function seedFromFiles(): void {
  try {
    // Load products from docs/products.json
    const productsPath = join(process.cwd(), 'docs', 'products.json');
    try {
      const productsData = JSON.parse(readFileSync(productsPath, 'utf-8'));
      if (productsData.products) {
        logger.info('mock.seed.loading', {
          file: 'products.json',
          count: productsData.products.length
        });
        // Products are already seeded in store constructor
        // This is here for future dynamic loading
      }
    } catch (err) {
      logger.debug('mock.seed.skip', { file: 'products.json', reason: 'File not found or invalid' });
    }

    // Load orders from docs/orders.json if exists
    const ordersPath = join(process.cwd(), 'docs', 'orders.json');
    try {
      const ordersData = JSON.parse(readFileSync(ordersPath, 'utf-8'));
      if (ordersData.orders && Array.isArray(ordersData.orders)) {
        logger.info('mock.seed.loading', {
          file: 'orders.json',
          count: ordersData.orders.length
        });
        // Process orders if needed
      }
    } catch (err) {
      logger.debug('mock.seed.skip', { file: 'orders.json', reason: 'File not found or empty' });
    }

    // Load tickets from docs/tickets.json if exists
    const ticketsPath = join(process.cwd(), 'docs', 'tickets.json');
    try {
      const ticketsData = JSON.parse(readFileSync(ticketsPath, 'utf-8'));
      if (ticketsData.tickets && Array.isArray(ticketsData.tickets)) {
        logger.info('mock.seed.loading', {
          file: 'tickets.json',
          count: ticketsData.tickets.length
        });
        // Process tickets if needed
      }
    } catch (err) {
      logger.debug('mock.seed.skip', { file: 'tickets.json', reason: 'File not found or empty' });
    }

    logger.info('mock.seed.complete', mockStore.getStats());
  } catch (error) {
    logger.error('mock.seed.error', { error });
  }
}

// Auto-seed on import in development
if (process.env.NODE_ENV !== 'production') {
  seedFromFiles();
}