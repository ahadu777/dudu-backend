import { Request, Response } from 'express';
import { OperatorValidationServiceMock } from './service.mock';
import {
  OperatorLoginRequest,
  ValidateTicketRequest,
  VerifyTicketRequest,
} from './types';
import { logger } from '../../utils/logger';

export class OperatorValidationController {
  private service: OperatorValidationServiceMock;

  constructor() {
    this.service = new OperatorValidationServiceMock();
  }

  /**
   * POST /api/operator/login
   * Operator authentication
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { operator_id, password, terminal_id, orq } = req.body as OperatorLoginRequest;

      if (!operator_id || !password || !terminal_id || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: operator_id, password, terminal_id, orq',
        });
        return;
      }

      const result = await this.service.login({ operator_id, password, terminal_id, orq });

      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('operator.login.api.success', { operator_id, terminal_id });
    } catch (error) {
      logger.error('operator.login.api.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process login',
      });
    }
  }

  /**
   * POST /api/operator/validate-ticket
   * Validate ticket via QR scan
   */
  async validateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_number, operator_id, terminal_id, orq } = req.body as ValidateTicketRequest;

      if (!ticket_number || !operator_id || !terminal_id || !orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: ticket_number, operator_id, terminal_id, orq',
        });
        return;
      }

      const result = await this.service.validateTicket({
        ticket_number,
        operator_id,
        terminal_id,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('operator.validate_ticket.api.success', {
        ticket_number,
        operator_id,
        color_code: result.validation_result?.color_code,
      });
    } catch (error) {
      logger.error('operator.validate_ticket.api.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to validate ticket',
      });
    }
  }

  /**
   * POST /api/operator/verify-ticket
   * Verify ticket entry (operator decision)
   */
  async verifyTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticket_number, operator_id, terminal_id, validation_decision, orq } =
        req.body as VerifyTicketRequest;

      if (!ticket_number || !operator_id || !terminal_id || !validation_decision || !orq) {
        res.status(400).json({
          success: false,
          error:
            'Missing required fields: ticket_number, operator_id, terminal_id, validation_decision, orq',
        });
        return;
      }

      if (!['ALLOW', 'DENY'].includes(validation_decision)) {
        res.status(400).json({
          success: false,
          error: 'Invalid validation_decision. Must be ALLOW or DENY',
        });
        return;
      }

      const result = await this.service.verifyTicket({
        ticket_number,
        operator_id,
        terminal_id,
        validation_decision,
        orq,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);

      logger.info('operator.verify_ticket.api.success', {
        ticket_number,
        operator_id,
        decision: validation_decision,
      });
    } catch (error) {
      logger.error('operator.verify_ticket.api.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify ticket',
      });
    }
  }
}
