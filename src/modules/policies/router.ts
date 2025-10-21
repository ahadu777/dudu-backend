import { Router } from 'express';
import { logger } from '../../utils/logger';
import { CancellationPoliciesResponse, CancellationPolicy, CancellationPolicyExample } from '../../types/domain';

const router = Router();

// Simple metrics
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  }
};

// GET /cancellation-policies - Get cancellation policies and refund rules
router.get('/cancellation-policies', (req, res) => {
  try {
    // Business rules configuration (in production, this could come from database)
    const policies: CancellationPolicy[] = [
      {
        rule_type: 'redemption_based',
        description: 'Refund percentage based on ticket usage',
        refund_percentage: 1.0, // This is the base, actual percentage varies by usage
        conditions: {
          unused: { percentage: 1.0, description: '100% refund for unused tickets' },
          partial_use_low: { percentage: 0.5, usage_threshold: 0.5, description: '50% refund if ≤50% used' },
          partial_use_high: { percentage: 0.25, usage_threshold: 1.0, description: '25% refund if 51-99% used' },
          fully_used: { percentage: 0.0, description: 'No refund for fully used tickets' }
        }
      },
      {
        rule_type: 'time_based',
        description: 'Future enhancement: Time-based cancellation rules',
        refund_percentage: 0.0,
        conditions: {
          note: 'Currently not implemented. Future: 24h rule, advance notice requirements'
        }
      },
      {
        rule_type: 'product_based',
        description: 'Future enhancement: Product-specific cancellation rules',
        refund_percentage: 0.0,
        conditions: {
          note: 'Currently not implemented. Future: Special event tickets, season passes with different rules'
        }
      }
    ];

    const examples: CancellationPolicyExample[] = [
      {
        scenario: 'Unused 3-in-1 Transport Pass',
        ticket_status: 'active',
        redemptions_used: 0,
        total_redemptions: 4,
        refund_percentage: 1.0,
        explanation: 'Full refund available - no functions have been redeemed'
      },
      {
        scenario: 'Partially used All Day Pass',
        ticket_status: 'partially_redeemed',
        redemptions_used: 500,
        total_redemptions: 1998,
        refund_percentage: 0.5,
        explanation: '50% refund - less than half of unlimited functions used'
      },
      {
        scenario: 'Mostly used Museum Ticket',
        ticket_status: 'partially_redeemed',
        redemptions_used: 0,
        total_redemptions: 1,
        refund_percentage: 0.5,
        explanation: '50% refund - only one redemption available, none used'
      },
      {
        scenario: 'Fully redeemed ticket',
        ticket_status: 'redeemed',
        redemptions_used: 4,
        total_redemptions: 4,
        refund_percentage: 0.0,
        explanation: 'No refund - all available functions have been used'
      },
      {
        scenario: 'Expired ticket',
        ticket_status: 'expired',
        redemptions_used: 0,
        total_redemptions: 4,
        refund_percentage: 0.0,
        explanation: 'No refund - ticket has passed expiration date'
      }
    ];

    const response: CancellationPoliciesResponse = {
      policies,
      examples
    };

    logger.info('policies.requested', {
      user_agent: req.headers['user-agent'],
      ip: req.ip
    });
    metrics.increment('policies.requests.count');

    res.json(response);

  } catch (error) {
    logger.error('policies.error', {
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch cancellation policies'
    });
  }
});

export default router;