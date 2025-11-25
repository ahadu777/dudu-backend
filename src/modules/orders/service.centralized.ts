import crypto from 'crypto';
import { ERR } from '../../core/errors/codes';
import { publish } from '../../core/events/bus';
import { OrdersCreated } from '../../core/events/types';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';
import { CreateOrderRequest, OrderResponse } from './types';
import { OrderStatus } from '../../types/domain';

// Using centralized logger from utils

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
      const existingOrder = mockStore.getOrder(userId, request.out_trade_no);

      if (existingOrder) {
        // Check payload hash if stored (for idempotency)
        // Note: mockStore Order type doesn't have payload_hash, but idempotency is handled by key
        // Return existing order (idempotency)
        const status = existingOrder.status as any; // Type compatibility
        return {
          order_id: existingOrder.order_id,
          status: status,
          amounts: existingOrder.amounts || {
            subtotal: 0,
            discount: 0,
            total: 0
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

        // Get product from mockStore (includes inventory in internal structure)
        const product = mockStore.getProduct(item.product_id);
        const productWithInventory = mockStore.getPromotionDetail(item.product_id);

        if (!product || !productWithInventory) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `Product ${item.product_id} not found`
          };
        }

        if (product.status !== 'active') {
          throw {
            code: ERR.PRODUCT_INACTIVE,
            message: `Product ${item.product_id} is not active`
          };
        }

        const available = productWithInventory.inventory.sellable_cap -
                         productWithInventory.inventory.reserved_count -
                         productWithInventory.inventory.sold_count;

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

        // Get unit price from promotion detail
        const unitPrice = productWithInventory.unit_price || 0;
        subtotal += unitPrice * item.qty;
        orderItems.push({
          product_id: item.product_id,
          qty: item.qty,
          unit_price: unitPrice
        });
      }

      // 3. Calculate amounts
      const discount = 0; // TODO: Implement coupon logic
      const total = subtotal - discount;

      // 4. Reserve inventory
      for (const item of orderItems) {
        const reserved = mockStore.reserveInventory(item.product_id, item.qty);
        if (!reserved) {
          // Rollback previous reservations
          for (let i = 0; i < orderItems.indexOf(item); i++) {
            mockStore.releaseInventory(orderItems[i].product_id, orderItems[i].qty);
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
      const order = mockStore.createOrder({
        user_id: userId,
        out_trade_no: request.out_trade_no,
        channel_id: request.channel_id,
        status: OrderStatus.PENDING_PAYMENT,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          qty: item.qty
        })),
        amounts: {
          subtotal,
          discount,
          total
        }
      });

      // 6. Emit event
      const event: OrdersCreated = {
        order_id: order.order_id,
        user_id: userId,
        items: orderItems,
        channel_id: request.channel_id,
        amounts: { subtotal, discount, total },
        out_trade_no: request.out_trade_no,
        ts: new Date().toISOString()
      };

      publish('orders.created', event);
      logger.info('Order created', { orderId: order.order_id, userId });

      return {
        order_id: order.order_id,
        status: order.status as any, // Type compatibility
        amounts: order.amounts || { subtotal, discount, total }
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