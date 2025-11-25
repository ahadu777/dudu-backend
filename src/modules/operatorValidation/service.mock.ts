import {
  OperatorLoginRequest,
  OperatorLoginResponse,
  ValidateTicketRequest,
  ValidateTicketResponse,
  VerifyTicketRequest,
  VerifyTicketResponse,
  OperatorSession,
  ValidationLog,
} from './types';
import { CustomerReservationServiceMock } from '../customerReservation/service.mock';
import { logger } from '../../utils/logger';
import { randomBytes } from 'crypto';

interface MockOperator {
  operator_id: string;
  operator_name: string;
  password: string;
  orq: number;
  active: boolean;
}

export class OperatorValidationServiceMock {
  private operators: Map<string, MockOperator> = new Map();
  private sessions: Map<string, OperatorSession> = new Map();
  private validationLogs: ValidationLog[] = [];
  private nextLogId = 1;
  private customerService: CustomerReservationServiceMock;

  constructor() {
    this.customerService = new CustomerReservationServiceMock();
    this.seedMockOperators();
  }

  /**
   * Seed mock operators
   */
  private seedMockOperators() {
    const mockOperators: MockOperator[] = [
      {
        operator_id: 'OP-001',
        operator_name: 'Zhang Wei',
        password: 'password123', // In production, this would be hashed
        orq: 1,
        active: true,
      },
      {
        operator_id: 'OP-002',
        operator_name: 'Li Ming',
        password: 'password123',
        orq: 1,
        active: true,
      },
      {
        operator_id: 'OP-003',
        operator_name: 'Wang Fang',
        password: 'password123',
        orq: 1,
        active: true,
      },
    ];

    mockOperators.forEach(op => {
      this.operators.set(op.operator_id, op);
    });

    logger.info('operator_validation.operators.seeded', { count: this.operators.size });
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Operator login
   */
  async login(request: OperatorLoginRequest): Promise<OperatorLoginResponse> {
    const { operator_id, password, terminal_id, orq } = request;

    const operator = this.operators.get(operator_id);

    if (!operator) {
      return {
        success: false,
        error: 'Invalid operator credentials',
      };
    }

    if (operator.password !== password) {
      return {
        success: false,
        error: 'Invalid operator credentials',
      };
    }

    if (operator.orq !== orq) {
      return {
        success: false,
        error: 'Operator does not belong to this organization',
      };
    }

    if (!operator.active) {
      return {
        success: false,
        error: 'Operator account is inactive',
      };
    }

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const session: OperatorSession = {
      operator_id,
      operator_name: operator.operator_name,
      terminal_id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      orq,
      created_at: new Date().toISOString(),
    };

    this.sessions.set(sessionToken, session);

    logger.info('operator.login.success', { operator_id, terminal_id });

    return {
      success: true,
      data: {
        operator_id: session.operator_id,
        operator_name: session.operator_name,
        terminal_id: session.terminal_id,
        session_token: session.session_token,
        expires_at: session.expires_at,
      },
    };
  }

  /**
   * Validate ticket (QR scan)
   */
  async validateTicket(request: ValidateTicketRequest): Promise<ValidateTicketResponse> {
    const { ticket_code, operator_id, terminal_id, orq } = request;

    try {
      // Get ticket validation info
      const ticketValidation = await this.customerService.validateTicket({ ticket_code, orq });

      if (!ticketValidation.valid || !ticketValidation.ticket) {
        // RED: Invalid ticket
        this.logValidation(ticket_code, operator_id, terminal_id, 'RED', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'INVALID',
            color_code: 'RED',
            message: ticketValidation.error || 'Invalid ticket',
            details: {
              visitor_name: 'N/A',
              slot_date: 'N/A',
              slot_time: 'N/A',
              product_name: 'N/A',
            },
            allow_entry: false,
          },
        };
      }

      const ticket = ticketValidation.ticket;

      // Check if ticket has reservation
      const reservation = await this.customerService.getReservationByTicket(ticket_code);

      if (!reservation) {
        // YELLOW: Valid ticket but no reservation
        this.logValidation(ticket_code, operator_id, terminal_id, 'YELLOW', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'RESERVED',
            color_code: 'YELLOW',
            message: 'Warning: No reservation found for this ticket',
            details: {
              visitor_name: 'N/A',
              slot_date: 'N/A',
              slot_time: 'N/A',
              product_name: ticket.product_name,
            },
            allow_entry: false, // Requires manual decision
          },
        };
      }

      // Check reservation status
      if (reservation.status === 'VERIFIED') {
        // YELLOW: Already verified (duplicate scan)
        this.logValidation(ticket_code, operator_id, terminal_id, 'YELLOW', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'VERIFIED',
            color_code: 'YELLOW',
            message: 'Warning: Ticket already verified',
            details: {
              visitor_name: reservation.visitor_name,
              slot_date: 'N/A', // Would need to join with slots
              slot_time: 'N/A',
              product_name: ticket.product_name,
            },
            allow_entry: false, // Already used
          },
        };
      }

      // GREEN: Valid reservation
      this.logValidation(ticket_code, operator_id, terminal_id, 'GREEN', orq);

      return {
        success: true,
        validation_result: {
          ticket_code,
          status: 'RESERVED',
          color_code: 'GREEN',
          message: 'Valid reservation - Allow entry',
          details: {
            visitor_name: reservation.visitor_name,
            slot_date: 'N/A', // Would need slot service integration
            slot_time: 'N/A',
            product_name: ticket.product_name,
          },
          allow_entry: true,
        },
      };
    } catch (error) {
      logger.error('operator.validate_ticket.error', { error, ticket_code });
      return {
        success: false,
        error: 'Failed to validate ticket',
      };
    }
  }

  /**
   * Verify ticket (operator decision)
   */
  async verifyTicket(request: VerifyTicketRequest): Promise<VerifyTicketResponse> {
    const { ticket_code, operator_id, terminal_id, validation_decision, orq } = request;

    try {
      if (validation_decision === 'DENY') {
        logger.info('operator.verify_ticket.denied', { ticket_code, operator_id });

        return {
          success: true,
          data: {
            ticket_code,
            verification_status: 'DENIED',
            verified_at: new Date().toISOString(),
            operator_id,
            terminal_id,
          },
        };
      }

      // ALLOW decision - mark ticket as VERIFIED
      const reservation = await this.customerService.getReservationByTicket(ticket_code);

      if (!reservation) {
        return {
          success: false,
          error: 'No reservation found for this ticket',
        };
      }

      // Update reservation status to VERIFIED (in real DB this would be a transaction)
      reservation.status = 'VERIFIED';
      reservation.verified_at = new Date().toISOString();
      reservation.updated_at = new Date().toISOString();

      logger.info('operator.verify_ticket.success', {
        ticket_code,
        operator_id,
        terminal_id,
        reservation_id: reservation.id,
      });

      return {
        success: true,
        data: {
          ticket_code,
          verification_status: 'VERIFIED',
          verified_at: reservation.verified_at,
          operator_id,
          terminal_id,
        },
      };
    } catch (error) {
      logger.error('operator.verify_ticket.error', { error, ticket_code });
      return {
        success: false,
        error: 'Failed to verify ticket',
      };
    }
  }

  /**
   * Log validation event
   */
  private logValidation(
    ticketNumber: string,
    operatorId: string,
    terminalId: string,
    result: 'GREEN' | 'YELLOW' | 'RED',
    orq: number
  ): void {
    const log: ValidationLog = {
      id: this.nextLogId++,
      ticket_code: ticketNumber,
      operator_id: operatorId,
      terminal_id: terminalId,
      validation_result: result,
      decision: null,
      validated_at: new Date().toISOString(),
      verified_at: null,
      orq,
    };

    this.validationLogs.push(log);
  }
}
