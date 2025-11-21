import { Request, Response, NextFunction } from 'express';
// Use database service
import { OrderService } from './service';
import { CreateOrderRequest } from './types';
import { ERR, ERROR_STATUS_MAP } from '../../core/errors/codes';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { items, channel_id, out_trade_no, coupon_code } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(422).json({
          code: ERR.VALIDATION_ERROR,
          message: 'Items array is required and cannot be empty'
        });
      }

      if (!channel_id || !out_trade_no) {
        return res.status(422).json({
          code: ERR.VALIDATION_ERROR,
          message: 'channel_id and out_trade_no are required'
        });
      }

      // Validate each item
      for (const item of items) {
        if (!item.product_id || !item.qty) {
          return res.status(422).json({
            code: ERR.VALIDATION_ERROR,
            message: 'Each item must have product_id and qty'
          });
        }

        if (item.qty < 1) {
          return res.status(422).json({
            code: ERR.VALIDATION_ERROR,
            message: 'Quantity must be at least 1'
          });
        }
      }

      // Get user ID from authenticated user
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          code: ERR.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      const request: CreateOrderRequest = {
        items,
        channel_id,
        out_trade_no,
        coupon_code
      };

      const response = await this.orderService.createOrder(userId, request);
      res.status(200).json(response);

    } catch (error: any) {
      if (error.code) {
        const status = ERROR_STATUS_MAP[error.code as keyof typeof ERROR_STATUS_MAP] || 500;
        return res.status(status).json({
          code: error.code,
          message: error.message
        });
      }

      console.error('Unexpected error in createOrder:', error);
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  };
}