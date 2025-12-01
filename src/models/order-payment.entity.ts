import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { OrderEntity } from './order.entity';

/**
 * 支付状态
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  MANUAL = 'manual'
}

/**
 * 订单支付记录实体
 * 记录微信支付等支付信息 (PRD-008)
 */
@Entity('order_payments')
@Index(['order_id'])
@Index(['transaction_id'])
@Index(['status'])
export class OrderPaymentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  // 订单关联
  @Column({ type: 'bigint' })
  order_id!: number;

  @ManyToOne(() => OrderEntity, order => order.payments)
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  // 支付方式
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.WECHAT })
  payment_method!: PaymentMethod;

  // 微信支付信息
  @Column({ type: 'varchar', length: 64, nullable: true })
  transaction_id?: string; // 微信支付交易号

  @Column({ type: 'varchar', length: 64, nullable: true })
  prepay_id?: string; // 预支付ID

  // 金额
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  // 支付状态
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  // 时间戳
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  paid_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  refunded_at?: Date;

  // 退款金额（部分退款场景）
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount?: number;

  // 微信回调原始数据
  @Column({ type: 'json', nullable: true })
  callback_raw?: Record<string, any>;

  // 错误信息
  @Column({ type: 'varchar', length: 500, nullable: true })
  error_message?: string;
}
