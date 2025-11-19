import { ERR } from '../../core/errors/codes';
import { logger } from '../../utils/logger';
import { AppDataSource } from '../../config/database';
import { OTARepository } from './domain/ota.repository';
import { mockDataStore } from '../../core/mock/data';
import { dataSourceConfig } from '../../config/data-source';
import { API_KEYS } from '../../middlewares/otaAuth';
import { generateSecureQR } from '../../utils/qr-crypto';
import { TicketRawMetadata } from '../../types/domain';

export interface OTAInventoryResponse {
  available_quantities: { [productId: number]: number };
  pricing_context: {
    base_prices: { [productId: number]: { weekday: number; weekend: number } };
    customer_types: string[];
    special_dates: { [date: string]: { multiplier: number } };
    customer_discounts?: { [productId: number]: { [type: string]: number } };
  };
  product_info: {
    [productId: number]: {
      name: string;
      description: string;
      category: string;
    };
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
    weekend_premium?: number;
    customer_discounts?: { [type: string]: number };  // Legacy field (deprecated)
    customer_type_pricing?: Array<{
      customer_type: 'adult' | 'child' | 'elderly';
      unit_price: number;
      discount_applied: number;
    }>;
    currency?: string;
    captured_at?: string;
  };
}

export interface OTAActivateRequest {
  customer_details: {
    name: string;
    email: string;
    phone: string;
  };
  customer_type?: Array<'adult' | 'child' | 'elderly'>;  // Array matching ticket quantity
  visit_date?: string;  // Intended visit date (YYYY-MM-DD) - used for weekend pricing
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
  special_pricing?: {
    base_price: number;
    customer_type_pricing: Array<{
      customer_type: 'adult' | 'child' | 'elderly';
      unit_price: number;
      discount_applied: number;
    }>;
    weekend_premium: number;
    currency: string;
  };
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
  customer_type: 'adult' | 'child' | 'elderly';  // Required: determines pricing
  visit_date?: string;  // Optional: YYYY-MM-DD format - used for weekend pricing calculation
  payment_reference: string;
}

export interface OTATicketActivateResponse {
  ticket_code: string;
  order_id: string;
  customer_name: string;
  customer_type: 'adult' | 'child' | 'elderly';
  ticket_price: number;
  currency: string;
  status: string;
  activated_at: string;
}

/**
 * Helper function: Check if a date is a weekend (Saturday or Sunday)
 * @param dateString - Date in YYYY-MM-DD format or Date object
 * @returns true if Saturday (6) or Sunday (0), false otherwise
 */
function isWeekend(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;  // Sunday = 0, Saturday = 6
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

  async getInventory(productIds?: number[], partnerId?: string): Promise<OTAInventoryResponse> {
    logger.info('ota.inventory.requested', { product_ids: productIds, partner_id: partnerId });

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Use database
      const repo = await this.getRepository();

      // Query strategy based on whether productIds are specified
      let inventories;
      if (productIds && productIds.length > 0) {
        // Query specific products if requested
        inventories = await repo.getInventoryByProductIds(productIds);
      } else {
        // Query all active products (no hardcoded list)
        inventories = await repo.getAllInventories();
      }

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
      const product_info: { [productId: number]: { name: string; description: string; category: string } } = {};

      const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback to 'ota'

      for (const inventory of inventories) {
        // Get available quantity for this partner's channel
        const available = inventory.getChannelAvailable(channelId);

        // Only include products where this partner has allocated inventory (even if currently 0 available)
        const channelAllocation = inventory.getChannelAllocation(channelId);
        if (channelAllocation && channelAllocation.allocated > 0) {
          // Include product even if temporarily sold out (available = 0)
          // This helps partners see their full product catalog
          availability[inventory.product_id] = available;

          // Get pricing and product info
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

            // Add product info
            product_info[inventory.product_id] = {
              name: inventory.product.name,
              description: inventory.product.description,
              category: inventory.product.category
            };
          }
        }
      }

      logger.info('ota.inventory.response', {
        source: 'database',
        partner_id: partnerId,
        channel_id: channelId,
        available_products: Object.keys(availability).length,
        total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
      });

      return { available_quantities: availability, pricing_context, product_info };
    } else {
      // Fallback to mock data
      logger.warn('ota.inventory.fallback_to_mock', { reason: 'database_unavailable' });

      const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback to 'ota'
      const mockProducts = productIds || [106, 107, 108]; // Default mock products
      const availability = mockDataStore.getChannelAvailability(channelId, mockProducts);
      const pricing_context = {
        base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
        customer_types: ['adult', 'child', 'elderly'],
        special_dates: {
          '2025-12-31': { multiplier: 1.5 },
          '2026-02-18': { multiplier: 1.3 }
        },
        customer_discounts: {} as { [productId: number]: { [type: string]: number } }
      };
      const product_info: { [productId: number]: { name: string; description: string; category: string } } = {};

      for (const productId of mockProducts) {
        const product = mockDataStore.getProduct(productId);
        if (product && availability[productId] > 0) {
          pricing_context.base_prices[productId] = {
            weekday: product.unit_price,
            weekend: product.unit_price + 30
          };
          // Add mock product info
          product_info[productId] = {
            name: product.name,
            description: product.name, // Mock uses name as description
            category: 'ferry' // Mock default category
          };
        }
      }

      logger.info('ota.inventory.response', {
        source: 'mock',
        available_products: Object.keys(availability).length,
        total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
      });

      return { available_quantities: availability, pricing_context, product_info };
    }
  }

  async createReservation(request: OTAReserveRequest, partnerId?: string): Promise<OTAReserveResponse> {
    logger.info('ota.reservation.requested', {
      product_id: request.product_id,
      quantity: request.quantity,
      partner_id: partnerId
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

        // Build pricing snapshot with customer type pricing
        const basePrice = Number(product.base_price);
        const weekendPremium = Number(product.weekend_premium || 30.00);

        // Get customer type pricing from product
        // Note: customer_discounts are stored as absolute amounts, not percentages
        // If a customer type is not configured, no discount is applied (use base price)
        const customerTypePricing = product.customer_discounts ? [
          {
            customer_type: 'adult' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.adult ?? 0)),
            discount_applied: Math.round(product.customer_discounts.adult ?? 0)
          },
          {
            customer_type: 'child' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.child ?? 0)),
            discount_applied: Math.round(product.customer_discounts.child ?? 0)
          },
          {
            customer_type: 'elderly' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.elderly ?? 0)),
            discount_applied: Math.round(product.customer_discounts.elderly ?? 0)
          }
        ] : [
          // Fallback if no customer discounts defined at all
          { customer_type: 'adult' as const, unit_price: basePrice, discount_applied: 0 },
          { customer_type: 'child' as const, unit_price: basePrice, discount_applied: 0 },
          { customer_type: 'elderly' as const, unit_price: basePrice, discount_applied: 0 }
        ];

        const pricing_snapshot = {
          base_price: basePrice,
          customer_type_pricing: customerTypePricing,
          weekend_premium: weekendPremium,
          currency: 'HKD',
          captured_at: new Date().toISOString()
        };

        // Create reservation with database transaction
        const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback
        const reservation = await repo.createReservation(
          request.product_id,
          channelId,
          request.quantity,
          expiresAt,
          pricing_snapshot
        );

        if (!reservation) {
          // Get current availability for error message
          const inventory = await repo.getInventoryByProductId(request.product_id);
          const available = inventory ? inventory.getChannelAvailable(partnerId || 'ota') : 0;

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

      const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback
      if (!product.channel_allocations[channelId]) {
        throw {
          code: 'CHANNEL_NOT_AVAILABLE',
          message: `Product ${request.product_id} is not available for channel ${channelId}`
        };
      }

      const ttlHours = (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      const reservation = mockDataStore.createChannelReservation(
        request.product_id,
        channelId,
        request.quantity,
        ttlHours
      );

      if (!reservation) {
        const channelId = partnerId || 'ota';
        const availability = mockDataStore.getChannelAvailability(channelId, [request.product_id]);
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

  async getActiveReservations(partnerId?: string) {
    const channelId = partnerId || 'ota';

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const reservations = await repo.findActiveReservations(channelId);
      return reservations.map(r => ({
        reservation_id: r.reservation_id,
        product_id: r.product_id,
        quantity: r.quantity,
        expires_at: r.expires_at.toISOString(),
        created_at: r.created_at.toISOString()
      }));
    } else {
      const reservations = mockDataStore.getActiveReservations(channelId);
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
      // Database implementation
      try {
        const repo = await this.getRepository();
        const result = await repo.activateReservationWithOrder(
          reservationId,
          {
            name: request.customer_details.name,
            email: request.customer_details.email,
            phone: request.customer_details.phone
          },
          request.payment_reference,
          request.special_requests,
          request.customer_type
        );

        logger.info('ota.reservation.activated', {
          source: 'database',
          reservation_id: reservationId,
          order_id: result.order.order_id,
          total_amount: result.order.total_amount,
          tickets_generated: result.tickets.length
        });

        return {
          order_id: result.order.order_id,
          tickets: result.tickets.map(ticket => ({
            code: ticket.ticket_code,
            qr_code: ticket.qr_code,
            customer_type: ticket.customer_type,
            entitlements: ticket.entitlements,
            status: ticket.status
          })),
          total_amount: Number(result.order.total_amount),
          confirmation_code: result.order.confirmation_code
        };

      } catch (error: any) {
        logger.error('ota.reservation.database_activation_failed', {
          reservation_id: reservationId,
          error: error.message
        });
        throw {
          code: ERR.VALIDATION_ERROR,
          message: error.message || 'Failed to activate reservation'
        };
      }
    }

    // Mock implementation (fallback when database not available)
    const order = mockDataStore.activateReservation(
      reservationId,
      request.customer_details,
      request.payment_reference,
      request.customer_type
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

  async getOrders(partnerId?: string): Promise<any[]> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      const orders = await this.otaRepository!.findOTAOrdersByChannel(partnerId);
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
    const channelId = partnerId || 'ota';
    const orders = mockDataStore.getOrdersByChannel(channelId);
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
        customer_type: ticket.customer_type,
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
        customer_type: ticket.customer_type,
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

      // Get product from database first (needed for pricing and inventory)
      const product = await this.otaRepository!.findProductById(request.product_id);
      if (!product) {
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `Product ${request.product_id} not found`
        };
      }

      // Build pricing snapshot from product or special pricing
      let pricingSnapshot;
      if (request.special_pricing) {
        // Use custom special pricing
        pricingSnapshot = {
          base_product_id: request.product_id,
          base_price: request.special_pricing.base_price,
          customer_type_pricing: request.special_pricing.customer_type_pricing,
          weekend_premium: request.special_pricing.weekend_premium,
          currency: request.special_pricing.currency,
          captured_at: new Date().toISOString()
        };

        // DEBUG: Log special pricing before saving
        logger.info('ota.batch.special_pricing_applied', {
          batch_id: request.batch_id,
          product_id: request.product_id,
          pricing_snapshot: pricingSnapshot
        });
      } else {
        // Use pricing from product entity
        const basePrice = Number(product.base_price);
        const weekendPremium = Number(product.weekend_premium || 30);
        const currency = 'HKD';

        // Get customer type pricing from product or calculate defaults
        // Note: customer_discounts are stored as absolute amounts, not percentages
        const customerTypePricing = product.customer_discounts ? [
          {
            customer_type: 'adult' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.adult || 0)),
            discount_applied: Math.round(product.customer_discounts.adult || 0)
          },
          {
            customer_type: 'child' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.child || Math.round(basePrice * 0.35))),
            discount_applied: Math.round(product.customer_discounts.child || Math.round(basePrice * 0.35))
          },
          {
            customer_type: 'elderly' as const,
            unit_price: Math.round(basePrice - (product.customer_discounts.elderly || Math.round(basePrice * 0.17))),
            discount_applied: Math.round(product.customer_discounts.elderly || Math.round(basePrice * 0.17))
          }
        ] : [
          // Fallback defaults if no customer discounts defined
          { customer_type: 'adult' as const, unit_price: basePrice, discount_applied: 0 },
          { customer_type: 'child' as const, unit_price: Math.round(basePrice * 0.65), discount_applied: Math.round(basePrice * 0.35) },
          { customer_type: 'elderly' as const, unit_price: Math.round(basePrice * 0.83), discount_applied: Math.round(basePrice * 0.17) }
        ];

        pricingSnapshot = {
          base_product_id: request.product_id,
          base_price: basePrice,
          customer_type_pricing: customerTypePricing,
          weekend_premium: weekendPremium,
          currency,
          captured_at: new Date().toISOString()
        };
      }

      // ⚠️ IMPORTANT: Check inventory FIRST before creating batch
      // This prevents orphaned batches when inventory is insufficient
      const inventory = product.inventory[0]; // There should be one inventory per product
      if (!inventory) {
        throw {
          code: ERR.PRODUCT_NOT_FOUND,
          message: `No inventory found for product ${request.product_id}`
        };
      }

      const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback
      const available = inventory.getChannelAvailable(channelId);
      if (available < request.quantity) {
        throw {
          code: ERR.SOLD_OUT,
          message: `Insufficient inventory for channel ${channelId}. Available: ${available}, Requested: ${request.quantity}`
        };
      }

      // Create batch record AFTER inventory validation passes
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
        pricing_snapshot: pricingSnapshot
      };

      const batch = await repo.createTicketBatch(batchData);

      // Generate tickets for database
      const tickets = [];
      for (let i = 0; i < request.quantity; i++) {
        const ticketId = Date.now() + (Math.random() * 1000) + i; // Unique ID with index
        const ticketCode = `CRUISE-${new Date().getFullYear()}-${product.category.toUpperCase()}-${Math.floor(ticketId)}`;

        // Use entitlements from product or default cruise functions
        const entitlements = product.entitlements?.map((entitlement: any) => ({
          function_code: entitlement.type,
          remaining_uses: 1
        })) || [
          { function_code: 'ferry', remaining_uses: 1 },
          { function_code: 'deck_access', remaining_uses: 1 },
          { function_code: 'dining', remaining_uses: 1 }
        ];

        // Generate QR code for bulk pre-generated tickets (for printing/PDF distribution)
        // OTA tickets: permanent QR codes (100 years = 52,560,000 minutes)
        const qrResult = await generateSecureQR(ticketCode, 52560000);
        const rawMetadata: TicketRawMetadata = {
          jti: {
            pre_generated_jti: qrResult.jti,
            current_jti: qrResult.jti
          },
          qr_metadata: {
            issued_at: new Date().toISOString(),
            expires_at: qrResult.expires_at
          }
        };

        const ticket = {
          ticket_code: ticketCode,
          product_id: product.id,
          batch_id: request.batch_id,
          partner_id: partnerId,
          status: 'PRE_GENERATED' as const,
          entitlements,
          qr_code: qrResult.qr_image, // Store QR image for printing/PDF generation
          raw: rawMetadata,
          created_at: new Date()
        };

        tickets.push(ticket);
      }

      // Save to database with inventory update
      const savedTickets = await this.otaRepository!.createPreGeneratedTickets(tickets, channelId);

      // Note: Batch statistics (tickets_generated, etc.) are now computed on-demand via JOIN queries
      // No need to update counters in the batch table

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

    // Check if we have enough channel allocation
    const channelId = partnerId || 'ota'; // Use partner-specific channel or fallback
    const availability = mockDataStore.getChannelAvailability(channelId, [request.product_id]);
    if (availability[request.product_id] < request.quantity) {
      throw {
        code: ERR.SOLD_OUT,
        message: `Insufficient inventory for channel ${channelId}. Available: ${availability[request.product_id]}, Requested: ${request.quantity}`
      };
    }

    // Generate pre-made tickets
    const tickets = [];
    for (let i = 0; i < request.quantity; i++) {
      const ticketId = mockDataStore.nextTicketId++;
      const ticketCode = `${product.sku}-${ticketId}`;

      // Generate QR code for bulk pre-generated tickets (for printing/PDF distribution)
      // OTA tickets: permanent QR codes (100 years = 52,560,000 minutes)
      const qrResult = await generateSecureQR(ticketCode, 52560000);
      const rawMetadata: TicketRawMetadata = {
        jti: {
          pre_generated_jti: qrResult.jti,
          current_jti: qrResult.jti
        },
        qr_metadata: {
          issued_at: new Date().toISOString(),
          expires_at: qrResult.expires_at
        }
      };

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
        qr_code: qrResult.qr_image, // Store QR image for printing/PDF generation
        raw: rawMetadata,
        created_at: new Date(),
        customer_name: null,
        customer_email: null,
        order_id: null
      };

      tickets.push(ticket);
      mockDataStore.preGeneratedTickets.set(ticketCode, ticket);
    }

    // Reserve inventory for this batch
    mockDataStore.reserveChannelInventory(channelId, request.product_id, request.quantity);

    // Create and store mock batch data
    const mockBatch = {
      batch_id: request.batch_id,
      distribution_mode: request.distribution_mode || 'direct_sale',
      pricing_snapshot: request.special_pricing ? {
        base_product_id: request.product_id,
        base_price: request.special_pricing.base_price,
        customer_type_pricing: request.special_pricing.customer_type_pricing,
        weekend_premium: request.special_pricing.weekend_premium,
        currency: request.special_pricing.currency,
        captured_at: new Date().toISOString()
      } : {
        base_product_id: request.product_id,
        base_price: Number(product.unit_price),
        customer_type_pricing: product.customer_discounts ? [
          {
            customer_type: 'adult',
            unit_price: Math.round(Number(product.unit_price) - (product.customer_discounts.adult || 0)),
            discount_applied: Math.round(product.customer_discounts.adult || 0)
          },
          {
            customer_type: 'child',
            unit_price: Math.round(Number(product.unit_price) - (product.customer_discounts.child || Math.round(Number(product.unit_price) * 0.35))),
            discount_applied: Math.round(product.customer_discounts.child || Math.round(Number(product.unit_price) * 0.35))
          },
          {
            customer_type: 'elderly',
            unit_price: Math.round(Number(product.unit_price) - (product.customer_discounts.elderly || Math.round(Number(product.unit_price) * 0.17))),
            discount_applied: Math.round(product.customer_discounts.elderly || Math.round(Number(product.unit_price) * 0.17))
          }
        ] : [
          { customer_type: 'adult', unit_price: Number(product.unit_price), discount_applied: 0 },
          { customer_type: 'child', unit_price: Math.round(Number(product.unit_price) * 0.65), discount_applied: Math.round(Number(product.unit_price) * 0.35) },
          { customer_type: 'elderly', unit_price: Math.round(Number(product.unit_price) * 0.83), discount_applied: Math.round(Number(product.unit_price) * 0.17) }
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
        // qr_code removed - will be generated on-demand via POST /qr/{code}
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

      try {
        const repo = await this.getRepository();

        // First, get the ticket to access batch pricing information
        const ticket = await repo.findPreGeneratedTicket(ticketCode);
        if (!ticket || ticket.status !== 'PRE_GENERATED' || ticket.partner_id !== partnerId) {
          throw {
            code: 'TICKET_NOT_FOUND',
            message: `Ticket ${ticketCode} not found or already activated`
          };
        }

        // Get batch to retrieve pricing snapshot
        const batch = await repo.findBatchById(ticket.batch_id);
        if (!batch) {
          throw {
            code: 'BATCH_NOT_FOUND',
            message: `Batch ${ticket.batch_id} not found`
          };
        }

        // DEBUG: Log complete pricing snapshot from database
        logger.info('ota.ticket.activation_pricing_debug', {
          ticket_code: ticketCode,
          batch_id: ticket.batch_id,
          pricing_snapshot: batch.pricing_snapshot,
          requested_customer_type: request.customer_type
        });

        // Find price for customer type from batch pricing snapshot
        const customerTypePricing = batch.pricing_snapshot.customer_type_pricing.find(
          (p: any) => p.customer_type === request.customer_type
        );

        if (!customerTypePricing) {
          throw {
            code: 'INVALID_CUSTOMER_TYPE',
            message: `Customer type ${request.customer_type} not available for this batch`
          };
        }

        // Calculate ticket price with optional weekend premium
        let ticketPrice = customerTypePricing.unit_price;
        const currency = batch.pricing_snapshot.currency || 'HKD';
        let weekendPremiumApplied = 0;

        // Apply weekend premium if visit_date is provided and is a weekend
        if (request.visit_date && isWeekend(request.visit_date)) {
          const weekendPremium = batch.pricing_snapshot.weekend_premium || 0;
          weekendPremiumApplied = weekendPremium;
          ticketPrice += weekendPremium;

          logger.info('ota.ticket.weekend_pricing_applied', {
            ticket_code: ticketCode,
            visit_date: request.visit_date,
            is_weekend: true,
            base_price: customerTypePricing.unit_price,
            weekend_premium: weekendPremium,
            final_price: ticketPrice
          });
        } else if (request.visit_date) {
          logger.info('ota.ticket.weekday_pricing', {
            ticket_code: ticketCode,
            visit_date: request.visit_date,
            is_weekend: false,
            price: ticketPrice
          });
        }

        // DEBUG: Log extracted price details
        logger.info('ota.ticket.activation_price_extracted', {
          ticket_code: ticketCode,
          customer_type: request.customer_type,
          customer_type_pricing: customerTypePricing,
          weekend_premium_applied: weekendPremiumApplied,
          final_ticket_price: ticketPrice,
          currency: currency
        });

        // VALIDATION: Check for anomalous pricing
        const basePrice = batch.pricing_snapshot.base_price || 0;
        if (ticketPrice > basePrice * 2) {
          logger.warn('ota.ticket.pricing_anomaly_detected', {
            ticket_code: ticketCode,
            batch_id: ticket.batch_id,
            ticket_price: ticketPrice,
            base_price: basePrice,
            ratio: ticketPrice / basePrice,
            message: 'Ticket price exceeds 2x base price - possible pricing error'
          });
        }

        // Generate order ID
        const orderId = `ORD-${Date.now()}`;
        const now = new Date();

        // Prepare order data with correct pricing
        const orderData = {
          order_id: orderId,
          product_id: ticket.product_id,
          channel_id: 2, // OTA channel
          total_amount: ticketPrice, // Use actual price based on customer type
          status: 'confirmed' as const,
          confirmation_code: `CONF-${Date.now()}`,
          created_at: now
        };

        // Prepare raw metadata for audit trail
        const rawMetadata: any = {
          payment_reference: request.payment_reference,
          pricing_breakdown: {
            base_price: customerTypePricing.unit_price,
            weekend_premium_applied: weekendPremiumApplied,
            final_price: ticketPrice
          }
        };

        // Record visit_date in raw field for audit
        if (request.visit_date) {
          rawMetadata.visit_date = request.visit_date;
          rawMetadata.is_weekend_ticket = isWeekend(request.visit_date);
        }

        // Use repository to activate ticket and create order atomically
        const result = await this.otaRepository!.activatePreGeneratedTicket(
          ticketCode,
          partnerId,
          {
            customer_name: request.customer_details.name,
            customer_email: request.customer_details.email,
            customer_phone: request.customer_details.phone,
            customer_type: request.customer_type,
            payment_reference: request.payment_reference,
            raw: rawMetadata
          },
          orderData
        );

        logger.info('ota.ticket.activation_database_completed', {
          ticket_code: ticketCode,
          order_id: result.order.order_id,
          customer_name: result.ticket.customer_name,
          customer_type: request.customer_type,
          ticket_price: ticketPrice
        });

        return {
          ticket_code: ticketCode,
          order_id: result.order.order_id,
          customer_name: result.ticket.customer_name!,
          customer_type: request.customer_type,
          ticket_price: ticketPrice,
          currency: currency,
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

    // Get batch pricing information
    const batch = mockDataStore.getBatch(ticket.batch_id);
    if (!batch) {
      throw {
        code: 'BATCH_NOT_FOUND',
        message: `Batch ${ticket.batch_id} not found`
      };
    }

    // DEBUG: Log complete pricing snapshot from mock store
    logger.info('ota.ticket.activation_pricing_debug_mock', {
      ticket_code: ticketCode,
      batch_id: ticket.batch_id,
      pricing_snapshot: batch.pricing_snapshot,
      requested_customer_type: request.customer_type
    });

    // Find price for customer type
    const customerTypePricing = batch.pricing_snapshot.customer_type_pricing.find(
      (p: any) => p.customer_type === request.customer_type
    );

    if (!customerTypePricing) {
      throw {
        code: 'INVALID_CUSTOMER_TYPE',
        message: `Customer type ${request.customer_type} not available for this batch`
      };
    }

    const ticketPrice = customerTypePricing.unit_price;
    const currency = batch.pricing_snapshot.currency || 'HKD';

    // DEBUG: Log extracted price details
    logger.info('ota.ticket.activation_price_extracted_mock', {
      ticket_code: ticketCode,
      customer_type: request.customer_type,
      customer_type_pricing: customerTypePricing,
      final_ticket_price: ticketPrice,
      currency: currency
    });

    // VALIDATION: Check for anomalous pricing
    const basePrice = batch.pricing_snapshot.base_price || 0;
    if (ticketPrice > basePrice * 2) {
      logger.warn('ota.ticket.pricing_anomaly_detected_mock', {
        ticket_code: ticketCode,
        batch_id: ticket.batch_id,
        ticket_price: ticketPrice,
        base_price: basePrice,
        ratio: ticketPrice / basePrice,
        message: 'Ticket price exceeds 2x base price - possible pricing error'
      });
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
      total_amount: ticketPrice, // Use actual price based on customer type
      status: 'confirmed',
      created_at: now,
      confirmation_code: `CONF-${mockDataStore.nextOrderId}`,
      tickets: [ticket]
    };

    // Generate new QR code with new JTI for activation (90 days expiry)
    // Update ticket with customer details and activation status
    // Note: QR codes are generated on-demand when requested via POST /qr/{code}
    // NOT stored in database to maintain security and freshness
    ticket.customer_name = request.customer_details.name;
    ticket.customer_email = request.customer_details.email;
    ticket.customer_phone = request.customer_details.phone;
    ticket.customer_type = request.customer_type;
    ticket.order_id = orderId;
    ticket.status = 'ACTIVE';
    ticket.activated_at = now;
    // QR code removed - will be generated on-demand via POST /qr/{code}

    // Store the order
    mockDataStore.addOrder(orderId, order);

    logger.info('ota.ticket.activation_completed', {
      ticket_code: ticketCode,
      order_id: orderId,
      customer_name: request.customer_details.name,
      customer_type: request.customer_type,
      ticket_price: ticketPrice
    });

    return {
      ticket_code: ticketCode,
      order_id: orderId,
      customer_name: request.customer_details.name,
      customer_type: request.customer_type,
      ticket_price: ticketPrice,
      currency: currency,
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
      // Mock implementation - dynamically calculate from actual ticket statuses
      const storedBatch = mockDataStore.getBatch(batchId);
      if (!storedBatch) return null;

      // Dynamically count tickets by status
      const tickets = Array.from(mockDataStore.preGeneratedTickets.values())
        .filter(t => t.batch_id === batchId);

      const tickets_generated = tickets.length;
      const tickets_activated = tickets.filter(t => t.status === 'ACTIVE' || t.status === 'REDEEMED').length;
      const tickets_redeemed = tickets.filter(t => t.status === 'REDEEMED').length;

      const basePrice = storedBatch.pricing_snapshot?.base_price || 288;

      // DEBUG: Log created_at details
      logger.info('batch.analytics.created_at_debug', {
        batch_id: batchId,
        created_at_type: typeof storedBatch.created_at,
        created_at_value: storedBatch.created_at,
        created_at_iso: storedBatch.created_at?.toISOString?.(),
        has_getMilliseconds: typeof storedBatch.created_at?.getMilliseconds === 'function',
        milliseconds: storedBatch.created_at?.getMilliseconds?.()
      });

      return {
        batch_id: batchId,
        reseller_name: storedBatch.reseller_metadata?.intended_reseller || "Direct Sale",
        campaign_type: storedBatch.batch_metadata?.campaign_type || "standard",
        campaign_name: storedBatch.batch_metadata?.campaign_name || "Standard Batch",
        generated_at: storedBatch.created_at?.toISOString() || new Date().toISOString(),
        tickets_generated,
        tickets_activated,
        tickets_redeemed,
        conversion_rates: {
          activation_rate: tickets_generated > 0 ? tickets_activated / tickets_generated : 0,
          redemption_rate: tickets_activated > 0 ? tickets_redeemed / tickets_activated : 0,
          overall_utilization: tickets_generated > 0 ? tickets_redeemed / tickets_generated : 0
        },
        revenue_metrics: {
          potential_revenue: tickets_generated * basePrice,
          realized_revenue: tickets_redeemed * basePrice,
          realization_rate: tickets_generated > 0 ? tickets_redeemed / tickets_generated : 0
        },
        wholesale_rate: basePrice,
        amount_due: (tickets_redeemed * basePrice).toFixed(2),
        batch_metadata: storedBatch.batch_metadata || {}
      };
    }
  }

  async getResellerBillingSummary(partnerId: string, reseller: string, period: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      if (reseller === 'all') {
        // NEW: Aggregate billing summary across all active resellers
        const allResellers = await repo.findResellersByPartner(partnerId);

        if (allResellers.length === 0) {
          return {
            billing_period: period,
            reseller_summaries: []
          };
        }

        // Get billing summary for each reseller
        const reseller_summaries = [];
        for (const resellerEntity of allResellers) {
          const summary = await repo.getResellerBillingSummary(resellerEntity.reseller_name, period);
          if (summary.reseller_summaries && summary.reseller_summaries.length > 0) {
            reseller_summaries.push(...summary.reseller_summaries);
          }
        }

        return {
          billing_period: period,
          reseller_summaries
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
      const repo = await this.getRepository();
      return await repo.getBatchRedemptions(batchId);
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

  async getCampaignAnalytics(partnerId: string, campaignType?: string, dateRange?: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();

      // Use optimized query with stats for ALL cases (no N+1 query problem)
      // Filter by partnerId to ensure data isolation
      const allBatches = await repo.findBatchesWithStats(partnerId);

      // Filter by campaign_type if specified
      let filteredBatches = allBatches;
      if (campaignType) {
        filteredBatches = allBatches.filter((batch: any) => {
          const type = batch.batch_metadata?.campaign_type || 'standard';
          return type === campaignType;
        });
      }

      // Filter by date_range if provided
      if (dateRange) {
        filteredBatches = filteredBatches.filter((batch: any) => {
          const batchDate = batch.created_at.toISOString().slice(0, 7); // YYYY-MM
          return batchDate === dateRange;
        });
      }

      if (campaignType) {
        // Return single campaign type analytics
        const totalGenerated = filteredBatches.reduce((sum, b) => sum + (b.tickets_generated ?? 0), 0);
        const totalRedeemed = filteredBatches.reduce((sum, b) => sum + (b.tickets_redeemed ?? 0), 0);

        return {
          campaign_summaries: [
            {
              campaign_type: campaignType,
              total_batches: filteredBatches.length,
              total_tickets_generated: totalGenerated,
              total_tickets_redeemed: totalRedeemed,
              average_conversion_rate: totalGenerated > 0 ? totalRedeemed / totalGenerated : 0,
              top_performing_resellers: [] // Would need aggregation logic
            }
          ]
        };
      } else {
        // Return all campaign types aggregated
        // Already have filteredBatches from above

        // Group by campaign_type
        const campaignGroups: { [key: string]: any[] } = {};
        filteredBatches.forEach((batch: any) => {
          const type = batch.batch_metadata?.campaign_type || 'standard';
          if (!campaignGroups[type]) {
            campaignGroups[type] = [];
          }
          campaignGroups[type].push(batch);
        });

        // Generate summaries for each campaign type
        const summaries = Object.keys(campaignGroups).map(type => {
          const batches = campaignGroups[type];
          const totalGenerated = batches.reduce((sum, b) => sum + (b.tickets_generated ?? 0), 0);
          const totalRedeemed = batches.reduce((sum, b) => sum + (b.tickets_redeemed ?? 0), 0);

          return {
            campaign_type: type,
            total_batches: batches.length,
            total_tickets_generated: totalGenerated,
            total_tickets_redeemed: totalRedeemed,
            average_conversion_rate: totalGenerated > 0 ? totalRedeemed / totalGenerated : 0,
            top_performing_resellers: []
          };
        });

        return { campaign_summaries: summaries };
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
  
  async getTickets(partnerId: string, filters: {
    status?: string;
    batch_id?: string;
    created_after?: string;
    created_before?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: any[]; total_count: number; page: number; page_size: number }> {
    logger.info('ota.tickets.list_requested', { partner_id: partnerId, filters });

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 100, 1000); // Max 1000 per page

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      // Database implementation
      logger.info('ota.tickets.database_mode', { filters });

      try {
        // Prepare database filters
        const dbFilters: any = {
          page,
          limit
        };

        if (filters.status) {
          dbFilters.status = filters.status as any; // TypeORM will validate the enum
        }

        if (filters.batch_id) {
          dbFilters.batch_id = filters.batch_id;
        }

        if (filters.created_after) {
          dbFilters.created_after = new Date(filters.created_after);
        }

        if (filters.created_before) {
          dbFilters.created_before = new Date(filters.created_before);
        }

        // Query from database with partner isolation
        const result = await this.otaRepository!.findPreGeneratedTickets(partnerId, dbFilters);

        logger.info('ota.tickets.list_response', {
          source: 'database',
          total_count: result.total,
          page,
          page_size: limit,
          returned: result.tickets.length
        });

        return {
          tickets: result.tickets.map(ticket => ({
            ticket_code: ticket.ticket_code,
            status: ticket.status,
            batch_id: ticket.batch_id,
            product_id: ticket.product_id,
            qr_code: ticket.qr_code,
            created_at: ticket.created_at.toISOString(),
            activated_at: ticket.activated_at ? ticket.activated_at.toISOString() : null,
            order_id: ticket.order_id || null,
            customer_name: ticket.customer_name || null,
            customer_email: ticket.customer_email || null
          })),
          total_count: result.total,
          page,
          page_size: limit
        };
      } catch (error) {
        logger.error('ota.tickets.database_query_failed', { error });
        throw error;
      }
    }

    // Mock implementation
    let allTickets = Array.from(mockDataStore.preGeneratedTickets.values());

    // IMPORTANT: Filter by partner_id first for security isolation
    allTickets = allTickets.filter(ticket => ticket.partner_id === partnerId);

    logger.info('ota.tickets.after_partner_filter', {
      partner_id: partnerId,
      total_tickets_for_partner: allTickets.length,
      first_ticket: allTickets[0] ? { code: allTickets[0].code, status: allTickets[0].status, partner_id: allTickets[0].partner_id } : null
    });

    // Apply filters
    if (filters.status) {
      allTickets = allTickets.filter(ticket => ticket.status === filters.status);
    }

    if (filters.batch_id) {
      allTickets = allTickets.filter(ticket => ticket.batch_id === filters.batch_id);
    }

    if (filters.created_after) {
      const afterDate = new Date(filters.created_after);
      allTickets = allTickets.filter(ticket => new Date(ticket.created_at) >= afterDate);
    }

    if (filters.created_before) {
      const beforeDate = new Date(filters.created_before);
      allTickets = allTickets.filter(ticket => new Date(ticket.created_at) <= beforeDate);
    }

    // Sort by created_at descending (newest first)
    allTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalCount = allTickets.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTickets = allTickets.slice(startIndex, endIndex);

    logger.info('ota.tickets.list_response', {
      source: 'mock',
      total_count: totalCount,
      page,
      page_size: limit,
      returned: paginatedTickets.length
    });

    return {
      tickets: paginatedTickets.map(ticket => ({
        ticket_code: ticket.code,
        status: ticket.status,
        batch_id: ticket.batch_id,
        product_id: ticket.product_id,
        qr_code: ticket.qr_code,
        created_at: ticket.created_at.toISOString(),
        activated_at: ticket.activated_at ? ticket.activated_at.toISOString() : null,
        order_id: ticket.order_id,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email
      })),
      total_count: totalCount,
      page,
      page_size: limit
    };
  }

  // ============= ADMIN MANAGEMENT METHODS =============

  /**
   * Get all OTA partners
   * Admin only - requires admin:read permission
   */
  async getAllPartners() {
    logger.info('ota.admin.get_all_partners');

    const partners = Array.from(API_KEYS.entries()).map(([apiKey, data]) => ({
      partner_id: data.partner_id,
      partner_name: data.partner_name,
      api_key_prefix: apiKey.substring(0, 10) + '...', // Security: only show prefix
      permissions: data.permissions,
      rate_limit: data.rate_limit,
      status: 'active' // All current partners are active (hardcoded)
    }));

    logger.info('ota.admin.partners_retrieved', { count: partners.length });

    return partners;
  }

  /**
   * Get statistics for a specific partner
   * Admin only - requires admin:read permission
   */
  async getPartnerStatistics(partnerId: string, dateRange?: { start_date?: string; end_date?: string }) {
    logger.info('ota.admin.get_partner_statistics', { partner_id: partnerId, date_range: dateRange });

    // Find partner info
    const partnerEntry = Array.from(API_KEYS.entries()).find(([_, data]) => data.partner_id === partnerId);
    if (!partnerEntry) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: `Partner ${partnerId} not found`
      };
    }

    const [_, partnerData] = partnerEntry;

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();

      // Get aggregated statistics from repository
      const [ordersSummary, reservationsSummary, ticketsSummary, inventoryUsage] = await Promise.all([
        repo.getPartnerOrdersSummary(partnerId, dateRange),
        repo.getPartnerReservationsSummary(partnerId, dateRange),
        repo.getPartnerTicketsSummary(partnerId),
        repo.getPartnerInventoryUsage(partnerId)
      ]);

      return {
        partner_id: partnerId,
        partner_name: partnerData.partner_name,
        date_range: dateRange || { start_date: null, end_date: null },
        orders: ordersSummary,
        reservations: reservationsSummary,
        tickets: ticketsSummary,
        inventory_usage: inventoryUsage
      };
    } else {
      // Mock mode - return empty statistics
      return {
        partner_id: partnerId,
        partner_name: partnerData.partner_name,
        date_range: dateRange || { start_date: null, end_date: null },
        orders: {
          total_count: 0,
          total_revenue: 0,
          avg_order_value: 0,
          by_status: {}
        },
        reservations: {
          total_count: 0,
          total_quantity: 0,
          by_status: {}
        },
        tickets: {
          total_generated: 0,
          by_status: {}
        },
        inventory_usage: {}
      };
    }
  }

  /**
   * Get platform-wide dashboard summary
   * Admin only - requires admin:read permission
   */
  async getDashboardSummary(dateRange?: { start_date?: string; end_date?: string }) {
    logger.info('ota.admin.get_dashboard_summary', { date_range: dateRange });

    const totalPartners = API_KEYS.size;
    const activePartners = totalPartners; // All current partners are active

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();

      // Get aggregated statistics across all partners
      const [platformSummary, topPartnersRaw, inventoryOverview] = await Promise.all([
        repo.getPlatformSummary(dateRange),
        repo.getTopPartners(5, dateRange),
        repo.getInventoryOverview()
      ]);

      // Filter out partners that no longer exist in API_KEYS
      // Get valid partner IDs from current API_KEYS configuration
      const validPartnerIds = new Set(
        Array.from(API_KEYS.values()).map(data => data.partner_id)
      );

      // Log raw partners from database before filtering
      const rawPartnerIds = topPartnersRaw.map(p => p.partner_id);
      logger.info('ota.admin.dashboard.raw_partners', {
        raw_count: topPartnersRaw.length,
        raw_partners: rawPartnerIds
      });

      const topPartners = topPartnersRaw.filter(partner =>
        validPartnerIds.has(partner.partner_id)
      );

      // Log filtered partners and any that were removed
      const filteredPartnerIds = topPartners.map(p => p.partner_id);
      const removedPartners = rawPartnerIds.filter(id => !validPartnerIds.has(id));

      if (removedPartners.length > 0) {
        logger.info('ota.admin.dashboard.filtered_partners', {
          removed_count: removedPartners.length,
          removed_partners: removedPartners,
          reason: 'Partner no longer exists in API_KEYS'
        });
      }

      logger.info('ota.admin.dashboard.final_partners', {
        final_count: topPartners.length,
        final_partners: filteredPartnerIds
      });

      return {
        summary: {
          total_partners: totalPartners,
          active_partners: activePartners,
          ...platformSummary
        },
        top_partners: topPartners,
        inventory_overview: inventoryOverview
      };
    } else {
      // Mock mode
      return {
        summary: {
          total_partners: totalPartners,
          active_partners: activePartners,
          total_orders: 0,
          total_revenue: 0,
          total_tickets_generated: 0,
          total_tickets_activated: 0
        },
        top_partners: [],
        inventory_overview: {
          total_allocated: 0,
          total_reserved: 0,
          total_sold: 0,
          overall_utilization: '0%'
        }
      };
    }
  }

  // ============= RESELLER MANAGEMENT CRUD (NEW - 2025-11-14) =============

  /**
   * Get reseller summary aggregated from batch metadata (JSON-based)
   * 从批次JSON字段中聚合经销商信息
   */
  async getResellersSummary(
    partnerId: string,
    filters?: {
      status?: string;
      date_range?: string;
      page?: number;
      limit?: number;
      batches_per_reseller?: number;  // 每个经销商显示多少个批次
    }
  ): Promise<any> {
    logger.info('ota.resellers.summary.start', { partnerId, filters, useDatabase: dataSourceConfig.useDatabase });

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100); // 默认20个经销商，最多100个
    const batchesPerReseller = Math.min(filters?.batches_per_reseller || 10, 50); // 每个经销商默认10个批次，最多50个

    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      try {
        logger.info('ota.resellers.summary.using_database', { partnerId, page, limit });
        const repo = await this.getRepository();

        // 1. 获取总数
        const totalCount = await repo.countResellers(partnerId, {
          status: filters?.status,
          date_range: filters?.date_range
        });

        // 2. 获取经销商汇总（带分页）
        const summary = await repo.getResellersSummaryFromBatches(partnerId, {
          status: filters?.status,
          date_range: filters?.date_range,
          page,
          limit
        });

        logger.info('ota.resellers.summary.query_result', { count: summary.length, total: totalCount });

        // 3. 为每个经销商获取批次详情
        const resellersWithBatches = await Promise.all(
          summary.map(async (r: any) => {
            // 获取该经销商的批次列表（前N个）
            const batches = await repo.getResellerBatches(partnerId, r.reseller_name, {
              status: filters?.status,
              limit: batchesPerReseller
            });

            const totalGenerated = parseInt(r.total_tickets_generated || 0);
            const totalActivated = parseInt(r.total_tickets_activated || 0);
            const totalUsed = parseInt(r.total_tickets_used || 0);
            const totalRevenue = parseFloat(r.total_revenue || 0);
            const realizedRevenue = parseFloat(r.realized_revenue || 0);

            return {
              reseller_name: r.reseller_name,
              contact_email: r.contact_email,
              contact_phone: r.contact_phone,

              statistics: {
                total_batches: parseInt(r.total_batches || 0),
                total_tickets_generated: totalGenerated,
                total_tickets_activated: totalActivated,
                total_tickets_used: totalUsed,
                activation_rate: totalGenerated > 0
                  ? parseFloat((totalActivated / totalGenerated).toFixed(2))
                  : 0,
                redemption_rate: totalActivated > 0
                  ? parseFloat((totalUsed / totalActivated).toFixed(2))
                  : 0,
                overall_utilization: totalGenerated > 0
                  ? parseFloat((totalUsed / totalGenerated).toFixed(2))
                  : 0
              },

              revenue_metrics: {
                total_revenue: parseFloat(totalRevenue.toFixed(2)),
                realized_revenue: parseFloat(realizedRevenue.toFixed(2)),
                currency: 'HKD'  // Default currency, could be extracted from pricing_snapshot if needed
              },

              commission: {
                avg_rate: r.avg_commission_rate ? parseFloat(r.avg_commission_rate) : null,
                settlement_cycle: r.settlement_cycle
              },

              // 批次详情列表
              batches: batches.map((b: any) => ({
                batch_id: b.batch_id,
                product_id: b.product_id,
                tickets_count: b.tickets_count,
                status: b.status,
                created_at: b.created_at,
                expires_at: b.expires_at
              })),

              first_batch_date: r.first_batch_date,
              last_batch_date: r.last_batch_date,
              days_active: r.first_batch_date
                ? Math.floor((new Date().getTime() - new Date(r.first_batch_date).getTime()) / (1000 * 60 * 60 * 24))
                : 0
            };
          })
        );

        return {
          total: totalCount,
          page,
          page_size: limit,
          resellers: resellersWithBatches
        };
      } catch (error: any) {
        logger.error('ota.resellers.summary.database_error', {
          partnerId,
          error: error.message,
          stack: error.stack
        });
        // Fall back to mock data on error
        logger.info('ota.resellers.summary.fallback_to_mock', { partnerId });
      }
    }

    // Mock data (default or fallback)
    logger.info('ota.resellers.summary.using_mock', { partnerId });
    return {
        total: 2,
        page: 1,
        page_size: 20,
        resellers: [
          {
            reseller_name: "携程旅行社",
            contact_email: "partner@ctrip.com",
            contact_phone: "138-1234-5678",
            statistics: {
              total_batches: 12,
              total_tickets_generated: 5000,
              total_tickets_activated: 4200,
              activation_rate: 0.84
            },
            commission: {
              avg_rate: 0.15,
              settlement_cycle: "monthly"
            },
            batches: [
              {
                batch_id: "BATCH-20251101-001",
                product_id: 106,
                tickets_count: 500,
                status: "active",
                created_at: "2025-11-01T10:00:00Z",
                expires_at: "2025-12-01T10:00:00Z"
              },
              {
                batch_id: "BATCH-20251115-002",
                product_id: 107,
                tickets_count: 300,
                status: "active",
                created_at: "2025-11-15T14:30:00Z",
                expires_at: "2025-12-15T14:30:00Z"
              }
            ],
            first_batch_date: "2025-10-01",
            last_batch_date: "2025-11-15",
            days_active: 48
          },
          {
            reseller_name: "美团门票",
            contact_email: "tickets@meituan.com",
            contact_phone: "139-9876-5432",
            statistics: {
              total_batches: 8,
              total_tickets_generated: 3000,
              total_tickets_activated: 2800,
              activation_rate: 0.93
            },
            commission: {
              avg_rate: 0.12,
              settlement_cycle: "weekly"
            },
            batches: [
              {
                batch_id: "BATCH-20251105-MT-001",
                product_id: 106,
                tickets_count: 400,
                status: "active",
                created_at: "2025-11-05T09:00:00Z",
                expires_at: "2025-12-05T09:00:00Z"
              }
            ],
            first_batch_date: "2025-11-01",
            last_batch_date: "2025-11-18",
            days_active: 17
          }
        ]
      };
  }

  /**
   * List all resellers for authenticated OTA partner
   */
  async listResellers(partnerId: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const resellers = await repo.findResellersByPartner(partnerId);

      return {
        total: resellers.length,
        resellers: resellers.map(r => ({
          id: r.id,
          reseller_code: r.reseller_code,
          reseller_name: r.reseller_name,
          contact_email: r.contact_email,
          contact_phone: r.contact_phone,
          commission_rate: parseFloat(r.commission_rate.toString()),
          contract_start_date: r.contract_start_date,
          contract_end_date: r.contract_end_date,
          status: r.status,
          settlement_cycle: r.settlement_cycle,
          payment_terms: r.payment_terms,
          region: r.region,
          tier: r.tier,
          created_at: r.created_at,
          updated_at: r.updated_at
        }))
      };
    } else {
      // Mock implementation
      return {
        total: 2,
        resellers: [
          {
            id: 1,
            reseller_code: 'TEST-RESELLER-001',
            reseller_name: 'Test Reseller Alpha',
            contact_email: 'alpha@test.com',
            contact_phone: '+86-138-0000-0001',
            commission_rate: 0.10,
            status: 'active',
            settlement_cycle: 'monthly',
            region: '华南地区',
            tier: 'gold',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 2,
            reseller_code: 'TEST-RESELLER-002',
            reseller_name: 'Test Reseller Beta',
            contact_email: 'beta@test.com',
            commission_rate: 0.12,
            status: 'active',
            settlement_cycle: 'monthly',
            region: '华北地区',
            tier: 'silver',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };
    }
  }

  /**
   * Get single reseller details
   */
  async getResellerById(resellerId: number, partnerId: string): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const reseller = await repo.findResellerById(resellerId, partnerId);

      if (!reseller) {
        return null;
      }

      return {
        id: reseller.id,
        reseller_code: reseller.reseller_code,
        reseller_name: reseller.reseller_name,
        contact_email: reseller.contact_email,
        contact_phone: reseller.contact_phone,
        commission_rate: parseFloat(reseller.commission_rate.toString()),
        contract_start_date: reseller.contract_start_date,
        contract_end_date: reseller.contract_end_date,
        status: reseller.status,
        settlement_cycle: reseller.settlement_cycle,
        payment_terms: reseller.payment_terms,
        region: reseller.region,
        tier: reseller.tier,
        notes: reseller.notes,
        created_at: reseller.created_at,
        updated_at: reseller.updated_at
      };
    } else {
      // Mock implementation
      return {
        id: resellerId,
        reseller_code: 'TEST-RESELLER-001',
        reseller_name: 'Test Reseller Alpha',
        contact_email: 'alpha@test.com',
        contact_phone: '+86-138-0000-0001',
        commission_rate: 0.10,
        status: 'active',
        settlement_cycle: 'monthly',
        payment_terms: 'Net 30',
        region: '华南地区',
        tier: 'gold',
        notes: 'Mock reseller for testing',
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  }

  /**
   * Create new reseller
   */
  async createReseller(partnerId: string, data: any): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();

      const reseller = await repo.createReseller({
        partner_id: partnerId,
        reseller_code: data.reseller_code,
        reseller_name: data.reseller_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        commission_rate: data.commission_rate || 0.10,
        contract_start_date: data.contract_start_date ? new Date(data.contract_start_date) : undefined,
        contract_end_date: data.contract_end_date ? new Date(data.contract_end_date) : undefined,
        status: data.status || 'active',
        settlement_cycle: data.settlement_cycle || 'monthly',
        payment_terms: data.payment_terms,
        region: data.region,
        tier: data.tier || 'bronze',
        notes: data.notes
      });

      logger.info('ota.reseller.created', {
        partner_id: partnerId,
        reseller_id: reseller.id,
        reseller_code: reseller.reseller_code
      });

      return {
        id: reseller.id,
        reseller_code: reseller.reseller_code,
        reseller_name: reseller.reseller_name,
        status: reseller.status,
        created_at: reseller.created_at
      };
    } else {
      // Mock implementation
      const resellerCode = data.reseller_code || `RSL-${partnerId}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      return {
        id: Math.floor(Math.random() * 1000),
        reseller_code: resellerCode,
        reseller_name: data.reseller_name,
        status: 'active',
        created_at: new Date()
      };
    }
  }

  /**
   * Update reseller
   */
  async updateReseller(resellerId: number, partnerId: string, data: any): Promise<any> {
    if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
      const repo = await this.getRepository();
      const reseller = await repo.findResellerById(resellerId, partnerId);

      if (!reseller) {
        return null;
      }

      // Update fields
      if (data.reseller_name) reseller.reseller_name = data.reseller_name;
      if (data.contact_email !== undefined) reseller.contact_email = data.contact_email;
      if (data.contact_phone !== undefined) reseller.contact_phone = data.contact_phone;
      if (data.commission_rate !== undefined) reseller.commission_rate = data.commission_rate;
      if (data.contract_start_date) reseller.contract_start_date = new Date(data.contract_start_date);
      if (data.contract_end_date) reseller.contract_end_date = new Date(data.contract_end_date);
      if (data.status) reseller.status = data.status;
      if (data.settlement_cycle) reseller.settlement_cycle = data.settlement_cycle;
      if (data.payment_terms !== undefined) reseller.payment_terms = data.payment_terms;
      if (data.region !== undefined) reseller.region = data.region;
      if (data.tier) reseller.tier = data.tier;
      if (data.notes !== undefined) reseller.notes = data.notes;

      const updated = await repo.createReseller(reseller); // Save uses same method

      logger.info('ota.reseller.updated', {
        partner_id: partnerId,
        reseller_id: updated.id,
        changes: Object.keys(data)
      });

      return {
        id: updated.id,
        reseller_code: updated.reseller_code,
        reseller_name: updated.reseller_name,
        status: updated.status,
        updated_at: updated.updated_at
      };
    } else {
      // Mock implementation
      return {
        id: resellerId,
        reseller_code: 'TEST-RESELLER-001',
        reseller_name: data.reseller_name || 'Updated Reseller',
        status: data.status || 'active',
        updated_at: new Date()
      };
    }
  }

  /**
   * Deactivate reseller (soft delete)
   */
  async deactivateReseller(resellerId: number, partnerId: string): Promise<any> {
    return this.updateReseller(resellerId, partnerId, { status: 'terminated' });
  }
}

export const otaService = new OTAService();

// Schedule periodic cleanup of expired reservations
setInterval(() => {
  otaService.expireOldReservations().catch(error => {
    logger.error('Failed to expire reservations', error);
  });
}, 5 * 60 * 1000); // Every 5 minutes