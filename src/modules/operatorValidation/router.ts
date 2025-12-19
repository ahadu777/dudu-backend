import { Router } from 'express';
import { OperatorValidationServiceEnhanced } from './service.enhanced';
import { OperatorValidationServiceDirectus } from './service.directus';
import {
  OperatorLoginRequest,
  ValidateTicketRequest,
  VerifyTicketRequest,
} from './types';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const router = Router();

// Initialize service based on environment
const useDirectus = env.USE_DIRECTUS;
const service = useDirectus
  ? new OperatorValidationServiceDirectus()
  : new OperatorValidationServiceEnhanced();

if (useDirectus) {
  logger.info('operator_validation.router.using_directus');
} else {
  logger.info('operator_validation.router.using_mock');
}

/**
 * POST /api/operator/login
 * Operator authentication
 */
router.post('/api/operator/login', async (req, res) => {
  try {
    const { operator_id, password, terminal_id, orq } = req.body as OperatorLoginRequest;

    if (!operator_id || !password || !terminal_id || !orq) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operator_id, password, terminal_id, orq',
      });
    }

    const result = await service.login({ operator_id, password, terminal_id, orq });

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
 * POST /api/operator/validate-ticket
 * Validate ticket via QR scan (returns color code)
 */
router.post('/api/operator/validate-ticket', async (req, res) => {
  try {
    const { ticket_code, operator_id, terminal_id, orq } = req.body as ValidateTicketRequest;

    if (!ticket_code || !operator_id || !terminal_id || !orq) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticket_code, operator_id, terminal_id, orq',
      });
    }

    const result = await service.validateTicket({
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
 * POST /api/operator/verify-ticket
 * Verify ticket entry (operator decision: ALLOW/DENY)
 */
router.post('/api/operator/verify-ticket', async (req, res) => {
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

    const result = await service.verifyTicket({
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
