import { BaseOTAService } from './base.service';
import { mockDataStore } from '../../../core/mock/data';
import { toOTAAPIStatus } from '../status-mapper';

/**
 * 订单服务
 *
 * 处理 OTA 渠道的订单查询
 */
export class OrderService extends BaseOTAService {

  /**
   * 获取订单列表
   */
  async getOrders(partnerId?: string): Promise<any[]> {
    if (await this.isDatabaseAvailable()) {
      return this.getOrdersFromDatabase(partnerId);
    } else {
      return this.getOrdersFromMock(partnerId);
    }
  }

  /**
   * 获取订单票务
   */
  async getOrderTickets(orderId: string): Promise<any[]> {
    if (await this.isDatabaseAvailable()) {
      return this.getOrderTicketsFromDatabase(orderId);
    } else {
      return this.getOrderTicketsFromMock(orderId);
    }
  }

  // ============== Database 实现 ==============

  private async getOrdersFromDatabase(partnerId?: string): Promise<any[]> {
    const repo = await this.getOTARepository();
    const orders = await repo.findOTAOrdersByChannel(partnerId);

    return orders.map((order: any) => ({
      order_id: order.order_no,
      product_id: order.product_id,
      customer_name: order.contact_name,
      customer_email: order.contact_email,
      total_amount: order.total,
      status: order.status,
      created_at: order.created_at.toISOString(),
      confirmation_code: order.confirmation_code
    }));
  }

  private async getOrderTicketsFromDatabase(orderId: string): Promise<any[]> {
    const repo = await this.getOTARepository();
    const tickets = await repo.findTicketsByOrderId(orderId);

    if (tickets.length === 0) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} not found`
      };
    }

    return tickets.map((ticket: any) => ({
      ticket_code: ticket.ticket_code,
      qr_code: ticket.qr_code,
      customer_type: ticket.customer_type,
      entitlements: ticket.entitlements,
      status: toOTAAPIStatus(ticket.status)
    }));
  }

  // ============== Mock 实现 ==============

  private async getOrdersFromMock(partnerId?: string): Promise<any[]> {
    const channelId = partnerId || 'ota';
    const orders = mockDataStore.getOrdersByChannel(channelId);

    return orders.map((order: any) => ({
      order_id: order.order_id,
      product_id: order.product_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at.toISOString(),
      confirmation_code: order.confirmation_code
    }));
  }

  private async getOrderTicketsFromMock(orderId: string): Promise<any[]> {
    const order = mockDataStore.getOrderByOrderId(orderId);

    if (!order) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} not found`
      };
    }

    return (order.tickets || []).map((ticket: any) => ({
      ticket_code: ticket.code,
      qr_code: `data:image/png;base64,${Buffer.from(JSON.stringify({ ticket_id: ticket.id, product_id: order.product_id })).toString('base64')}`,
      customer_type: ticket.customer_type,
      entitlements: ticket.entitlements,
      status: toOTAAPIStatus(ticket.status)
    }));
  }
}

// 单例
let instance: OrderService | null = null;

export const getOrderService = (): OrderService => {
  if (!instance) {
    instance = new OrderService();
  }
  return instance;
};

export const orderService = new Proxy({} as OrderService, {
  get: (_, prop) => getOrderService()[prop as keyof OrderService]
});
