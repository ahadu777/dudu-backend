import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type TicketStatus = 'PRE_GENERATED' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
export type DistributionMode = 'direct_sale' | 'reseller_batch';

@Entity('pre_generated_tickets')
@Index(['batch_id']) // For batch operations
@Index(['product_id']) // For product queries
@Index(['status']) // For status filtering
@Index(['customer_email']) // For customer lookups
@Index(['partner_id']) // For partner isolation
@Index(['partner_id', 'status']) // For partner ticket queries
@Index(['distribution_mode']) // For sales channel analytics
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
    enum: ['PRE_GENERATED', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'],
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

  @Column({
    type: 'enum',
    enum: ['adult', 'child', 'elderly'],
    nullable: true
  })
  customer_type?: 'adult' | 'child' | 'elderly';

  @Column({ type: 'json', nullable: true })
  raw?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  order_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference?: string;

  @Column({ type: 'timestamp', nullable: true })
  activated_at?: Date;

  // === Export-friendly fields (denormalized from batch and reseller) ===

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '票券金额（从批次定价快照中提取，便于导出）'
  })
  ticket_price?: number;

  @Column({
    type: 'enum',
    enum: ['direct_sale', 'reseller_batch'],
    nullable: true,
    comment: '销售模式：direct_sale=直销, reseller_batch=分销'
  })
  distribution_mode?: DistributionMode;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '分销商名称（仅分销模式时有值）'
  })
  reseller_name?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}