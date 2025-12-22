import { mockDataStore } from '../../core/mock/data';
import { mockStore } from '../../core/mock/store';
import { ERR } from '../../core/errors/codes';
import { TicketStatus, TicketEntitlement } from '../../types/domain';
import { ticketCodeGenerator } from '../../utils/ticket-code-generator';
import { logger } from '../../utils/logger';

interface Entitlement {
  function_code: string;
  remaining_uses: number;
}

interface Ticket {
  id: number;
  code: string;
  order_id: number;
  product_id: number;
  user_id: number;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  valid_from: Date;
  valid_until: Date;
  entitlements: Entitlement[];
  created_at?: Date;
}

const metrics = {
  increment: (metric: string, value: number = 1) => {
    logger.info(`[METRIC] ${metric} +${value}`);
  }
};

class TicketService {
  private issuedTicketsCache = new Map<number, Ticket[]>();

  async issueTicketsForPaidOrder(orderId: number): Promise<Ticket[]> {
    logger.info('tickets.issuance.started', { orderId });

    // Check if tickets already issued (idempotency)
    if (this.issuedTicketsCache.has(orderId)) {
      logger.info('tickets.issuance.already_issued', { orderId });
      return this.issuedTicketsCache.get(orderId)!;
    }

    // Get order from mock store
    const order = mockDataStore.getOrderById(orderId);

    if (!order) {
      logger.info('tickets.issuance.order_not_found', { orderId });
      throw {
        code: ERR.ORDER_NOT_FOUND,
        message: `Order ${orderId} not found`
      };
    }

    // Check order is PAID
    if (order.status !== 'PAID') {
      logger.info('tickets.issuance.order_not_paid', { orderId, status: order.status });
      throw {
        code: 'INVALID_ORDER_STATUS',
        message: `Order ${orderId} is not in PAID status`
      };
    }

    const tickets: Ticket[] = [];
    let ticketCounter = 0;

    // Process each order item
    for (let itemIndex = 0; itemIndex < order.items.length; itemIndex++) {
      const item = order.items[itemIndex];
      const product = mockDataStore.getProduct(item.product_id);

      if (!product) {
        logger.info('tickets.issuance.product_not_found', { productId: item.product_id });
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `Product ${item.product_id} not found`
        };
      }

      // Create tickets based on quantity
      for (let ticketIndex = 0; ticketIndex < item.qty; ticketIndex++) {
        // Generate secure random ticket code (replaces predictable orderId-itemIndex-ticketIndex format)
        const ticketCode = await ticketCodeGenerator.generate('TKT');

        // Build entitlements from product functions
        const entitlements: Entitlement[] = product.functions.map(func => ({
          function_code: func.function_code,
          remaining_uses: func.max_uses === -1 ? 999 : func.max_uses
        }));

        const storeEntitlements: TicketEntitlement[] = product.functions.map(func => ({
          function_code: func.function_code,
          label: func.function_name ?? func.function_code,
          remaining_uses: func.max_uses === -1 ? 999 : func.max_uses
        }));

        const now = new Date();
        const validFrom = now;
        const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year validity

        const ticket: Ticket = {
          id: 0, // Will be set by createTicket
          code: ticketCode,
          order_id: orderId,
          product_id: product.id,
          user_id: order.user_id,
          status: 'ACTIVE',
          valid_from: validFrom,
          valid_until: validUntil,
          entitlements
        };

        // Store ticket in mock data
        const createdTicket = mockDataStore.createTicket({
          code: ticket.code,
          order_id: ticket.order_id,
          user_id: ticket.user_id,
          status: ticket.status,
          entitlements: ticket.entitlements
        });

        mockStore.createTicket({
          ticket_code: ticketCode,
          product_id: product.id,
          product_name: product.name,
          status: TicketStatus.ACTIVE,
          entitlements: storeEntitlements,
          user_id: order.user_id,
          order_id: orderId,
          expires_at: validUntil.toISOString()
        });

        tickets.push({
          ...ticket,
          id: createdTicket.id,
          created_at: createdTicket.created_at
        });
        ticketCounter++;
      }
    }

    // Cache for idempotency
    this.issuedTicketsCache.set(orderId, tickets);

    logger.info('tickets.issuance.completed', { orderId, count: ticketCounter });
    metrics.increment('tickets.issued.count', ticketCounter);

    return tickets;
  }

  // Helper method to get tickets by user
  async getTicketsByUser(userId: number): Promise<any[]> {
    return mockDataStore.getTicketsByUser(userId);
  }

  // Helper method to get ticket by code
  async getTicketByCode(code: string): Promise<any> {
    return mockDataStore.getTicketByCode(code);
  }
}

export const ticketService = new TicketService();
export type { Ticket, Entitlement };
