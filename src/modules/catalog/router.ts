import { Router } from 'express';
import { mockStore } from '../../core/mock/store.js';
import { logger } from '../../utils/logger.js';
import { CatalogResponse } from '../../types/domain.js';

const router = Router();

// Simple metrics (until we have a proper metrics service)
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  },
  recordLatency: (metric: string, ms: number) => {
    logger.info('metric.latency', { metric, latency_ms: ms });
  }
};

// GET /catalog - Get product catalog
router.get('/', (_req, res) => {
  const startTime = Date.now();

  try {
    // Get active products from unified store
    const products = mockStore.getProducts();

    // Transform to match CatalogResponse type
    const response: CatalogResponse = {
      products: products
        .sort((a, b) => a.id - b.id) // Stable sort by id ASC
    };

    // Log catalog.list with count
    logger.info('catalog.list', { count: response.products.length });

    // Record metrics
    metrics.increment('catalog.list.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('catalog.list.latency_ms', latency);

    // Return response matching OAS contract
    res.status(200).json(response);

  } catch (error) {
    logger.error('catalog.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch catalog'
    });
  }
});

export default router;