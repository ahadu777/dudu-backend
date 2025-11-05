import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type TicketStatus = 'PRE_GENERATED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

@Entity('pre_generated_tickets')
@Index(['batch_id']) // For batch operations
@Index(['product_id']) // For product queries
@Index(['status']) // For status filtering
@Index(['customer_email']) // For customer lookups
@Index(['partner_id']) // For partner isolation
@Index(['partner_id', 'status']) // For partner ticket queries
export class PreGeneratedTicketEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  ticket_code!: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'varchar', length: 100 })
  batch_id!: string;

  @Column({ type: 'varchar', length: 50 })
  partner_id!: string;

  @Column({
    type: 'enum',
    enum: ['PRE_GENERATED', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'PRE_GENERATED'
  })
  status!: TicketStatus;

  @Column({ type: 'text' })
  qr_code!: string;

  @Column({ type: 'json' })
  entitlements!: Array<{
    function_code: string;
    remaining_uses: number;
  }>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  order_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference?: string;

  @Column({ type: 'timestamp', nullable: true })
  activated_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}