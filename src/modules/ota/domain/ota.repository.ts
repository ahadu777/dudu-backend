import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ProductInventoryEntity } from './product-inventory.entity';
import { ChannelReservationEntity, ReservationStatus } from './channel-reservation.entity';

export class OTARepository {
  private productRepo: Repository<ProductEntity>;
  private inventoryRepo: Repository<ProductInventoryEntity>;
  private reservationRepo: Repository<ChannelReservationEntity>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository(ProductEntity);
    this.inventoryRepo = dataSource.getRepository(ProductInventoryEntity);
    this.reservationRepo = dataSource.getRepository(ChannelReservationEntity);
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
      where: { product_id: productIds.length === 1 ? productIds[0] : undefined },
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
}