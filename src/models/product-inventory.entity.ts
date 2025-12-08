import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { ChannelReservationEntity } from '../modules/ota/domain/channel-reservation.entity';

export interface ChannelAllocation {
  allocated: number;
  reserved: number;
  sold: number;
}

@Entity('product_inventory')
@Index(['product_id'])
export class ProductInventoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  product_id!: number;

  @Column({ type: 'int', unsigned: true })
  sellable_cap!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sold_count!: number;

  @Column({ type: 'json' })
  channel_allocations!: Record<string, ChannelAllocation>;

  @ManyToOne(() => ProductEntity, product => product.inventory)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @OneToMany(() => ChannelReservationEntity, reservation => reservation.product_inventory)
  reservations!: ChannelReservationEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Helper methods
  getChannelAllocation(channel: string): ChannelAllocation | null {
    return this.channel_allocations[channel] || null;
  }

  getChannelAvailable(channel: string): number {
    const allocation = this.channel_allocations[channel];
    if (!allocation) return 0;
    return allocation.allocated - allocation.reserved - allocation.sold;
  }

  getTotalAvailable(): number {
    return this.sellable_cap - this.sold_count;
  }

  reserveInventory(channel: string, quantity: number): boolean {
    const allocation = this.channel_allocations[channel];
    if (!allocation) return false;

    const available = this.getChannelAvailable(channel);
    if (available < quantity) return false;

    allocation.reserved += quantity;
    return true;
  }

  releaseReservation(channel: string, quantity: number): void {
    const allocation = this.channel_allocations[channel];
    if (allocation) {
      allocation.reserved = Math.max(0, allocation.reserved - quantity);
    }
  }

  activateReservation(channel: string, quantity: number): void {
    const allocation = this.channel_allocations[channel];
    if (allocation) {
      allocation.reserved = Math.max(0, allocation.reserved - quantity);
      allocation.sold += quantity;
      this.sold_count += quantity;
    }
  }
}
