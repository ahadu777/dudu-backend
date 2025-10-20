import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { mockStore } from '../../core/mock/store.js';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const router = Router();

// Simple auth middleware (mock for prototype) - matching tickets router pattern
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
    req.user = { id: 123, user_id: 123 };
  } else if (token === 'user456') {
    req.user = { id: 456, user_id: 456 };
  } else {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    });
  }
  next();
};

// POST /tickets/:code/qr-token - Generate QR token
router.post('/:code/qr-token', mockAuth, async (req, res) => {
  const { code } = req.params;
  const userId = req.user!.id;

  try {
    logger.info('qr.issue.started', { ticket_code: code, user_id: userId });

    // 1. Get ticket by code from mockStore
    const tickets = mockStore.getTicketsByUserId(userId);
    const ticket = tickets.find(t => t.ticket_code === code);
    if (!ticket) {
      return res.status(404).json({
        error: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      });
    }

    // 2. Verify ownership
    if (ticket.user_id !== userId) {
      return res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'Ticket does not belong to user'
      });
    }

    // 3. Verify ticket status (using enum values)
    if (ticket.status === 'expired' || ticket.status === 'void') {
      return res.status(422).json({
        error: 'TICKET_INVALID',
        message: `Ticket status: ${ticket.status}`
      });
    }

    // 4. Generate JWT payload
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60; // 60 seconds TTL
    const jti = crypto.randomUUID(); // unique nonce
    const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);

    const payload = {
      tid: ticket.ticket_code, // Use ticket_code as identifier
      code_hash: codeHash,
      exp,
      jti,
      iat: now
    };

    // 5. Sign token
    const token = jwt.sign(payload, String(env.QR_SIGNER_SECRET), {
      algorithm: 'HS256'
    });

    logger.info('qr.issue.success', { ticket_code: ticket.ticket_code, jti });

    res.json({
      token,
      expires_in: 60
    });

  } catch (error) {
    logger.info('qr.issue.error', { ticket_code: code, error: (error as Error).message });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate QR token'
    });
  }
});

// POST /tickets/scan - Scan and redeem ticket
router.post('/scan', (req, res) => {
  // TODO: Team C - Implement ticket scanning
  // Mock implementation for integration proof
  const { function_code } = req.body;

  // Simulate entitlements with remaining uses
  const mockEntitlements = [
    { function_code: 'ferry', remaining_uses: function_code === 'ferry' ? 0 : 1 },
    { function_code: 'bus', remaining_uses: 2 },
    { function_code: 'mrt', remaining_uses: 1 }
  ];

  res.json({
    result: 'success',
    ticket_status: 'active',
    entitlements: mockEntitlements,
    ts: new Date().toISOString()
  });
});

export default router;