import { Repository, DataSource, QueryRunner, In } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ProductInventoryEntity } from './product-inventory.entity';
import { ChannelReservationEntity, ReservationStatus } from './channel-reservation.entity';
import { PreGeneratedTicketEntity, TicketStatus } from './pre-generated-ticket.entity';
import { OTAOrderEntity, OrderStatus } from './ota-order.entity';
import { OTATicketBatchEntity, BatchStatus } from './ota-ticket-batch.entity';

export class OTARepository {
  private productRepo: Repository<ProductEntity>;
  private inventoryRepo: Repository<ProductInventoryEntity>;
  private reservationRepo: Repository<ChannelReservationEntity>;
  private preGeneratedTicketRepo: Repository<PreGeneratedTicketEntity>;
  private otaOrderRepo: Repository<OTAOrderEntity>;
  private batchRepo: Repository<OTATicketBatchEntity>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository(ProductEntity);
    this.inventoryRepo = dataSource.getRepository(ProductInventoryEntity);
    this.reservationRepo = dataSource.getRepository(ChannelReservationEntity);
    this.preGeneratedTicketRepo = dataSource.getRepository(PreGeneratedTicketEntity);
    this.otaOrderRepo = dataSource.getRepository(OTAOrderEntity);
    this.batchRepo = dataSource.getRepository(OTATicketBatchEntity);
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

  // Reservation operations with database transactions
  async createReservation(
    productId: number,
    channelId: string,
    quantity: number,
    expiresAt: Date,
    pricingSnapshot?: any
  ): Promise<ChannelReservationEntity | null> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock inventory row for update
      const inventory = await queryRunner.manager
        .createQueryBuilder(ProductInventoryEntity, 'inventory')
        .setLock('pessimistic_write')
        .where('inventory.product_id = :productId', { productId })
        .getOne();

      if (!inventory) {
        throw new Error(`Product ${productId} not found`);
      }

      // Check availability and reserve
      if (!inventory.reserveInventory(channelId, quantity)) {
        throw new Error(`Insufficient inventory for product ${productId}`);
      }

      // Save updated inventory
      await queryRunner.manager.save(ProductInventoryEntity, inventory);

      // Create reservation
      const reservation = new ChannelReservationEntity();
      reservation.product_id = productId;
      reservation.channel_id = channelId;
      reservation.quantity = quantity;
      reservation.expires_at = expiresAt;
      reservation.pricing_snapshot = pricingSnapshot;

      const savedReservation = await queryRunner.manager.save(ChannelReservationEntity, reservation);

      await queryRunner.commitTransaction();
      return savedReservation;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findReservation(reservationId: string): Promise<ChannelReservationEntity | null> {
    return this.reservationRepo.findOne({
      where: { reservation_id: reservationId },
      relations: ['product_inventory', 'product_inventory.product']
    });
  }

  async findActiveReservations(channelId?: string): Promise<ChannelReservationEntity[]> {
    const query = this.reservationRepo.createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.product_inventory', 'inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('reservation.status = :status', { status: 'active' });

    if (channelId) {
      query.andWhere('reservation.channel_id = :channelId', { channelId });
    }

    return query.getMany();
  }

  async findReservationsByProduct(productId: number, channelId?: string): Promise<ChannelReservationEntity[]> {
    const query = this.reservationRepo.createQueryBuilder('reservation')
      .where('reservation.product_id = :productId', { productId })
      .andWhere('reservation.status = :status', { status: 'active' });

    if (channelId) {
      query.andWhere('reservation.channel_id = :channelId', { channelId });
    }

    return query.getMany();
  }

  // Expire reservations and release inventory
  async expireReservations(): Promise<number> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find expired reservations
      const expiredReservations = await queryRunner.manager
        .createQueryBuilder(ChannelReservationEntity, 'reservation')
        .where('reservation.status = :status', { status: 'active' })
        .andWhere('reservation.expires_at < :now', { now: new Date() })
        .getMany();

      if (expiredReservations.length === 0) {
        await queryRunner.commitTransaction();
        return 0;
      }

      // Group by product and channel to batch inventory updates
      const inventoryUpdates = new Map<string, { productId: number; channelId: string; quantity: number }>();

      for (const reservation of expiredReservations) {
        const key = `${reservation.product_id}_${reservation.channel_id}`;
        const existing = inventoryUpdates.get(key);
        if (existing) {
          existing.quantity += reservation.quantity;
        } else {
          inventoryUpdates.set(key, {
            productId: reservation.product_id,
            channelId: reservation.channel_id,
            quantity: reservation.quantity
          });
        }
      }

      // Update inventory for each product/channel combination
      for (const update of inventoryUpdates.values()) {
        const inventory = await queryRunner.manager
          .createQueryBuilder(ProductInventoryEntity, 'inventory')
          .setLock('pessimistic_write')
          .where('inventory.product_id = :productId', { productId: update.productId })
          .getOne();

        if (inventory) {
          inventory.releaseReservation(update.channelId, update.quantity);
          await queryRunner.manager.save(ProductInventoryEntity, inventory);
        }
      }

      // Mark reservations as expired
      const reservationIds = expiredReservations.map(r => r.reservation_id);
      await queryRunner.manager
        .createQueryBuilder()
        .update(ChannelReservationEntity)
        .set({ status: 'expired' })
        .where('reservation_id IN (:...reservationIds)', { reservationIds })
        .execute();

      await queryRunner.commitTransaction();
      return expiredReservations.length;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Activate reservation (when order is created)
  async activateReservation(reservationId: string, orderId: number): Promise<boolean> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager
        .createQueryBuilder(ChannelReservationEntity, 'reservation')
        .setLock('pessimistic_write')
        .where('reservation.reservation_id = :reservationId', { reservationId })
        .getOne();

      if (!reservation || !reservation.canActivate()) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // Update inventory to move from reserved to sold
      const inventory = await queryRunner.manager
        .createQueryBuilder(ProductInventoryEntity, 'inventory')
        .setLock('pessimistic_write')
        .where('inventory.product_id = :productId', { productId: reservation.product_id })
        .getOne();

      if (inventory) {
        inventory.activateReservation(reservation.channel_id, reservation.quantity);
        await queryRunner.manager.save(ProductInventoryEntity, inventory);
      }

      // Activate the reservation
      reservation.activate(orderId);
      await queryRunner.manager.save(ChannelReservationEntity, reservation);

      await queryRunner.commitTransaction();
      return true;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Cancel reservation
  async cancelReservation(reservationId: string): Promise<boolean> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservation = await queryRunner.manager
        .createQueryBuilder(ChannelReservationEntity, 'reservation')
        .setLock('pessimistic_write')
        .where('reservation.reservation_id = :reservationId', { reservationId })
        .getOne();

      if (!reservation || reservation.status !== 'active') {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // Release inventory
      const inventory = await queryRunner.manager
        .createQueryBuilder(ProductInventoryEntity, 'inventory')
        .setLock('pessimistic_write')
        .where('inventory.product_id = :productId', { productId: reservation.product_id })
        .getOne();

      if (inventory) {
        inventory.releaseReservation(reservation.channel_id, reservation.quantity);
        await queryRunner.manager.save(ProductInventoryEntity, inventory);
      }

      // Cancel the reservation
      reservation.cancel();
      await queryRunner.manager.save(ChannelReservationEntity, reservation);

      await queryRunner.commitTransaction();
      return true;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Pre-Generated Ticket Operations
  async createPreGeneratedTickets(tickets: Partial<PreGeneratedTicketEntity>[]): Promise<PreGeneratedTicketEntity[]> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bulk insert tickets
      const savedTickets = await queryRunner.manager.save(PreGeneratedTicketEntity, tickets);

      // Update inventory (reserve units for the batch)
      if (tickets.length > 0) {
        const productId = tickets[0].product_id;
        const quantity = tickets.length;

        // Update inventory using the helper method
        const inventory = await queryRunner.manager.findOne(ProductInventoryEntity, {
          where: { product_id: productId }
        });

        if (inventory) {
          if (!inventory.reserveInventory('ota', quantity)) {
            throw new Error('Insufficient inventory for reservation');
          }
          await queryRunner.manager.save(ProductInventoryEntity, inventory);
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
    return this.preGeneratedTicketRepo.findOne({
      where: { ticket_code: ticketCode }
    });
  }

  async findPreGeneratedTicketsByBatch(batchId: string): Promise<PreGeneratedTicketEntity[]> {
    return this.preGeneratedTicketRepo.find({
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
      payment_reference: string;
    },
    orderData: Partial<OTAOrderEntity>
  ): Promise<{ ticket: PreGeneratedTicketEntity; order: OTAOrderEntity }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the pre-generated ticket (with partner isolation)
      const ticket = await queryRunner.manager.findOne(PreGeneratedTicketEntity, {
        where: { ticket_code: ticketCode, status: 'PRE_GENERATED', partner_id: partnerId }
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketCode} not found or already activated`);
      }

      // Create the order
      const order = queryRunner.manager.create(OTAOrderEntity, {
        ...orderData,
        customer_name: customerData.customer_name,
        customer_email: customerData.customer_email,
        customer_phone: customerData.customer_phone,
        payment_reference: customerData.payment_reference
      });

      const savedOrder = await queryRunner.manager.save(OTAOrderEntity, order);

      // Update the ticket with customer info and link to order
      ticket.customer_name = customerData.customer_name;
      ticket.customer_email = customerData.customer_email;
      ticket.customer_phone = customerData.customer_phone;
      ticket.payment_reference = customerData.payment_reference;
      ticket.order_id = savedOrder.order_id;
      ticket.status = 'ACTIVE';
      ticket.activated_at = new Date();

      const savedTicket = await queryRunner.manager.save(PreGeneratedTicketEntity, ticket);

      // Update inventory (move from reserved to sold)
      const inventory = await queryRunner.manager.findOne(ProductInventoryEntity, {
        where: { product_id: ticket.product_id }
      });

      if (inventory) {
        inventory.activateReservation('ota', 1);
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
  async createOTAOrder(orderData: Partial<OTAOrderEntity>): Promise<OTAOrderEntity> {
    const order = this.otaOrderRepo.create(orderData);
    return this.otaOrderRepo.save(order);
  }

  async findOTAOrdersByChannel(): Promise<OTAOrderEntity[]> {
    return this.otaOrderRepo.find({
      where: { channel_id: 2 }, // OTA channel
      order: { created_at: 'DESC' }
    });
  }

  async findOTAOrderById(orderId: string): Promise<OTAOrderEntity | null> {
    return this.otaOrderRepo.findOne({
      where: { order_id: orderId }
    });
  }

  async findTicketsByOrderId(orderId: string): Promise<PreGeneratedTicketEntity[]> {
    return this.preGeneratedTicketRepo.find({
      where: { order_id: orderId, status: 'ACTIVE' }
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
    const query = this.preGeneratedTicketRepo.createQueryBuilder('ticket')
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

  async updateBatchCounters(batchId: string, updates: {
    tickets_generated?: number;
    tickets_activated?: number;
    tickets_redeemed?: number;
    revenue_realized?: number;
  }): Promise<boolean> {
    const batch = await this.batchRepo.findOne({ where: { batch_id: batchId } });
    if (!batch) return false;

    if (updates.tickets_generated !== undefined) {
      batch.tickets_generated = updates.tickets_generated;
    }
    if (updates.tickets_activated !== undefined) {
      batch.tickets_activated = updates.tickets_activated;
    }
    if (updates.tickets_redeemed !== undefined) {
      batch.tickets_redeemed = updates.tickets_redeemed;
    }
    if (updates.revenue_realized !== undefined) {
      batch.total_revenue_realized = updates.revenue_realized;
    }

    await this.batchRepo.save(batch);
    return true;
  }

  async getBatchAnalytics(batchId: string): Promise<any | null> {
    const batch = await this.findBatchById(batchId);
    return batch ? batch.getBillingSummary() : null;
  }

  async getResellerBillingSummary(resellerName: string, period: string): Promise<any> {
    const batches = await this.findBatchesByReseller(resellerName);

    // Filter by period (YYYY-MM format)
    const periodBatches = batches.filter(batch => {
      return batch.created_at.toISOString().slice(0, 7) === period;
    });

    const summary = {
      billing_period: period,
      reseller_name: resellerName,
      total_batches: periodBatches.length,
      total_redemptions: periodBatches.reduce((sum, b) => sum + b.tickets_redeemed, 0),
      total_amount_due: periodBatches.reduce((sum, b) => sum + b.total_revenue_realized, 0),
      batches: periodBatches.map(batch => ({
        batch_id: batch.batch_id,
        redemptions_count: batch.tickets_redeemed,
        wholesale_rate: batch.pricing_snapshot.base_price,
        amount_due: batch.total_revenue_realized
      }))
    };

    return summary;
  }
}