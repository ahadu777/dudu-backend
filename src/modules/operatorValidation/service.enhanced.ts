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
import { CustomerReservationServiceEnhanced } from '../customerReservation/service.enhanced';
import { ReservationSlotServiceMock } from '../reservation-slots/service.mock';
import { logger } from '../../utils/logger';
import { randomBytes } from 'crypto';

interface MockOperator {
  operator_id: string;
  operator_name: string;
  password: string;
  orq: number;
  active: boolean;
}

export class OperatorValidationServiceEnhanced {
  private operators: Map<string, MockOperator> = new Map();
  private sessions: Map<string, OperatorSession> = new Map();
  private validationLogs: ValidationLog[] = [];
  private nextLogId = 1;
  private customerService: CustomerReservationServiceEnhanced;
  private slotsService: ReservationSlotServiceMock;

  constructor() {
    this.customerService = new CustomerReservationServiceEnhanced();
    this.slotsService = new ReservationSlotServiceMock();
    this.seedMockOperators();
  }

  /**
   * Seed mock operators for testing
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

    logger.info('operator_validation_enhanced.operators.seeded', { count: this.operators.size });
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if date is today
   */
  private isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
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
   * Validate ticket (QR scan) - Enhanced with Week 2 integration
   *
   * Test Scenarios Covered:
   * - OV-G01: GREEN - Valid reservation for today
   * - OV-Y01: YELLOW - No reservation
   * - OV-Y02: YELLOW - Already verified
   * - OV-R01: RED - Wrong date
   * - OV-R02: RED - Ticket not found
   * - OV-R03: RED - Ticket not activated
   * - OV-R04: RED - Ticket expired
   */
  async validateTicket(request: ValidateTicketRequest): Promise<ValidateTicketResponse> {
    const { ticket_code, operator_id, terminal_id, orq } = request;

    try {
      // Validate ticket with activation check
      const ticketValidation = await this.customerService.validateTicket({ ticket_code, orq });

      if (!ticketValidation.valid || !ticketValidation.ticket) {
        // RED: Invalid ticket (covers OV-R02, OV-R03, OV-R04)
        const errorCode = ticketValidation.error || 'TICKET_NOT_FOUND';
        this.logValidation(ticket_code, operator_id, terminal_id, 'RED', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'INVALID',
            color_code: 'RED',
            message: this.getErrorMessage(errorCode),
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
      const reservation = await this.customerService.getReservation(ticket_code);

      if (!reservation) {
        // YELLOW: Valid ticket but no reservation (OV-Y01)
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

      // Get slot details for date/time validation
      const slot = await this.slotsService.getSlotById(reservation.slot_id.toString());

      if (!slot) {
        this.logValidation(ticket_code, operator_id, terminal_id, 'RED', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'INVALID',
            color_code: 'RED',
            message: 'Error: Reservation slot not found',
            details: {
              visitor_name: reservation.visitor_name,
              slot_date: 'N/A',
              slot_time: 'N/A',
              product_name: ticket.product_name,
            },
            allow_entry: false,
          },
        };
      }

      // Check if already verified (OV-Y02)
      if (reservation.status === 'VERIFIED') {
        this.logValidation(ticket_code, operator_id, terminal_id, 'YELLOW', orq);

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'VERIFIED',
            color_code: 'YELLOW',
            message: `Warning: Ticket already verified at ${reservation.verified_at}`,
            details: {
              visitor_name: reservation.visitor_name,
              slot_date: slot.date,
              slot_time: `${slot.start_time} - ${slot.end_time}`,
              product_name: ticket.product_name,
            },
            allow_entry: false, // Already used - idempotent behavior
          },
        };
      }

      // Check if reservation is for today (OV-R01)
      if (!this.isToday(slot.date)) {
        this.logValidation(ticket_code, operator_id, terminal_id, 'RED', orq);

        const today = new Date().toISOString().split('T')[0];

        return {
          success: true,
          validation_result: {
            ticket_code,
            status: 'RESERVED',
            color_code: 'RED',
            message: `Wrong date: Reserved for ${slot.date}, today is ${today}`,
            details: {
              visitor_name: reservation.visitor_name,
              slot_date: slot.date,
              slot_time: `${slot.start_time} - ${slot.end_time}`,
              product_name: ticket.product_name,
            },
            allow_entry: false,
          },
        };
      }

      // GREEN: Valid reservation for today (OV-G01)
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
            slot_date: slot.date,
            slot_time: `${slot.start_time} - ${slot.end_time}`,
            product_name: ticket.product_name,
          },
          allow_entry: true,
        },
      };
    } catch (error: any) {
      logger.error('operator.validate_ticket.error', { error: error.message, ticket_code });
      return {
        success: false,
        error: 'Failed to validate ticket',
      };
    }
  }

  /**
   * Verify ticket (operator decision to allow entry)
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
      const reservation = await this.customerService.getReservation(ticket_code);

      if (!reservation) {
        return {
          success: false,
          error: 'No reservation found for this ticket',
        };
      }

      // Check if already verified (idempotent behavior)
      if (reservation.status === 'VERIFIED') {
        return {
          success: true,
          data: {
            ticket_code,
            verification_status: 'VERIFIED',
            verified_at: reservation.verified_at || new Date().toISOString(),
            operator_id,
            terminal_id,
          },
        };
      }

      // Update reservation status to VERIFIED
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
    } catch (error: any) {
      logger.error('operator.verify_ticket.error', { error: error.message, ticket_code });
      return {
        success: false,
        error: 'Failed to verify ticket',
      };
    }
  }

  /**
   * Get error message based on error code
   */
  private getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'TICKET_NOT_FOUND': 'Ticket not found',
      'TICKET_NOT_ACTIVATED': 'Ticket not activated - Cannot enter',
      'TICKET_EXPIRED': 'Ticket has expired',
      'TICKET_WRONG_ORG': 'Ticket does not belong to this organization',
      'TICKET_ALREADY_RESERVED': 'Ticket already has a reservation',
      'TICKET_ALREADY_VERIFIED': 'Ticket already verified',
    };

    return messages[errorCode] || 'Invalid ticket';
  }

  /**
   * Log validation event for audit trail
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

  /**
   * Get validation logs (for operator dashboard/reports)
   */
  getValidationLogs(operatorId?: string, limit: number = 100): ValidationLog[] {
    let logs = [...this.validationLogs];

    if (operatorId) {
      logs = logs.filter(log => log.operator_id === operatorId);
    }

    return logs.slice(-limit).reverse(); // Most recent first
  }
}
