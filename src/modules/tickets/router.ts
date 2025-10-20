import { Router } from 'express';
import { mockStore } from '../../core/mock/store.js';
import { logger } from '../../utils/logger.js';
import { Ticket } from '../../types/domain.js';

const router = Router();

// Simple auth middleware (mock for prototype)
const mockAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Bearer token required'
    });
  }

  // Mock: extract user_id from token (in production, decode JWT)
  const token = authHeader.split(' ')[1];
  if (token === 'user123') {
    req.user = { user_id: 123 };
  } else if (token === 'user456') {
    req.user = { user_id: 456 };
  } else {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    });
  }

  next();
};

// Simple metrics
const metrics = {
  increment: (metric: string) => {
    logger.info('metric.increment', { metric });
  }
};

// GET /my/tickets - List user's tickets with entitlements
router.get('/tickets', mockAuth, (req: any, res) => {
  const startTime = Date.now();
  const userId = req.user.user_id;

  try {
    // Get tickets for authenticated user from mock store
    const userTickets = mockStore.getTicketsByUserId(userId);

    // Sort by ticket_code DESC for stable ordering
    const sortedTickets = userTickets.sort((a, b) =>
      b.ticket_code.localeCompare(a.ticket_code)
    );

    logger.info('tickets.list', {
      user_id: userId,
      count: sortedTickets.length
    });
    metrics.increment('tickets.list.count');

    // Return tickets using domain.ts Ticket type
    res.json({
      tickets: sortedTickets
    });

  } catch (error) {
    logger.error('tickets.list.error', {
      user_id: userId,
      error: String(error)
    });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch tickets'
    });
  }
});

export default router;