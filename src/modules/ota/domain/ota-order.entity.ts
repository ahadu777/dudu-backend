import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { TicketEntity } from '../../../models';

export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';

@Entity('ota_orders')
@Index(['customer_email']) // For customer lookups
@Index(['payment_reference']) // For payment tracking
@Index(['status']) // For order status filtering
@Index(['created_at']) // For date range queries
@Index(['partner_id']) // For partner isolation
@Index(['partner_id', 'created_at']) // For partner analytics
export class OTAOrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  order_id!: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'int', default: 2 }) // 2 = OTA channel
  channel_id!: number;

  @Column({ type: 'varchar', length: 50 })
  partner_id!: string;

  @Column({ type: 'varchar', length: 255 })
  customer_name!: string;

  @Column({ type: 'varchar', length: 255 })
  customer_email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone?: string;

  @Column({ type: 'varchar', length: 100 })
  payment_reference!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount!: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'],
    default: 'confirmed'
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 50 })
  confirmation_code!: string;

  @Column({ type: 'text', nullable: true })
  special_requests?: string;

  // Relationship to tickets (for future queries)
  @OneToMany(() => TicketEntity, ticket => ticket.ota_order_id)
  tickets?: TicketEntity[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}