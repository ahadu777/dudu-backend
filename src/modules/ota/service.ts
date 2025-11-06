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
    customer_discounts?: { [productId: number]: { [type: string]: number } };
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
  distribution_mode?: 'direct_sale' | 'reseller_batch';
  reseller_metadata?: {
    intended_reseller: string;
    batch_purpose: string;
    distribution_notes?: string;
    margin_guidance?: number;
  };
  batch_metadata?: {
    campaign_type?: 'early_bird' | 'flash_sale' | 'group_discount' | 'seasonal' | 'standard';
    campaign_name?: string;
    special_conditions?: string[];
    marketing_tags?: string[];
    promotional_code?: string;
    notes?: string;
  };
}

export interface OTABulkGenerateResponse {
  batch_id: string;
  distribution_mode: string;
  pricing_snapshot?: any;
  reseller_metadata?: any;
  batch_metadata?: any;
  expires_at?: string;
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
        },
        customer_discounts: {} as { [productId: number]: { [type: string]: number } }
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

            // Add customer discounts if available
            if (inventory.product.customer_discounts) {
              pricing_context.customer_discounts[inventory.product_id] = inventory.product.customer_discounts;
            }
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
        },
        customer_discounts: {} as { [productId: number]: { [type: string]: number } }
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

  async bulkGenerateTickets(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    logger.info('ota.tickets.bulk_generation_requested', {
      product_id: request.product_id,
      quantity: request.quantity,
      batch_id: request.batch_id,
      distribution_mode: request.distribution_mode,
      campaign_type: request.batch_metadata?.campaign_type
    });

    // Validate quantity
    if (request.quantity < 1 || request.quantity > 5000) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 5000'
      };
    }

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation with batch creation
      logger.info('ota.tickets.bulk_generation_database_mode', {
        batch_id: request.batch_id,
        quantity: request.quantity,
        distribution_mode: request.distribution_mode
      });

      const repo = await this.getRepository();

      // Create batch record first
      const expiresAt = request.distribution_mode === 'reseller_batch'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for reseller
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days for direct

      const batchData = {
        batch_id: request.batch_id,
        partner_id: partnerId,
        product_id: request.product_id,
        total_quantity: request.quantity,
        distribution_mode: request.distribution_mode || 'direct_sale',
        expires_at: expiresAt,
        reseller_metadata: request.reseller_metadata,
        batch_metadata: request.batch_metadata,
        pricing_snapshot: {
          base_product_id: request.product_id,
          base_price: 288, // Will be filled from product data
          customer_type_pricing: [
            { customer_type: 'adult' as const, unit_price: 288, discount_applied: 0 },
            { customer_type: 'child' as const, unit_price: 188, discount_applied: 100 },
            { customer_type: 'elderly' as const, unit_price: 238, discount_applied: 50 }
          ],
          weekend_premium: 30,
          currency: 'HKD',
          captured_at: new Date().toISOString()
        }
      };

      const batch = await repo.createTicketBatch(batchData);

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
          partner_id: partnerId,
          status: 'PRE_GENERATED' as const,
          entitlements,
          qr_code: `data:image/png;base64,${Buffer.from(qrData).toString('base64')}`,
          created_at: new Date()
        };

        tickets.push(ticket);
      }

      // Save to database with inventory update
      const savedTickets = await this.otaRepository!.createPreGeneratedTickets(tickets);

      // Update batch with actual tickets generated
      await repo.updateBatchCounters(batch.batch_id, {
        tickets_generated: savedTickets.length
      });

      logger.info('ota.tickets.bulk_generation_database_completed', {
        batch_id: request.batch_id,
        product_id: request.product_id,
        total_generated: savedTickets.length,
        distribution_mode: batch.distribution_mode
      });

      return {
        batch_id: request.batch_id,
        distribution_mode: batch.distribution_mode,
        pricing_snapshot: batch.pricing_snapshot,
        reseller_metadata: batch.reseller_metadata,
        batch_metadata: batch.batch_metadata,
        expires_at: batch.expires_at?.toISOString(),
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
        partner_id: partnerId,
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

    // Create and store mock batch data
    const mockBatch = {
      batch_id: request.batch_id,
      distribution_mode: request.distribution_mode || 'direct_sale',
      pricing_snapshot: {
        base_product_id: request.product_id,
        base_price: 288,
        customer_type_pricing: [
          { customer_type: 'adult', unit_price: 288, discount_applied: 0 },
          { customer_type: 'child', unit_price: 188, discount_applied: 100 },
          { customer_type: 'elderly', unit_price: 238, discount_applied: 50 }
        ],
        weekend_premium: 30,
        currency: 'HKD',
        captured_at: new Date().toISOString()
      },
      reseller_metadata: request.reseller_metadata,
      batch_metadata: request.batch_metadata,
      expires_at: request.distribution_mode === 'reseller_batch'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tickets_generated: tickets.length,
      tickets_activated: 0,
      tickets_redeemed: 0
    };

    // Store the batch in mock data
    mockDataStore.addTicketBatch(mockBatch);

    logger.info('ota.tickets.bulk_generation_completed', {
      batch_id: request.batch_id,
      product_id: request.product_id,
      total_generated: tickets.length,
      distribution_mode: mockBatch.distribution_mode
    });

    return {
      batch_id: request.batch_id,
      distribution_mode: mockBatch.distribution_mode,
      pricing_snapshot: mockBatch.pricing_snapshot,
      reseller_metadata: mockBatch.reseller_metadata,
      batch_metadata: mockBatch.batch_metadata,
      expires_at: mockBatch.expires_at,
      tickets: tickets.map(ticket => ({
        ticket_code: ticket.code,
        qr_code: ticket.qr_code,
        status: ticket.status,
        entitlements: ticket.entitlements
      })),
      total_generated: tickets.length
    };
  }

  async activatePreMadeTicket(ticketCode: string, partnerId: string, request: OTATicketActivateRequest): Promise<OTATicketActivateResponse> {
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
          partnerId,
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
    // Check partner isolation
    if (ticket.partner_id !== partnerId) {
      throw {
        code: 'TICKET_NOT_FOUND',
        message: `Ticket ${ticketCode} not found or not available for activation`
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

  // New batch analytics methods
  async getBatchAnalytics(batchId: string): Promise<any | null> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      return await repo.getBatchAnalytics(batchId);
    } else {
      // Mock implementation - use stored batch data
      const storedBatch = mockDataStore.getBatch(batchId);
      if (!storedBatch) return null;

      return {
        batch_id: batchId,
        reseller_name: storedBatch.reseller_metadata?.intended_reseller || "Direct Sale",
        campaign_type: storedBatch.batch_metadata?.campaign_type || "standard",
        campaign_name: storedBatch.batch_metadata?.campaign_name || "Standard Batch",
        generated_at: storedBatch.created_at?.toISOString() || new Date().toISOString(),
        tickets_generated: storedBatch.tickets_generated || 0,
        tickets_activated: storedBatch.tickets_activated || 0,
        tickets_redeemed: storedBatch.tickets_redeemed || 0,
        conversion_rates: {
          activation_rate: storedBatch.tickets_generated > 0 ?
            (storedBatch.tickets_activated || 0) / storedBatch.tickets_generated : 0,
          redemption_rate: storedBatch.tickets_activated > 0 ?
            (storedBatch.tickets_redeemed || 0) / storedBatch.tickets_activated : 0,
          overall_utilization: storedBatch.tickets_generated > 0 ?
            (storedBatch.tickets_redeemed || 0) / storedBatch.tickets_generated : 0
        },
        revenue_metrics: {
          potential_revenue: storedBatch.tickets_generated * (storedBatch.pricing_snapshot?.base_price || 288),
          realized_revenue: (storedBatch.tickets_redeemed || 0) * (storedBatch.pricing_snapshot?.base_price || 288),
          realization_rate: storedBatch.tickets_generated > 0 ?
            (storedBatch.tickets_redeemed || 0) / storedBatch.tickets_generated : 0
        },
        batch_metadata: storedBatch.batch_metadata || {}
      };
    }
  }

  async getResellerBillingSummary(reseller: string, period: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      if (reseller === 'all') {
        // Return aggregated summary for all resellers
        const batches = await repo.findBatchesByPartner('all');
        // Implementation would aggregate across all resellers
        return {
          billing_period: period,
          reseller_summaries: []
        };
      } else {
        return await repo.getResellerBillingSummary(reseller, period);
      }
    } else {
      // Mock implementation
      return {
        billing_period: period,
        reseller_summaries: [
          {
            reseller_name: reseller === 'all' ? 'Mock Reseller' : reseller,
            total_redemptions: 45,
            total_amount_due: 12960,
            batches: [
              {
                batch_id: 'BATCH-20251107-TEST-001',
                redemptions_count: 45,
                wholesale_rate: 288,
                amount_due: 12960
              }
            ]
          }
        ]
      };
    }
  }

  async getBatchRedemptions(batchId: string): Promise<any[]> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Would need to join with redemption_events table
      // This is a complex query that links batch -> tickets -> redemption_events
      return [];
    } else {
      // Mock implementation
      return [
        {
          ticket_code: `CRUISE-2025-FERRY-001`,
          function_code: 'ferry_boarding',
          redeemed_at: new Date().toISOString(),
          venue_name: 'Central Ferry Terminal',
          wholesale_price: 288
        },
        {
          ticket_code: `CRUISE-2025-FERRY-002`,
          function_code: 'deck_access',
          redeemed_at: new Date().toISOString(),
          venue_name: 'Main Deck',
          wholesale_price: 288
        }
      ];
    }
  }

  async getCampaignAnalytics(campaignType?: string, dateRange?: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      if (campaignType) {
        const batches = await repo.findBatchesByCampaignType(campaignType);
        // Aggregate analytics for this campaign type
        const totalBatches = batches.length;
        const totalGenerated = batches.reduce((sum, b) => sum + b.tickets_generated, 0);
        const totalRedeemed = batches.reduce((sum, b) => sum + b.tickets_redeemed, 0);

        return {
          campaign_summaries: [
            {
              campaign_type: campaignType,
              total_batches: totalBatches,
              total_tickets_generated: totalGenerated,
              total_tickets_redeemed: totalRedeemed,
              average_conversion_rate: totalGenerated > 0 ? totalRedeemed / totalGenerated : 0,
              top_performing_resellers: [] // Would need aggregation logic
            }
          ]
        };
      } else {
        // Return all campaign types
        return { campaign_summaries: [] };
      }
    } else {
      // Mock implementation
      return {
        campaign_summaries: [
          {
            campaign_type: campaignType || 'early_bird',
            total_batches: 5,
            total_tickets_generated: 500,
            total_tickets_redeemed: 225,
            average_conversion_rate: 0.45,
            top_performing_resellers: ['Travel Agency ABC', 'Resort Partners Ltd']
          }
        ]
      };
    }
  }
}

export const otaService = new OTAService();

// Schedule periodic cleanup of expired reservations
setInterval(() => {
  otaService.expireOldReservations().catch(error => {
    logger.error('Failed to expire reservations', error);
  });
}, 5 * 60 * 1000); // Every 5 minutes