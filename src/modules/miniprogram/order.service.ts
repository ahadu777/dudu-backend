/**
 * 小程序订单服务
 * 基于 PRD-008 设计，使用 TypeORM
 */

import { Repository, EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { OrderEntity, OrderStatus, OrderType, OrderChannel, PricingContext } from '../../models/order.entity';
import { ProductEntity, ProductInventoryEntity, TicketEntity } from '../../models';
import { logger } from '../../utils/logger';
import { ticketCodeGenerator } from '../../utils/ticket-code-generator';
import { generateSecureQR, EncryptedQRResult } from '../../utils/qr-crypto';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDetailResponse,
  OrderListItem,
  CustomerPricingItem,
  AddonPricingItem,
  PricingContext as PricingContextType,
  PassengerInput
} from './order.types';

// 订单支付过期时长（分钟）
const ORDER_EXPIRY_MINUTES = 15;

export class MiniprogramOrderService {
  private orderRepo: Repository<OrderEntity>;
  private ticketRepo: Repository<TicketEntity>;

  constructor() {
    this.orderRepo = AppDataSource.getRepository(OrderEntity);
    this.ticketRepo = AppDataSource.getRepository(TicketEntity);
  }

  /**
   * 创建订单
   */
  async createOrder(userId: number, request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. 幂等检查：相同 order_no 返回已有订单
      const existingOrder = await manager.findOne(OrderEntity, {
        where: { user_id: userId, order_no: request.order_no }
      });

      if (existingOrder) {
        return this.formatOrderResponse(existingOrder);
      }

      // 2. 获取产品信息
      const product = await manager.findOne(ProductEntity, {
        where: { id: request.product_id, status: 'active' }
      });

      if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: '产品不存在或已下架' };
      }

      // 3. 检查库存（加锁）
      const inventory = await manager
        .createQueryBuilder(ProductInventoryEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.product_id = :productId', { productId: request.product_id })
        .getOne();

      if (!inventory) {
        throw { code: 'INVENTORY_NOT_FOUND', message: '产品库存信息不存在' };
      }

      const directAllocation = inventory.channel_allocations?.['direct'];
      if (!directAllocation) {
        throw { code: 'CHANNEL_NOT_AVAILABLE', message: '该产品不支持小程序购买' };
      }

      // 计算总人数
      const totalQuantity = request.customer_breakdown.reduce((sum, item) => sum + item.count, 0);

      // 检查库存是否足够
      const available = directAllocation.allocated - directAllocation.reserved - directAllocation.sold;
      if (available < totalQuantity) {
        throw { code: 'INSUFFICIENT_INVENTORY', message: '库存不足' };
      }

      // 4. 计算价格
      const pricingContext = this.calculatePricing(product, request);
      const total = pricingContext.subtotal + pricingContext.addons_total;

      // 5. 创建订单实体
      const order = new OrderEntity();
      order.user_id = userId;
      order.order_no = request.order_no;
      order.channel = OrderChannel.DIRECT;
      // 联系人信息
      order.contact_name = request.contact_name;
      order.contact_phone = request.contact_phone;
      order.contact_email = request.contact_email;
      // 乘客信息（可选）
      order.passengers = request.passengers;
      order.order_type = OrderType.PACKAGE;
      order.product_id = request.product_id;
      order.product_name = product.name;
      order.quantity = totalQuantity;
      order.travel_date = new Date(request.travel_date);
      order.total = total;
      order.pricing_context = pricingContext as PricingContext;
      order.status = OrderStatus.PENDING;

      const savedOrder = await manager.save(order);

      // 6. 预留库存 - 创建新对象，触发 TypeORM JSON 字段变更检测
      inventory.channel_allocations = {
        ...inventory.channel_allocations,
        direct: {
          ...directAllocation,
          reserved: directAllocation.reserved + totalQuantity
        }
      };

      await manager.save(inventory);

      logger.info('miniprogram.order.created', {
        order_id: savedOrder.id,
        user_id: userId,
        product_id: request.product_id,
        total
      });

      return this.formatOrderResponse(savedOrder);
    });
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(userId: number, orderId: number): Promise<OrderDetailResponse | null> {
    // 优化：一次查询订单和票券
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['tickets']
    });

    if (!order) {
      return null;
    }

    return this.formatOrderDetailResponse(order, order.tickets || []);
  }

  /**
   * 获取用户订单列表
   */
  async getOrderList(userId: number, page: number, pageSize: number): Promise<{ orders: OrderListItem[], total: number }> {
    // 优化：分页查询订单后，再批量查询票券，避免 join 放大导致慢查询与分页不准
    const [orders, total] = await this.orderRepo
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.order_no',
        'order.status',
        'order.product_id',
        'order.product_name',
        'order.quantity',
        'order.total',
        'order.travel_date',
        'order.created_at',
        'order.paid_at'
      ])
      .where('order.user_id = :userId', { userId })
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    if (orders.length === 0) {
      return { orders: [], total };
    }

    const orderIds = orders.map(o => Number(o.id));
    const tickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select([
        'ticket.id',
        'ticket.ticket_code',
        'ticket.customer_type',
        'ticket.status',
        'ticket.entitlements',
        'ticket.order_id'
      ])
      .where('ticket.order_id IN (:...orderIds)', { orderIds })
      .getMany();

    // 按订单ID分组票券
    const ticketsByOrderId = new Map<number, TicketEntity[]>();
    for (const ticket of tickets) {
      const orderId = Number(ticket.order_id);
      if (!ticketsByOrderId.has(orderId)) {
        ticketsByOrderId.set(orderId, []);
      }
      ticketsByOrderId.get(orderId)!.push(ticket);
    }

    return {
      orders: orders.map(o => this.formatOrderListItem(o, ticketsByOrderId.get(Number(o.id)) || [])),
      total
    };
  }

  /**
   * 模拟支付成功（仅用于测试环境）
   * 在没有真实微信支付的情况下，模拟支付成功流程：
   * 1. 更新订单状态为 PAID
   * 2. 确认库存（reserved -> sold）
   * 3. 生成票券
   */
  async simulatePayment(userId: number, orderId: number): Promise<OrderDetailResponse> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. 查找订单
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId, user_id: userId }
      });

      if (!order) {
        throw { code: 'ORDER_NOT_FOUND', message: '订单不存在' };
      }

      // 2. 检查订单状态
      if (order.status === OrderStatus.CONFIRMED) {
        // 已支付，直接返回订单详情（幂等）
        const tickets = await this.ticketRepo.find({ where: { order_id: orderId } });
        return this.formatOrderDetailResponse(order, tickets);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw { code: 'INVALID_ORDER_STATUS', message: `订单状态不正确: ${order.status}` };
      }

      // 3. 更新库存（reserved -> sold）
      const inventory = await manager
        .createQueryBuilder(ProductInventoryEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.product_id = :productId', { productId: order.product_id })
        .getOne();

      if (inventory) {
        const directAllocation = inventory.channel_allocations?.['direct'];
        if (directAllocation) {
          // 从预留转为已售 - 创建新对象，触发 TypeORM JSON 字段变更检测
          inventory.channel_allocations = {
            ...inventory.channel_allocations,
            direct: {
              ...directAllocation,
              reserved: directAllocation.reserved - order.quantity,
              sold: directAllocation.sold + order.quantity
            }
          };
          await manager.save(inventory);
        }
      }

      // 4. 更新订单状态
      order.status = OrderStatus.CONFIRMED;
      order.paid_at = new Date();
      await manager.save(order);

      // 5. 获取产品权益
      const product = await manager.findOne(ProductEntity, {
        where: { id: order.product_id }
      });
      const productEntitlements = product?.entitlements || [];

      logger.info('miniprogram.order.product_entitlements', {
        order_id: orderId,
        product_id: order.product_id,
        product_found: !!product,
        entitlements_raw: product?.entitlements,
        entitlements_count: productEntitlements.length
      });

      // 6. 生成票券
      const tickets: TicketEntity[] = [];
      const pricingContext = order.pricing_context as PricingContextType;

      if (pricingContext?.customer_breakdown) {
        for (const breakdown of pricingContext.customer_breakdown) {
          for (let i = 0; i < breakdown.count; i++) {
            const ticket = new TicketEntity();
            ticket.ticket_code = ticketCodeGenerator.generate('MP');
            ticket.order_id = orderId;
            ticket.product_id = order.product_id!;
            ticket.orq = 1; // 默认组织ID
            ticket.customer_type = breakdown.customer_type;
            ticket.status = 'ACTIVATED';
            ticket.travel_date = order.travel_date;
            ticket.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年有效期
            ticket.channel = 'direct';
            // 复制订单联系人信息到票券（用于预订时自动填充）
            ticket.customer_name = order.contact_name;
            ticket.customer_email = order.contact_email;
            ticket.customer_phone = order.contact_phone;
            // 复制产品权益到票券（与 OTA 保持一致，使用 remaining_uses）
            // 支持两种数据格式：{ type, metadata: { quantity } } 或 { type, quantity }
            ticket.entitlements = productEntitlements.map(e => ({
              function_code: e.type,
              remaining_uses: e.metadata?.quantity || (e as any).quantity || 1
            }));

            logger.debug('miniprogram.ticket.entitlements_generated', {
              ticket_code: ticket.ticket_code,
              entitlements: ticket.entitlements
            });

            const savedTicket = await manager.save(ticket);
            tickets.push(savedTicket);
          }
        }
      }

      logger.info('miniprogram.order.payment_simulated', {
        order_id: orderId,
        user_id: userId,
        ticket_count: tickets.length
      });

      return this.formatOrderDetailResponse(order, tickets);
    });
  }

  /**
   * 取消订单
   * 仅允许取消 PENDING 状态的订单，取消后释放预留库存
   */
  async cancelOrder(userId: number, orderId: number): Promise<{ success: boolean; message: string }> {
    return AppDataSource.transaction(async (manager: EntityManager) => {
      // 1. 查找订单
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId, user_id: userId }
      });

      if (!order) {
        throw { code: 'ORDER_NOT_FOUND', message: '订单不存在' };
      }

      // 2. 检查订单状态（只有 PENDING 可以取消）
      if (order.status === OrderStatus.CANCELLED) {
        // 幂等：已取消的订单直接返回成功
        return { success: true, message: '订单已取消' };
      }

      if (order.status !== OrderStatus.PENDING) {
        throw { code: 'INVALID_ORDER_STATUS', message: `订单状态 "${order.status}" 不允许取消` };
      }

      // 3. 释放预留库存
      const inventory = await manager
        .createQueryBuilder(ProductInventoryEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.product_id = :productId', { productId: order.product_id })
        .getOne();

      if (inventory) {
        const directAllocation = inventory.channel_allocations?.['direct'];
        if (directAllocation && directAllocation.reserved >= order.quantity) {
          // 创建新对象，触发 TypeORM JSON 字段变更检测
          inventory.channel_allocations = {
            ...inventory.channel_allocations,
            direct: {
              ...directAllocation,
              reserved: directAllocation.reserved - order.quantity
            }
          };
          await manager.save(inventory);
        }
      }

      // 4. 更新订单状态
      order.status = OrderStatus.CANCELLED;
      order.cancelled_at = new Date();
      await manager.save(order);

      logger.info('miniprogram.order.cancelled', {
        order_id: orderId,
        user_id: userId,
        quantity_released: order.quantity
      });

      return { success: true, message: '订单已取消' };
    });
  }

  /**
   * 清理指定产品的超时订单（懒惰清理）
   * 在查询库存时调用，避免定时任务带来的服务器压力
   *
   * @param productId - 产品ID
   * @returns 取消的订单数量
   */
  async cleanupExpiredOrdersForProduct(productId: number): Promise<number> {
    const expireTime = new Date(Date.now() - ORDER_EXPIRY_MINUTES * 60 * 1000);

    // 1. 查找该产品的超时 PENDING 订单
    const expiredOrders = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.product_id = :productId', { productId })
      .andWhere('order.status = :status', { status: OrderStatus.PENDING })
      .andWhere('order.created_at < :expireTime', { expireTime })
      .getMany();

    if (expiredOrders.length === 0) {
      return 0;
    }

    // 2. 计算需要释放的库存总量
    const totalQuantityToRelease = expiredOrders.reduce((sum, order) => sum + order.quantity, 0);
    const orderIds = expiredOrders.map(o => o.id);

    // 3. 在事务中批量更新订单状态并释放库存
    await AppDataSource.transaction(async (manager: EntityManager) => {
      // 批量更新订单状态为 CANCELLED
      await manager
        .createQueryBuilder()
        .update(OrderEntity)
        .set({
          status: OrderStatus.CANCELLED,
          cancelled_at: new Date()
        })
        .whereInIds(orderIds)
        .execute();

      // 释放预留库存
      const inventory = await manager
        .createQueryBuilder(ProductInventoryEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.product_id = :productId', { productId })
        .getOne();

      if (inventory) {
        const directAllocation = inventory.channel_allocations?.['direct'];
        if (directAllocation) {
          // 确保不会减成负数
          const releaseAmount = Math.min(directAllocation.reserved, totalQuantityToRelease);
          // 创建新对象，触发 TypeORM JSON 字段变更检测
          inventory.channel_allocations = {
            ...inventory.channel_allocations,
            direct: {
              ...directAllocation,
              reserved: directAllocation.reserved - releaseAmount
            }
          };
          await manager.save(inventory);
        }
      }
    });

    logger.info('miniprogram.orders.expired_cleanup', {
      product_id: productId,
      cancelled_count: expiredOrders.length,
      quantity_released: totalQuantityToRelease,
      order_ids: orderIds
    });

    return expiredOrders.length;
  }

  /**
   * 为票券生成二维码
   * 生成新二维码时会更新 ticket.extra.current_jti，使旧二维码失效
   *
   * @param userId - 用户ID（用于权限校验）
   * @param ticketCode - 票券编码
   * @param expiryMinutes - 二维码有效期（分钟），默认30分钟
   * @returns 加密的二维码结果
   */
  async generateTicketQR(
    userId: number,
    ticketCode: string,
    expiryMinutes: number = 30
  ): Promise<EncryptedQRResult & { valid_for_seconds: number }> {
    // 1. 查找票券并验证所有权
    const ticket = await this.ticketRepo.findOne({
      where: { ticket_code: ticketCode }
    });

    if (!ticket) {
      throw { code: 'TICKET_NOT_FOUND', message: '票券不存在' };
    }

    // 2. 验证票券归属（通过订单关联）
    const order = await this.orderRepo.findOne({
      where: { id: ticket.order_id, user_id: userId }
    });

    if (!order) {
      throw { code: 'UNAUTHORIZED', message: '无权访问此票券' };
    }

    // 3. 验证票券状态
    const validStatuses = ['ACTIVATED', 'RESERVED'];
    if (!validStatuses.includes(ticket.status)) {
      throw {
        code: 'INVALID_TICKET_STATUS',
        message: `票券状态 "${ticket.status}" 不允许生成二维码`
      };
    }

    // 4. 获取产品 QR 配置（颜色）和统一 logo
    let qrColorConfig;

    if (order.product_id) {
      const productRepo = AppDataSource.getRepository(ProductEntity);
      const product = await productRepo.findOne({ where: { id: order.product_id } });
      if (product?.qr_config) {
        qrColorConfig = {
          dark_color: product.qr_config.dark_color,
          light_color: product.qr_config.light_color
        };
      }
    }

    // 获取统一 logo（与 OTA 共用同一个硬编码 logo）
    const { DirectusService } = await import('../../utils/directus');
    const directusService = new DirectusService();
    const logoBuffer = await directusService.getPartnerLogo('miniprogram');

    // 5. 生成二维码（带 logo）
    const qrResult = await generateSecureQR(ticketCode, expiryMinutes, logoBuffer || undefined, qrColorConfig);

    // 6. 更新 ticket.extra.current_jti（使旧二维码失效）
    const extra = ticket.extra || {};
    extra.current_jti = qrResult.jti;
    extra.qr_generated_at = new Date().toISOString();
    ticket.extra = extra;

    await this.ticketRepo.save(ticket);

    logger.info('miniprogram.ticket.qr_generated', {
      ticket_code: ticketCode,
      jti: qrResult.jti,
      expires_at: qrResult.expires_at,
      user_id: userId
    });

    // 6. 计算剩余有效时间
    const expiresAt = new Date(qrResult.expires_at);
    const now = new Date();
    const validForSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    return {
      ...qrResult,
      valid_for_seconds: validForSeconds
    };
  }

  /**
   * 计算定价
   */
  private calculatePricing(product: ProductEntity, request: CreateOrderRequest): PricingContextType {
    const basePrice = Number(product.base_price);
    // TODO: 周末加价暂未启用
    // const weekendPremium = Number(product.weekend_premium) || 0;
    const customerDiscounts = product.customer_discounts || {};

    // 判断是否周末
    const travelDate = new Date(request.travel_date);
    const dayOfWeek = travelDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 计算每种客户类型的价格
    const customerBreakdown: CustomerPricingItem[] = request.customer_breakdown.map(item => {
      let unitPrice = basePrice;

      // TODO: 周末加价（仅成人）- 暂未启用
      // if (isWeekend && item.customer_type === 'adult') {
      //   unitPrice += weekendPremium;
      // }

      // 客户类型折扣（在基础价格上减少）
      const discount = customerDiscounts[item.customer_type];
      if (discount && typeof discount === 'number') {
        unitPrice -= discount;
      }

      return {
        customer_type: item.customer_type,
        count: item.count,
        unit_price: unitPrice,
        total: unitPrice * item.count
      };
    });

    const subtotal = customerBreakdown.reduce((sum, item) => sum + item.total, 0);

    // 计算附加项
    const addons: AddonPricingItem[] = (request.addons || []).map(addon => {
      const addonPrices: Record<string, { name: string, price: number }> = {
        'tokens-plan-a': { name: '代币套餐A (10个)', price: 100 },
        'tokens-plan-b': { name: '代币套餐B (20个)', price: 180 },
        'tokens-plan-c': { name: '代币套餐C (50个)', price: 400 }
      };

      const addonInfo = addonPrices[addon.addon_id] || { name: addon.addon_id, price: 0 };

      return {
        addon_id: addon.addon_id,
        name: addonInfo.name,
        quantity: addon.quantity,
        unit_price: addonInfo.price,
        total: addonInfo.price * addon.quantity
      };
    });

    const addonsTotal = addons.reduce((sum, item) => sum + item.total, 0);

    return {
      travel_date: request.travel_date,
      is_weekend: isWeekend,
      customer_breakdown: customerBreakdown,
      addons,
      subtotal,
      addons_total: addonsTotal
    };
  }

  /**
   * 格式化订单响应
   */
  private formatOrderResponse(order: OrderEntity): CreateOrderResponse {
    return {
      id: Number(order.id),
      order_no: order.order_no,
      status: order.status,
      product_id: Number(order.product_id),
      product_name: order.product_name || '',
      travel_date: order.travel_date instanceof Date
        ? order.travel_date.toISOString().split('T')[0]
        : String(order.travel_date),
      quantity: order.quantity,
      total: Number(order.total),
      // 联系人信息
      contact_name: order.contact_name || '',
      contact_phone: order.contact_phone || '',
      contact_email: order.contact_email,
      // 乘客信息
      passengers: order.passengers as PassengerInput[],
      pricing_context: order.pricing_context as PricingContextType,
      created_at: order.created_at instanceof Date
        ? order.created_at.toISOString()
        : String(order.created_at),
      // 动态计算过期时间：created_at + ORDER_EXPIRY_MINUTES
      expires_at: order.status === 'pending' && order.created_at instanceof Date
        ? new Date(order.created_at.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000).toISOString()
        : undefined
    };
  }

  /**
   * 格式化订单详情响应
   */
  private formatOrderDetailResponse(order: OrderEntity, tickets: TicketEntity[]): OrderDetailResponse {
    const base = this.formatOrderResponse(order);

    return {
      ...base,
      paid_at: order.paid_at instanceof Date ? order.paid_at.toISOString() : undefined,
      tickets: tickets.map(t => ({
        ticket_id: t.id,
        ticket_code: t.ticket_code,
        customer_type: t.customer_type || 'adult',
        status: t.status,
        qr_code: t.qr_code,
        entitlements: t.entitlements?.map(e => ({
          function_code: e.function_code,
          remaining_uses: e.remaining_uses ?? 0
        }))
      }))
    };
  }

  /**
   * 格式化订单列表项
   */
  private formatOrderListItem(order: OrderEntity, tickets: TicketEntity[]): OrderListItem {
    return {
      order_id: Number(order.id),
      order_no: order.order_no,
      status: order.status,
      product_id: Number(order.product_id),
      product_name: order.product_name || '',
      travel_date: order.travel_date instanceof Date
        ? order.travel_date.toISOString().split('T')[0]
        : String(order.travel_date),
      quantity: order.quantity,
      total: Number(order.total),
      created_at: order.created_at instanceof Date
        ? order.created_at.toISOString()
        : String(order.created_at),
      // 动态计算过期时间：created_at + ORDER_EXPIRY_MINUTES（仅 pending 状态）
      expires_at: order.status === 'pending' && order.created_at instanceof Date
        ? new Date(order.created_at.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000).toISOString()
        : undefined,
      paid_at: order.paid_at instanceof Date ? order.paid_at.toISOString() : undefined,
      tickets: tickets.map(t => ({
        ticket_id: t.id,
        ticket_code: t.ticket_code,
        customer_type: t.customer_type || 'adult',
        status: t.status,
        qr_code: t.qr_code,
        entitlements: t.entitlements?.map(e => ({
          function_code: e.function_code,
          remaining_uses: e.remaining_uses ?? 0
        }))
      }))
    };
  }
}
