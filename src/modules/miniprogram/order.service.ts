/**
 * 小程序订单服务
 * 基于 PRD-008 设计，使用 TypeORM
 */

import { Repository, EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { OrderEntity, OrderStatus, OrderType, PricingContext } from '../../models/order.entity';
import { ProductEntity } from '../ota/domain/product.entity';
import { ProductInventoryEntity } from '../ota/domain/product-inventory.entity';
import { TicketEntity } from '../ticket-reservation/domain/ticket.entity';
import { logger } from '../../utils/logger';
import {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderDetailResponse,
  OrderListItem,
  CustomerPricingItem,
  AddonPricingItem,
  PricingContext as PricingContextType
} from './order.types';

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
      order.channel = 'direct';
      order.order_type = OrderType.PACKAGE;
      order.product_id = request.product_id;
      order.product_name = product.name;
      order.quantity = totalQuantity;
      order.travel_date = new Date(request.travel_date);
      order.total = total;
      order.pricing_context = pricingContext as PricingContext;
      order.status = OrderStatus.PENDING;

      const savedOrder = await manager.save(order);

      // 6. 预留库存
      directAllocation.reserved += totalQuantity;
      inventory.channel_allocations['direct'] = directAllocation;

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
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user_id: userId }
    });

    if (!order) {
      return null;
    }

    // 获取关联的票券
    const tickets = await this.ticketRepo.find({
      where: { order_id: orderId }
    });

    return this.formatOrderDetailResponse(order, tickets);
  }

  /**
   * 获取用户订单列表
   */
  async getOrderList(userId: number, page: number, pageSize: number): Promise<{ orders: OrderListItem[], total: number }> {
    const [orders, total] = await this.orderRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return {
      orders: orders.map(o => this.formatOrderListItem(o)),
      total
    };
  }

  /**
   * 计算定价
   */
  private calculatePricing(product: ProductEntity, request: CreateOrderRequest): PricingContextType {
    const basePrice = Number(product.base_price);
    const weekendPremium = Number(product.weekend_premium) || 0;
    const customerDiscounts = product.customer_discounts || {};

    // 判断是否周末
    const travelDate = new Date(request.travel_date);
    const dayOfWeek = travelDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 计算每种客户类型的价格
    const customerBreakdown: CustomerPricingItem[] = request.customer_breakdown.map(item => {
      let unitPrice = basePrice;

      // 周末加价（仅成人）
      if (isWeekend && item.customer_type === 'adult') {
        unitPrice += weekendPremium;
      }

      // 客户类型折扣/固定价格
      const discount = customerDiscounts[item.customer_type];
      if (discount && typeof discount === 'number') {
        unitPrice = discount;
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
      pricing_context: order.pricing_context as PricingContextType,
      created_at: order.created_at instanceof Date
        ? order.created_at.toISOString()
        : String(order.created_at)
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
        qr_code: t.qr_code
      }))
    };
  }

  /**
   * 格式化订单列表项
   */
  private formatOrderListItem(order: OrderEntity): OrderListItem {
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
      paid_at: order.paid_at instanceof Date ? order.paid_at.toISOString() : undefined
    };
  }
}
