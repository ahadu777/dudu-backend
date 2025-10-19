import crypto from 'crypto';
import { ERR } from '../../core/errors/codes';
import { publish } from '../../core/events/bus';
import { OrdersCreated } from '../../core/events/types';
// Simple console logging for mock service
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};
import { CreateOrderRequest, OrderResponse } from './types';

// Mock in-memory storage for testing without database
const mockOrders = new Map<string, any>();
const mockInventory = new Map<number, { sellable: number; reserved: number; sold: number }>();

// Initialize mock inventory
mockInventory.set(101, { sellable: 1000, reserved: 0, sold: 0 });

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
      const idempotencyKey = `${userId}-${request.out_trade_no}`;
      const payloadHash = this.calculatePayloadHash(request);

      const existingOrder = mockOrders.get(idempotencyKey);
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
      const inventoryChecks = [];

      for (const item of request.items) {
        if (item.qty < 1) {
          throw {
            code: ERR.VALIDATION_ERROR,
            message: 'Quantity must be at least 1'
          };
        }

        // Mock product check
        if (item.product_id !== 101) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `Product ${item.product_id} not found`
          };
        }

        const unitPrice = 99.00; // Mock price for product 101
        const inventory = mockInventory.get(item.product_id);

        if (!inventory) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `No inventory for product ${item.product_id}`
          };
        }

        const available = inventory.sellable - inventory.reserved - inventory.sold;
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

        subtotal += unitPrice * item.qty;
        inventoryChecks.push({
          product_id: item.product_id,
          qty: item.qty,
          unit_price: unitPrice
        });
      }

      // 3. Calculate amounts
      const discount = 0;
      const total = subtotal - discount;

      // 4. Create order (mock)
      const orderId = Math.floor(Math.random() * 100000) + 1;
      const order = {
        id: orderId,
        user_id: userId,
        out_trade_no: request.out_trade_no,
        channel_id: request.channel_id,
        status: 'PENDING_PAYMENT',
        subtotal,
        discount,
        total,
        payload_hash: payloadHash,
        created_at: new Date()
      };

      mockOrders.set(idempotencyKey, order);

      // 5. Reserve inventory (mock)
      for (const item of inventoryChecks) {
        const inventory = mockInventory.get(item.product_id)!;
        inventory.reserved += item.qty;

        logger.info('reserve.ok', {
          product_id: item.product_id,
          delta: item.qty,
          remaining: inventory.sellable - inventory.reserved - inventory.sold
        });
      }

      // 6. Emit event
      const event: OrdersCreated = {
        order_id: orderId,
        user_id: userId,
        items: inventoryChecks,
        channel_id: request.channel_id,
        amounts: { subtotal, discount, total },
        out_trade_no: request.out_trade_no,
        ts: new Date().toISOString()
      };

      publish('orders.created', event);
      logger.info('Order created', { orderId, userId });

      return {
        order_id: orderId,
        status: 'PENDING_PAYMENT',
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