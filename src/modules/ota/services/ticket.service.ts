import { BaseOTAService } from './base.service';
import { TicketEntity, ProductEntity, ProductInventoryEntity } from '../../../models';
import { OTATicketBatchEntity } from '../domain/ota-ticket-batch.entity';
import { mockDataStore } from '../../../core/mock/data';
import { ERR } from '../../../core/errors/codes';
import { generateSecureQR, preprocessLogoForBulk } from '../../../utils/qr-crypto';
import { ticketCodeGenerator } from '../../../utils/ticket-code-generator';
import { directusService } from '../../../utils/directus';
import { toOTAAPIStatus, fromOTAAPIStatus } from '../status-mapper';
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
   *
   * batch_id 处理逻辑（混合模式）：
   * - 如果前端传入 batch_id：检查是否已存在，存在则报错
   * - 如果前端未传入 batch_id：由后端自动生成
   */
  async bulkGenerateTickets(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    // 生成或验证 batch_id
    let batchId: string;
    if (request.batch_id) {
      // 前端传入了 batch_id，需要检查是否已存在
      batchId = request.batch_id;
    } else {
      // 前端未传入，由后端生成
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      batchId = `BATCH-${date}-${partnerId}-${random}`;
    }

    this.log('ota.tickets.bulk_generate.requested', {
      partner_id: partnerId,
      product_id: request.product_id,
      quantity: request.quantity,
      batch_id: batchId,
      batch_id_source: request.batch_id ? 'client' : 'server'
    });

    // 验证数量
    if (request.quantity < 1 || request.quantity > 5000) {
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Quantity must be between 1 and 5000'
      };
    }

    // 将生成的或验证过的 batch_id 设置回 request
    const requestWithBatchId = { ...request, batch_id: batchId };

    if (await this.isDatabaseAvailable()) {
      return this.bulkGenerateInDatabase(partnerId, requestWithBatchId);
    } else {
      return this.bulkGenerateInMock(partnerId, requestWithBatchId);
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

  /**
   * 并行生成单张票券（用于 Promise.all 批量处理）
   */
  private async generateSingleTicket(
    ticketCode: string,
    product: ProductEntity,
    batch: OTATicketBatchEntity,
    partnerId: string,
    logoBuffer: Buffer | null,
    qrColorConfig: { dark_color?: string; light_color?: string } | undefined,
    isLogoPreprocessed: boolean = false
  ): Promise<any> {
    // Use entitlements from product or default cruise functions
    const entitlements = product.entitlements?.map((entitlement: any) => ({
      function_code: entitlement.type,
      remaining_uses: entitlement.metadata?.quantity || entitlement.quantity || 1
    })) || [
      { function_code: 'ferry', remaining_uses: 1 },
      { function_code: 'deck_access', remaining_uses: 1 },
      { function_code: 'dining', remaining_uses: 1 }
    ];

    // Generate QR code for bulk pre-generated tickets
    // OTA tickets: permanent QR codes (100 years = 52,560,000 minutes)
    const qrResult = await generateSecureQR(ticketCode, 52560000, logoBuffer || undefined, qrColorConfig, isLogoPreprocessed);
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

    return {
      ticket_code: ticketCode,
      product_id: product.id,
      batch_id: batch.batch_id,
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
  }

  /**
   * 分批并行处理，控制并发数量防止内存溢出
   */
  private async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 50
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batchItems.map(processor));
      results.push(...batchResults);
    }
    return results;
  }

  private async bulkGenerateInDatabase(partnerId: string, request: OTABulkGenerateRequest): Promise<OTABulkGenerateResponse> {
    const startTime = Date.now();

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

      // Get customer type pricing from product
      const discounts = product.customer_discounts || {};
      const customerTypePricing = [
        {
          customer_type: 'adult' as const,
          unit_price: Math.round(basePrice - (discounts.adult || 0)),
          discount_applied: Math.round(discounts.adult || 0)
        },
        {
          customer_type: 'child' as const,
          unit_price: Math.round(basePrice - (discounts.child || 0)),
          discount_applied: Math.round(discounts.child || 0)
        },
        {
          customer_type: 'elderly' as const,
          unit_price: Math.round(basePrice - (discounts.elderly || 0)),
          discount_applied: Math.round(discounts.elderly || 0)
        }
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

    // Prepare batch data (will be created in transaction with tickets)
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

    // 【关键修复】在生成 QR 之前，先创建占位批次（状态 creating）
    // 这利用数据库主键约束防止并发请求创建相同 batch_id
    const placeholderBatch = await repo.createPlaceholderBatch(batchData);
    if (!placeholderBatch) {
      this.log('ota.tickets.bulk_generate.duplicate_batch_id', {
        batch_id: request.batch_id,
        partner_id: partnerId
      }, 'warn');

      throw {
        code: ERR.VALIDATION_ERROR,
        message: `Batch ID '${request.batch_id}' already exists or is being created. Please use a different batch_id or omit it to auto-generate.`
      };
    }

    this.log('ota.tickets.bulk_generate.placeholder_created', {
      batch_id: request.batch_id,
      partner_id: partnerId,
      status: 'creating'
    });

    // Create temporary batch object for QR generation
    const tempBatch = {
      batch_id: batchData.batch_id,
      distribution_mode: batchData.distribution_mode,
      reseller_metadata: batchData.reseller_metadata,
      pricing_snapshot: batchData.pricing_snapshot,
      expires_at: batchData.expires_at
    } as any;

    // Get partner logo from Directus (cached for performance)
    const logoBuffer = await directusService.getPartnerLogo(partnerId);
    if (logoBuffer) {
      this.log('ota.batch.logo_loaded', {
        batch_id: request.batch_id,
        partner_id: partnerId,
        size_kb: Math.round(logoBuffer.length / 1024)
      });
    }

    // Pre-process logo ONCE for bulk generation (major optimization)
    // This avoids re-processing the same logo for each QR code
    const logoPreprocessStartTime = Date.now();
    const preprocessedLogo = await preprocessLogoForBulk(logoBuffer);
    const logoPreprocessDuration = Date.now() - logoPreprocessStartTime;

    if (preprocessedLogo) {
      this.log('ota.batch.logo_preprocessed', {
        batch_id: request.batch_id,
        preprocess_ms: logoPreprocessDuration,
        preprocessed_size_bytes: preprocessedLogo.length
      });
    }

    // Pre-generate all ticket codes first (synchronous, fast)
    const ticketCodes: string[] = [];
    for (let i = 0; i < request.quantity; i++) {
      ticketCodes.push(ticketCodeGenerator.generate('DT'));
    }

    // QR color config (reused for all tickets)
    const qrColorConfig = product.qr_config ? {
      dark_color: product.qr_config.dark_color,
      light_color: product.qr_config.light_color
    } : undefined;

    // Determine optimal batch size based on quantity
    // - Small batches (< 50): process all at once
    // - Medium batches (50-200): 50 concurrent
    // - Large batches (> 200): 100 concurrent for better throughput
    const concurrencyLimit = request.quantity <= 50 ? request.quantity :
                             request.quantity <= 200 ? 50 : 100;

    this.log('ota.tickets.bulk_generation_parallel_start', {
      batch_id: request.batch_id,
      quantity: request.quantity,
      concurrency_limit: concurrencyLimit,
      logo_preprocessed: !!preprocessedLogo
    });

    // Generate tickets in parallel batches (using preprocessed logo)
    // 如果 QR 生成失败，需要清理占位批次
    const qrStartTime = Date.now();
    let tickets: any[];
    try {
      tickets = await this.processInBatches(
        ticketCodes,
        (ticketCode) => this.generateSingleTicket(
          ticketCode,
          product,
          tempBatch,  // Use temp batch object for QR generation
          partnerId,
          preprocessedLogo,  // Use preprocessed logo
          qrColorConfig,
          true  // Flag that logo is already preprocessed
        ),
        concurrencyLimit
      );
    } catch (qrError) {
      // QR 生成失败，清理占位批次
      this.log('ota.tickets.bulk_generate.qr_generation_failed', {
        batch_id: request.batch_id,
        error: qrError instanceof Error ? qrError.message : String(qrError)
      }, 'error');

      await repo.deletePlaceholderBatch(request.batch_id!);
      throw qrError;
    }
    const qrDuration = Date.now() - qrStartTime;

    this.log('ota.tickets.bulk_generation_qr_completed', {
      batch_id: request.batch_id,
      quantity: request.quantity,
      qr_generation_ms: qrDuration,
      avg_per_ticket_ms: Math.round(qrDuration / request.quantity)
    });

    // 完成批次创建：更新占位批次状态，插入票券
    // 如果失败，占位批次会被清理
    const dbStartTime = Date.now();
    let batch: any;
    let savedTickets: any[];

    try {
      const result = await repo.completeBatchWithTickets(
        request.batch_id!,
        tickets,
        channelId
      );
      batch = result.batch;
      savedTickets = result.tickets;
    } catch (error) {
      // 如果完成批次失败，清理占位批次
      this.log('ota.tickets.bulk_generate.completion_failed', {
        batch_id: request.batch_id,
        error: error instanceof Error ? error.message : String(error)
      }, 'error');

      await repo.deletePlaceholderBatch(request.batch_id!);
      throw error;
    }

    const dbDuration = Date.now() - dbStartTime;

    const totalDuration = Date.now() - startTime;
    this.log('ota.tickets.bulk_generation_database_completed', {
      batch_id: request.batch_id,
      product_id: request.product_id,
      total_generated: savedTickets.length,
      distribution_mode: batch.distribution_mode,
      transaction_mode: 'placeholder_then_complete',  // 新的两阶段模式
      performance: {
        total_ms: totalDuration,
        qr_generation_ms: qrDuration,
        db_insert_ms: dbDuration,
        avg_per_ticket_ms: Math.round(totalDuration / request.quantity)
      }
    });

    return {
      batch_id: request.batch_id!,
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
    const pageSize = filters.page_size || filters.limit || 100;

    // 构建查询
    const queryBuilder = ticketRepo.createQueryBuilder('ticket')
      .where('ticket.partner_id = :partnerId', { partnerId });

    if (filters.status) {
      // 将 OTA API 状态转换为内部状态进行查询
      const internalStatus = fromOTAAPIStatus(filters.status as any);
      queryBuilder.andWhere('ticket.status = :status', { status: internalStatus });
    }

    if (filters.batch_id) {
      queryBuilder.andWhere('ticket.batch_id = :batchId', { batchId: filters.batch_id });
    }

    if (filters.created_after) {
      queryBuilder.andWhere('ticket.created_at >= :createdAfter', { createdAfter: new Date(filters.created_after) });
    }

    if (filters.created_before) {
      queryBuilder.andWhere('ticket.created_at <= :createdBefore', { createdBefore: new Date(filters.created_before) });
    }

    // 新增筛选条件
    if (filters.ticket_code) {
      // 票券码前缀匹配
      queryBuilder.andWhere('ticket.ticket_code LIKE :ticketCode', { ticketCode: `${filters.ticket_code}%` });
    }

    if (filters.customer_name) {
      // 客户名称模糊匹配
      queryBuilder.andWhere('ticket.customer_name LIKE :customerName', { customerName: `%${filters.customer_name}%` });
    }

    if (filters.reseller_name) {
      // 经销商名称精确匹配
      queryBuilder.andWhere('ticket.reseller_name = :resellerName', { resellerName: filters.reseller_name });
    }

    if (filters.product_id) {
      // 产品ID精确匹配
      queryBuilder.andWhere('ticket.product_id = :productId', { productId: filters.product_id });
    }

    // 分页
    const [tickets, total] = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(Math.min(pageSize, 1000)) // Max 1000 per page
      .orderBy('ticket.created_at', 'DESC')
      .getManyAndCount();

    return {
      tickets: tickets.map(t => ({
        ticket_code: t.ticket_code,
        status: toOTAAPIStatus(t.status),
        batch_id: t.batch_id || null,
        product_id: t.product_id,
        qr_code: t.qr_code || null,
        created_at: t.created_at.toISOString(),
        activated_at: t.activated_at ? t.activated_at.toISOString() : null,
        order_id: t.order_no || null,
        customer_name: t.customer_name || null,
        customer_email: t.customer_email || null,
        customer_type: t.customer_type || null,
        reseller_name: t.reseller_name || null,
        distribution_mode: t.distribution_mode || null
      })),
      pagination: {
        page,
        page_size: pageSize,
        total_count: total,
        total_pages: Math.ceil(total / pageSize)
      },
      // 兼容旧格式
      total_count: total,
      page,
      page_size: pageSize
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
      batch_id: request.batch_id!,  // 已在 bulkGenerateTickets 中确保有值
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
      currency: 'HKD',
      status: 'activated',
      activated_at: new Date().toISOString()
    };
  }

  private async getTicketsFromMock(partnerId: string, filters: OTATicketFilters): Promise<OTATicketListResponse> {
    return {
      tickets: [],  // Mock returns empty array, but type now includes reseller_name
      pagination: {
        page: filters.page || 1,
        page_size: filters.page_size || 20,
        total_count: 0,
        total_pages: 0
      }
    };
  }

  // ============== PDF 导出 ==============

  /**
   * 生成票券 PDF
   *
   * @param ticketCode 票券代码
   * @param partnerId Partner ID（用于权限验证）
   * @returns PDF Buffer
   */
  async getTicketPDF(ticketCode: string, partnerId: string): Promise<Buffer> {
    this.log('ota.ticket.pdf_export.requested', {
      ticket_code: ticketCode,
      partner_id: partnerId
    });

    // 获取票券
    let ticket: TicketEntity | null = null;

    if (await this.isDatabaseAvailable()) {
      const repo = await this.getOTARepository();
      ticket = await repo.findPreGeneratedTicket(ticketCode);
    } else {
      // Mock 模式：从 mockDataStore 获取
      const mockTicket = mockDataStore.preGeneratedTickets.get(ticketCode);
      if (mockTicket) {
        ticket = {
          ticket_code: mockTicket.code,
          partner_id: mockTicket.partner_id,
          status: mockTicket.status,
          qr_code: mockTicket.qr_code
        } as TicketEntity;
      }
    }

    // 验证票券存在
    if (!ticket) {
      throw {
        code: 'TICKET_NOT_FOUND',
        message: `Ticket ${ticketCode} not found`
      };
    }

    // 验证票券归属
    if (ticket.partner_id !== partnerId) {
      this.log('ota.ticket.pdf_export.unauthorized', {
        ticket_code: ticketCode,
        requested_by: partnerId,
        owned_by: ticket.partner_id
      }, 'warn');

      throw {
        code: 'UNAUTHORIZED',
        message: 'Ticket does not belong to this partner'
      };
    }

    // 验证票券状态（仅 PRE_GENERATED 和 ACTIVATED 可导出）
    const validStatuses = ['PRE_GENERATED', 'ACTIVATED'];
    if (!validStatuses.includes(ticket.status)) {
      throw {
        code: 'INVALID_STATUS',
        message: `Cannot export PDF for ticket with status ${ticket.status}`
      };
    }

    // 生成 QR 码（如果票券已有 QR 码则使用，否则重新生成）
    let qrImage: string;
    if (ticket.qr_code) {
      qrImage = ticket.qr_code;
    } else {
      // 重新生成 QR 码
      const qrResult = await generateSecureQR(ticketCode, 52560000);  // 100 年有效
      qrImage = qrResult.qr_image;
    }

    // 动态导入 PDF 生成器（避免循环依赖）
    const { createTicketPDF } = await import('../../../utils/ticket-pdf-generator');

    // 生成 PDF
    const pdfBuffer = await createTicketPDF(ticketCode, qrImage);

    this.log('ota.ticket.pdf_export.success', {
      ticket_code: ticketCode,
      partner_id: partnerId,
      pdf_size_bytes: pdfBuffer.length
    });

    return pdfBuffer;
  }

  /**
   * 批量导出票券 PDF（一个批次所有票券合并到一个 PDF）
   *
   * @param batchId 批次 ID
   * @param partnerId Partner ID（用于权限验证）
   * @returns PDF Buffer
   */
  async getBatchPDF(batchId: string, partnerId: string): Promise<Buffer> {
    this.log('ota.batch.pdf_export.requested', {
      batch_id: batchId,
      partner_id: partnerId
    });

    // 获取批次信息
    if (!await this.isDatabaseAvailable()) {
      throw {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not available for batch PDF export'
      };
    }

    const repo = await this.getOTARepository();
    const batch = await repo.findBatchById(batchId);

    // 验证批次存在
    if (!batch) {
      throw {
        code: 'BATCH_NOT_FOUND',
        message: `Batch ${batchId} not found`
      };
    }

    // 验证批次归属
    if (batch.partner_id !== partnerId) {
      this.log('ota.batch.pdf_export.unauthorized', {
        batch_id: batchId,
        requested_by: partnerId,
        owned_by: batch.partner_id
      }, 'warn');

      throw {
        code: 'UNAUTHORIZED',
        message: 'Batch does not belong to this partner'
      };
    }

    // 获取批次下所有票券
    const ticketRepo = this.getRepository(TicketEntity);
    const tickets = await ticketRepo.find({
      where: { batch_id: batchId },
      order: { created_at: 'ASC' }
    });

    if (tickets.length === 0) {
      throw {
        code: 'NO_TICKETS',
        message: `No tickets found in batch ${batchId}`
      };
    }

    this.log('ota.batch.pdf_export.tickets_found', {
      batch_id: batchId,
      ticket_count: tickets.length
    });

    // 准备票券数据（确保每张票都有 QR 码）
    const ticketConfigs = await Promise.all(
      tickets.map(async (ticket) => {
        let qrImage: string;
        if (ticket.qr_code) {
          qrImage = ticket.qr_code;
        } else {
          // 重新生成 QR 码
          const qrResult = await generateSecureQR(ticket.ticket_code, 52560000);
          qrImage = qrResult.qr_image;
        }
        return {
          ticketCode: ticket.ticket_code,
          qrImageBase64: qrImage
        };
      })
    );

    // 动态导入 PDF 生成器
    const { generateBatchPDF } = await import('../../../utils/ticket-pdf-generator');

    // 生成批量 PDF
    const pdfBuffer = await generateBatchPDF(batchId, ticketConfigs);

    this.log('ota.batch.pdf_export.success', {
      batch_id: batchId,
      partner_id: partnerId,
      ticket_count: tickets.length,
      pdf_size_bytes: pdfBuffer.length
    });

    return pdfBuffer;
  }

  /**
   * 流式导出批次所有票券为 ZIP
   *
   * 每张票生成一个独立的 PDF 文件，打包成 ZIP 流式传输。
   * 使用流式处理避免内存溢出，支持超大批次（5000-10000 张）。
   *
   * @param batchId 批次 ID
   * @param partnerId Partner ID（用于权限验证）
   * @param outputStream HTTP Response 流
   */
  async streamBatchZip(
    batchId: string,
    partnerId: string,
    outputStream: NodeJS.WritableStream
  ): Promise<void> {
    this.log('ota.batch.zip_export.started', {
      batch_id: batchId,
      partner_id: partnerId
    });

    // 验证数据库可用
    if (!await this.isDatabaseAvailable()) {
      throw {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is not available for batch ZIP export'
      };
    }

    const repo = await this.getOTARepository();
    const batch = await repo.findBatchById(batchId);

    // 验证批次存在
    if (!batch) {
      throw {
        code: 'BATCH_NOT_FOUND',
        message: `Batch ${batchId} not found`
      };
    }

    // 验证批次归属
    if (batch.partner_id !== partnerId) {
      this.log('ota.batch.zip_export.unauthorized', {
        batch_id: batchId,
        requested_by: partnerId,
        owned_by: batch.partner_id
      }, 'warn');

      throw {
        code: 'UNAUTHORIZED',
        message: 'Batch does not belong to this partner'
      };
    }

    // 获取批次下所有票券（只获取必要字段）
    const ticketRepo = this.getRepository(TicketEntity);
    const tickets = await ticketRepo.find({
      where: { batch_id: batchId },
      select: ['ticket_code', 'qr_code'],
      order: { created_at: 'ASC' }
    });

    if (tickets.length === 0) {
      throw {
        code: 'NO_TICKETS',
        message: `No tickets found in batch ${batchId}`
      };
    }

    this.log('ota.batch.zip_export.tickets_found', {
      batch_id: batchId,
      ticket_count: tickets.length
    });

    // 动态导入依赖
    const archiver = (await import('archiver')).default;
    const { generateTicketPDFStream } = await import('../../../utils/ticket-pdf-generator');

    // 创建 ZIP 归档流
    const archive = archiver('zip', {
      zlib: { level: 6 } // 压缩级别 0-9，6 是平衡点
    });

    // 错误处理
    archive.on('error', (err: Error) => {
      this.log('ota.batch.zip_export.archive_error', {
        batch_id: batchId,
        error: err.message
      }, 'error');
      throw err;
    });

    // 完成处理
    archive.on('end', () => {
      this.log('ota.batch.zip_export.completed', {
        batch_id: batchId,
        ticket_count: tickets.length,
        total_bytes: archive.pointer()
      });
    });

    // pipe 到输出流
    archive.pipe(outputStream);

    // 逐个生成 PDF 并添加到 ZIP
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];

      // 获取或生成 QR 码
      let qrImage: string;
      if (ticket.qr_code) {
        qrImage = ticket.qr_code;
      } else {
        // 重新生成 QR 码
        const { generateSecureQR } = await import('../../../utils/qr-crypto');
        const qrResult = await generateSecureQR(ticket.ticket_code, 52560000);
        qrImage = qrResult.qr_image;
      }

      // 生成 PDF 流并添加到 ZIP
      const pdfStream = generateTicketPDFStream(ticket.ticket_code, qrImage);
      archive.append(pdfStream, { name: `${ticket.ticket_code}.pdf` });

      // 每 100 张记录一次进度
      if ((i + 1) % 100 === 0) {
        this.log('ota.batch.zip_export.progress', {
          batch_id: batchId,
          processed: i + 1,
          total: tickets.length,
          percentage: Math.round((i + 1) / tickets.length * 100)
        });
      }
    }

    // 完成归档
    await archive.finalize();
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
