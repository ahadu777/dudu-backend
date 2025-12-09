import { BaseOTAService } from './base.service';
import { ProductInventoryEntity, TicketEntity } from '../../../models';
import { ChannelReservationEntity } from '../domain/channel-reservation.entity';
import { mockDataStore } from '../../../core/mock/data';
import { ERR } from '../../../core/errors/codes';
import { toOTAAPIStatus } from '../status-mapper';
import {
  OTAReserveRequest,
  OTAReserveResponse,
  OTAActivateRequest,
  OTAActivateResponse
} from '../types';

// 本地错误码（ERR 中没有的）
const LOCAL_ERR = {
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  DATABASE_ERROR: 'DATABASE_ERROR'
} as const;

/**
 * 预订服务
 *
 * 处理 OTA 渠道的预订创建、查询、激活、取消
 */
export class ReservationService extends BaseOTAService {

  /**
   * 创建预订
   */
  async createReservation(request: OTAReserveRequest, partnerId?: string): Promise<OTAReserveResponse> {
    this.log('ota.reservation.requested', {
      product_id: request.product_id,
      quantity: request.quantity,
      partner_id: partnerId
    });

    // 验证数量
    if (request.quantity < 1 || request.quantity > 100) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 100'
      };
    }

    // 计算过期时间
    let expiresAt = new Date();
    if (request.reservation_expires_at) {
      const requestedExpiry = new Date(request.reservation_expires_at);
      const maxExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      expiresAt = requestedExpiry > maxExpiry ? maxExpiry : requestedExpiry;
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    if (await this.isDatabaseAvailable()) {
      return this.createReservationInDatabase(request, partnerId, expiresAt);
    } else {
      return this.createReservationInMock(request, partnerId, expiresAt);
    }
  }

  /**
   * 获取预订
   */
  async getReservation(reservationId: string): Promise<any> {
    if (await this.isDatabaseAvailable()) {
      return this.getReservationFromDatabase(reservationId);
    } else {
      return this.getReservationFromMock(reservationId);
    }
  }

  /**
   * 获取活跃预订列表
   */
  async getActiveReservations(partnerId?: string): Promise<any[]> {
    if (await this.isDatabaseAvailable()) {
      return this.getActiveReservationsFromDatabase(partnerId);
    } else {
      return this.getActiveReservationsFromMock(partnerId);
    }
  }

  /**
   * 激活预订（创建订单）
   */
  async activateReservation(reservationId: string, request: OTAActivateRequest): Promise<OTAActivateResponse> {
    this.log('ota.reservation.activation_requested', {
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

    if (await this.isDatabaseAvailable()) {
      // Database implementation
      try {
        const repo = await this.getOTARepository();
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

        this.log('ota.reservation.activated', {
          source: 'database',
          reservation_id: reservationId,
          order_id: result.order.order_no,
          total_amount: result.order.total,
          tickets_generated: result.tickets.length
        });

        return {
          order_id: result.order.order_no!,
          tickets: result.tickets.map((ticket: TicketEntity) => ({
            code: ticket.ticket_code,
            qr_code: ticket.qr_code,
            customer_type: ticket.customer_type,
            entitlements: ticket.entitlements,
            status: toOTAAPIStatus(ticket.status)
          })),
          total_amount: Number(result.order.total),
          confirmation_code: result.order.confirmation_code!
        };

      } catch (error: any) {
        this.log('ota.reservation.database_activation_failed', {
          reservation_id: reservationId,
          error: error.message
        }, 'error');
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

    this.log('ota.reservation.activated', {
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

  /**
   * 取消预订
   */
  async cancelReservation(reservationId: string): Promise<void> {
    this.log('ota.reservation.cancellation_requested', {
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

    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();
      await repo.cancelReservation(reservationId);

      this.log('ota.reservation.cancelled', {
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

      this.log('ota.reservation.cancelled', {
        source: 'mock',
        reservation_id: reservationId
      });
    }
  }

  /**
   * 过期旧预订
   */
  async expireOldReservations(): Promise<number> {
    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();
      const expiredCount = await repo.expireReservations();
      if (expiredCount > 0) {
        this.log('ota.reservations.expired', { source: 'database', count: expiredCount });
      }
      return expiredCount;
    } else {
      const expiredCount = mockDataStore.expireReservations();
      if (expiredCount > 0) {
        this.log('ota.reservations.expired', { source: 'mock', count: expiredCount });
      }
      return expiredCount;
    }
  }

  // ============== Database 实现 ==============

  private async createReservationInDatabase(
    request: OTAReserveRequest,
    partnerId: string | undefined,
    expiresAt: Date
  ): Promise<OTAReserveResponse> {
    const repo = await this.getOTARepository();
    const channelId = partnerId || 'ota';

    // 获取产品详情（包含价格信息）
    const product = await repo.findProductById(request.product_id);
    if (!product) {
      throw { code: ERR.PRODUCT_NOT_FOUND, message: `Product ${request.product_id} not found` };
    }

    // 构建价格快照
    const basePrice = Number(product.base_price);
    const weekendPremium = Number(product.weekend_premium || 30.00);

    // 获取客户类型定价
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
      { customer_type: 'adult' as const, unit_price: basePrice, discount_applied: 0 },
      { customer_type: 'child' as const, unit_price: basePrice, discount_applied: 0 },
      { customer_type: 'elderly' as const, unit_price: basePrice, discount_applied: 0 }
    ];

    const pricingSnapshot = {
      base_price: basePrice,
      customer_type_pricing: customerTypePricing,
      weekend_premium: weekendPremium,
      currency: 'HKD',
      captured_at: new Date().toISOString()
    };

    // 使用 repository 创建预订（包含库存锁定）
    const reservation = await repo.createReservation(
      request.product_id,
      channelId,
      request.quantity,
      expiresAt,
      pricingSnapshot
    );

    if (!reservation) {
      // 获取当前可用库存
      const inventory = await repo.getInventoryByProductId(request.product_id);
      const available = inventory ? inventory.getChannelAvailable(channelId) : 0;

      this.log('ota.reservation.insufficient_inventory', {
        product_id: request.product_id,
        requested: request.quantity,
        available
      });

      throw {
        code: ERR.SOLD_OUT,
        message: `Insufficient OTA inventory. Available: ${available}, Requested: ${request.quantity}`
      };
    }

    this.log('ota.reservation.created', {
      source: 'database',
      reservation_id: reservation.reservation_id,
      product_id: request.product_id,
      quantity: request.quantity,
      expires_at: reservation.expires_at.toISOString()
    });

    return {
      reservation_id: reservation.reservation_id,
      reserved_until: reservation.expires_at.toISOString(),
      pricing_snapshot: pricingSnapshot
    };
  }

  private async getReservationFromDatabase(reservationId: string): Promise<any> {
    const reservationRepo = this.getRepository(ChannelReservationEntity);
    const reservation = await reservationRepo.findOne({
      where: { reservation_id: reservationId }
    });

    if (!reservation) {
      throw { code: 'RESERVATION_NOT_FOUND', message: `Reservation ${reservationId} not found` };
    }

    return {
      reservation_id: reservation.reservation_id,
      product_id: reservation.product_id,
      quantity: reservation.quantity,
      status: reservation.status,
      expires_at: reservation.expires_at.toISOString(),
      pricing_snapshot: reservation.pricing_snapshot
    };
  }

  private async getActiveReservationsFromDatabase(partnerId?: string): Promise<any[]> {
    const reservationRepo = this.getRepository(ChannelReservationEntity);
    const channelId = partnerId || 'ota';

    const reservations = await reservationRepo.find({
      where: { channel_id: channelId, status: 'active' as any },
      order: { created_at: 'DESC' }
    });

    return reservations.map(r => ({
      reservation_id: r.reservation_id,
      product_id: r.product_id,
      quantity: r.quantity,
      status: r.status,
      expires_at: r.expires_at.toISOString(),
      pricing_snapshot: r.pricing_snapshot
    }));
  }

  // ============== Mock 实现 ==============

  private async createReservationInMock(
    request: OTAReserveRequest,
    partnerId: string | undefined,
    expiresAt: Date
  ): Promise<OTAReserveResponse> {
    const channelId = partnerId || 'ota';
    const product = mockDataStore.getProduct(request.product_id);

    if (!product) {
      throw { code: ERR.PRODUCT_NOT_FOUND, message: `Product ${request.product_id} not found` };
    }

    if (!product.channel_allocations[channelId]) {
      throw { code: 'CHANNEL_NOT_AVAILABLE', message: `Product not available for channel ${channelId}` };
    }

    const ttlHours = (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    const reservation = mockDataStore.createChannelReservation(
      request.product_id,
      channelId,
      request.quantity,
      ttlHours
    );

    if (!reservation) {
      const availability = mockDataStore.getChannelAvailability(channelId, [request.product_id]);
      throw { code: ERR.SOLD_OUT, message: `Insufficient inventory. Available: ${availability[request.product_id] || 0}` };
    }

    return {
      reservation_id: reservation.reservation_id,
      reserved_until: expiresAt.toISOString(),
      pricing_snapshot: {
        base_price: product.unit_price,
        weekend_premium: 30,
        customer_type_pricing: [
          { customer_type: 'adult', unit_price: product.unit_price, discount_applied: 0 },
          { customer_type: 'child', unit_price: Math.round(product.unit_price * 0.5), discount_applied: 50 },
          { customer_type: 'elderly', unit_price: Math.round(product.unit_price * 0.7), discount_applied: 30 }
        ],
        currency: 'CNY',
        captured_at: new Date().toISOString()
      }
    };
  }

  private async getReservationFromMock(reservationId: string): Promise<any> {
    const reservation = mockDataStore.getReservation(reservationId);
    if (!reservation) {
      throw { code: 'RESERVATION_NOT_FOUND', message: `Reservation ${reservationId} not found` };
    }
    return reservation;
  }

  private async getActiveReservationsFromMock(partnerId?: string): Promise<any[]> {
    const channelId = partnerId || 'ota';
    return mockDataStore.getActiveReservations(channelId);
  }
}

// 单例
let instance: ReservationService | null = null;

export const getReservationService = (): ReservationService => {
  if (!instance) {
    instance = new ReservationService();
  }
  return instance;
};

export const reservationService = new Proxy({} as ReservationService, {
  get: (_, prop) => getReservationService()[prop as keyof ReservationService]
});
