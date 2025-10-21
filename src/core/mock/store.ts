import {
  Product,
  Order,
  Ticket,
  Operator,
  ValidatorSession,
  RedemptionEvent,
  OrderStatus,
  TicketStatus,
  TicketTransitions,
  ISODate,
  TicketCode,
  SessionId,
  ScanResult,
  PromotionDetail
} from '../../types/domain.js';
import { logger } from '../../utils/logger.js';

/**
 * Unified Mock Data Store aligned with domain.ts
 * Single source of truth for all mock data operations
 */
export class MockStore {
  private products: Map<number, Product & { inventory: { sellable_cap: number; reserved_count: number; sold_count: number; } }>;
  private orders: Map<string, Order>;  // key: `${user_id}-${out_trade_no}`
  private ordersByOrderId: Map<number, Order>;  // secondary index
  private tickets: Map<TicketCode, Ticket>;
  private operators: Map<string, Operator>;  // key: username
  private sessions: Map<SessionId, ValidatorSession>;
  private redemptions: Array<RedemptionEvent>;
  private jtiCache: Set<string>;  // for replay prevention

  private nextOrderId = 1000;
  private nextTicketId = 1;

  constructor() {
    this.products = new Map();
    this.orders = new Map();
    this.ordersByOrderId = new Map();
    this.tickets = new Map();
    this.operators = new Map();
    this.sessions = new Map();
    this.redemptions = [];
    this.jtiCache = new Set();

    this.initializeSeedData();
  }

  // Enhanced product data for promotion details
  private promotionData: Map<number, { description: string; unit_price: number; features: string[]; images: string[]; }> = new Map();

  private initializeSeedData(): void {
    // Initialize promotion enhancement data
    this.promotionData.set(101, {
      description: 'Perfect for tourists and daily commuters. This convenient 3-in-1 pass gives you access to multiple transport modes in one ticket.',
      unit_price: 25.00,
      features: ['2 Bus rides included', '1 Ferry crossing', '1 Metro journey', 'Valid for 24 hours', 'No booking required'],
      images: ['https://example.com/transport-pass.jpg']
    });

    this.promotionData.set(102, {
      description: 'Unlimited travel throughout the day! Perfect for exploring the entire city at your own pace.',
      unit_price: 45.00,
      features: ['Unlimited bus rides', 'Unlimited metro access', 'Valid for 24 hours', 'Peak hour access included', 'Mobile ticket available'],
      images: ['https://example.com/day-pass.jpg']
    });

    this.promotionData.set(103, {
      description: 'Discover our world-class museum collections. Entry includes access to all permanent exhibitions.',
      unit_price: 18.00,
      features: ['All permanent exhibitions', 'Audio guide included', 'Valid for one day', 'Student discounts available', 'Group rates available'],
      images: ['https://example.com/museum-ticket.jpg']
    });

    this.promotionData.set(104, {
      description: 'Experience thrilling rides and attractions at our premier theme park. Fast Pass included for shorter wait times!',
      unit_price: 89.00,
      features: ['Park entry included', '3 Fast Pass rides', 'All attractions access', 'Free parking', 'Photo package discount'],
      images: ['https://example.com/park-pass.jpg']
    });

    this.promotionData.set(105, {
      description: 'This seasonal pass is currently unavailable. Check back for new offers!',
      unit_price: 0.00,
      features: ['Currently unavailable'],
      images: []
    });

    // Seed products (from products.json structure)
    this.products.set(101, {
      id: 101,
      sku: 'PASS-3IN1',
      name: '3-in-1 Transport Pass',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'bus', label: 'Bus Ride', quantity: 2 },
        { function_code: 'ferry', label: 'Ferry Ride', quantity: 1 },
        { function_code: 'metro', label: 'Metro Entry', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 1000,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(102, {
      id: 102,
      sku: 'DAY-PASS',
      name: 'All Day Pass',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'bus', label: 'Unlimited Bus', quantity: 999 },
        { function_code: 'metro', label: 'Unlimited Metro', quantity: 999 }
      ],
      inventory: {
        sellable_cap: 500,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(103, {
      id: 103,
      sku: 'MUSEUM-TICKET',
      name: 'Museum Entry',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'museum', label: 'Museum Entry', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 200,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(104, {
      id: 104,
      sku: 'PARK-PASS',
      name: 'Theme Park Pass',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'park', label: 'Park Entry', quantity: 1 },
        { function_code: 'ride', label: 'Fast Pass', quantity: 3 }
      ],
      inventory: {
        sellable_cap: 100,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(105, {
      id: 105,
      sku: 'INACTIVE-PASS',
      name: 'Expired Product',
      status: 'archived',
      sale_start_at: null,
      sale_end_at: '2024-01-01T00:00:00Z',
      functions: [
        { function_code: 'expired', label: 'Expired Function', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 0,
        reserved_count: 0,
        sold_count: 0
      }
    });

    // Seed operators
    const bcrypt = require('bcrypt');
    this.operators.set('alice', {
      operator_id: 1,
      username: 'alice',
      password_hash: bcrypt.hashSync('secret123', 10),
      roles: ['gate_operator', 'validator']
    });

    this.operators.set('bob', {
      operator_id: 2,
      username: 'bob',
      password_hash: bcrypt.hashSync('pass456', 10),
      roles: ['gate_operator']
    });

    this.operators.set('charlie', {
      operator_id: 3,
      username: 'charlie',
      password_hash: bcrypt.hashSync('admin789', 10),
      roles: ['gate_operator', 'validator', 'admin']
    });

    // Seed test tickets for validation
    this.seedTestTickets();

    logger.info('mock.store.initialized', {
      products: this.products.size,
      operators: this.operators.size,
      tickets: this.tickets.size
    });
  }

  private seedTestTickets(): void {
    // Create test tickets for user 123 (for workflow validation)
    const testTicket1: Ticket = {
      ticket_code: 'TKT-123-001',
      product_id: 101,
      product_name: '3-in-1 Transport Pass',
      status: TicketStatus.ACTIVE,
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
      entitlements: [
        {
          function_code: 'bus',
          label: 'Bus Ride',
          remaining_uses: 2
        },
        {
          function_code: 'ferry',
          label: 'Ferry Ride',
          remaining_uses: 1
        },
        {
          function_code: 'metro',
          label: 'Metro Entry',
          remaining_uses: 1
        }
      ],
      user_id: 123,
      order_id: 1001
    };

    const testTicket2: Ticket = {
      ticket_code: 'TKT-123-002',
      product_id: 103,
      product_name: 'Museum Entry',
      status: TicketStatus.ASSIGNED,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      entitlements: [
        {
          function_code: 'museum',
          label: 'Museum Entry',
          remaining_uses: 1
        }
      ],
      user_id: 123,
      order_id: 1002
    };

    this.tickets.set(testTicket1.ticket_code, testTicket1);
    this.tickets.set(testTicket2.ticket_code, testTicket2);

    logger.info('mock.store.test_tickets_seeded', {
      user_id: 123,
      ticket_count: 2
    });
  }

  // Product operations
  getProducts(): Product[] {
    return Array.from(this.products.values())
      .filter(p => p.status === 'active')
      .map(({ inventory, ...product }) => product);  // Remove inventory from response
  }

  getProduct(id: number): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;
    const { inventory, ...productData } = product;
    return productData;
  }

  // Get promotion detail with enhanced information
  getPromotionDetail(id: number): PromotionDetail | undefined {
    const product = this.products.get(id);
    const promotionInfo = this.promotionData.get(id);

    if (!product || !promotionInfo) return undefined;

    const available = product.inventory.sellable_cap - product.inventory.reserved_count - product.inventory.sold_count;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: promotionInfo.description,
      unit_price: promotionInfo.unit_price,
      status: product.status,
      sale_start_at: product.sale_start_at,
      sale_end_at: product.sale_end_at,
      functions: product.functions,
      inventory: {
        sellable_cap: product.inventory.sellable_cap,
        reserved_count: product.inventory.reserved_count,
        sold_count: product.inventory.sold_count,
        available: available
      },
      features: promotionInfo.features,
      images: promotionInfo.images
    };
  }

  reserveInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    const available = product.inventory.sellable_cap - product.inventory.reserved_count - product.inventory.sold_count;
    if (available < qty) return false;

    product.inventory.reserved_count += qty;
    return true;
  }

  commitInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    if (product.inventory.reserved_count < qty) return false;

    product.inventory.reserved_count -= qty;
    product.inventory.sold_count += qty;
    return true;
  }

  releaseInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    product.inventory.reserved_count = Math.max(0, product.inventory.reserved_count - qty);
    return true;
  }

  // Order operations
  createOrder(order: Omit<Order, 'order_id' | 'created_at'>): Order {
    const orderId = this.nextOrderId++;
    const key = `${order.user_id}-${order.out_trade_no}`;

    // Check for idempotency
    const existing = this.orders.get(key);
    if (existing) {
      return existing;
    }

    const newOrder: Order = {
      ...order,
      order_id: orderId,
      created_at: new Date().toISOString()
    };

    this.orders.set(key, newOrder);
    this.ordersByOrderId.set(orderId, newOrder);

    return newOrder;
  }

  getOrder(userId: number, outTradeNo: string): Order | undefined {
    return this.orders.get(`${userId}-${outTradeNo}`);
  }

  getOrderById(orderId: number): Order | undefined {
    return this.ordersByOrderId.get(orderId);
  }

  updateOrderStatus(orderId: number, status: OrderStatus, paidAt?: ISODate): boolean {
    const order = this.ordersByOrderId.get(orderId);
    if (!order) return false;

    order.status = status;
    if (paidAt) {
      order.paid_at = paidAt;
    }

    // Update both maps
    const key = `${order.user_id}-${order.out_trade_no}`;
    this.orders.set(key, order);

    return true;
  }

  // Ticket operations
  createTicket(ticket: Ticket): Ticket {
    this.tickets.set(ticket.ticket_code, ticket);
    return ticket;
  }

  getTicket(ticketCode: TicketCode): Ticket | undefined {
    return this.tickets.get(ticketCode);
  }

  getTicketsByUserId(userId: number): Ticket[] {
    return Array.from(this.tickets.values()).filter(t => t.user_id === userId);
  }

  getTicketsByOrderId(orderId: number): Ticket[] {
    return Array.from(this.tickets.values()).filter(t => t.order_id === orderId);
  }

  updateTicketStatus(ticketCode: TicketCode, newStatus: TicketStatus): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    // Validate state transition
    const allowedTransitions = TicketTransitions[ticket.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      logger.warn('ticket.invalid_transition', {
        ticketCode,
        currentStatus: ticket.status,
        attemptedStatus: newStatus
      });
      return false;
    }

    ticket.status = newStatus;
    return true;
  }

  decrementEntitlement(ticketCode: TicketCode, functionCode: string): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    const entitlement = ticket.entitlements.find(e => e.function_code === functionCode);
    if (!entitlement || entitlement.remaining_uses <= 0) return false;

    entitlement.remaining_uses--;

    // Update ticket status based on remaining uses
    const totalRemaining = ticket.entitlements.reduce((sum, e) => sum + e.remaining_uses, 0);
    if (totalRemaining === 0) {
      this.updateTicketStatus(ticketCode, TicketStatus.REDEEMED);
    } else if (ticket.status === TicketStatus.ACTIVE) {
      this.updateTicketStatus(ticketCode, TicketStatus.PARTIALLY_REDEEMED);
    }

    return true;
  }

  // Operator operations
  getOperator(username: string): Operator | undefined {
    return this.operators.get(username);
  }

  // Session operations
  createSession(session: ValidatorSession): ValidatorSession {
    this.sessions.set(session.session_id, session);
    return session;
  }

  getSession(sessionId: SessionId): ValidatorSession | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionValid(sessionId: SessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    return now < expiresAt;
  }

  // Redemption operations
  addRedemption(event: RedemptionEvent): void {
    this.redemptions.push(event);

    // Add jti to cache if present
    if (event.jti) {
      this.jtiCache.add(event.jti);
    }
  }

  hasJti(jti: string): boolean {
    return this.jtiCache.has(jti);
  }

  getRedemptions(filters?: {
    ticket_id?: number;
    operator_id?: number;
    location_id?: number;
    from?: ISODate;
    to?: ISODate;
  }): RedemptionEvent[] {
    let results = [...this.redemptions];

    if (filters) {
      if (filters.ticket_id) {
        results = results.filter(r => r.ticket_id === filters.ticket_id);
      }
      if (filters.operator_id) {
        results = results.filter(r => r.operator_id === filters.operator_id);
      }
      if (filters.location_id) {
        results = results.filter(r => r.location_id === filters.location_id);
      }
      if (filters.from) {
        results = results.filter(r => r.ts >= filters.from!);
      }
      if (filters.to) {
        results = results.filter(r => r.ts <= filters.to!);
      }
    }

    return results;
  }

  // Cancellation operations
  cancelTicket(ticketCode: TicketCode, reason?: string): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    // Check if ticket can be cancelled
    if (ticket.status === TicketStatus.REDEEMED ||
        ticket.status === TicketStatus.EXPIRED ||
        ticket.status === TicketStatus.VOID) {
      return false;
    }

    // Update ticket to VOID status
    ticket.status = TicketStatus.VOID;
    ticket.cancelled_at = new Date().toISOString();
    ticket.cancellation_reason = reason || null;

    return true;
  }

  calculateRefundAmount(ticketCode: TicketCode): number {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return 0;

    const order = this.ordersByOrderId.get(ticket.order_id);
    if (!order || !order.amounts) return 0;

    // Calculate refund based on remaining entitlements
    const totalEntitlements = ticket.entitlements.reduce((sum, e) => {
      const product = this.products.get(ticket.product_id);
      const productFunction = product?.functions.find(f => f.function_code === e.function_code);
      return sum + (productFunction?.quantity || 0);
    }, 0);

    const remainingEntitlements = ticket.entitlements.reduce((sum, e) => sum + e.remaining_uses, 0);

    if (totalEntitlements === 0) return 0;

    const usagePercentage = (totalEntitlements - remainingEntitlements) / totalEntitlements;
    const itemPrice = order.amounts.total / order.items.length; // Simple division for prototype

    // Apply refund policy
    let refundPercentage = 0;
    if (usagePercentage === 0) {
      refundPercentage = 1.0; // 100% refund
    } else if (usagePercentage <= 0.5) {
      refundPercentage = 0.5; // 50% refund
    } else if (usagePercentage < 1.0) {
      refundPercentage = 0.25; // 25% refund
    } else {
      refundPercentage = 0; // No refund
    }

    return Math.round(itemPrice * refundPercentage * 100) / 100; // Round to 2 decimal places
  }

  // Refund operations (for refund-processing card)
  private refunds: Map<string, any> = new Map();
  private nextRefundId = 1;

  createRefund(orderOrderId: number, amount: number, reason: string, ticketId?: number): any {
    const refundId = `REF-${this.nextRefundId++}`;
    const refund = {
      refund_id: refundId,
      order_id: orderOrderId,
      ticket_id: ticketId || null,
      amount,
      status: 'pending',
      reason,
      gateway_response: null,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    this.refunds.set(refundId, refund);
    return refund;
  }

  updateRefundStatus(refundId: string, status: string, gatewayResponse?: any): boolean {
    const refund = this.refunds.get(refundId);
    if (!refund) return false;

    refund.status = status;
    if (gatewayResponse) {
      refund.gateway_response = gatewayResponse;
    }
    if (status === 'success' || status === 'failed') {
      refund.completed_at = new Date().toISOString();
    }

    return true;
  }

  getRefundsByUserId(userId: number): any[] {
    const userOrders = Array.from(this.ordersByOrderId.values())
      .filter(o => o.user_id === userId)
      .map(o => o.order_id);

    return Array.from(this.refunds.values())
      .filter(r => userOrders.includes(r.order_id));
  }

  updateOrderRefundStatus(orderId: number, refundAmount: number): boolean {
    const order = this.ordersByOrderId.get(orderId);
    if (!order) return false;

    order.refund_amount = (order.refund_amount || 0) + refundAmount;

    if (order.amounts) {
      if (order.refund_amount >= order.amounts.total) {
        order.refund_status = 'full';
        order.status = OrderStatus.REFUNDED;
      } else if (order.refund_amount > 0) {
        order.refund_status = 'partial';
        order.status = OrderStatus.PARTIALLY_REFUNDED;
      }
    }

    // Update both maps
    const key = `${order.user_id}-${order.out_trade_no}`;
    this.orders.set(key, order);

    return true;
  }

  // Utility methods
  reset(): void {
    this.products.clear();
    this.orders.clear();
    this.ordersByOrderId.clear();
    this.tickets.clear();
    this.operators.clear();
    this.sessions.clear();
    this.redemptions = [];
    this.jtiCache.clear();
    this.refunds.clear();
    this.nextOrderId = 1000;
    this.nextTicketId = 1;
    this.nextRefundId = 1;

    this.initializeSeedData();
  }

  getStats(): object {
    return {
      products: this.products.size,
      orders: this.orders.size,
      tickets: this.tickets.size,
      operators: this.operators.size,
      sessions: this.sessions.size,
      redemptions: this.redemptions.length,
      jtiCacheSize: this.jtiCache.size
    };
  }
}

// Export singleton instance
export const mockStore = new MockStore();