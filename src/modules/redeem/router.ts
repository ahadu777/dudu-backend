import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { mockStore } from '../../core/mock/store';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { authenticate } from '../../middlewares/auth';

const router = Router();

// Using standard JWT authentication middleware

// POST /tickets/:code/qr-token - Generate QR token
router.post('/:code/qr-token', authenticate, async (req, res) => {
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
    const exp = now + Number(env.QR_TOKEN_TTL_SECONDS); // configurable TTL in seconds
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
      expires_in: Number(env.QR_TOKEN_TTL_SECONDS)
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
  const { qr_token, function_code, session_id, location_id } = req.body;

  if (!qr_token || !function_code || !session_id) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'qr_token, function_code, and session_id are required'
    });
  }

  try {
    logger.info('scan.attempt', { function_code, session_id, location_id });

    // 1. Verify session is valid
    if (!mockStore.isSessionValid(session_id)) {
      return res.status(401).json({
        error: 'INVALID_SESSION',
        message: 'Session expired or not found'
      });
    }

    const session = mockStore.getSession(session_id);
    if (!session) {
      return res.status(401).json({
        error: 'INVALID_SESSION',
        message: 'Session not found'
      });
    }

    // 2. Parse and verify QR token
    let tokenPayload;
    try {
      tokenPayload = jwt.verify(qr_token, env.QR_SIGNER_SECRET) as any;
    } catch (jwtError) {
      logger.info('scan.reject', { reason: 'TOKEN_EXPIRED', session_id });

      // Record rejection event
      mockStore.addRedemption({
        ticket_id: 0, // Unknown ticket
        function_code,
        operator_id: session.operator_id,
        session_id,
        location_id: location_id || null,
        jti: null,
        result: 'reject' as any,
        reason: 'TOKEN_EXPIRED',
        ts: new Date().toISOString()
      });

      return res.status(422).json({
        error: 'TOKEN_EXPIRED',
        message: 'QR code has expired'
      });
    }

    const { tid: ticketCode, jti } = tokenPayload;

    // 3. Check for replay (idempotency)
    if (jti && mockStore.hasJti(jti)) {
      return res.status(409).json({
        error: 'REPLAY',
        message: 'QR code already used'
      });
    }

    // 4. Get ticket and validate
    const ticket = mockStore.getTicket(ticketCode);
    if (!ticket) {
      logger.info('scan.reject', { reason: 'TICKET_NOT_FOUND', ticket_code: ticketCode });
      return res.status(404).json({
        error: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      });
    }

    // 5. Validate ticket status
    if (ticket.status === 'expired' || ticket.status === 'void') {
      logger.info('scan.reject', {
        reason: 'TICKET_INVALID',
        ticket_code: ticketCode,
        status: ticket.status
      });

      mockStore.addRedemption({
        ticket_id: parseInt(ticketCode.split('-')[2]) || 0,
        function_code,
        operator_id: session.operator_id,
        session_id,
        location_id: location_id || null,
        jti,
        result: 'reject' as any,
        reason: 'TICKET_INVALID',
        ts: new Date().toISOString()
      });

      return res.status(422).json({
        error: 'TICKET_INVALID',
        message: `Ticket status: ${ticket.status}`
      });
    }

    // 6. Find entitlement for the function
    const entitlement = ticket.entitlements.find(e => e.function_code === function_code);
    if (!entitlement) {
      logger.info('scan.reject', {
        reason: 'WRONG_FUNCTION',
        ticket_code: ticketCode,
        function_code,
        available_functions: ticket.entitlements.map(e => e.function_code)
      });

      mockStore.addRedemption({
        ticket_id: parseInt(ticketCode.split('-')[2]) || 0,
        function_code,
        operator_id: session.operator_id,
        session_id,
        location_id: location_id || null,
        jti,
        result: 'reject' as any,
        reason: 'WRONG_FUNCTION',
        ts: new Date().toISOString()
      });

      return res.status(422).json({
        error: 'WRONG_FUNCTION',
        message: `Function ${function_code} not available on this ticket`
      });
    }

    // 7. Check remaining uses
    if (entitlement.remaining_uses <= 0) {
      logger.info('scan.reject', {
        reason: 'NO_REMAINING',
        ticket_code: ticketCode,
        function_code,
        remaining_uses: entitlement.remaining_uses
      });

      mockStore.addRedemption({
        ticket_id: parseInt(ticketCode.split('-')[2]) || 0,
        function_code,
        operator_id: session.operator_id,
        session_id,
        location_id: location_id || null,
        jti,
        result: 'reject' as any,
        reason: 'NO_REMAINING',
        ts: new Date().toISOString()
      });

      return res.status(422).json({
        error: 'NO_REMAINING',
        message: 'No remaining uses for this function'
      });
    }

    // 8. SUCCESS: Decrement entitlement and record redemption
    const success = mockStore.decrementEntitlement(ticketCode, function_code);
    if (!success) {
      logger.error('scan.error', { ticket_code: ticketCode, function_code });
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to process redemption'
      });
    }

    // Record successful redemption
    mockStore.addRedemption({
      ticket_id: parseInt(ticketCode.split('-')[2]) || 0,
      function_code,
      operator_id: session.operator_id,
      session_id,
      location_id: location_id || null,
      jti,
      result: 'success' as any,
      reason: null,
      ts: new Date().toISOString()
    });

    // Get updated ticket info
    const updatedTicket = mockStore.getTicket(ticketCode);

    logger.info('scan.success', {
      ticket_code: ticketCode,
      function_code,
      new_status: updatedTicket?.status,
      remaining_uses: entitlement.remaining_uses - 1
    });

    res.json({
      result: 'success',
      ticket_status: updatedTicket?.status || 'unknown',
      entitlements: updatedTicket?.entitlements || [],
      ts: new Date().toISOString()
    });

  } catch (error) {
    logger.error('scan.error', {
      function_code,
      session_id,
      error: (error as Error).message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Scan failed'
    });
  }
});

export default router;
