import crypto from 'crypto';
import { ERR } from '../../core/errors/codes';
import { publish } from '../../core/events/bus';
import { OrdersCreated } from '../../core/events/types';
import { mockDataStore } from '../../core/mock/data';
import { CreateOrderRequest, OrderResponse } from './types';

// Simple console logging for mock service
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

export class OrderService {
  private calculatePayloadHash(payload: CreateOrderRequest): string {
    const normalized = JSON.stringify({
      items: payload.items.sort((a, b) => a.product_id - b.product_id),
      channel_id: payload.channel_id,
      coupon_code: payload.coupon_code || null
    });
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async createOrder(userId: number, request: CreateOrderRequest): Promise<OrderResponse> {
    try {
      // 1. Idempotency check
      const payloadHash = this.calculatePayloadHash(request);
      const existingOrder = mockDataStore.getOrder(userId, request.out_trade_no);

      if (existingOrder) {
        if (existingOrder.payload_hash !== payloadHash) {
          throw {
            code: ERR.IDEMPOTENCY_CONFLICT,
            message: 'Mismatched payload for existing order'
          };
        }

        return {
          order_id: existingOrder.id,
          status: existingOrder.status,
          amounts: {
            subtotal: existingOrder.subtotal,
            discount: existingOrder.discount,
            total: existingOrder.total
          }
        };
      }

      // 2. Validate products and check inventory
      let subtotal = 0;
      const orderItems = [];

      for (const item of request.items) {
        if (item.qty < 1) {
          throw {
            code: ERR.VALIDATION_ERROR,
            message: 'Quantity must be at least 1'
          };
        }

        const product = mockDataStore.getProduct(item.product_id);

        if (!product) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `Product ${item.product_id} not found`
          };
        }

        if (!product.active) {
          throw {
            code: ERR.PRODUCT_INACTIVE,
            message: `Product ${item.product_id} is not active`
          };
        }

        const available = product.inventory.sellable_cap -
                         product.inventory.reserved_count -
                         product.inventory.sold_count;

        if (available < item.qty) {
          logger.info('reserve.fail', {
            product_id: item.product_id,
            requested: item.qty,
            available
          });
          throw {
            code: ERR.SOLD_OUT,
            message: 'Insufficient sellable inventory'
          };
        }

        subtotal += product.unit_price * item.qty;
        orderItems.push({
          product_id: item.product_id,
          qty: item.qty,
          unit_price: product.unit_price
        });
      }

      // 3. Calculate amounts
      const discount = 0; // TODO: Implement coupon logic
      const total = subtotal - discount;

      // 4. Reserve inventory
      for (const item of orderItems) {
        const reserved = mockDataStore.reserveInventory(item.product_id, item.qty);
        if (!reserved) {
          // Rollback previous reservations
          for (let i = 0; i < orderItems.indexOf(item); i++) {
            mockDataStore.releaseInventory(orderItems[i].product_id, orderItems[i].qty);
          }
          throw {
            code: ERR.SOLD_OUT,
            message: 'Failed to reserve inventory'
          };
        }

        logger.info('reserve.ok', {
          product_id: item.product_id,
          delta: item.qty
        });
      }

      // 5. Create order
      const order = mockDataStore.createOrder({
        user_id: userId,
        out_trade_no: request.out_trade_no,
        channel_id: request.channel_id,
        status: 'PENDING_PAYMENT',
        subtotal,
        discount,
        total,
        payload_hash: payloadHash,
        items: orderItems
      });

      // 6. Emit event
      const event: OrdersCreated = {
        order_id: order.id,
        user_id: userId,
        items: orderItems,
        channel_id: request.channel_id,
        amounts: { subtotal, discount, total },
        out_trade_no: request.out_trade_no,
        ts: new Date().toISOString()
      };

      publish('orders.created', event);
      logger.info('Order created', { orderId: order.id, userId });

      return {
        order_id: order.id,
        status: order.status,
        amounts: { subtotal, discount, total }
      };

    } catch (error: any) {
      if (error.code) {
        throw error;
      }

      logger.error('Order creation failed', error);
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Order creation failed'
      };
    }
  }
}