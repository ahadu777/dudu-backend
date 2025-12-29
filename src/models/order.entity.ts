import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * 客户类型明细
 */
export interface CustomerBreakdownItem {
  customer_type: 'adult' | 'child' | 'elderly';
  count: number;
  unit_price: number;
  total: number;
}

/**
 * 附加项明细
 */
export interface AddonItem {
  addon_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * 定价上下文
 */
export interface PricingContext {
  booking_dates?: string[];
  customer_breakdown?: CustomerBreakdownItem[];
  addons?: AddonItem[];
  is_weekend?: boolean;
  special_event?: string;
}

/**
 * 乘客信息（可选，用于实名验证）
 */
export interface PassengerInfo {
  name: string;                                   // 乘客姓名
  customer_type: 'adult' | 'child' | 'elderly';   // 客户类型
  id_type?: 'id_card' | 'passport' | 'other';     // 证件类型
  id_number?: string;                             // 证件号码
  phone?: string;                                 // 手机号
}

/**
 * 订单状态（统一小程序和 OTA）
 */
export enum OrderStatus {
  PENDING = 'pending',           // 待处理/待支付
  CONFIRMED = 'confirmed',       // 已确认/已支付
  IN_PROGRESS = 'in_progress',   // 进行中（部分核销）
  COMPLETED = 'completed',       // 已完成（全部核销）
  CANCELLED = 'cancelled',       // 已取消
  REFUNDED = 'refunded'          // 已退款
}

/**
 * 订单类型
 */
export enum OrderType {
  PACKAGE = 'package',
  ROUTE = 'route'
}

/**
 * 渠道类型
 */
export enum OrderChannel {
  DIRECT = 'direct',   // 小程序直销
  OTA = 'ota'          // OTA 平台
}

/**
 * 统一订单实体
 * 合并了原 orders 表（小程序）和 ota_orders 表（OTA）
 *
 * 数据关系：
 * - 一个订单对应一个产品
 * - 一个订单可生成多张票券（每人一张）
 */
@Entity('orders')
@Index(['user_id', 'order_no'], { unique: true })
@Index(['user_id', 'created_at'])  // 优化：用户订单列表查询
@Index(['status'])
@Index(['travel_date'])
@Index(['created_at'])
@Index(['product_id'])
@Index(['channel'])
@Index(['partner_id'])
@Index(['partner_id', 'created_at'])
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  // ========== 订单标识 ==========

  // 订单号（唯一业务标识）
  // - 小程序: 客户端生成，用于微信支付 out_trade_no
  // - OTA: OTA 平台的原始订单号
  @Column({ type: 'varchar', length: 64 })
  order_no!: string;

  // 渠道：direct=小程序, ota=OTA平台
  @Column({ type: 'enum', enum: OrderChannel, default: OrderChannel.DIRECT })
  channel!: OrderChannel;

  // ========== 用户/合作伙伴标识 ==========

  // 用户ID（小程序用户，OTA 订单为 null）
  @Column({ type: 'bigint', nullable: true })
  user_id?: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  // OTA 合作伙伴 ID（小程序订单为 null）
  @Column({ type: 'varchar', length: 50, nullable: true })
  partner_id?: string;

  // ========== 联系人/客户信息 ==========

  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_name?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact_phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email?: string;

  // 乘客信息（小程序可选，用于实名验证）
  @Column({ type: 'json', nullable: true })
  passengers?: PassengerInfo[];

  // ========== 订单类型 ==========

  // 订单类型（PRD-008 双模式：套餐/班次）
  @Column({ type: 'enum', enum: OrderType, default: OrderType.PACKAGE })
  order_type!: OrderType;

  // ========== 产品信息 ==========

  @Column({ type: 'bigint' })
  product_id!: number;

  // 产品名称快照（下单时记录）
  @Column({ type: 'varchar', length: 255, nullable: true })
  product_name?: string;

  // 购买数量（总人数）
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  // ========== 出行信息 ==========

  // 出行日期（动态定价依据，OTA 可为 null）
  @Column({ type: 'date', nullable: true })
  travel_date?: Date;

  // ========== 金额 ==========

  // 订单总额
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  // 定价上下文（小程序订单包含完整定价明细）
  @Column({ type: 'json', nullable: true })
  pricing_context?: PricingContext;

  // ========== 状态 ==========

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  // ========== OTA 专用字段 ==========

  // OTA 确认码
  @Column({ type: 'varchar', length: 50, nullable: true })
  confirmation_code?: string;

  // OTA 支付引用
  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference?: string;

  // OTA 特殊请求
  @Column({ type: 'text', nullable: true })
  special_requests?: string;

  // ========== 时间戳 ==========

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  paid_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  refunded_at?: Date;

  // ========== 退款信息 ==========

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refund_reason?: string;

  // ========== 关联 ==========

  // 关联票券
  @OneToMany('TicketEntity', 'order')
  tickets?: any[];

  // 关联支付记录
  @OneToMany('OrderPaymentEntity', 'order')
  payments?: any[];
}
