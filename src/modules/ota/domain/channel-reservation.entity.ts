import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert
} from 'typeorm';
import { ProductInventoryEntity } from './product-inventory.entity';

export type ReservationStatus = 'active' | 'expired' | 'activated' | 'cancelled';

@Entity('channel_reservations')
@Index(['status', 'expires_at'])
@Index(['product_id', 'channel_id'])
@Index(['expires_at', 'status'])
export class ChannelReservationEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  reservation_id!: string;

  @Column()
  product_id!: number;

  @Column({ type: 'varchar', length: 20, default: 'ota' })
  channel_id!: string;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'activated', 'cancelled'],
    default: 'active'
  })
  status!: ReservationStatus;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  activated_at?: Date;

  @Column({ type: 'int', nullable: true })
  order_id?: number;

  @Column({ type: 'json', nullable: true })
  pricing_snapshot?: {
    base_price: number;
    weekend_premium?: number;
    customer_discounts?: Record<string, number>;  // Legacy field (deprecated)
    customer_type_pricing?: Array<{
      customer_type: 'adult' | 'child' | 'elderly';
      unit_price: number;
      discount_applied: number;
    }>;
    currency?: string;
    captured_at?: string;
  };

  @ManyToOne(() => ProductInventoryEntity, inventory => inventory.reservations)
  @JoinColumn({ name: 'product_id', referencedColumnName: 'product_id' })
  product_inventory!: ProductInventoryEntity;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @BeforeInsert()
  generateReservationId() {
    if (!this.reservation_id) {
      // Generate unique reservation ID: res_ + timestamp + random
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      this.reservation_id = `res_${timestamp}_${random}`;
    }
  }

  // Helper methods
  isExpired(): boolean {
    return this.status === 'active' && new Date() > this.expires_at;
  }

  canActivate(): boolean {
    return this.status === 'active' && !this.isExpired();
  }

  activate(orderId?: number): void {
    if (this.canActivate()) {
      this.status = 'activated';
      this.activated_at = new Date();
      this.order_id = orderId;
    }
  }

  expire(): void {
    if (this.status === 'active') {
      this.status = 'expired';
    }
  }

  cancel(): void {
    if (this.status === 'active') {
      this.status = 'cancelled';
    }
  }
}