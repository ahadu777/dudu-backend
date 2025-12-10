import { Repository, DataSource, QueryRunner, In } from 'typeorm';
import { ProductEntity, ProductInventoryEntity, TicketEntity, TicketStatus, OrderEntity, OrderStatus, OrderChannel } from '../../../models';
import { OTATicketBatchEntity, BatchStatus } from './ota-ticket-batch.entity';
import { OTATicketBatchWithStatsDTO } from './ota-ticket-batch.dto';
import { OTAResellerEntity } from '../../../models/ota-reseller.entity';
import { generateSecureQR } from '../../../utils/qr-crypto';
import { logger } from '../../../utils/logger';

// 保持向后兼容的类型别名
type OTAOrderEntity = OrderEntity;

// 类型别名，保持向后兼容
type PreGeneratedTicketEntity = TicketEntity;

export class OTARepository {
  private productRepo: Repository<ProductEntity>;
  private inventoryRepo: Repository<ProductInventoryEntity>;
  private ticketRepo: Repository<TicketEntity>;
  private orderRepo: Repository<OrderEntity>;
  private batchRepo: Repository<OTATicketBatchEntity>;
  private resellerRepo: Repository<OTAResellerEntity>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository(ProductEntity);
    this.inventoryRepo = dataSource.getRepository(ProductInventoryEntity);
    this.ticketRepo = dataSource.getRepository(TicketEntity);
    this.orderRepo = dataSource.getRepository(OrderEntity);
    this.batchRepo = dataSource.getRepository(OTATicketBatchEntity);
    this.resellerRepo = dataSource.getRepository(OTAResellerEntity);
  }

  // Product operations
  async findProducts(productIds?: number[]): Promise<ProductEntity[]> {
    const query = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .where('product.status = :status', { status: 'active' });

    if (productIds && productIds.length > 0) {
      query.andWhere('product.id IN (:...productIds)', { productIds });
    }

    return query.getMany();
  }

  async findProductById(productId: number): Promise<ProductEntity | null> {
    return this.productRepo.findOne({
      where: { id: productId },
      relations: ['inventory']
    });
  }

  // Inventory operations
  async getAllInventories(): Promise<ProductInventoryEntity[]> {
    return this.inventoryRepo.find({
      relations: ['product'],
      where: {
        product: { status: 'active' }
      }
    });
  }

  async getInventoryByProductIds(productIds: number[]): Promise<ProductInventoryEntity[]> {
    return this.inventoryRepo.find({
      where: { product_id: In(productIds) },
      relations: ['product']
    });
  }

  async getInventoryByProductId(productId: number): Promise<ProductInventoryEntity | null> {
    return this.inventoryRepo.findOne({
      where: { product_id: productId },
      relations: ['product']
    });
  }

  // Pre-Generated Ticket Operations
  async createPreGeneratedTickets(tickets: Partial<PreGeneratedTicketEntity>[], channelId: string = 'ota'): Promise<PreGeneratedTicketEntity[]> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update inventory FIRST (reserve units for the batch)
      if (tickets.length > 0) {
        const productId = tickets[0].product_id;
        const quantity = tickets.length;

        // Update inventory using the helper method
        const inventory = await queryRunner.manager.findOne(ProductInventoryEntity, {
          where: { product_id: productId }
        });

        if (inventory) {
          if (!inventory.reserveInventory(channelId, quantity)) {
            throw new Error('Insufficient inventory for reservation');
          }
          await queryRunner.manager.save(ProductInventoryEntity, inventory);
        }
      }

      // Optimized batch insert using insert() for large batches
      // insert() is more efficient than save() for bulk operations
      // We split into chunks of 100 to avoid MySQL max_allowed_packet issues
      const BATCH_SIZE = 100;
      const savedTickets: PreGeneratedTicketEntity[] = [];

      for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
        const chunk = tickets.slice(i, i + BATCH_SIZE);

        // Use insert() for bulk insert - returns InsertResult, not entities
        await queryRunner.manager.insert(TicketEntity, chunk);

        // Convert partial tickets to full entities for return
        // The insert was successful, so we can construct the entities
        for (const ticket of chunk) {
          const entity = new TicketEntity();
          Object.assign(entity, ticket);
          savedTickets.push(entity);
        }
      }

      await queryRunner.commitTransaction();
      return savedTickets;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findPreGeneratedTicket(ticketCode: string): Promise<PreGeneratedTicketEntity | null> {
    return this.ticketRepo.findOne({
      where: { ticket_code: ticketCode }
    });
  }

  async findPreGeneratedTicketsByBatch(batchId: string): Promise<PreGeneratedTicketEntity[]> {
    return this.ticketRepo.find({
      where: { batch_id: batchId },
      order: { created_at: 'ASC' }
    });
  }

  async activatePreGeneratedTicket(
    ticketCode: string,
    partnerId: string,
    customerData: {
      customer_name: string;
      customer_email: string;
      customer_phone?: string;
      customer_type: 'adult' | 'child' | 'elderly';
      payment_reference: string;
      raw?: Record<string, any>;  // Optional metadata for audit trail
    },
    orderData: Partial<OTAOrderEntity>
  ): Promise<{ ticket: PreGeneratedTicketEntity; order: OTAOrderEntity }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the pre-generated ticket (with partner isolation)
      const ticket = await queryRunner.manager.findOne(TicketEntity, {
        where: { ticket_code: ticketCode, status: 'PRE_GENERATED' as TicketStatus, partner_id: partnerId, channel: 'ota' }
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketCode} not found or already activated`);
      }

      // Create the order
      const order = queryRunner.manager.create(OrderEntity, {
        order_no: (orderData as any).order_no || (orderData as any).order_id || `OTA-${Date.now()}`,
        channel: OrderChannel.OTA,
        partner_id: partnerId,
        contact_name: customerData.customer_name,
        contact_email: customerData.customer_email,
        contact_phone: customerData.customer_phone,
        payment_reference: customerData.payment_reference,
        product_id: ticket.product_id,
        quantity: 1,
        total: (orderData as any).total || (orderData as any).total_amount || 0,
        status: OrderStatus.CONFIRMED,
        confirmation_code: (orderData as any).confirmation_code
      });

      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // Fetch batch to get pricing information
      const batch = await queryRunner.manager.findOne(OTATicketBatchEntity, {
        where: { batch_id: ticket.batch_id }
      });

      // Calculate ticket price from batch pricing snapshot
      let ticketPrice: number | undefined;
      if (batch?.pricing_snapshot) {
        const snapshot = batch.pricing_snapshot;
        const customerType = customerData.customer_type;

        // Check for custom pricing override first
        const overridePrice = snapshot.pricing_overrides?.custom_customer_pricing?.[customerType];
        if (overridePrice !== undefined) {
          ticketPrice = overridePrice;
        } else {
          // Fall back to standard pricing
          const pricing = snapshot.customer_type_pricing?.find(p => p.customer_type === customerType);
          ticketPrice = pricing?.unit_price || snapshot.base_price;

          // Apply campaign discount if exists
          const discountRate = snapshot.pricing_overrides?.campaign_discount_rate || 0;
          if (discountRate > 0 && ticketPrice) {
            ticketPrice = ticketPrice * (1 - discountRate);
          }
        }
      }

      // Update the ticket with customer info and activation status
      // Note: QR codes are generated on-demand when requested via POST /qr/{code}
      // NOT stored in database to maintain security and freshness
      ticket.customer_name = customerData.customer_name;
      ticket.customer_email = customerData.customer_email;
      ticket.customer_phone = customerData.customer_phone;
      ticket.customer_type = customerData.customer_type;
      ticket.payment_reference = customerData.payment_reference;
      ticket.order_id = Number(savedOrder.id);
      ticket.order_no = savedOrder.order_no;
      ticket.status = 'ACTIVATED';
      ticket.activated_at = new Date();
      ticket.ticket_price = ticketPrice;

      // Update raw metadata if provided (for audit trail, e.g., visit_date, pricing breakdown)
      if (customerData.raw) {
        ticket.raw = customerData.raw;
      }

      // QR code removed - will be generated on-demand via POST /qr/{code}

      const savedTicket = await queryRunner.manager.save(TicketEntity, ticket);

      // Update inventory (move from reserved to sold)
      const inventory = await queryRunner.manager.findOne(ProductInventoryEntity, {
        where: { product_id: ticket.product_id }
      });

      if (inventory) {
        inventory.activateReservation(partnerId, 1);
        await queryRunner.manager.save(ProductInventoryEntity, inventory);
      }

      await queryRunner.commitTransaction();
      return { ticket: savedTicket, order: savedOrder };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // OTA Order Operations
  async createOTAOrder(orderData: Partial<OrderEntity>): Promise<OrderEntity> {
    const order = this.orderRepo.create({
      ...orderData,
      channel: OrderChannel.OTA
    });
    return this.orderRepo.save(order);
  }

  async findOTAOrdersByChannel(partnerId?: string): Promise<OrderEntity[]> {
    const whereClause: any = { channel: OrderChannel.OTA };
    if (partnerId) {
      whereClause.partner_id = partnerId;
    }
    return this.orderRepo.find({
      where: whereClause,
      order: { created_at: 'DESC' }
    });
  }

  async findOTAOrderById(orderId: string): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({
      where: { order_no: orderId, channel: OrderChannel.OTA }
    });
  }

  async findTicketsByOrderId(orderId: string): Promise<TicketEntity[]> {
    return this.ticketRepo.find({
      where: { order_no: orderId, channel: 'ota' }
      // Removed status: 'ACTIVE' filter - should return tickets in ANY status (ACTIVATED, VERIFIED, EXPIRED, etc.)
      // This allows viewing ticket details for completed orders with redeemed tickets
    });
  }

  // Query pre-generated tickets with filters and pagination
  async findPreGeneratedTickets(
    partnerId: string,
    filters: {
      status?: TicketStatus;
      batch_id?: string;
      created_after?: Date;
      created_before?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ tickets: PreGeneratedTicketEntity[]; total: number }> {
    const query = this.ticketRepo.createQueryBuilder('ticket')
      .where('ticket.partner_id = :partnerId', { partnerId });

    // Apply filters
    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.batch_id) {
      query.andWhere('ticket.batch_id = :batch_id', { batch_id: filters.batch_id });
    }

    if (filters.created_after) {
      query.andWhere('ticket.created_at >= :created_after', { created_after: filters.created_after });
    }

    if (filters.created_before) {
      query.andWhere('ticket.created_at <= :created_before', { created_before: filters.created_before });
    }

    // Sort by created_at descending (newest first)
    query.orderBy('ticket.created_at', 'DESC');

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 100, 1000);
    query.skip((page - 1) * limit).take(limit);

    const tickets = await query.getMany();

    return { tickets, total };
  }

  // OTA Ticket Batch Operations
  async createTicketBatch(batchData: Partial<OTATicketBatchEntity>): Promise<OTATicketBatchEntity> {
    const batch = this.batchRepo.create(batchData);
    return this.batchRepo.save(batch);
  }

  /**
   * 创建批次和票券在同一个事务中
   * 确保批次创建、库存扣减、票券插入的原子性
   * 任何步骤失败都会完全回滚
   */
  async createBatchWithTickets(
    batchData: Partial<OTATicketBatchEntity>,
    tickets: Partial<PreGeneratedTicketEntity>[],
    channelId: string = 'ota'
  ): Promise<{ batch: OTATicketBatchEntity; tickets: PreGeneratedTicketEntity[] }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: 创建批次记录
      const batch = queryRunner.manager.create(OTATicketBatchEntity, batchData);
      const savedBatch = await queryRunner.manager.save(OTATicketBatchEntity, batch);

      logger.info('ota.batch.created_in_transaction', {
        batch_id: savedBatch.batch_id,
        total_quantity: savedBatch.total_quantity
      });

      // Step 2: 更新库存（先扣减，失败则整体回滚）
      if (tickets.length > 0) {
        const productId = tickets[0].product_id;
        const quantity = tickets.length;

        const inventory = await queryRunner.manager.findOne(ProductInventoryEntity, {
          where: { product_id: productId }
        });

        if (inventory) {
          if (!inventory.reserveInventory(channelId, quantity)) {
            throw new Error('Insufficient inventory for reservation');
          }
          await queryRunner.manager.save(ProductInventoryEntity, inventory);

          logger.info('ota.inventory.reserved_in_transaction', {
            batch_id: savedBatch.batch_id,
            product_id: productId,
            quantity
          });
        }
      }

      // Step 3: 批量插入票券（分块处理）
      const BATCH_SIZE = 100;
      const savedTickets: PreGeneratedTicketEntity[] = [];

      for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
        const chunk = tickets.slice(i, i + BATCH_SIZE);
        await queryRunner.manager.insert(TicketEntity, chunk);

        for (const ticket of chunk) {
          const entity = new TicketEntity();
          Object.assign(entity, ticket);
          savedTickets.push(entity);
        }
      }

      logger.info('ota.tickets.inserted_in_transaction', {
        batch_id: savedBatch.batch_id,
        tickets_count: savedTickets.length
      });

      // Step 4: 提交事务
      await queryRunner.commitTransaction();

      logger.info('ota.batch_with_tickets.transaction_committed', {
        batch_id: savedBatch.batch_id,
        tickets_count: savedTickets.length
      });

      return { batch: savedBatch, tickets: savedTickets };

    } catch (error) {
      // 回滚事务：批次、库存、票券全部回滚
      await queryRunner.rollbackTransaction();

      logger.error('ota.batch_with_tickets.transaction_rolled_back', {
        batch_id: batchData.batch_id,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findBatchById(batchId: string): Promise<OTATicketBatchEntity | null> {
    return this.batchRepo.findOne({
      where: { batch_id: batchId }
    });
  }

  async findBatchesByPartner(partnerId: string, status?: BatchStatus): Promise<OTATicketBatchEntity[]> {
    const query = this.batchRepo.createQueryBuilder('batch')
      .where('batch.partner_id = :partnerId', { partnerId });

    if (status) {
      query.andWhere('batch.status = :status', { status });
    }

    return query.orderBy('batch.created_at', 'DESC').getMany();
  }

  async findBatchesByReseller(resellerName: string): Promise<OTATicketBatchEntity[]> {
    return this.batchRepo.createQueryBuilder('batch')
      .where("JSON_UNQUOTE(JSON_EXTRACT(batch.reseller_metadata, '$.intended_reseller')) = :resellerName",
        { resellerName })
      .orderBy('batch.created_at', 'DESC')
      .getMany();
  }

  async findBatchesByCampaignType(campaignType: string): Promise<OTATicketBatchEntity[]> {
    return this.batchRepo.createQueryBuilder('batch')
      .where("JSON_UNQUOTE(JSON_EXTRACT(batch.batch_metadata, '$.campaign_type')) = :campaignType",
        { campaignType })
      .orderBy('batch.created_at', 'DESC')
      .getMany();
  }

  // ========================================
  // Optimized batch queries with statistics (single JOIN query)
  // ========================================

  /**
   * Find a single batch with statistics computed via JOIN
   * This is much faster than separate queries
   */
  async findBatchWithStats(batchId: string): Promise<OTATicketBatchWithStatsDTO | null> {
    const result = await this.dataSource.query(`
      SELECT
        b.*,
        COUNT(t.ticket_code) as tickets_generated,
        SUM(CASE WHEN t.status IN ('ACTIVATED', 'VERIFIED') THEN 1 ELSE 0 END) as tickets_activated,
        SUM(CASE WHEN t.status = 'VERIFIED' THEN 1 ELSE 0 END) as tickets_redeemed,
        SUM(CASE
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'adult' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[0].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2))
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'child' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[1].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.65
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'elderly' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[2].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.83
            )
          ELSE 0
        END) as total_revenue_realized
      FROM ota_ticket_batches b
      LEFT JOIN tickets t ON t.batch_id = b.batch_id AND t.channel = 'ota'
      WHERE b.batch_id = ?
      GROUP BY b.batch_id
    `, [batchId]);

    if (!result || result.length === 0) return null;

    return this.mapRowToBatchWithStats(result[0]);
  }

  /**
   * Find multiple batches with statistics via JOIN
   * Optimized for listing pages - avoids N+1 query problem
   */
  async findBatchesWithStats(partnerId?: string, limit?: number, offset?: number): Promise<OTATicketBatchWithStatsDTO[]> {
    let query = `
      SELECT
        b.*,
        COUNT(t.ticket_code) as tickets_generated,
        SUM(CASE WHEN t.status IN ('ACTIVATED', 'VERIFIED') THEN 1 ELSE 0 END) as tickets_activated,
        SUM(CASE WHEN t.status = 'VERIFIED' THEN 1 ELSE 0 END) as tickets_redeemed,
        SUM(CASE
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'adult' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[0].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2))
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'child' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[1].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.65
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'elderly' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[2].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.83
            )
          ELSE 0
        END) as total_revenue_realized
      FROM ota_ticket_batches b
      LEFT JOIN tickets t ON t.batch_id = b.batch_id AND t.channel = 'ota'
    `;

    const params: any[] = [];
    if (partnerId) {
      query += ' WHERE b.partner_id = ?';
      params.push(partnerId);
    }

    query += ' GROUP BY b.batch_id ORDER BY b.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    const results = await this.dataSource.query(query, params);
    return results.map((row: any) => this.mapRowToBatchWithStats(row));
  }

  /**
   * Find batches with filters and pagination (for batch list API)
   * Supports: status, product_id, reseller, date range filters
   */
  async findBatchesWithFilters(
    partnerId: string,
    filters: {
      status?: string;
      product_id?: number;
      reseller?: string;
      created_after?: string;
      created_before?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ batches: OTATicketBatchWithStatsDTO[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['b.partner_id = ?'];
    const params: any[] = [partnerId];

    if (filters.status) {
      conditions.push('b.status = ?');
      params.push(filters.status);
    }

    if (filters.product_id) {
      conditions.push('b.product_id = ?');
      params.push(filters.product_id);
    }

    if (filters.reseller) {
      conditions.push("JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller')) = ?");
      params.push(filters.reseller);
    }

    if (filters.created_after) {
      conditions.push('b.created_at >= ?');
      params.push(filters.created_after);
    }

    if (filters.created_before) {
      conditions.push('b.created_at <= ?');
      params.push(filters.created_before);
    }

    const whereClause = conditions.join(' AND ');

    // Count total for pagination
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM ota_ticket_batches b WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.total) || 0;

    // Main query with stats
    const query = `
      SELECT
        b.*,
        COUNT(t.ticket_code) as tickets_generated,
        SUM(CASE WHEN t.status IN ('ACTIVATED', 'VERIFIED') THEN 1 ELSE 0 END) as tickets_activated,
        SUM(CASE WHEN t.status = 'VERIFIED' THEN 1 ELSE 0 END) as tickets_redeemed,
        SUM(CASE
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'adult' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[0].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2))
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'child' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[1].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.65
            )
          WHEN t.status = 'VERIFIED' AND t.customer_type = 'elderly' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[2].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.83
            )
          ELSE 0
        END) as total_revenue_realized
      FROM ota_ticket_batches b
      LEFT JOIN tickets t ON t.batch_id = b.batch_id AND t.channel = 'ota'
      WHERE ${whereClause}
      GROUP BY b.batch_id
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await this.dataSource.query(query, [...params, limit, offset]);
    const batches = results.map((row: any) => this.mapRowToBatchWithStats(row));

    return { batches, total };
  }

  /**
   * Helper method to map raw SQL row to DTO with stats
   */
  private mapRowToBatchWithStats(row: any): OTATicketBatchWithStatsDTO {
    const batch = new OTATicketBatchWithStatsDTO();

    // Map basic fields
    batch.batch_id = row.batch_id;
    batch.partner_id = row.partner_id;
    batch.product_id = row.product_id;
    batch.total_quantity = row.total_quantity;
    batch.distribution_mode = row.distribution_mode;
    batch.pricing_snapshot = typeof row.pricing_snapshot === 'string'
      ? JSON.parse(row.pricing_snapshot)
      : row.pricing_snapshot;
    batch.reseller_metadata = row.reseller_metadata
      ? (typeof row.reseller_metadata === 'string' ? JSON.parse(row.reseller_metadata) : row.reseller_metadata)
      : undefined;
    batch.batch_metadata = row.batch_metadata
      ? (typeof row.batch_metadata === 'string' ? JSON.parse(row.batch_metadata) : row.batch_metadata)
      : undefined;
    batch.expires_at = row.expires_at;
    batch.status = row.status;
    batch.created_at = row.created_at;
    batch.updated_at = row.updated_at;

    // Map computed statistics (transient properties)
    batch.tickets_generated = parseInt(row.tickets_generated) || 0;
    batch.tickets_activated = parseInt(row.tickets_activated) || 0;
    batch.tickets_redeemed = parseInt(row.tickets_redeemed) || 0;
    batch.total_revenue_realized = parseFloat(row.total_revenue_realized) || 0;

    return batch;
  }

  /**
   * Get batch analytics using optimized JOIN query
   * This is the preferred method for fetching batch statistics
   */
  async getBatchAnalytics(batchId: string): Promise<any | null> {
    // Use optimized single-query method
    const batch = await this.findBatchWithStats(batchId);
    if (!batch) return null;

    const basePrice = batch.pricing_snapshot.base_price;
    const tickets_generated = batch.tickets_generated ?? 0;
    const tickets_activated = batch.tickets_activated ?? 0;
    const tickets_redeemed = batch.tickets_redeemed ?? 0;
    const total_revenue = batch.total_revenue_realized ?? 0;

    return {
      batch_id: batch.batch_id,
      reseller_name: batch.reseller_metadata?.intended_reseller || 'Direct Sale',
      campaign_type: batch.batch_metadata?.campaign_type || 'standard',
      campaign_name: batch.batch_metadata?.campaign_name || 'Standard Batch',
      generated_at: batch.created_at,
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
        realized_revenue: total_revenue,
        realization_rate: tickets_generated > 0 ? total_revenue / (tickets_generated * basePrice) : 0
      },
      wholesale_rate: basePrice,
      amount_due: total_revenue.toFixed(2),
      batch_metadata: batch.batch_metadata || {}
    };
  }

  /**
   * Get reseller billing summary with optimized query
   * Uses JOIN to compute statistics in single query
   */
  async getResellerBillingSummary(resellerName: string, period: string): Promise<any> {
    // Optimized query with stats computed via JOIN
    // Note: batch_id is stored in lowercase in database, so we use LOWER() for comparison
    // Billing happens when tickets are sold (ACTIVE) not when redeemed (USED)
    const result = await this.dataSource.query(`
      SELECT
        b.*,
        COUNT(t.ticket_code) as tickets_generated,
        SUM(CASE WHEN t.status IN ('ACTIVATED', 'VERIFIED') THEN 1 ELSE 0 END) as tickets_sold,
        SUM(CASE
          WHEN t.status IN ('ACTIVATED', 'VERIFIED') AND t.customer_type = 'adult' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[0].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2))
            )
          WHEN t.status IN ('ACTIVATED', 'VERIFIED') AND t.customer_type = 'child' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[1].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.65
            )
          WHEN t.status IN ('ACTIVATED', 'VERIFIED') AND t.customer_type = 'elderly' THEN
            COALESCE(
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.customer_type_pricing[2].unit_price')) AS DECIMAL(10,2)),
              CAST(JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) AS DECIMAL(10,2)) * 0.83
            )
          ELSE 0
        END) as total_revenue_realized
      FROM ota_ticket_batches b
      LEFT JOIN tickets t ON LOWER(t.batch_id) = LOWER(b.batch_id) AND t.channel = 'ota'
      WHERE b.reseller_metadata IS NOT NULL
        AND JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller')) = ?
        AND DATE_FORMAT(b.created_at, '%Y-%m') = ?
      GROUP BY b.batch_id
      ORDER BY b.created_at DESC
    `, [resellerName, period]);

    // Return empty if no results - this is normal
    if (result.length === 0) {
      return {
        billing_period: period,
        reseller_summaries: []
      };
    }

    const periodBatches = result.map((row: any) => ({
      batch_id: row.batch_id,
      tickets_generated: parseInt(row.tickets_generated) || 0,
      tickets_sold: parseInt(row.tickets_sold) || 0,
      total_revenue_realized: parseFloat(row.total_revenue_realized) || 0,
      pricing_snapshot: typeof row.pricing_snapshot === 'string' ? JSON.parse(row.pricing_snapshot) : row.pricing_snapshot
    }));

    const totalSold = periodBatches.reduce((sum: number, b: any) => sum + b.tickets_sold, 0);
    const totalRevenue = periodBatches.reduce((sum: number, b: any) => sum + b.total_revenue_realized, 0);

    const resellerSummary = {
      reseller_name: resellerName,
      total_batches: periodBatches.length,
      total_sales: totalSold,
      total_amount_due: totalRevenue.toFixed(2),
      batches: periodBatches.map((batch: any) => ({
        batch_id: batch.batch_id,
        sales_count: batch.tickets_sold,
        wholesale_rate: batch.pricing_snapshot.base_price,
        amount_due: batch.total_revenue_realized.toFixed(2)
      }))
    };

    return {
      billing_period: period,
      reseller_summaries: [resellerSummary]
    };
  }

  async getBatchRedemptions(batchId: string): Promise<any[]> {
    // Complex JOIN query: redemption_events -> tickets -> batch -> venue
    const result = await this.dataSource.query(`
      SELECT
        r.ticket_code,
        r.function_code,
        r.redeemed_at,
        v.venue_name,
        JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) as wholesale_price
      FROM redemption_events r
      INNER JOIN tickets t ON r.ticket_code = t.ticket_code AND t.channel = 'ota'
      INNER JOIN ota_ticket_batches b ON t.batch_id = b.batch_id
      LEFT JOIN venues v ON r.venue_id = v.venue_id
      WHERE b.batch_id = ?
        AND r.result = 'success'
      ORDER BY r.redeemed_at DESC
    `, [batchId]);

    return result.map((row: any) => ({
      ticket_code: row.ticket_code,
      function_code: row.function_code,
      redeemed_at: row.redeemed_at,
      venue_name: row.venue_name || 'Unknown Venue',
      wholesale_price: parseFloat(row.wholesale_price) || 0
    }));
  }

  // ============= ADMIN MANAGEMENT QUERIES =============

  /**
   * Get orders summary for a specific partner
   */
  async getPartnerOrdersSummary(partnerId: string, dateRange?: { start_date?: string; end_date?: string }) {
    const query = this.orderRepo.createQueryBuilder('order')
      .where('order.partner_id = :partnerId', { partnerId })
      .andWhere('order.channel = :channel', { channel: OrderChannel.OTA });

    if (dateRange?.start_date) {
      query.andWhere('order.created_at >= :startDate', { startDate: dateRange.start_date });
    }
    if (dateRange?.end_date) {
      query.andWhere('order.created_at <= :endDate', { endDate: dateRange.end_date });
    }

    const orders = await query.getMany();

    const byStatus: any = {};
    orders.forEach(order => {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });

    return {
      total_count: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
      avg_order_value: orders.length > 0
        ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
        : 0,
      by_status: byStatus
    };
  }

  /**
   * Get tickets summary for a specific partner
   */
  async getPartnerTicketsSummary(partnerId: string) {
    const tickets = await this.ticketRepo.find({
      where: { partner_id: partnerId }
    });

    const byStatus: any = {};
    const byProduct: any = {};

    tickets.forEach((ticket: PreGeneratedTicketEntity) => {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byProduct[ticket.product_id] = (byProduct[ticket.product_id] || 0) + 1;
    });

    return {
      total_generated: tickets.length,
      by_status: byStatus,
      by_product: byProduct
    };
  }

  /**
   * Get inventory usage for a specific partner
   */
  async getPartnerInventoryUsage(partnerId: string) {
    const inventories = await this.inventoryRepo.find({
      relations: ['product']
    });

    const usage: any = {};

    for (const inventory of inventories) {
      const allocation = inventory.channel_allocations[partnerId];
      if (allocation) {
        const total = allocation.allocated;
        const used = allocation.reserved + allocation.sold;
        const utilization = total > 0 ? ((used / total) * 100).toFixed(2) + '%' : '0%';

        usage[inventory.product_id] = {
          product_name: inventory.product?.name || `Product ${inventory.product_id}`,
          allocated: allocation.allocated,
          reserved: allocation.reserved,
          sold: allocation.sold,
          available: allocation.allocated - allocation.reserved - allocation.sold,
          utilization_rate: utilization
        };
      }
    }

    return usage;
  }

  /**
   * Get partner summary
   * 返回三组数据：全局总览 + 今日数据 + 时间筛选区间数据
   * 按 partner_id 筛选
   */
  async getPartnerSummary(options: { partner_id: string; start_date?: string; end_date?: string }) {
    const { partner_id, start_date, end_date } = options;

    // 今天的日期范围
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. 全局票券统计（使用 TypeORM QueryBuilder）
    const ticketStatsQuery = this.ticketRepo.createQueryBuilder('t')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = :preGen THEN 1 ELSE 0 END)', 'pre_generated')
      .addSelect('SUM(CASE WHEN t.status = :activated THEN 1 ELSE 0 END)', 'activated')
      .addSelect('SUM(CASE WHEN t.status = :verified THEN 1 ELSE 0 END)', 'verified')
      .where('t.channel = :channel', { channel: 'ota' })
      .andWhere('t.partner_id = :partnerId', { partnerId: partner_id })
      .setParameters({ preGen: 'PRE_GENERATED', activated: 'ACTIVATED', verified: 'VERIFIED' });

    // 2. 今日票券统计
    const todayTicketStatsQuery = this.ticketRepo.createQueryBuilder('t')
      .select('SUM(CASE WHEN t.created_at >= :todayStart THEN 1 ELSE 0 END)', 'created')
      .addSelect('SUM(CASE WHEN t.activated_at >= :todayStart THEN 1 ELSE 0 END)', 'activated')
      .addSelect('SUM(CASE WHEN t.verified_at >= :todayStart THEN 1 ELSE 0 END)', 'verified')
      .where('t.channel = :channel', { channel: 'ota' })
      .andWhere('t.partner_id = :partnerId', { partnerId: partner_id })
      .setParameters({ todayStart });

    // 3. 全局订单统计
    const orderStatsQuery = this.orderRepo.createQueryBuilder('o')
      .select('COUNT(*)', 'total_orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'total_revenue')
      .where('o.channel = :channel', { channel: OrderChannel.OTA })
      .andWhere('o.partner_id = :partnerId', { partnerId: partner_id });

    // 4. 今日订单统计
    const todayOrderStatsQuery = this.orderRepo.createQueryBuilder('o')
      .select('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.channel = :channel', { channel: OrderChannel.OTA })
      .andWhere('o.partner_id = :partnerId', { partnerId: partner_id })
      .andWhere('o.created_at >= :todayStart', { todayStart });

    // 并行执行查询
    const [ticketStats, todayTicketStats, orderStats, todayOrderStats] = await Promise.all([
      ticketStatsQuery.getRawOne(),
      todayTicketStatsQuery.getRawOne(),
      orderStatsQuery.getRawOne(),
      todayOrderStatsQuery.getRawOne()
    ]);

    // 5. 时间筛选区间统计（如果提供了时间参数）
    let filtered = null;
    if (start_date || end_date) {
      const filteredTicketQuery = this.ticketRepo.createQueryBuilder('t')
        .select('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN t.status = :preGen THEN 1 ELSE 0 END)', 'pre_generated')
        .addSelect('SUM(CASE WHEN t.status = :activated THEN 1 ELSE 0 END)', 'activated')
        .addSelect('SUM(CASE WHEN t.status = :verified THEN 1 ELSE 0 END)', 'verified')
        .where('t.channel = :channel', { channel: 'ota' })
        .andWhere('t.partner_id = :partnerId', { partnerId: partner_id })
        .setParameters({ preGen: 'PRE_GENERATED', activated: 'ACTIVATED', verified: 'VERIFIED' });

      const filteredOrderQuery = this.orderRepo.createQueryBuilder('o')
        .select('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
        .where('o.channel = :channel', { channel: OrderChannel.OTA })
        .andWhere('o.partner_id = :partnerId', { partnerId: partner_id });

      if (start_date) {
        filteredTicketQuery.andWhere('t.created_at >= :startDate', { startDate: start_date });
        filteredOrderQuery.andWhere('o.created_at >= :startDate', { startDate: start_date });
      }
      if (end_date) {
        filteredTicketQuery.andWhere('t.created_at <= :endDate', { endDate: end_date });
        filteredOrderQuery.andWhere('o.created_at <= :endDate', { endDate: end_date });
      }

      const [ft, fo] = await Promise.all([
        filteredTicketQuery.getRawOne(),
        filteredOrderQuery.getRawOne()
      ]);

      filtered = {
        start_date: start_date || null,
        end_date: end_date || null,
        orders: parseInt(fo?.orders) || 0,
        revenue: parseFloat(fo?.revenue) || 0,
        total_tickets: parseInt(ft?.total) || 0,
        pre_generated_tickets: parseInt(ft?.pre_generated) || 0,
        activated_tickets: parseInt(ft?.activated) || 0,
        verified_tickets: parseInt(ft?.verified) || 0
      };
    }

    return {
      // 全局总览
      total_orders: parseInt(orderStats?.total_orders) || 0,
      total_revenue: parseFloat(orderStats?.total_revenue) || 0,
      total_tickets: parseInt(ticketStats?.total) || 0,
      pre_generated_tickets: parseInt(ticketStats?.pre_generated) || 0,
      activated_tickets: parseInt(ticketStats?.activated) || 0,
      verified_tickets: parseInt(ticketStats?.verified) || 0,
      // 今日统计
      today: {
        orders: parseInt(todayOrderStats?.orders) || 0,
        revenue: parseFloat(todayOrderStats?.revenue) || 0,
        created_tickets: parseInt(todayTicketStats?.created) || 0,
        activated_tickets: parseInt(todayTicketStats?.activated) || 0,
        verified_tickets: parseInt(todayTicketStats?.verified) || 0
      },
      // 时间筛选区间（如果有）
      filtered
    };
  }

  /**
   * Get top partners by revenue
   */
  async getTopPartners(limit: number = 5, dateRange?: { start_date?: string; end_date?: string }) {
    const query = this.orderRepo.createQueryBuilder('order')
      .select('order.partner_id', 'partner_id')
      .addSelect('COUNT(order.id)', 'orders_count')
      .addSelect('SUM(order.total)', 'revenue')
      .where('order.channel = :channel', { channel: OrderChannel.OTA })
      .groupBy('order.partner_id')
      .orderBy('revenue', 'DESC')
      .limit(limit);

    if (dateRange?.start_date) {
      query.andWhere('order.created_at >= :startDate', { startDate: dateRange.start_date });
    }
    if (dateRange?.end_date) {
      query.andWhere('order.created_at <= :endDate', { endDate: dateRange.end_date });
    }

    const results = await query.getRawMany();

    return results.map((r: any) => ({
      partner_id: r.partner_id,
      orders_count: parseInt(r.orders_count),
      revenue: parseFloat(r.revenue)
    }));
  }

  /**
   * Get inventory overview across all partners
   */
  async getInventoryOverview() {
    const inventories = await this.inventoryRepo.find();

    let totalAllocated = 0;
    let totalReserved = 0;
    let totalSold = 0;

    inventories.forEach(inv => {
      Object.values(inv.channel_allocations).forEach((allocation: any) => {
        totalAllocated += allocation.allocated;
        totalReserved += allocation.reserved;
        totalSold += allocation.sold;
      });
    });

    const overallUtilization = totalAllocated > 0
      ? ((totalSold / totalAllocated) * 100).toFixed(2) + '%'
      : '0%';

    return {
      total_allocated: totalAllocated,
      total_reserved: totalReserved,
      total_sold: totalSold,
      overall_utilization: overallUtilization
    };
  }

  // ============= RESELLER MANAGEMENT (NEW - 2025-11-14) =============

  /**
   * Get batch details for a specific reseller
   * 获取某个经销商的批次详情列表
   */
  async getResellerBatches(partnerId: string, resellerName: string, filters?: { status?: string; page?: number; limit?: number }): Promise<any[]> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, 50); // 每个经销商最多50个批次
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        batch_id,
        product_id,
        total_quantity as tickets_count,
        status,
        created_at,
        expires_at
      FROM ota_ticket_batches
      WHERE partner_id = ?
        AND reseller_metadata IS NOT NULL
        AND distribution_mode = 'reseller_batch'
        AND JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.intended_reseller')) = ?
    `;

    const params: any[] = [partnerId, resellerName];

    // 状态过滤
    if (filters?.status === 'active') {
      query += ` AND status = 'active'`;
    }

    query += `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const results = await this.dataSource.query(query, params);
    return results;
  }

  /**
   * Aggregate reseller summary from batch metadata (JSON-based approach)
   * 从批次JSON字段聚合经销商信息,用于管理列表
   */
  async getResellersSummaryFromBatches(partnerId: string, filters?: { status?: string; date_range?: string; page?: number; limit?: number }): Promise<any[]> {
    let query = `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(otb.reseller_metadata, '$.intended_reseller')) as reseller_name,
        JSON_UNQUOTE(JSON_EXTRACT(otb.reseller_metadata, '$.contact_email')) as contact_email,
        JSON_UNQUOTE(JSON_EXTRACT(otb.reseller_metadata, '$.contact_phone')) as contact_phone,

        -- 统计信息
        COUNT(DISTINCT otb.batch_id) as total_batches,
        SUM(otb.total_quantity) as total_tickets_generated,
        COALESCE(SUM(batch_stats.activated_count), 0) as total_tickets_activated,
        COALESCE(SUM(batch_stats.used_count), 0) as total_tickets_used,

        -- 收入统计（基于实际激活价格，包含客户类型折扣）
        COALESCE(SUM(batch_stats.total_revenue), 0) as total_revenue,
        COALESCE(SUM(batch_stats.realized_revenue), 0) as realized_revenue,

        -- 最近活动
        MAX(otb.created_at) as last_batch_date,
        MIN(otb.created_at) as first_batch_date,

        -- 佣金统计(按百分比类型)
        AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(otb.reseller_metadata, '$.commission_config.rate')) AS DECIMAL(5,4))) as avg_commission_rate,

        -- 结算周期(取最常见的)
        JSON_UNQUOTE(JSON_EXTRACT(otb.reseller_metadata, '$.settlement_cycle')) as settlement_cycle

      FROM ota_ticket_batches otb
      LEFT JOIN (
        SELECT
          batch_id,
          COUNT(CASE WHEN status IN ('ACTIVATED', 'VERIFIED') THEN 1 END) as activated_count,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as used_count,
          -- 总收入：所有已激活票券的实际价格（包含客户类型折扣）
          SUM(
            CASE WHEN status IN ('ACTIVATED', 'VERIFIED') THEN
              COALESCE(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(raw, '$.pricing_breakdown.final_price')) AS DECIMAL(10,2)),
                0
              )
            ELSE 0 END
          ) as total_revenue,
          -- 已实现收入：已核销票券的实际价格
          SUM(
            CASE WHEN status = 'VERIFIED' THEN
              COALESCE(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(raw, '$.pricing_breakdown.final_price')) AS DECIMAL(10,2)),
                0
              )
            ELSE 0 END
          ) as realized_revenue
        FROM tickets
        WHERE channel = 'ota' AND status IN ('ACTIVATED', 'VERIFIED')
        GROUP BY batch_id
      ) batch_stats ON otb.batch_id = batch_stats.batch_id

      WHERE otb.partner_id = ?
        AND otb.reseller_metadata IS NOT NULL
        AND otb.distribution_mode = 'reseller_batch'
    `;

    const params: any[] = [partnerId];

    // 状态过滤
    if (filters?.status === 'active') {
      query += ` AND otb.status = 'active'`;
    }

    // 日期范围过滤
    if (filters?.date_range) {
      query += ` AND DATE_FORMAT(otb.created_at, '%Y-%m') = ?`;
      params.push(filters.date_range);
    }

    query += `
      GROUP BY
        reseller_name,
        contact_email,
        contact_phone,
        settlement_cycle

      ORDER BY total_tickets_activated DESC
    `;

    // 添加分页
    if (filters?.page && filters?.limit) {
      const page = filters.page;
      const limit = Math.min(filters.limit, 100); // 最多100个经销商
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const results = await this.dataSource.query(query, params);
    return results;
  }

  /**
   * Count total resellers (for pagination)
   * 计算经销商总数（用于分页）
   */
  async countResellers(partnerId: string, filters?: { status?: string; date_range?: string }): Promise<number> {
    let query = `
      SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.intended_reseller'))) as total
      FROM ota_ticket_batches
      WHERE partner_id = ?
        AND reseller_metadata IS NOT NULL
        AND distribution_mode = 'reseller_batch'
    `;

    const params: any[] = [partnerId];

    // 状态过滤
    if (filters?.status === 'active') {
      query += ` AND status = 'active'`;
    }

    // 日期范围过滤
    if (filters?.date_range) {
      query += ` AND DATE_FORMAT(created_at, '%Y-%m') = ?`;
      params.push(filters.date_range);
    }

    const result = await this.dataSource.query(query, params);
    return result[0]?.total || 0;
  }

  /**
   * Find all resellers for a specific OTA partner
   * Used for: Reseller listing, dropdown selections
   */
  async findResellersByPartner(partnerId: string): Promise<OTAResellerEntity[]> {
    return this.resellerRepo.find({
      where: { partner_id: partnerId, status: 'active' },
      order: { reseller_name: 'ASC' }
    });
  }

  /**
   * Find reseller by ID (with partner isolation check)
   * Used for: Reseller detail views, batch assignments
   */
  async findResellerById(id: number, partnerId: string): Promise<OTAResellerEntity | null> {
    return this.resellerRepo.findOne({
      where: { id, partner_id: partnerId }
    });
  }

  /**
   * Create new reseller
   * Used for: Reseller onboarding (future API)
   * Auto-generates reseller_code: RSL-{partner_id}-{counter}
   */
  async createReseller(data: Partial<OTAResellerEntity>): Promise<OTAResellerEntity> {
    // Auto-generate reseller_code if not provided
    if (!data.reseller_code && data.partner_id) {
      // Find max counter for this partner
      const existingResellers = await this.resellerRepo.find({
        where: { partner_id: data.partner_id },
        order: { reseller_code: 'DESC' },
        take: 1
      });

      let counter = 1;
      if (existingResellers.length > 0) {
        const lastCode = existingResellers[0].reseller_code;
        // Extract counter from format RSL-{partner_id}-{counter}
        const match = lastCode.match(/-(\d+)$/);
        if (match) {
          counter = parseInt(match[1]) + 1;
        }
      }

      // Format: RSL-ctrip-001
      data.reseller_code = `RSL-${data.partner_id}-${counter.toString().padStart(3, '0')}`;
    }

    const reseller = this.resellerRepo.create(data);
    return this.resellerRepo.save(reseller);
  }
}