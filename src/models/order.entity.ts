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
 * 订单状态（与 OTA 订单状态统一）
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
 * 订单主表实体
 * 支持小程序订单流程 (PRD-008)
 *
 * 数据关系：
 * - 一个订单对应一个产品
 * - 一个订单可生成多张票券（每人一张）
 */
@Entity('orders')
@Index(['user_id', 'order_no'], { unique: true })
@Index(['status'])
@Index(['travel_date'])
@Index(['created_at'])
@Index(['product_id'])
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  // 用户关联
  @Column({ type: 'bigint' })
  user_id!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  // 订单号（唯一标识，用于幂等校验和微信支付 out_trade_no）
  @Column({ type: 'varchar', length: 64 })
  order_no!: string;

  // 渠道：direct=小程序, ota=OTA平台
  @Column({ type: 'varchar', length: 20, default: 'direct' })
  channel!: string;

  // 订单类型（PRD-008 双模式：套餐/班次）
  @Column({ type: 'enum', enum: OrderType, default: OrderType.PACKAGE })
  order_type!: OrderType;

  // ========== 产品信息（一个订单对应一个产品）==========

  // 产品ID
  @Column({ type: 'bigint' })
  product_id!: number;

  // 产品名称快照（下单时记录，防止产品改名后订单显示异常）
  @Column({ type: 'varchar', length: 255, nullable: true })
  product_name?: string;

  // 购买数量（总人数）
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  // ========== 出行信息 ==========

  // 出行日期（动态定价依据）
  @Column({ type: 'date' })
  travel_date!: Date;

  // ========== 金额 ==========

  // 订单总额
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  // 定价上下文（包含完整定价明细：customer_breakdown, addons 等）
  @Column({ type: 'json', nullable: true })
  pricing_context?: PricingContext;

  // ========== 状态 ==========

  // 订单状态
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  // 时间戳
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

  // 退款信息
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refund_reason?: string;

  // 关联票券（一个订单可生成多张票）
  @OneToMany('TicketEntity', 'order')
  tickets?: any[];

  // 关联支付记录
  @OneToMany('OrderPaymentEntity', 'order')
  payments?: any[];
}
