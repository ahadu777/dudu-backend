import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { mockStore } from '../../core/mock/store';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ValidatorSession } from '../../types/domain';
import { authenticateOperator } from '../../middlewares/auth';

const router = Router();

// POST /operators/login - Operator login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Username and password are required'
    });
  }

  try {
    logger.info('operators.login.attempt', { username });

    // 1. Lookup operator by username
    const operator = mockStore.getOperator(username);
    if (!operator) {
      logger.info('operators.login.fail', { username, reason: 'user_not_found' });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, operator.password_hash);
    if (!isPasswordValid) {
      logger.info('operators.login.fail', { username, reason: 'invalid_password' });
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
    }

    // 3. Issue JWT token
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (24 * 60 * 60); // 24 hours

    const payload = {
      sub: operator.operator_id,
      username: operator.username,
      roles: operator.roles,
      iat: now,
      exp
    };

    const operatorToken = jwt.sign(payload, env.JWT_SECRET, {
      algorithm: 'HS256'
    });

    logger.info('operators.login.success', {
      operator_id: operator.operator_id,
      username: operator.username,
      roles: operator.roles
    });

    res.json({
      operator_token: operatorToken
    });

  } catch (error) {
    logger.error('operators.login.error', {
      username,
      error: (error as Error).message
    });
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed'
    });
  }
});

// POST /validators/sessions - Create validator session
router.post('/sessions', authenticateOperator, (req, res) => {
  const { device_id, location_id } = req.body;

  if (!device_id) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'device_id is required'
    });
  }

  try {
    const operator = req.operator!; // Guaranteed by authenticateOperator middleware

    logger.info('validators.session.create.attempt', {
      operator_id: operator.operator_id,
      device_id,
      location_id
    });

    // Create session
    const sessionId = `sess-${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 8 hours

    const session: ValidatorSession = {
      session_id: sessionId,
      operator_id: operator.operator_id,
      device_id,
      location_id: location_id || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    mockStore.createSession(session);

    logger.info('validators.session.created', {
      session_id: sessionId,
      operator_id: operator.operator_id,
      expires_in: 28800
    });

    res.json({
      session_id: sessionId,
      expires_in: 28800 // 8 hours in seconds
    });

  } catch (error) {
    logger.error('validators.session.error', {
      error: (error as Error).message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Session creation failed'
    });
  }
});

export default router;