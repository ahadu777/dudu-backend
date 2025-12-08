import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

/**
 * 统一票券状态
 * - PRE_GENERATED: OTA 预生成，未售出
 * - PENDING_PAYMENT: 小程序下单，待支付
 * - ACTIVATED: 已激活/已售出（可用）
 * - RESERVED: 已预约时段
 * - VERIFIED: 已核销
 * - EXPIRED: 已过期
 * - CANCELLED: 已取消
 */
export type TicketStatus = 'PRE_GENERATED' | 'PENDING_PAYMENT' | 'ACTIVATED' | 'RESERVED' | 'VERIFIED' | 'EXPIRED' | 'CANCELLED';

/** @deprecated 使用 TicketStatus 代替 */
export type TicketReservationStatus = TicketStatus;

export type CustomerType = 'adult' | 'child' | 'elderly';

/** 销售模式 */
export type DistributionMode = 'direct_sale' | 'reseller_batch';

/**
 * 票券权益
 */
export interface TicketEntitlement {
  function_code: string;  // ferry, playground_tokens, monchhichi_gift, etc.
  remaining_uses: number; // 剩余使用次数
}

/**
 * 统一票券实体
 * 合并了原 tickets 表（小程序）和 pre_generated_tickets 表（OTA）
 */
@Entity('tickets')
@Index(['ticket_code'])
@Index(['order_id'])
@Index(['ota_order_id'])
@Index(['status'])
@Index(['orq'])
@Index(['user_id'])
@Index(['travel_date'])
@Index(['batch_id'])
@Index(['partner_id'])
@Index(['partner_id', 'status'])
@Index(['channel'])
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  ticket_code!: string;

  // 订单ID（小程序内部订单，BIGINT）
  @Column({ type: 'bigint', nullable: true, comment: '小程序订单ID' })
  order_id?: number;

  // OTA 订单ID（VARCHAR，OTA 平台使用）
  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'OTA订单ID' })
  ota_order_id?: string;

  // 用户ID（小程序用户）
  @Column({ type: 'bigint', nullable: true, comment: '小程序用户ID' })
  user_id?: number;

  @Column({
    type: 'enum',
    enum: ['PRE_GENERATED', 'PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING_PAYMENT'
  })
  status!: TicketStatus;

  // 客户姓名
  @Column({ type: 'varchar', length: 100, nullable: true })
  customer_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customer_phone?: string;

  @Column({ type: 'int' })
  product_id!: number;

  @Column({ type: 'int', nullable: true, comment: 'Organization ID (NULL for OTA tickets)' })
  orq?: number;

  @Column({ type: 'text', nullable: true, comment: 'Base64 QR code image' })
  qr_code?: string;

  // ========== OTA 专用字段 ==========

  // OTA 批次 ID
  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'OTA 批次 ID' })
  batch_id?: string;

  // OTA 合作伙伴 ID
  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'OTA 合作伙伴 ID' })
  partner_id?: string;

  // 支付引用号
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '支付引用号' })
  payment_reference?: string;

  // 销售模式
  @Column({
    type: 'enum',
    enum: ['direct_sale', 'reseller_batch'],
    nullable: true,
    comment: '销售模式：direct_sale=直销, reseller_batch=分销'
  })
  distribution_mode?: DistributionMode;

  // 分销商名称
  @Column({ type: 'varchar', length: 200, nullable: true, comment: '分销商名称' })
  reseller_name?: string;

  // QR 码审计元数据
  @Column({ type: 'json', nullable: true, comment: 'QR 码审计元数据（jti, issued_at 等）' })
  raw?: Record<string, any>;

  // ========== 小程序/通用字段 ==========

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
