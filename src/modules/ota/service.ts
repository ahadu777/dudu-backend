import { ERR } from '../../core/errors/codes';
import { logger } from '../../utils/logger';
import { AppDataSource } from '../../config/database';
import { OTARepository } from './domain/ota.repository';
import { mockDataStore } from '../../core/mock/data';
import { dataSourceConfig } from '../../config/data-source';

export interface OTAInventoryResponse {
  available_quantities: { [productId: number]: number };
  pricing_context: {
    base_prices: { [productId: number]: { weekday: number; weekend: number } };
    customer_types: string[];
    special_dates: { [date: string]: { multiplier: number } };
  };
}

export interface OTAReserveRequest {
  product_id: number;
  quantity: number;
  reservation_expires_at?: string;
}

export interface OTAReserveResponse {
  reservation_id: string;
  reserved_until: string;
  pricing_snapshot: {
    base_price: number;
    weekend_premium: number;
    customer_discounts: { [type: string]: number };
  };
}

export interface OTAActivateRequest {
  customer_details: {
    name: string;
    email: string;
    phone: string;
  };
  payment_reference: string;
  special_requests?: string;
}

export interface OTAActivateResponse {
  order_id: string;
  tickets: any[];
  total_amount: number;
  confirmation_code: string;
}

export interface OTABulkGenerateRequest {
  product_id: number;
  quantity: number;
  batch_id: string;
}

export interface OTABulkGenerateResponse {
  batch_id: string;
  tickets: any[];
  total_generated: number;
}

export interface OTATicketActivateRequest {
  customer_details: {
    name: string;
    email: string;
    phone: string;
  };
  payment_reference: string;
}

export interface OTATicketActivateResponse {
  ticket_code: string;
  order_id: string;
  customer_name: string;
  status: string;
  activated_at: string;
}

export class OTAService {
  private otaRepository: OTARepository | null = null;

  private async getRepository(): Promise<OTARepository> {
    if (!this.otaRepository) {
      if (AppDataSource.isInitialized) {
        this.otaRepository = new OTARepository(AppDataSource);
      } else {
        throw new Error('Database not initialized');
      }
    }
    return this.otaRepository;
  }

  private async isDatabaseAvailable(): Promise<boolean> {
    try {
      await this.getRepository();
      return true;
    } catch {
      return false;
    }
  }

  async getInventory(productIds?: number[]): Promise<OTAInventoryResponse> {
    logger.info('ota.inventory.requested', { product_ids: productIds });

    const targetProducts = productIds || [106, 107, 108]; // Default to cruise packages

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Use database
      const repo = await this.getRepository();
      const inventories = await repo.getInventoryByProductIds(targetProducts);

      const availability: { [productId: number]: number } = {};
      const pricing_context = {
        base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
        customer_types: ['adult', 'child', 'elderly'],
        special_dates: {
          '2025-12-31': { multiplier: 1.5 },
          '2026-02-18': { multiplier: 1.3 }
        }
      };

      for (const inventory of inventories) {
        const otaAvailable = inventory.getChannelAvailable('ota');
        if (otaAvailable > 0) {
          availability[inventory.product_id] = otaAvailable;

          // Get pricing from product
          if (inventory.product) {
            const basePrice = Number(inventory.product.base_price);
            const weekendPremium = Number(inventory.product.weekend_premium || 30);
            pricing_context.base_prices[inventory.product_id] = {
              weekday: basePrice,
              weekend: basePrice + weekendPremium
            };
          }
        }
      }

      logger.info('ota.inventory.response', {
        source: 'database',
        available_products: Object.keys(availability).length,
        total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
      });

      return { available_quantities: availability, pricing_context };
    } else {
      // Fallback to mock data
      logger.warn('ota.inventory.fallback_to_mock', { reason: 'database_unavailable' });

      const availability = mockDataStore.getChannelAvailability('ota', targetProducts);
      const pricing_context = {
        base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
        customer_types: ['adult', 'child', 'elderly'],
        special_dates: {
          '2025-12-31': { multiplier: 1.5 },
          '2026-02-18': { multiplier: 1.3 }
        }
      };

      for (const productId of targetProducts) {
        const product = mockDataStore.getProduct(productId);
        if (product && availability[productId] > 0) {
          pricing_context.base_prices[productId] = {
            weekday: product.unit_price,
            weekend: product.unit_price + 30
          };
        }
      }

      logger.info('ota.inventory.response', {
        source: 'mock',
        available_products: Object.keys(availability).length,
        total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
      });

      return { available_quantities: availability, pricing_context };
    }
  }

  async createReservation(request: OTAReserveRequest): Promise<OTAReserveResponse> {
    logger.info('ota.reservation.requested', {
      product_id: request.product_id,
      quantity: request.quantity
    });

    // Validate quantity
    if (request.quantity < 1 || request.quantity > 100) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 100'
      };
    }

    // Calculate expiry date
    let expiresAt = new Date();
    if (request.reservation_expires_at) {
      const requestedExpiry = new Date(request.reservation_expires_at);
      const maxExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // Max 48 hours
      expiresAt = requestedExpiry > maxExpiry ? maxExpiry : requestedExpiry;
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
    }

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Use database
      const repo = await this.getRepository();

      try {
        // Get product details for pricing
        const product = await repo.findProductById(request.product_id);
        if (!product) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `Product ${request.product_id} not found`
          };
        }

        // Build pricing snapshot
        const pricing_snapshot = {
          base_price: Number(product.base_price),
          weekend_premium: Number(product.weekend_premium || 30.00),
          customer_discounts: product.customer_discounts || {}
        };

        // Create reservation with database transaction
        const reservation = await repo.createReservation(
          request.product_id,
          'ota',
          request.quantity,
          expiresAt,
          pricing_snapshot
        );

        if (!reservation) {
          // Get current availability for error message
          const inventory = await repo.getInventoryByProductId(request.product_id);
          const available = inventory ? inventory.getChannelAvailable('ota') : 0;

          logger.info('ota.reservation.insufficient_inventory', {
            product_id: request.product_id,
            requested: request.quantity,
            available
          });

          throw {
            code: ERR.SOLD_OUT,
            message: `Insufficient OTA inventory. Available: ${available}, Requested: ${request.quantity}`
          };
        }

        logger.info('ota.reservation.created', {
          source: 'database',
          reservation_id: reservation.reservation_id,
          product_id: request.product_id,
          quantity: request.quantity,
          expires_at: reservation.expires_at.toISOString()
        });

        return {
          reservation_id: reservation.reservation_id,
          reserved_until: reservation.expires_at.toISOString(),
          pricing_snapshot
        };

      } catch (error: any) {
        if (error.code) {
          throw error; // Re-throw known errors
        }

        logger.error('ota.reservation.database_error', error);
        throw {
          code: 'RESERVATION_FAILED',
          message: 'Failed to create reservation'
        };
      }
    } else {
      // Fallback to mock data
      logger.warn('ota.reservation.fallback_to_mock', { reason: 'database_unavailable' });

      const product = mockDataStore.getProduct(request.product_id);
      if (!product) {
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `Product ${request.product_id} not found`
        };
      }

      if (!product.channel_allocations.ota) {
        throw {
          code: 'OTA_NOT_AVAILABLE',
          message: `Product ${request.product_id} is not available for OTA sales`
        };
      }

      const ttlHours = (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      const reservation = mockDataStore.createChannelReservation(
        request.product_id,
        'ota',
        request.quantity,
        ttlHours
      );

      if (!reservation) {
        const availability = mockDataStore.getChannelAvailability('ota', [request.product_id]);
        throw {
          code: ERR.SOLD_OUT,
          message: `Insufficient OTA inventory. Available: ${availability[request.product_id] || 0}, Requested: ${request.quantity}`
        };
      }

      const pricing_snapshot = {
        base_price: product.unit_price,
        weekend_premium: 30.00,
        customer_discounts: {
          child: 100.00,
          elderly: 100.00
        }
      };

      logger.info('ota.reservation.created', {
        source: 'mock',
        reservation_id: reservation.reservation_id,
        product_id: request.product_id,
        quantity: request.quantity,
        expires_at: reservation.expires_at.toISOString()
      });

      return {
        reservation_id: reservation.reservation_id,
        reserved_until: reservation.expires_at.toISOString(),
        pricing_snapshot
      };
    }
  }

  async getReservation(reservationId: string) {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const reservation = await repo.findReservation(reservationId);

      if (!reservation) {
        throw {
          code: 'RESERVATION_NOT_FOUND',
          message: `Reservation ${reservationId} not found`
        };
      }

      return {
        reservation_id: reservation.reservation_id,
        product_id: reservation.product_id,
        quantity: reservation.quantity,
        status: reservation.status,
        expires_at: reservation.expires_at.toISOString(),
        created_at: reservation.created_at.toISOString(),
        order_id: reservation.order_id
      };
    } else {
      const reservation = mockDataStore.getReservation(reservationId);
      if (!reservation) {
        throw {
          code: 'RESERVATION_NOT_FOUND',
          message: `Reservation ${reservationId} not found`
        };
      }

      return {
        reservation_id: reservation.reservation_id,
        product_id: reservation.product_id,
        quantity: reservation.quantity,
        status: reservation.status,
        expires_at: reservation.expires_at.toISOString(),
        created_at: reservation.created_at.toISOString(),
        order_id: reservation.order_id
      };
    }
  }

  async expireOldReservations(): Promise<number> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const expiredCount = await repo.expireReservations();
      if (expiredCount > 0) {
        logger.info('ota.reservations.expired', { source: 'database', count: expiredCount });
      }
      return expiredCount;
    } else {
      const expiredCount = mockDataStore.expireReservations();
      if (expiredCount > 0) {
        logger.info('ota.reservations.expired', { source: 'mock', count: expiredCount });
      }
      return expiredCount;
    }
  }

  async getActiveReservations() {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const reservations = await repo.findActiveReservations('ota');
      return reservations.map(r => ({
        reservation_id: r.reservation_id,
        product_id: r.product_id,
        quantity: r.quantity,
        expires_at: r.expires_at.toISOString(),
        created_at: r.created_at.toISOString()
      }));
    } else {
      const reservations = mockDataStore.getActiveReservations('ota');
      return reservations.map(r => ({
        reservation_id: r.reservation_id,
        product_id: r.product_id,
        quantity: r.quantity,
        expires_at: r.expires_at.toISOString(),
        created_at: r.created_at.toISOString()
      }));
    }
  }

  async activateReservation(reservationId: string, request: OTAActivateRequest): Promise<OTAActivateResponse> {
    logger.info('ota.reservation.activation_requested', {
      reservation_id: reservationId,
      customer_email: request.customer_details.email,
      payment_reference: request.payment_reference
    });

    // First, validate the reservation exists and is active
    const reservation = await this.getReservation(reservationId);

    if (reservation.status !== 'active') {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: `Reservation ${reservationId} is ${reservation.status} and cannot be activated`
      };
    }

    // Check if reservation has expired
    const now = new Date();
    const expiresAt = new Date(reservation.expires_at);
    if (now > expiresAt) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Reservation has expired and cannot be activated'
      };
    }

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation - TODO: Implement database activation method
      logger.warn('ota.reservation.database_activation_not_implemented', {
        reservation_id: reservationId
      });
      // Fall through to mock implementation for now
    }

    // Mock implementation (always used for now)
    const order = mockDataStore.activateReservation(
        reservationId,
        request.customer_details,
        request.payment_reference
      );

      if (!order) {
        throw {
          code: ERR.VALIDATION_ERROR,
          message: 'Failed to activate reservation'
        };
      }

      logger.info('ota.reservation.activated', {
        source: 'mock',
        reservation_id: reservationId,
        order_id: order.order_id,
        total_amount: order.total_amount
      });

      return {
        order_id: order.order_id,
        tickets: order.tickets,
        total_amount: order.total_amount,
        confirmation_code: order.confirmation_code
      };
    }

  async cancelReservation(reservationId: string): Promise<void> {
    logger.info('ota.reservation.cancellation_requested', {
      reservation_id: reservationId
    });

    // First, validate the reservation exists
    const reservation = await this.getReservation(reservationId);

    if (reservation.status === 'activated') {
      throw {
        code: 'CANNOT_CANCEL_ACTIVATED',
        message: `Reservation ${reservationId} has been activated and cannot be cancelled`
      };
    }

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      await repo.cancelReservation(reservationId);

      logger.info('ota.reservation.cancelled', {
        source: 'database',
        reservation_id: reservationId
      });
    } else {
      const cancelled = mockDataStore.cancelReservation(reservationId);
      if (!cancelled) {
        throw {
          code: 'RESERVATION_NOT_FOUND',
          message: `Reservation ${reservationId} not found`
        };
      }

      logger.info('ota.reservation.cancelled', {
        source: 'mock',
        reservation_id: reservationId
      });
    }
  }

  async getOrders(): Promise<any[]> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      const orders = await this.otaRepository!.findOTAOrdersByChannel();
      return orders.map((order: any) => ({
        order_id: order.order_id,
        product_id: order.product_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at.toISOString(),
        confirmation_code: order.confirmation_code
      }));
    }

    // Mock implementation
    const orders = mockDataStore.getOrdersByChannel('ota');
    return orders.map((order: any) => ({
        order_id: order.order_id,
        product_id: order.product_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at.toISOString(),
        confirmation_code: order.confirmation_code
      }));
  }

  async getOrderTickets(orderId: string): Promise<any[]> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      const tickets = await this.otaRepository!.findTicketsByOrderId(orderId);
      if (tickets.length === 0) {
        throw {
          code: 'ORDER_NOT_FOUND',
          message: `Order ${orderId} not found`
        };
      }

      return tickets.map((ticket: any) => ({
        ticket_code: ticket.ticket_code,
        qr_code: ticket.qr_code,
        entitlements: ticket.entitlements,
        status: ticket.status
      }));
    }

    // Mock implementation
    const order = mockDataStore.getOrderByOrderId(orderId);
    if (!order) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} not found`
      };
    }

    return (order.tickets || []).map((ticket: any) => ({
        ticket_code: ticket.code,
        qr_code: `data:image/png;base64,${Buffer.from(JSON.stringify({ticket_id: ticket.id, product_id: order.product_id})).toString('base64')}`,
        entitlements: ticket.entitlements,
        status: ticket.status
      }));
  }

  async bulkGenerateTickets(request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    logger.info('ota.tickets.bulk_generation_requested', {
      product_id: request.product_id,
      quantity: request.quantity,
      batch_id: request.batch_id
    });

    // Validate quantity
    if (request.quantity < 1 || request.quantity > 5000) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 5000'
      };
    }

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      logger.info('ota.tickets.bulk_generation_database_mode', {
        batch_id: request.batch_id,
        quantity: request.quantity
      });

      // Get product from database
      const product = await this.otaRepository!.findProductById(request.product_id);
      if (!product) {
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `Product ${request.product_id} not found`
        };
      }

      // Check inventory availability - inventory should be included with the product
      const inventory = product.inventory[0]; // There should be one inventory per product
      if (!inventory) {
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `No inventory found for product ${request.product_id}`
        };
      }

      const otaAvailable = inventory.getChannelAvailable('ota');
      if (otaAvailable < request.quantity) {
        throw {
          code: ERR.SOLD_OUT,
          message: `Insufficient OTA inventory. Available: ${otaAvailable}, Requested: ${request.quantity}`
        };
      }

      // Generate tickets for database
      const tickets = [];
      for (let i = 0; i < request.quantity; i++) {
        const ticketId = Date.now() + (Math.random() * 1000) + i; // Unique ID with index
        const ticketCode = `CRUISE-${new Date().getFullYear()}-${product.category.toUpperCase()}-${Math.floor(ticketId)}`;

        const qrData = JSON.stringify({
          ticket_id: ticketId,
          product_id: product.id,
          batch_id: request.batch_id,
          issued_at: new Date().toISOString()
        });

        // Use entitlements from product or default cruise functions
        const entitlements = product.entitlements?.map((entitlement: any) => ({
          function_code: entitlement.type,
          remaining_uses: 1
        })) || [
          { function_code: 'ferry', remaining_uses: 1 },
          { function_code: 'deck_access', remaining_uses: 1 },
          { function_code: 'dining', remaining_uses: 1 }
        ];

        const ticket = {
          ticket_code: ticketCode,
          product_id: product.id,
          batch_id: request.batch_id,
          status: 'PRE_GENERATED' as const,
          entitlements,
          qr_code: `data:image/png;base64,${Buffer.from(qrData).toString('base64')}`,
          created_at: new Date()
        };

        tickets.push(ticket);
      }

      // Save to database with inventory update
      const savedTickets = await this.otaRepository!.createPreGeneratedTickets(tickets);

      logger.info('ota.tickets.bulk_generation_database_completed', {
        batch_id: request.batch_id,
        product_id: request.product_id,
        total_generated: savedTickets.length
      });

      return {
        batch_id: request.batch_id,
        tickets: savedTickets.map(ticket => ({
          ticket_code: ticket.ticket_code,
          qr_code: ticket.qr_code,
          status: ticket.status,
          entitlements: ticket.entitlements
        })),
        total_generated: savedTickets.length
      };
    }

    // Mock implementation
    const product = mockDataStore.getProduct(request.product_id);
    if (!product) {
      throw {
        code: ERR.PRODUCT_NOT_FOUND,
        message: `Product ${request.product_id} not found`
      };
    }

    // Check if we have enough OTA allocation
    const availability = mockDataStore.getChannelAvailability('ota', [request.product_id]);
    if (availability[request.product_id] < request.quantity) {
      throw {
        code: ERR.SOLD_OUT,
        message: `Insufficient OTA inventory. Available: ${availability[request.product_id]}, Requested: ${request.quantity}`
      };
    }

    // Generate pre-made tickets
    const tickets = [];
    for (let i = 0; i < request.quantity; i++) {
      const ticketId = mockDataStore.nextTicketId++;
      const ticketCode = `${product.sku}-${ticketId}`;

      const qrData = JSON.stringify({
        ticket_id: ticketId,
        product_id: product.id,
        batch_id: request.batch_id,
        issued_at: new Date().toISOString()
      });

      const ticket = {
        id: ticketId,
        code: ticketCode,
        product_id: product.id,
        batch_id: request.batch_id,
        status: 'PRE_GENERATED',
        entitlements: product.functions.map(func => ({
          function_code: func.function_code,
          remaining_uses: 1
        })),
        qr_code: `data:image/png;base64,${Buffer.from(qrData).toString('base64')}`,
        created_at: new Date(),
        customer_name: null,
        customer_email: null,
        order_id: null
      };

      tickets.push(ticket);
      mockDataStore.preGeneratedTickets.set(ticketCode, ticket);
    }

    // Reserve inventory for this batch
    mockDataStore.reserveChannelInventory('ota', request.product_id, request.quantity);

    logger.info('ota.tickets.bulk_generation_completed', {
      batch_id: request.batch_id,
      product_id: request.product_id,
      total_generated: tickets.length
    });

    return {
      batch_id: request.batch_id,
      tickets: tickets.map(ticket => ({
        ticket_code: ticket.code,
        qr_code: ticket.qr_code,
        status: ticket.status,
        entitlements: ticket.entitlements
      })),
      total_generated: tickets.length
    };
  }

  async activatePreMadeTicket(ticketCode: string, request: OTATicketActivateRequest): Promise<OTATicketActivateResponse> {
    logger.info('ota.ticket.activation_requested', {
      ticket_code: ticketCode,
      customer_email: request.customer_details.email,
      payment_reference: request.payment_reference
    });

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      logger.info('ota.ticket.activation_database_mode', {
        ticket_code: ticketCode,
        customer_email: request.customer_details.email
      });

      // Generate order ID
      const orderId = `ORD-${Date.now()}`;
      const now = new Date();

      // Prepare order data
      const orderData = {
        order_id: orderId,
        product_id: 0, // Will be set from ticket
        channel_id: 2, // OTA channel
        total_amount: 382, // Base price for simplicity
        status: 'confirmed' as const,
        confirmation_code: `CONF-${Date.now()}`,
        created_at: now
      };

      try {
        // Use repository to activate ticket and create order atomically
        const result = await this.otaRepository!.activatePreGeneratedTicket(
          ticketCode,
          {
            customer_name: request.customer_details.name,
            customer_email: request.customer_details.email,
            customer_phone: request.customer_details.phone,
            payment_reference: request.payment_reference
          },
          orderData
        );

        logger.info('ota.ticket.activation_database_completed', {
          ticket_code: ticketCode,
          order_id: result.order.order_id,
          customer_name: result.ticket.customer_name
        });

        return {
          ticket_code: ticketCode,
          order_id: result.order.order_id,
          customer_name: result.ticket.customer_name!,
          status: 'ACTIVE',
          activated_at: result.ticket.activated_at!.toISOString()
        };

      } catch (error: any) {
        if (error.message?.includes('not found')) {
          throw {
            code: 'TICKET_NOT_FOUND',
            message: error.message
          };
        }
        if (error.message?.includes('already activated')) {
          throw {
            code: 'TICKET_ALREADY_ACTIVATED',
            message: error.message
          };
        }
        throw error;
      }
    }

    // Mock implementation
    const ticket = mockDataStore.preGeneratedTickets.get(ticketCode);
    if (!ticket) {
      throw {
        code: 'TICKET_NOT_FOUND',
        message: `Ticket ${ticketCode} not found`
      };
    }

    if (ticket.status !== 'PRE_GENERATED') {
      throw {
        code: 'TICKET_ALREADY_ACTIVATED',
        message: `Ticket ${ticketCode} is already ${ticket.status}`
      };
    }

    // Create order for this ticket
    const orderId = `ORD-${mockDataStore.nextOrderId++}`;
    const now = new Date();

    const order = {
      order_id: orderId,
      product_id: ticket.product_id,
      channel_id: 2, // OTA channel ID
      customer_name: request.customer_details.name,
      customer_email: request.customer_details.email,
      customer_phone: request.customer_details.phone,
      payment_reference: request.payment_reference,
      total_amount: 382, // Base price for simplicity
      status: 'confirmed',
      created_at: now,
      confirmation_code: `CONF-${mockDataStore.nextOrderId}`,
      tickets: [ticket]
    };

    // Update ticket with customer details
    ticket.customer_name = request.customer_details.name;
    ticket.customer_email = request.customer_details.email;
    ticket.order_id = orderId;
    ticket.status = 'ACTIVE';
    ticket.activated_at = now;

    // Store the order
    mockDataStore.addOrder(orderId, order);

    logger.info('ota.ticket.activation_completed', {
      ticket_code: ticketCode,
      order_id: orderId,
      customer_name: request.customer_details.name
    });

    return {
      ticket_code: ticketCode,
      order_id: orderId,
      customer_name: request.customer_details.name,
      status: 'ACTIVE',
      activated_at: now.toISOString()
    };
  }
}

export const otaService = new OTAService();

// Schedule periodic cleanup of expired reservations
setInterval(() => {
  otaService.expireOldReservations().catch(error => {
    logger.error('Failed to expire reservations', error);
  });
}, 5 * 60 * 1000); // Every 5 minutes