import { Router } from 'express';
import { operatorService } from './service';
import { OperatorValidationServiceEnhanced } from '../operatorValidation/service.enhanced';
import { OperatorValidationServiceDirectus } from '../operatorValidation/service.directus';
import {
  OperatorLoginRequest,
  ValidateTicketRequest,
  VerifyTicketRequest,
} from '../operatorValidation/types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const router = Router();

// Initialize validation service based on environment
const useDirectus = env.USE_DIRECTUS;
const validationService = useDirectus
  ? new OperatorValidationServiceDirectus()
  : new OperatorValidationServiceEnhanced();

// POST /operators/login - Operator login (existing system)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Username and password are required'
    });
  }

  try {
    const result = await operatorService.login({ username, password });

    if (!result) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed'
    });
  }
});

// ========================================
// Week 3: Ticket Validation & Verification (PRD-006)
// ========================================

/**
 * POST /operators/auth - Enhanced operator authentication with session management
 * Body: {operator_id: string, password: string, terminal_id: string, orq: number}
 */
router.post('/auth', async (req, res) => {
  try {
    const { operator_id, password, terminal_id, orq } = req.body as OperatorLoginRequest;

    if (!operator_id || !password || !terminal_id || !orq) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operator_id, password, terminal_id, orq',
      });
    }

    const result = await validationService.login({ operator_id, password, terminal_id, orq });

    if (!result.success) {
      return res.status(401).json(result);
    }

    logger.info('operator.login.api.success', { operator_id, terminal_id });
    res.status(200).json(result);
  } catch (error) {
    logger.error('operator.login.api.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process login',
    });
  }
});

/**
 * POST /operators/validate-ticket - Validate ticket via QR scan
 * Returns color-coded validation result (GREEN/YELLOW/RED)
 * Body: {ticket_code: string, operator_id: string, terminal_id: string, orq: number}
 */
router.post('/validate-ticket', async (req, res) => {
  try {
    const { ticket_code, operator_id, terminal_id, orq } = req.body as ValidateTicketRequest;

    if (!ticket_code || !operator_id || !terminal_id || !orq) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticket_code, operator_id, terminal_id, orq',
      });
    }

    const result = await validationService.validateTicket({
      ticket_code,
      operator_id,
      terminal_id,
      orq,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('operator.validate_ticket.api.success', {
      ticket_code,
      operator_id,
      color_code: result.validation_result?.color_code,
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error('operator.validate_ticket.api.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate ticket',
    });
  }
});

/**
 * POST /operators/verify-ticket - Verify ticket entry (mark as verified)
 * Body: {ticket_code: string, operator_id: string, terminal_id: string, validation_decision: 'ALLOW'|'DENY', orq: number}
 */
router.post('/verify-ticket', async (req, res) => {
  try {
    const { ticket_code, operator_id, terminal_id, validation_decision, orq } =
      req.body as VerifyTicketRequest;

    if (!ticket_code || !operator_id || !terminal_id || !validation_decision || !orq) {
      return res.status(400).json({
        success: false,
        error:
          'Missing required fields: ticket_code, operator_id, terminal_id, validation_decision, orq',
      });
    }

    if (!['ALLOW', 'DENY'].includes(validation_decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid validation_decision. Must be ALLOW or DENY',
      });
    }

    const result = await validationService.verifyTicket({
      ticket_code,
      operator_id,
      terminal_id,
      validation_decision,
      orq,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    logger.info('operator.verify_ticket.api.success', {
      ticket_code,
      operator_id,
      decision: validation_decision,
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error('operator.verify_ticket.api.error', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to verify ticket',
    });
  }
});

export default router;
