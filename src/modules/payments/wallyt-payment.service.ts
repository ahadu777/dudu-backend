/**
 * Wallyt 支付服务
 * 整合订单系统和 Wallyt API，处理完整的支付流程
 */

import { Repository, EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { OrderEntity, OrderStatus } from '../../models/order.entity';
import { OrderPaymentEntity, PaymentStatus, PaymentMethod } from '../../models/order-payment.entity';
import { ProductInventoryEntity } from '../ota/domain/product-inventory.entity';
import { ProductEntity } from '../ota/domain/product.entity';
import { TicketEntity } from '../ticket-reservation/domain/ticket.entity';
import { logger } from '../../utils/logger';
import { ticketCodeGenerator } from '../../utils/ticket-code-generator';
import { getWallytClient, WallytError, isWallytConfigured } from './wallyt.client';
import { verifySign } from './wallyt-signature.util';
import { parseWallytTime } from './wallyt-signature.util';
import type { WallytNotification, MiniProgramPayParams } from './wallyt.types';
import type { PricingContext as PricingContextType } from '../miniprogram/order.types';

/**
 * 创建预支付响应
 */
export interface CreatePrepayResponse {
  /** 订单 ID */
  orderId: number;
  /** 商户订单号 (发送给 Wallyt 的) */
  outTradeNo: string;
  /** 小程序支付参数 */
  payParams: MiniProgramPayParams;
  /** 支付记录 ID */
  paymentId: number;
  /** 过期时间 */
  expiresAt: string;
}

/**
 * 支付通知处理结果
 */
export interface NotifyResult {
  success: boolean;
  message: string;
  orderId?: number;
  transactionId?: string;
}

/**
 * 退款请求参数
 */
export interface RefundRequest {
  /** 订单 ID */
  orderId: number;
  /** 退款金额 (元)，不传则全额退款 */
  refundAmount?: number;
  /** 退款原因 */
  reason?: string;
}

/**
 * 退款响应
 */
export interface RefundResponse {
  /** 订单 ID */
  orderId: number;
  /** 商户退款单号 */
  outRefundNo: string;
  /** Wallyt 退款单号 */
  refundId?: string;
  /** 退款金额 (元) */
  refundAmount: number;
  /** 退款状态 */
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED';
  /** 错误信息 */
  errorMessage?: string;
}

/**
 * Wallyt 支付服务
 */
export class WallytPaymentService {
  private orderRepo: Repository<OrderEntity>;
  private paymentRepo: Repository<OrderPaymentEntity>;
  private ticketRepo: Repository<TicketEntity>;

  constructor() {
    this.orderRepo = AppDataSource.getRepository(OrderEntity);
    this.paymentRepo = AppDataSource.getRepository(OrderPaymentEntity);
    this.ticketRepo = AppDataSource.getRepository(TicketEntity);
  }

  /**
   * 为订单创建预支付
   *
   * @param userId - 用户 ID
   * @param orderId - 订单 ID
   * @param openid - 用户 OpenID
   * @param clientIp - 客户端 IP
   * @returns 小程序支付参数
   */
  async createPrepay(
    userId: number,
    orderId: number,
    openid: string,
    clientIp: string
  ): Promise<CreatePrepayResponse> {
    // 1. 查找订单
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user_id: userId }
    });

    if (!order) {
      throw { code: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    // 2. 检查订单状态
    if (order.status !== OrderStatus.PENDING) {
      throw {
        code: 'INVALID_ORDER_STATUS',
        message: `订单状态 "${order.status}" 不允许支付`
      };
    }

    // 3. 检查是否已有进行中的支付记录
    const existingPayment = await this.paymentRepo.findOne({
      where: {
        order_id: orderId,
        status: PaymentStatus.PENDING
      }
    });

    // 如果已有预支付且未过期，直接返回 (幂等)
    if (existingPayment && existingPayment.prepay_id) {
      // 注意：这里简化处理，实际可能需要检查 prepay_id 是否过期
      logger.info('wallyt.prepay.existing', {
        order_id: orderId,
        payment_id: existingPayment.id
      });

      // 需要重新调用 Wallyt 获取支付参数，因为 pay_info 没有存储
      // 或者可以考虑存储 pay_info
    }

    // 4. 生成商户订单号 (Wallyt 要求唯一)
    const outTradeNo = `MP${order.id}_${Date.now()}`;

    // 5. 调用 Wallyt API
    const client = getWallytClient();
    const totalFee = Math.round(Number(order.total) * 100); // 元转分

    try {
      const result = await client.createJSPayOrder({
        outTradeNo,
        body: order.product_name || '商品购买',
        totalFee,
        subOpenid: openid,
        clientIp,
        attach: JSON.stringify({
          orderId: order.id,
          userId
        })
      });

      // 6. 创建/更新支付记录
      let payment: OrderPaymentEntity;

      if (existingPayment) {
        // 更新现有记录
        existingPayment.prepay_id = result.tokenId;
        existingPayment.callback_raw = {
          ...existingPayment.callback_raw,
          out_trade_no: outTradeNo,
          created_at: new Date().toISOString()
        };
        payment = await this.paymentRepo.save(existingPayment);
      } else {
        // 创建新记录
        payment = new OrderPaymentEntity();
        payment.order_id = orderId;
        payment.payment_method = PaymentMethod.WECHAT;
        payment.amount = Number(order.total);
        payment.status = PaymentStatus.PENDING;
        payment.prepay_id = result.tokenId;
        payment.callback_raw = {
          out_trade_no: outTradeNo,
          created_at: new Date().toISOString()
        };
        payment = await this.paymentRepo.save(payment);
      }

      logger.info('wallyt.prepay.created', {
        order_id: orderId,
        payment_id: payment.id,
        out_trade_no: outTradeNo,
        total_fee: totalFee
      });

      return {
        orderId,
        outTradeNo,
        payParams: result.payParams,
        paymentId: Number(payment.id),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      };
    } catch (error: any) {
      logger.error('wallyt.prepay.failed', {
        order_id: orderId,
        error: error.message,
        code: error.code
      });

      // 记录失败的支付尝试
      if (!existingPayment) {
        const failedPayment = new OrderPaymentEntity();
        failedPayment.order_id = orderId;
        failedPayment.payment_method = PaymentMethod.WECHAT;
        failedPayment.amount = Number(order.total);
        failedPayment.status = PaymentStatus.FAILED;
        failedPayment.error_message = error.message;
        await this.paymentRepo.save(failedPayment);
      }

      throw {
        code: error.code || 'PREPAY_FAILED',
        message: error.message || '创建预支付失败'
      };
    }
  }

  /**
   * 处理 Wallyt 支付回调通知
   *
   * @param notification - 回调通知数据
   * @returns 处理结果
   */
  async handleNotification(notification: WallytNotification): Promise<NotifyResult> {
    const outTradeNo = notification.out_trade_no;

    logger.info('wallyt.notify.received', {
      out_trade_no: outTradeNo,
      pay_result: notification.pay_result,
      transaction_id: notification.transaction_id
    });

    // 1. 验证签名
    const secretKey = process.env.WALLYT_SECRET_KEY || '';
    const signType = (process.env.WALLYT_SIGN_TYPE as 'MD5' | 'SHA256') || 'MD5';

    if (!verifySign(notification, secretKey, signType)) {
      logger.warn('wallyt.notify.invalid_signature', { out_trade_no: outTradeNo });
      return { success: false, message: 'Invalid signature' };
    }

    // 2. 检查通信和业务状态
    if (notification.status !== '0') {
      logger.warn('wallyt.notify.comm_error', {
        out_trade_no: outTradeNo,
        status: notification.status
      });
      return { success: false, message: 'Communication error' };
    }

    if (notification.result_code !== '0' || notification.pay_result !== '0') {
      logger.warn('wallyt.notify.payment_failed', {
        out_trade_no: outTradeNo,
        result_code: notification.result_code,
        pay_result: notification.pay_result
      });
      return { success: false, message: 'Payment failed' };
    }

    // 3. 解析附加数据获取订单 ID
    let orderId: number;
    let userId: number;

    try {
      const attach = notification.attach ? JSON.parse(notification.attach) : {};
      orderId = attach.orderId;
      userId = attach.userId;

      if (!orderId) {
        // 从 out_trade_no 解析 (格式: MP{orderId}_{timestamp})
        const match = outTradeNo?.match(/^MP(\d+)_/);
        if (match) {
          orderId = parseInt(match[1], 10);
        }
      }
    } catch {
      logger.error('wallyt.notify.parse_attach_failed', { out_trade_no: outTradeNo });
      return { success: false, message: 'Failed to parse attach data' };
    }

    if (!orderId) {
      logger.error('wallyt.notify.missing_order_id', { out_trade_no: outTradeNo });
      return { success: false, message: 'Missing order ID' };
    }

    // 4. 在事务中处理支付成功
    try {
      await this.processPaymentSuccess(orderId, notification);

      logger.info('wallyt.notify.success', {
        order_id: orderId,
        transaction_id: notification.transaction_id
      });

      return {
        success: true,
        message: 'Payment processed successfully',
        orderId,
        transactionId: notification.transaction_id
      };
    } catch (error: any) {
      logger.error('wallyt.notify.process_failed', {
        order_id: orderId,
        error: error.message
      });

      return {
        success: false,
        message: error.message || 'Failed to process payment'
      };
    }
  }

  /**
   * 处理支付成功 (事务)
   */
  private async processPaymentSuccess(
    orderId: number,
    notification: WallytNotification
  ): Promise<void> {
    await AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. 查找订单 (加锁)
      const order = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: orderId })
        .getOne();

      if (!order) {
        throw new Error('Order not found');
      }

      // 2. 幂等检查：已支付直接返回
      if (order.status === OrderStatus.CONFIRMED) {
        logger.info('wallyt.notify.already_paid', { order_id: orderId });
        return;
      }

      // 3. 检查订单状态
      if (order.status !== OrderStatus.PENDING) {
        throw new Error(`Invalid order status: ${order.status}`);
      }

      // 4. 验证金额
      const paidAmount = parseInt(notification.total_fee || '0', 10);
      const orderAmount = Math.round(Number(order.total) * 100);

      if (paidAmount !== orderAmount) {
        logger.warn('wallyt.notify.amount_mismatch', {
          order_id: orderId,
          paid: paidAmount,
          expected: orderAmount
        });
        // 金额不匹配，但仍然处理（可根据业务需求调整）
      }

      // 5. 更新支付记录
      const payment = await manager.findOne(OrderPaymentEntity, {
        where: { order_id: orderId, status: PaymentStatus.PENDING }
      });

      if (payment) {
        payment.status = PaymentStatus.SUCCESS;
        payment.transaction_id = notification.transaction_id;
        payment.paid_at = notification.time_end
          ? parseWallytTime(notification.time_end)
          : new Date();
        payment.callback_raw = {
          ...payment.callback_raw,
          notification
        };
        await manager.save(payment);
      }

      // 6. 更新库存 (reserved -> sold)
      if (order.product_id) {
        const inventory = await manager
          .createQueryBuilder(ProductInventoryEntity, 'inv')
          .setLock('pessimistic_write')
          .where('inv.product_id = :productId', { productId: order.product_id })
          .getOne();

        if (inventory) {
          const directAllocation = inventory.channel_allocations?.['direct'];
          if (directAllocation) {
            directAllocation.reserved = Math.max(0, directAllocation.reserved - order.quantity);
            directAllocation.sold += order.quantity;
            inventory.channel_allocations['direct'] = directAllocation;
            await manager.save(inventory);
          }
        }
      }

      // 7. 更新订单状态
      order.status = OrderStatus.CONFIRMED;
      order.paid_at = notification.time_end
        ? parseWallytTime(notification.time_end)
        : new Date();
      await manager.save(order);

      // 8. 生成票券
      await this.generateTickets(manager, order);
    });
  }

  /**
   * 生成票券
   */
  private async generateTickets(
    manager: EntityManager,
    order: OrderEntity
  ): Promise<TicketEntity[]> {
    const tickets: TicketEntity[] = [];

    // 获取产品权益
    let productEntitlements: any[] = [];
    if (order.product_id) {
      const product = await manager.findOne(ProductEntity, {
        where: { id: order.product_id }
      });
      productEntitlements = product?.entitlements || [];
    }

    // 根据定价上下文生成票券
    const pricingContext = order.pricing_context as PricingContextType;

    if (pricingContext?.customer_breakdown) {
      for (const breakdown of pricingContext.customer_breakdown) {
        for (let i = 0; i < breakdown.count; i++) {
          const ticket = new TicketEntity();
          ticket.ticket_code = ticketCodeGenerator.generate('MP');
          ticket.order_id = Number(order.id);
          ticket.product_id = order.product_id!;
          ticket.orq = 1;
          ticket.customer_type = breakdown.customer_type;
          ticket.status = 'ACTIVATED';
          ticket.travel_date = order.travel_date;
          ticket.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          ticket.channel = 'direct';
          ticket.entitlements = productEntitlements.map(e => ({
            function_code: e.type,
            remaining_uses: e.metadata?.quantity || (e as any).quantity || 1
          }));

          const savedTicket = await manager.save(ticket);
          tickets.push(savedTicket);
        }
      }
    }

    logger.info('wallyt.tickets.generated', {
      order_id: order.id,
      ticket_count: tickets.length
    });

    return tickets;
  }

  /**
   * 查询订单支付状态
   * 用于前端轮询或主动查询
   */
  async queryPaymentStatus(orderId: number): Promise<{
    status: string;
    paidAt?: string;
    transactionId?: string;
  }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId }
    });

    if (!order) {
      throw { code: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    const payment = await this.paymentRepo.findOne({
      where: { order_id: orderId },
      order: { created_at: 'DESC' }
    });

    return {
      status: order.status,
      paidAt: order.paid_at?.toISOString(),
      transactionId: payment?.transaction_id
    };
  }

  /**
   * 主动查询 Wallyt 订单状态
   * 用于补偿机制
   */
  async syncPaymentFromWallyt(orderId: number, outTradeNo: string): Promise<boolean> {
    try {
      const client = getWallytClient();
      const result = await client.queryOrder(outTradeNo);

      if (result.trade_state === 'SUCCESS') {
        // 构造通知数据并处理
        const notification: WallytNotification = {
          version: '2.0',
          charset: 'UTF-8',
          sign_type: 'MD5',
          status: '0',
          result_code: '0',
          pay_result: '0',
          out_trade_no: outTradeNo,
          transaction_id: result.transaction_id,
          total_fee: result.total_fee,
          time_end: result.time_end,
          attach: JSON.stringify({ orderId })
        };

        await this.processPaymentSuccess(orderId, notification);
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('wallyt.sync.failed', {
        order_id: orderId,
        out_trade_no: outTradeNo,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 申请退款
   *
   * @param request - 退款请求参数
   * @returns 退款结果
   */
  async refund(request: RefundRequest): Promise<RefundResponse> {
    const { orderId, refundAmount, reason } = request;

    // 1. 查找订单
    const order = await this.orderRepo.findOne({
      where: { id: orderId }
    });

    if (!order) {
      throw { code: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    // 2. 检查订单状态 (只有已支付的订单才能退款)
    if (order.status !== OrderStatus.CONFIRMED) {
      throw {
        code: 'INVALID_ORDER_STATUS',
        message: `订单状态 "${order.status}" 不允许退款，只有已支付订单可退款`
      };
    }

    // 3. 查找成功的支付记录
    const payment = await this.paymentRepo.findOne({
      where: { order_id: orderId, status: PaymentStatus.SUCCESS }
    });

    if (!payment) {
      throw { code: 'PAYMENT_NOT_FOUND', message: '未找到成功的支付记录' };
    }

    // 4. 获取原支付的商户订单号
    const outTradeNo = payment.callback_raw?.out_trade_no ||
      payment.callback_raw?.notification?.out_trade_no;

    if (!outTradeNo) {
      throw { code: 'OUT_TRADE_NO_NOT_FOUND', message: '未找到原支付商户订单号' };
    }

    // 5. 计算退款金额
    const totalPaid = Number(payment.amount);
    const alreadyRefunded = Number(payment.refund_amount || 0);
    const maxRefundable = totalPaid - alreadyRefunded;
    const actualRefundAmount = refundAmount ?? maxRefundable;

    if (actualRefundAmount <= 0) {
      throw { code: 'INVALID_REFUND_AMOUNT', message: '退款金额必须大于 0' };
    }

    if (actualRefundAmount > maxRefundable) {
      throw {
        code: 'REFUND_AMOUNT_EXCEEDS_LIMIT',
        message: `退款金额 ${actualRefundAmount} 超过可退款金额 ${maxRefundable}`
      };
    }

    // 6. 生成商户退款单号
    const outRefundNo = `RF${orderId}_${Date.now()}`;

    // 7. 调用 Wallyt 退款 API
    const client = getWallytClient();
    const totalFee = Math.round(totalPaid * 100); // 元转分
    const refundFee = Math.round(actualRefundAmount * 100); // 元转分

    try {
      logger.info('wallyt.refund.initiating', {
        order_id: orderId,
        out_trade_no: outTradeNo,
        out_refund_no: outRefundNo,
        total_fee: totalFee,
        refund_fee: refundFee,
        reason
      });

      const result = await client.refund({
        outTradeNo,
        outRefundNo,
        totalFee,
        refundFee
      });

      // 8. 更新支付记录
      payment.status = PaymentStatus.REFUNDED;
      payment.refund_amount = alreadyRefunded + actualRefundAmount;
      payment.refunded_at = new Date();
      payment.callback_raw = {
        ...payment.callback_raw,
        refund: {
          out_refund_no: outRefundNo,
          refund_id: result.refund_id,
          refund_fee: refundFee,
          reason,
          refunded_at: new Date().toISOString(),
          wallyt_response: result
        }
      };
      await this.paymentRepo.save(payment);

      // 9. 如果全额退款，更新订单状态
      if (payment.refund_amount >= totalPaid) {
        order.status = OrderStatus.CANCELLED;
        await this.orderRepo.save(order);

        // 10. 作废相关票券
        await this.ticketRepo.update(
          { order_id: orderId },
          { status: 'CANCELLED' }
        );

        logger.info('wallyt.refund.order_cancelled', { order_id: orderId });
      }

      logger.info('wallyt.refund.success', {
        order_id: orderId,
        out_refund_no: outRefundNo,
        refund_id: result.refund_id,
        refund_amount: actualRefundAmount
      });

      return {
        orderId,
        outRefundNo,
        refundId: result.refund_id,
        refundAmount: actualRefundAmount,
        status: 'SUCCESS'
      };
    } catch (error: any) {
      logger.error('wallyt.refund.failed', {
        order_id: orderId,
        out_refund_no: outRefundNo,
        error: error.message,
        code: error.code
      });

      // 记录退款失败
      payment.callback_raw = {
        ...payment.callback_raw,
        refund_failed: {
          out_refund_no: outRefundNo,
          reason,
          error: error.message,
          failed_at: new Date().toISOString()
        }
      };
      await this.paymentRepo.save(payment);

      return {
        orderId,
        outRefundNo,
        refundAmount: actualRefundAmount,
        status: 'FAILED',
        errorMessage: error.message || '退款失败'
      };
    }
  }
}

// 单例
let serviceInstance: WallytPaymentService | null = null;

export function getWallytPaymentService(): WallytPaymentService {
  if (!serviceInstance) {
    serviceInstance = new WallytPaymentService();
  }
  return serviceInstance;
}
