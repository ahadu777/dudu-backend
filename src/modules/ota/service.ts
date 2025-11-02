import { mockDataStore } from '../../core/mock/data';
import { ERR } from '../../core/errors/codes';
import { logger } from '../../utils/logger';

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

export class OTAService {

  async getInventory(productIds?: number[]): Promise<OTAInventoryResponse> {
    logger.info('ota.inventory.requested', { product_ids: productIds });

    // Get OTA channel availability
    const targetProducts = productIds || [106, 107, 108]; // Default to cruise packages
    const availability = mockDataStore.getChannelAvailability('ota', targetProducts);

    // Build pricing context
    const pricing_context = {
      base_prices: {} as { [productId: number]: { weekday: number; weekend: number } },
      customer_types: ['adult', 'child', 'elderly'],
      special_dates: {
        '2025-12-31': { multiplier: 1.5 },
        '2026-02-18': { multiplier: 1.3 }
      }
    };

    // Add pricing for available products
    for (const productId of targetProducts) {
      const product = mockDataStore.getProduct(productId);
      if (product && availability[productId] > 0) {
        pricing_context.base_prices[productId] = {
          weekday: product.unit_price,
          weekend: product.unit_price + 30 // Weekend premium
        };
      }
    }

    logger.info('ota.inventory.response', {
      available_products: Object.keys(availability).length,
      total_units: Object.values(availability).reduce((sum, qty) => sum + qty, 0)
    });

    return {
      available_quantities: availability,
      pricing_context
    };
  }

  async createReservation(request: OTAReserveRequest): Promise<OTAReserveResponse> {
    logger.info('ota.reservation.requested', {
      product_id: request.product_id,
      quantity: request.quantity
    });

    // Validate product exists and has OTA allocation
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

    // Validate quantity
    if (request.quantity < 1 || request.quantity > 100) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 100'
      };
    }

    // Calculate TTL
    let ttlHours = 24; // Default 24 hours
    if (request.reservation_expires_at) {
      const expiryDate = new Date(request.reservation_expires_at);
      const now = new Date();
      ttlHours = Math.max(1, Math.min(48, (expiryDate.getTime() - now.getTime()) / (60 * 60 * 1000)));
    }

    // Create reservation
    const reservation = mockDataStore.createChannelReservation(
      request.product_id,
      'ota',
      request.quantity,
      ttlHours
    );

    if (!reservation) {
      const availability = mockDataStore.getChannelAvailability('ota', [request.product_id]);
      logger.info('ota.reservation.insufficient_inventory', {
        product_id: request.product_id,
        requested: request.quantity,
        available: availability[request.product_id] || 0
      });

      throw {
        code: ERR.SOLD_OUT,
        message: `Insufficient OTA inventory. Available: ${availability[request.product_id] || 0}, Requested: ${request.quantity}`
      };
    }

    // Build pricing snapshot
    const pricing_snapshot = {
      base_price: product.unit_price,
      weekend_premium: 30.00,
      customer_discounts: {
        child: 100.00,  // Fixed $188 for children
        elderly: 100.00 // Fixed $188 for elderly
      }
    };

    logger.info('ota.reservation.created', {
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

  async getReservation(reservationId: string) {
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

  async expireOldReservations(): Promise<number> {
    const expiredCount = mockDataStore.expireReservations();
    if (expiredCount > 0) {
      logger.info('ota.reservations.expired', { count: expiredCount });
    }
    return expiredCount;
  }

  async getActiveReservations() {
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

export const otaService = new OTAService();

// Schedule periodic cleanup of expired reservations
setInterval(() => {
  otaService.expireOldReservations().catch(error => {
    logger.error('Failed to expire reservations', error);
  });
}, 5 * 60 * 1000); // Every 5 minutes