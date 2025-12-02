import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

export type TicketReservationStatus = 'PENDING_PAYMENT' | 'ACTIVATED' | 'RESERVED' | 'VERIFIED' | 'EXPIRED' | 'CANCELLED';

export type CustomerType = 'adult' | 'child' | 'elderly';

/**
 * 票券权益
 */
export interface TicketEntitlement {
  function_code: string;  // ferry, playground_tokens, monchhichi_gift, etc.
  remaining_uses: number; // 剩余使用次数
}

@Entity('tickets')
@Index(['ticket_code'])
@Index(['order_id'])
@Index(['status'])
@Index(['orq'])
@Index(['user_id'])
@Index(['travel_date'])
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_code!: string;

  @Column({ type: 'bigint' })
  order_id!: number;

  // 用户ID（小程序用户）
  @Column({ type: 'bigint', nullable: true, comment: '小程序用户ID' })
  user_id?: number;

  @Column({
    type: 'enum',
    enum: ['PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING_PAYMENT'
  })
  status!: TicketReservationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone?: string;

  // 客户姓名
  @Column({ type: 'varchar', length: 100, nullable: true })
  customer_name?: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'int', comment: 'Organization ID' })
  orq!: number;

  @Column({ type: 'text', nullable: true, comment: 'Base64 QR code image' })
  qr_code?: string;

  // ========== 新增字段（小程序支持）==========

  // 客户类型（用于定价）
  @Column({
    type: 'enum',
    enum: ['adult', 'child', 'elderly'],
    nullable: true,
    comment: '客户类型：adult/child/elderly'
  })
  customer_type?: CustomerType;

  // 票券权益（ferry, playground_tokens 等）
  @Column({ type: 'json', nullable: true, comment: '票券权益列表' })
  entitlements?: TicketEntitlement[];

  // 出行日期
  @Column({ type: 'date', nullable: true, comment: '出行日期' })
  travel_date?: Date;

  // 票价
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '票券金额' })
  ticket_price?: number;

  // 渠道来源
  @Column({ type: 'varchar', length: 20, default: 'direct', comment: '渠道：direct=小程序, ota=OTA' })
  channel!: string;

  // 扩展数据
  @Column({ type: 'json', nullable: true, comment: '扩展元数据' })
  extra?: Record<string, any>;

  // ========== 时间戳 ==========

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  activated_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  reserved_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  verified_at?: Date;

  @Column({ type: 'int', nullable: true, comment: 'Operator user ID' })
  verified_by?: number;

  // 过期时间
  @Column({ type: 'timestamp', nullable: true, comment: '票券过期时间' })
  expires_at?: Date;

  // 取消时间
  @Column({ type: 'timestamp', nullable: true })
  cancelled_at?: Date;
}
