import { Repository, DataSource, QueryRunner, In } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ProductInventoryEntity } from './product-inventory.entity';
import { ChannelReservationEntity, ReservationStatus } from './channel-reservation.entity';
import { PreGeneratedTicketEntity, TicketStatus } from './pre-generated-ticket.entity';
import { OTAOrderEntity, OrderStatus } from './ota-order.entity';
import { OTATicketBatchEntity, BatchStatus } from './ota-ticket-batch.entity';
import { generateSecureQR } from '../../../utils/qr-crypto';
import { TicketRawMetadata } from '../../../types/domain';

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

  // Activate reservation with order and ticket generation
  async activateReservationWithOrder(
    reservationId: string,
    customerData: {
      name: string;
      email: string;
      phone: string;
    },
    paymentReference: string,
    specialRequests?: string
  ): Promise<{ order: OTAOrderEntity; tickets: PreGeneratedTicketEntity[] }> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock and validate reservation
      const reservation = await queryRunner.manager
        .createQueryBuilder(ChannelReservationEntity, 'reservation')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('reservation.product_inventory', 'inventory')
        .leftJoinAndSelect('inventory.product', 'product')
        .where('reservation.reservation_id = :reservationId', { reservationId })
        .getOne();

      if (!reservation) {
        throw new Error(`Reservation ${reservationId} not found`);
      }

      if (!reservation.canActivate()) {
        throw new Error(`Reservation ${reservationId} cannot be activated (status: ${reservation.status})`);
      }

      const product = reservation.product_inventory?.product;
      if (!product) {
        throw new Error(`Product ${reservation.product_id} not found for reservation`);
      }

      // 2. Update inventory (move from reserved to sold)
      const inventory = await queryRunner.manager
        .createQueryBuilder(ProductInventoryEntity, 'inventory')
        .setLock('pessimistic_write')
        .where('inventory.product_id = :productId', { productId: reservation.product_id })
        .getOne();

      if (!inventory) {
        throw new Error(`Inventory for product ${reservation.product_id} not found`);
      }

      inventory.activateReservation(reservation.channel_id, reservation.quantity);
      await queryRunner.manager.save(ProductInventoryEntity, inventory);

      // 3. Create order
      const orderId = `ORD-${Date.now()}`;
      const confirmationCode = `CONF-${Date.now()}`;

      // Calculate total amount based on pricing snapshot
      const basePrice = reservation.pricing_snapshot?.base_price || Number(product.base_price);
      const totalAmount = basePrice * reservation.quantity;

      const order = queryRunner.manager.create(OTAOrderEntity, {
        order_id: orderId,
        product_id: reservation.product_id,
        channel_id: 2, // OTA channel
        partner_id: reservation.channel_id,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        payment_reference: paymentReference,
        total_amount: totalAmount,
        status: 'confirmed' as OrderStatus,
        confirmation_code: confirmationCode,
        special_requests: specialRequests
      });

      const savedOrder = await queryRunner.manager.save(OTAOrderEntity, order);

      // 4. Generate tickets
      const tickets: PreGeneratedTicketEntity[] = [];
      const entitlements = product.entitlements?.map((e: any) => ({
        function_code: e.type || e.function_code,
        remaining_uses: 1
      })) || [
        { function_code: 'ferry', remaining_uses: 1 },
        { function_code: 'deck_access', remaining_uses: 1 },
        { function_code: 'dining', remaining_uses: 1 }
      ];

      for (let i = 0; i < reservation.quantity; i++) {
        const ticketId = Date.now() + (Math.random() * 1000) + i;
        const ticketCode = `${product.category?.toUpperCase() || 'TICKET'}-${new Date().getFullYear()}-P${product.id}-${Math.floor(ticketId)}`;

        // Generate secure QR code with encryption + signature
        const qrResult = await generateSecureQR({
          ticket_code: ticketCode,
          product_id: product.id,
          ticket_type: 'OTA',
          batch_id: `RESERVATION-${reservationId}`,
          partner_id: reservation.channel_id,
          order_id: orderId
        });

        const ticket = queryRunner.manager.create(PreGeneratedTicketEntity, {
          ticket_code: ticketCode,
          product_id: reservation.product_id,
          batch_id: `RESERVATION-${reservationId}`,
          partner_id: reservation.channel_id,
          status: 'ACTIVE' as TicketStatus,
          qr_code: qrResult.qr_image,
          entitlements: entitlements,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          order_id: orderId,
          payment_reference: paymentReference,
          activated_at: new Date()
        });

        tickets.push(ticket);
      }

      const savedTickets = await queryRunner.manager.save(PreGeneratedTicketEntity, tickets);

      // 5. Update reservation status
      reservation.activate(Number(orderId.split('-')[1])); // Extract numeric part for order_id field
      reservation.order_id = Number(orderId.split('-')[1]);
      await queryRunner.manager.save(ChannelReservationEntity, reservation);

      await queryRunner.commitTransaction();
      return { order: savedOrder, tickets: savedTickets };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Pre-Generated Ticket Operations
  async createPreGeneratedTickets(tickets: Partial<PreGeneratedTicketEntity>[], channelId: string = 'ota'): Promise<PreGeneratedTicketEntity[]> {
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
          if (!inventory.reserveInventory(channelId, quantity)) {
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
      customer_type: 'adult' | 'child' | 'elderly';
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
        partner_id: partnerId,  // Add partner_id for order isolation
        customer_name: customerData.customer_name,
        customer_email: customerData.customer_email,
        customer_phone: customerData.customer_phone,
        payment_reference: customerData.payment_reference
      });

      const savedOrder = await queryRunner.manager.save(OTAOrderEntity, order);

      // Generate new QR code with new JTI for activation (90 days expiry)
      const newQrResult = await generateSecureQR({
        ticket_code: ticketCode,
        product_id: ticket.product_id,
        ticket_type: 'OTA',
        batch_id: ticket.batch_id,
        partner_id: partnerId,
        order_id: savedOrder.order_id
      }, 90 * 24 * 60); // 90 days in minutes

      // Update raw field: preserve pre_generated_jti, update current_jti
      const existingRaw = (ticket.raw as TicketRawMetadata) || {};
      const updatedRaw: TicketRawMetadata = {
        ...existingRaw,
        jti: {
          pre_generated_jti: existingRaw.jti?.pre_generated_jti || existingRaw.jti?.current_jti,
          current_jti: newQrResult.jti,
          jti_history: [
            ...(existingRaw.jti?.jti_history || []),
            {
              jti: newQrResult.jti,
              issued_at: new Date().toISOString(),
              status: 'ACTIVE'
            }
          ]
        },
        qr_metadata: {
          issued_at: new Date().toISOString(),
          expires_at: newQrResult.expires_at
        }
      };

      // Update the ticket with customer info, new QR code, and link to order
      ticket.customer_name = customerData.customer_name;
      ticket.customer_email = customerData.customer_email;
      ticket.customer_phone = customerData.customer_phone;
      ticket.customer_type = customerData.customer_type;
      ticket.raw = updatedRaw;
      ticket.payment_reference = customerData.payment_reference;
      ticket.order_id = savedOrder.order_id;
      ticket.status = 'ACTIVE';
      ticket.activated_at = new Date();
      ticket.qr_code = newQrResult.qr_image;  // Update with new QR code

      const savedTicket = await queryRunner.manager.save(PreGeneratedTicketEntity, ticket);

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
  async createOTAOrder(orderData: Partial<OTAOrderEntity>): Promise<OTAOrderEntity> {
    const order = this.otaOrderRepo.create(orderData);
    return this.otaOrderRepo.save(order);
  }

  async findOTAOrdersByChannel(partnerId?: string): Promise<OTAOrderEntity[]> {
    const whereClause: any = { channel_id: 2 }; // OTA channel
    if (partnerId) {
      whereClause.partner_id = partnerId;
    }
    return this.otaOrderRepo.find({
      where: whereClause,
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
    if (!batch) return null;

    // Dynamically calculate ticket counts from actual ticket statuses
    const ticketStats = await this.dataSource.query(`
      SELECT
        COUNT(*) as tickets_generated,
        SUM(CASE WHEN status IN ('ACTIVE', 'REDEEMED') THEN 1 ELSE 0 END) as tickets_activated,
        SUM(CASE WHEN status = 'REDEEMED' THEN 1 ELSE 0 END) as tickets_redeemed
      FROM pre_generated_tickets
      WHERE batch_id = ?
    `, [batchId]);

    const stats = ticketStats[0];
    const tickets_generated = parseInt(stats.tickets_generated) || 0;
    const tickets_activated = parseInt(stats.tickets_activated) || 0;
    const tickets_redeemed = parseInt(stats.tickets_redeemed) || 0;

    const basePrice = batch.pricing_snapshot.base_price;

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
        realized_revenue: tickets_redeemed * basePrice,
        realization_rate: tickets_generated > 0 ? tickets_redeemed / tickets_generated : 0
      },
      wholesale_rate: basePrice,
      amount_due: (tickets_redeemed * basePrice).toFixed(2),
      batch_metadata: batch.batch_metadata || {}
    };
  }

  async getResellerBillingSummary(resellerName: string, period: string): Promise<any> {
    const batches = await this.findBatchesByReseller(resellerName);

    // Filter by period (YYYY-MM format)
    const periodBatches = batches.filter(batch => {
      return batch.created_at.toISOString().slice(0, 7) === period;
    });

    const resellerSummary = {
      reseller_name: resellerName,
      total_batches: periodBatches.length,
      total_redemptions: periodBatches.reduce((sum, b) => sum + b.tickets_redeemed, 0),
      total_amount_due: periodBatches.reduce((sum, b) => sum + b.total_revenue_realized, 0).toFixed(2),
      batches: periodBatches.map(batch => ({
        batch_id: batch.batch_id,
        redemptions_count: batch.tickets_redeemed,
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
        v.name as venue_name,
        JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot, '$.base_price')) as wholesale_price
      FROM redemption_events r
      INNER JOIN pre_generated_tickets t ON r.ticket_code = t.ticket_code
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
    const query = this.otaOrderRepo.createQueryBuilder('order')
      .where('order.partner_id = :partnerId', { partnerId });

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
      total_revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      avg_order_value: orders.length > 0
        ? orders.reduce((sum, o) => sum + Number(o.total_amount), 0) / orders.length
        : 0,
      by_status: byStatus
    };
  }

  /**
   * Get reservations summary for a specific partner
   */
  async getPartnerReservationsSummary(partnerId: string, dateRange?: { start_date?: string; end_date?: string }) {
    const query = this.reservationRepo.createQueryBuilder('reservation')
      .where('reservation.channel_id = :partnerId', { partnerId });

    if (dateRange?.start_date) {
      query.andWhere('reservation.created_at >= :startDate', { startDate: dateRange.start_date });
    }
    if (dateRange?.end_date) {
      query.andWhere('reservation.created_at <= :endDate', { endDate: dateRange.end_date });
    }

    const reservations = await query.getMany();

    const byStatus: any = {};
    reservations.forEach(res => {
      byStatus[res.status] = (byStatus[res.status] || 0) + 1;
    });

    return {
      total_count: reservations.length,
      total_quantity: reservations.reduce((sum, r) => sum + r.quantity, 0),
      by_status: byStatus
    };
  }

  /**
   * Get tickets summary for a specific partner
   */
  async getPartnerTicketsSummary(partnerId: string) {
    const tickets = await this.preGeneratedTicketRepo.find({
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
   * Get platform-wide summary
   */
  async getPlatformSummary(dateRange?: { start_date?: string; end_date?: string }) {
    const orderQuery = this.otaOrderRepo.createQueryBuilder('order');

    if (dateRange?.start_date) {
      orderQuery.andWhere('order.created_at >= :startDate', { startDate: dateRange.start_date });
    }
    if (dateRange?.end_date) {
      orderQuery.andWhere('order.created_at <= :endDate', { endDate: dateRange.end_date });
    }

    const orders = await orderQuery.getMany();
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    const totalTickets = await this.preGeneratedTicketRepo.count();
    const activeTickets = await this.preGeneratedTicketRepo.count({ where: { status: 'ACTIVE' } });

    return {
      total_orders: orders.length,
      total_revenue: totalRevenue,
      total_tickets_generated: totalTickets,
      total_tickets_activated: activeTickets
    };
  }

  /**
   * Get top partners by revenue
   */
  async getTopPartners(limit: number = 5, dateRange?: { start_date?: string; end_date?: string }) {
    const query = this.otaOrderRepo.createQueryBuilder('order')
      .select('order.partner_id', 'partner_id')
      .addSelect('COUNT(order.order_id)', 'orders_count')
      .addSelect('SUM(order.total_amount)', 'revenue')
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
}