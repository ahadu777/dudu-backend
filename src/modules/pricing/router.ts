import { Router } from 'express';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import {
  PricingCalculationRequest,
  PricingCalculationResponse,
  PricingStructure
} from '../../types/domain';

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

// POST /pricing/calculate - Calculate total price for complex booking
router.post('/calculate', (req, res) => {
  const startTime = Date.now();

  try {
    const request: PricingCalculationRequest = req.body;

    // Validate required fields
    if (!request.product_id) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'product_id is required'
      });
    }

    if (!request.booking_dates || !Array.isArray(request.booking_dates) || request.booking_dates.length === 0) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'booking_dates must be a non-empty array'
      });
    }

    if (!request.customer_breakdown || !Array.isArray(request.customer_breakdown) || request.customer_breakdown.length === 0) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'customer_breakdown must be a non-empty array'
      });
    }

    // Validate booking dates are valid future dates
    const now = new Date();
    for (const dateStr of request.booking_dates) {
      const bookingDate = new Date(dateStr);
      if (isNaN(bookingDate.getTime())) {
        return res.status(422).json({
          code: 'INVALID_DATE',
          message: `Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`
        });
      }
      // Note: Not enforcing future dates for testing flexibility
    }

    // Validate customer breakdown
    for (const customer of request.customer_breakdown) {
      if (!['adult', 'child', 'elderly'].includes(customer.customer_type)) {
        return res.status(422).json({
          code: 'INVALID_CUSTOMER_TYPE',
          message: `Invalid customer_type: ${customer.customer_type}. Must be 'adult', 'child', or 'elderly'.`
        });
      }
      if (!Number.isInteger(customer.count) || customer.count < 1) {
        return res.status(422).json({
          code: 'INVALID_COUNT',
          message: `Invalid count for ${customer.customer_type}: must be a positive integer`
        });
      }
    }

    // Check if product has complex pricing
    const pricingStructure = mockStore.getComplexPricingStructure(request.product_id);
    if (!pricingStructure) {
      logger.info('pricing.calculation.product_not_found', { product_id: request.product_id });
      return res.status(404).json({
        code: 'PRODUCT_NOT_FOUND',
        message: `Complex pricing not available for product ${request.product_id}`
      });
    }

    // Calculate pricing
    const response: PricingCalculationResponse = mockStore.calculateComplexPricing(request);

    // Log calculation
    const customerCount = request.customer_breakdown.reduce((sum, cb) => sum + cb.count, 0);
    const addonCount = request.addons ? request.addons.length : 0;
    logger.info('pricing.calculation.completed', {
      product_id: request.product_id,
      customer_count: customerCount,
      addon_count: addonCount,
      final_total: response.final_total,
      calculation_time_ms: Date.now() - startTime
    });

    // Record metrics
    metrics.increment('pricing.calculations.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('pricing.calculations.avg_time_ms', latency);

    res.status(200).json(response);

  } catch (error) {
    logger.error('pricing.calculation.error', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate pricing'
    });
  }
});

// GET /pricing/rules/:product_id - Get pricing rules for product
router.get('/rules/:product_id', (req, res) => {
  const startTime = Date.now();

  try {
    const productId = parseInt(req.params.product_id);

    if (isNaN(productId)) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID must be a valid number'
      });
    }

    // Get pricing structure
    const pricingStructure = mockStore.getComplexPricingStructure(productId);
    if (!pricingStructure) {
      logger.info('pricing.rules.not_found', { product_id: productId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Pricing rules not found for product ${productId}`
      });
    }

    // Transform to response format
    const response = {
      base_prices: {
        adult: pricingStructure.base_price,
        // Extract customer type prices from rules
        child: pricingStructure.pricing_rules
          .find(r => r.rule_type === 'customer_type' && r.conditions.customer_types?.includes('child'))
          ?.price_modifier.value || pricingStructure.base_price,
        elderly: pricingStructure.pricing_rules
          .find(r => r.rule_type === 'customer_type' && r.conditions.customer_types?.includes('elderly'))
          ?.price_modifier.value || pricingStructure.base_price
      },
      time_rules: pricingStructure.pricing_rules.filter(r => r.rule_type === 'time_based'),
      customer_rules: pricingStructure.pricing_rules.filter(r => r.rule_type === 'customer_type'),
      special_dates: pricingStructure.pricing_rules
        .filter(r => r.rule_type === 'special_date')
        .flatMap(r => r.conditions.special_dates || []),
      package_tiers: pricingStructure.package_tiers || [],
      available_addons: pricingStructure.addon_products || []
    };

    // Log rules loaded
    logger.info('pricing.rules.loaded', {
      product_id: productId,
      rules_count: pricingStructure.pricing_rules.length,
      package_tiers_count: pricingStructure.package_tiers?.length || 0,
      addons_count: pricingStructure.addon_products?.length || 0
    });

    // Record metrics
    metrics.increment('pricing.rules.loaded.count');
    const latency = Date.now() - startTime;
    metrics.recordLatency('pricing.rules.loaded.latency_ms', latency);

    res.status(200).json(response);

  } catch (error) {
    logger.error('pricing.rules.error', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch pricing rules'
    });
  }
});

export default router;

