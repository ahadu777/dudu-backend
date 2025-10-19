import { Router } from 'express';
import { mockDataStore } from '../../core/mock/data';

const router = Router();

// Simple logging for observability
const logger = {
  info: (event: string, data?: any) => {
    console.log(JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }
};

// Metrics tracking (mock implementation)
const metrics = {
  increment: (metric: string) => {
    // In production, this would send to metrics service
    console.log(`[METRIC] ${metric} +1`);
  },
  recordLatency: (metric: string, ms: number) => {
    console.log(`[METRIC] ${metric} = ${ms}ms`);
  }
};

// GET /catalog - Get product catalog
router.get('/', (_req, res) => {
  const startTime = Date.now();

  try {
    // Query active products (mock DB query)
    const products = mockDataStore.getActiveProducts();

    // Transform to match card requirements
    // Group by product and build functions array
    const catalog = products
      .sort((a, b) => a.id - b.id) // Stable sort by id ASC
      .map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        status: 'active', // Only active products returned
        sale_start_at: new Date(Date.now() - 86400000).toISOString(), // Mock: started yesterday
        sale_end_at: new Date(Date.now() + 86400000 * 30).toISOString(), // Mock: ends in 30 days
        functions: product.functions.map(f => ({
          function_code: f.function_code,
          label: f.function_name,
          quantity: f.max_uses === -1 ? 999 : f.max_uses // -1 means unlimited
        }))
      }));

    // Log catalog.list with count
    logger.info('catalog.list', { count: catalog.length });

    // Record metrics
    metrics.increment('catalog.list.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('catalog.list.latency_ms', latency);

    // Return response matching OAS contract
    res.status(200).json({
      products: catalog
    });

  } catch (error) {
    logger.info('catalog.error', { error: String(error) });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch catalog'
    });
  }
});

export default router;