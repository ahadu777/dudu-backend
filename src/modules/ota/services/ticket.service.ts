import { BaseOTAService } from './base.service';
import { TicketEntity, ProductEntity, ProductInventoryEntity } from '../../../models';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { mockDataStore } from '../../../core/mock/data';
import { ERR } from '../../../core/errors/codes';
import { generateSecureQR } from '../../../utils/qr-crypto';
import { ticketCodeGenerator } from '../../../utils/ticket-code-generator';
import { directusService } from '../../../utils/directus';
import { toOTAAPIStatus } from '../status-mapper';
import { TicketRawMetadata } from '../../../types/domain';
import {
  OTABulkGenerateRequest,
  OTABulkGenerateResponse,
  OTATicketActivateRequest,
  OTATicketActivateResponse,
  OTATicketFilters,
  OTATicketListResponse,
  isWeekend
} from '../types';

/**
 * 票务服务
 *
 * 处理 OTA 渠道的票务生成、激活、查询
 */
export class TicketService extends BaseOTAService {

  /**
   * 批量生成票务
   */
  async bulkGenerateTickets(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    this.log('ota.tickets.bulk_generate.requested', {
      partner_id: partnerId,
      product_id: request.product_id,
      quantity: request.quantity,
      batch_id: request.batch_id
    });

    // 验证数量
    if (request.quantity < 1 || request.quantity > 5000) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 5000'
      };
    }

    if (await this.isDatabaseAvailable()) {
      return this.bulkGenerateInDatabase(partnerId, request);
    } else {
      return this.bulkGenerateInMock(partnerId, request);
    }
  }

  /**
   * 激活预制票
   */
  async activatePreMadeTicket(
    ticketCode: string,
    partnerId: string,
    request: OTATicketActivateRequest
  ): Promise<OTATicketActivateResponse> {
    this.log('ota.ticket.activate.requested', {
      ticket_code: ticketCode,
      partner_id: partnerId,
      customer_type: request.customer_type
    });

    if (await this.isDatabaseAvailable()) {
      return this.activateTicketInDatabase(ticketCode, partnerId, request);
    } else {
      return this.activateTicketInMock(ticketCode, partnerId, request);
    }
  }

  /**
   * 获取票务列表
   */
  async getTickets(partnerId: string, filters: OTATicketFilters): Promise<OTATicketListResponse> {
    if (await this.isDatabaseAvailable()) {
      return this.getTicketsFromDatabase(partnerId, filters);
    } else {
      return this.getTicketsFromMock(partnerId, filters);
    }
  }

  // ============== Database 实现 ==============

  private async bulkGenerateInDatabase(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    this.log('ota.tickets.bulk_generation_database_mode', {
      batch_id: request.batch_id,
      quantity: request.quantity,
      distribution_mode: request.distribution_mode
    });

    const repo = await this.getOTARepository();

    // Get product from database first (needed for pricing and inventory)
    const product = await repo.findProductById(request.product_id);
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

      this.log('ota.batch.special_pricing_applied', {
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

    // Check inventory FIRST before creating batch
    const inventory = product.inventory[0];
    if (!inventory) {
      throw {
        code: ERR.PRODUCT_NOT_FOUND,
        message: `No inventory found for product ${request.product_id}`
      };
    }

    const channelId = partnerId || 'ota';
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

    // Get partner logo from Directus (cached for performance)
    const logoBuffer = await directusService.getPartnerLogo(partnerId);
    if (logoBuffer) {
      this.log('ota.batch.logo_loaded', {
        batch_id: request.batch_id,
        partner_id: partnerId,
        size_kb: Math.round(logoBuffer.length / 1024)
      });
    }

    // Generate tickets for database
    const tickets = [];

    for (let i = 0; i < request.quantity; i++) {
      const ticketCode = ticketCodeGenerator.generate('DT');

      // Use entitlements from product or default cruise functions
      const entitlements = product.entitlements?.map((entitlement: any) => ({
        function_code: entitlement.type,
        remaining_uses: 1
      })) || [
        { function_code: 'ferry', remaining_uses: 1 },
        { function_code: 'deck_access', remaining_uses: 1 },
        { function_code: 'dining', remaining_uses: 1 }
      ];

      // Generate QR code for bulk pre-generated tickets
      // OTA tickets: permanent QR codes (100 years = 52,560,000 minutes)
      const qrColorConfig = product.qr_config ? {
        dark_color: product.qr_config.dark_color,
        light_color: product.qr_config.light_color
      } : undefined;
      const qrResult = await generateSecureQR(ticketCode, 52560000, logoBuffer || undefined, qrColorConfig);
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
        channel: 'ota',
        entitlements,
        qr_code: qrResult.qr_image,
        raw: rawMetadata,
        created_at: new Date(),
        distribution_mode: batch.distribution_mode,
        reseller_name: batch.reseller_metadata?.intended_reseller
      };

      tickets.push(ticket);
    }

    // Save to database with inventory update
    const savedTickets = await repo.createPreGeneratedTickets(tickets, channelId);

    this.log('ota.tickets.bulk_generation_database_completed', {
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
      tickets: savedTickets.map((ticket: TicketEntity) => ({
        ticket_code: ticket.ticket_code,
        qr_code: ticket.qr_code,
        status: toOTAAPIStatus(ticket.status),
        entitlements: ticket.entitlements
      })),
      total_generated: savedTickets.length
    };
  }

  private async activateTicketInDatabase(
    ticketCode: string,
    partnerId: string,
    request: OTATicketActivateRequest
  ): Promise<OTATicketActivateResponse> {
    this.log('ota.ticket.activation_database_mode', {
      ticket_code: ticketCode,
      customer_email: request.customer_details.email
    });

    try {
      const repo = await this.getOTARepository();

      // First, get the ticket to access batch pricing information
      const ticket = await repo.findPreGeneratedTicket(ticketCode);
      if (!ticket || ticket.status !== 'PRE_GENERATED' || ticket.partner_id !== partnerId) {
        throw {
          code: 'TICKET_NOT_FOUND',
          message: `Ticket ${ticketCode} not found or already activated`
        };
      }

      // Get batch to retrieve pricing snapshot
      if (!ticket.batch_id) {
        throw {
          code: 'BATCH_NOT_FOUND',
          message: `Ticket ${ticketCode} has no batch_id`
        };
      }
      const batch = await repo.findBatchById(ticket.batch_id);
      if (!batch) {
        throw {
          code: 'BATCH_NOT_FOUND',
          message: `Batch ${ticket.batch_id} not found`
        };
      }

      this.log('ota.ticket.activation_pricing_debug', {
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

        this.log('ota.ticket.weekend_pricing_applied', {
          ticket_code: ticketCode,
          visit_date: request.visit_date,
          is_weekend: true,
          base_price: customerTypePricing.unit_price,
          weekend_premium: weekendPremium,
          final_price: ticketPrice
        });
      }

      this.log('ota.ticket.activation_price_extracted', {
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
        this.log('ota.ticket.pricing_anomaly_detected', {
          ticket_code: ticketCode,
          batch_id: ticket.batch_id,
          ticket_price: ticketPrice,
          base_price: basePrice,
          ratio: ticketPrice / basePrice,
          message: 'Ticket price exceeds 2x base price - possible pricing error'
        }, 'warn');
      }

      // Generate order ID
      const orderId = `ORD-${Date.now()}`;

      // Prepare order data with correct pricing
      const orderData = {
        order_no: orderId,
        product_id: ticket.product_id,
        total: ticketPrice,
        confirmation_code: `CONF-${Date.now()}`
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
      const result = await repo.activatePreGeneratedTicket(
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

      this.log('ota.ticket.activation_database_completed', {
        ticket_code: ticketCode,
        order_id: result.order.order_no,
        customer_name: result.ticket.customer_name,
        customer_type: request.customer_type,
        ticket_price: ticketPrice
      });

      return {
        ticket_code: ticketCode,
        order_id: result.order.order_no,
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

  private async getTicketsFromDatabase(partnerId: string, filters: OTATicketFilters): Promise<OTATicketListResponse> {
    const ticketRepo = this.getRepository(TicketEntity);
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;

    // 构建查询
    const queryBuilder = ticketRepo.createQueryBuilder('ticket')
      .where('ticket.channel_id = :channelId', { channelId: partnerId });

    if (filters.status) {
      queryBuilder.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.batch_id) {
      queryBuilder.andWhere('ticket.batch_id = :batchId', { batchId: filters.batch_id });
    }

    // 分页
    const [tickets, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('ticket.created_at', 'DESC')
      .getManyAndCount();

    return {
      tickets: tickets.map(t => ({
        ticket_code: t.ticket_code,
        status: toOTAAPIStatus(t.status),
        customer_type: t.customer_type,
        created_at: t.created_at.toISOString()
      })),
      pagination: {
        page,
        page_size: pageSize,
        total_count: total,
        total_pages: Math.ceil(total / pageSize)
      }
    };
  }

  // ============== Mock 实现 ==============

  private async bulkGenerateInMock(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    const product = mockDataStore.getProduct(request.product_id);
    if (!product) {
      throw { code: ERR.PRODUCT_NOT_FOUND, message: `Product ${request.product_id} not found` };
    }

    const tickets: any[] = [];
    for (let i = 0; i < request.quantity; i++) {
      const ticketCode = ticketCodeGenerator.generate();
      tickets.push({
        ticket_code: ticketCode,
        status: 'pre_generated',
        batch_id: request.batch_id,
        qr_code: `mock_qr_${ticketCode}`
      });
    }

    return {
      batch_id: request.batch_id,
      distribution_mode: request.distribution_mode || 'direct_sale',
      tickets,
      total_generated: tickets.length
    };
  }

  private async activateTicketInMock(
    ticketCode: string,
    partnerId: string,
    request: OTATicketActivateRequest
  ): Promise<OTATicketActivateResponse> {
    // Mock 简化实现
    return {
      ticket_code: ticketCode,
      order_id: `ORD-${Date.now()}`,
      customer_name: request.customer_details.name,
      customer_type: request.customer_type,
      ticket_price: 100,
      currency: 'CNY',
      status: 'activated',
      activated_at: new Date().toISOString()
    };
  }

  private async getTicketsFromMock(partnerId: string, filters: OTATicketFilters): Promise<OTATicketListResponse> {
    return {
      tickets: [],
      pagination: {
        page: filters.page || 1,
        page_size: filters.page_size || 20,
        total_count: 0,
        total_pages: 0
      }
    };
  }
}

// 单例
let instance: TicketService | null = null;

export const getTicketService = (): TicketService => {
  if (!instance) {
    instance = new TicketService();
  }
  return instance;
};

export const ticketService = new Proxy({} as TicketService, {
  get: (_, prop) => getTicketService()[prop as keyof TicketService]
});
