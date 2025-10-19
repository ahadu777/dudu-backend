import crypto from 'crypto';
import { AppDataSource } from '../../config/database';
import { ERR } from '../../core/errors/codes';
import { publish } from '../../core/events/bus';
import { OrdersCreated } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { CreateOrderRequest, OrderResponse, Product, ProductInventory, Order } from './types';

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
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Idempotency check
      const payloadHash = this.calculatePayloadHash(request);

      const existingOrder = await queryRunner.query(
        `SELECT id, status, subtotal, discount, total, payload_hash
         FROM orders
         WHERE user_id = ? AND out_trade_no = ?
         FOR UPDATE`,
        [userId, request.out_trade_no]
      );

      if (existingOrder.length > 0) {
        const order = existingOrder[0];
        if (order.payload_hash !== payloadHash) {
          await queryRunner.rollbackTransaction();
          throw {
            code: ERR.IDEMPOTENCY_CONFLICT,
            message: 'Mismatched payload for existing order'
          };
        }

        await queryRunner.commitTransaction();
        return {
          order_id: order.id,
          status: order.status,
          amounts: {
            subtotal: Number(order.subtotal),
            discount: Number(order.discount),
            total: Number(order.total)
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

        // Get product details
        const products = await queryRunner.query(
          'SELECT id, unit_price, active FROM products WHERE id = ?',
          [item.product_id]
        );

        if (products.length === 0) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `Product ${item.product_id} not found`
          };
        }

        const product = products[0];
        if (!product.active) {
          throw {
            code: ERR.PRODUCT_INACTIVE,
            message: `Product ${item.product_id} is not active`
          };
        }

        // Lock and check inventory
        const inventory = await queryRunner.query(
          `SELECT product_id, sellable_cap, reserved_count, sold_count
           FROM product_inventory
           WHERE product_id = ?
           FOR UPDATE`,
          [item.product_id]
        );

        if (inventory.length === 0) {
          throw {
            code: ERR.PRODUCT_NOT_FOUND,
            message: `No inventory for product ${item.product_id}`
          };
        }

        const inv = inventory[0];
        const available = inv.sellable_cap - inv.reserved_count - inv.sold_count;

        if (available < item.qty) {
          await queryRunner.rollbackTransaction();
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

        subtotal += Number(product.unit_price) * item.qty;
        inventoryChecks.push({
          product_id: item.product_id,
          qty: item.qty,
          unit_price: Number(product.unit_price)
        });
      }

      // 3. Calculate amounts (coupon logic would go here)
      const discount = 0; // TODO: Implement coupon logic
      const total = subtotal - discount;

      // 4. Insert order
      const orderResult = await queryRunner.query(
        `INSERT INTO orders (user_id, out_trade_no, channel_id, status, subtotal, discount, total, payload_hash)
         VALUES (?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?)`,
        [userId, request.out_trade_no, request.channel_id, subtotal, discount, total, payloadHash]
      );

      const orderId = orderResult.insertId;

      // 5. Insert order items
      for (const item of inventoryChecks) {
        await queryRunner.query(
          `INSERT INTO order_items (order_id, product_id, qty, unit_price)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.product_id, item.qty, item.unit_price]
        );
      }

      // 6. Reserve inventory
      for (const item of inventoryChecks) {
        await queryRunner.query(
          `UPDATE product_inventory
           SET reserved_count = reserved_count + ?
           WHERE product_id = ?`,
          [item.qty, item.product_id]
        );

        logger.info('reserve.ok', {
          product_id: item.product_id,
          delta: item.qty
        });
      }

      await queryRunner.commitTransaction();

      // 7. Emit event (outside transaction)
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
      await queryRunner.rollbackTransaction();

      if (error.code) {
        throw error;
      }

      logger.error('Order creation failed', error);
      throw {
        code: ERR.VALIDATION_ERROR,
        message: 'Order creation failed'
      };
    } finally {
      await queryRunner.release();
    }
  }
}