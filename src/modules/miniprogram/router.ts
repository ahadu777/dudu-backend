import { Router } from 'express';
import { logger } from '../../utils/logger';
import { paginationMiddleware } from '../../middlewares/pagination';
import { authenticate } from '../../middlewares/auth';
import { MiniprogramOrderService } from './order.service';
import { MiniprogramProductService } from './product.service';
import { CreateOrderRequest } from './order.types';

const router = Router();
const orderService = new MiniprogramOrderService();
const productService = new MiniprogramProductService();

/**
 * GET /miniprogram/products
 * 获取小程序商品列表（仅展示 direct channel 有库存的商品）
 */
router.get('/products', paginationMiddleware({ defaultLimit: 20, maxLimit: 100 }), async (req, res) => {
  const startTime = Date.now();

  try {
    const category = req.query.category as string | undefined;
    const { page, limit, offset } = req.pagination;

    const result = await productService.getProductList({ category, offset: offset!, limit });

    logger.info('miniprogram.products.list', {
      total: result.total,
      page,
      page_size: limit,
      returned: result.products.length
    });

    const latency = Date.now() - startTime;
    logger.info('miniprogram.products.list.latency', { latency_ms: latency });

    res.status(200).json({
      total: result.total,
      page,
      page_size: limit,
      products: result.products
    });

  } catch (error) {
    logger.error('miniprogram.products.list.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch products'
    });
  }
});

/**
 * GET /miniprogram/products/:id
 * 获取商品详情
 */
router.get('/products/:id', async (req, res) => {
  const startTime = Date.now();

  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID must be a valid number'
      });
    }

    const product = await productService.getProductDetail(productId);

    if (!product) {
      logger.info('miniprogram.product.not_found', { product_id: productId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Product not found or not available'
      });
    }

    logger.info('miniprogram.product.detail', {
      product_id: productId,
      name: product.name
    });

    const latency = Date.now() - startTime;
    logger.info('miniprogram.product.detail.latency', { latency_ms: latency });

    res.status(200).json(product);

  } catch (error) {
    logger.error('miniprogram.product.detail.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch product detail'
    });
  }
});

/**
 * GET /miniprogram/products/:id/availability
 * 实时查询商品库存
 */
router.get('/products/:id/availability', async (req, res) => {
  const startTime = Date.now();

  try {
    const productId = parseInt(req.params.id);
    const quantity = parseInt(req.query.quantity as string) || 1;

    if (isNaN(productId)) {
      return res.status(400).json({
        code: 'INVALID_PRODUCT_ID',
        message: 'Product ID must be a valid number'
      });
    }

    const availability = await productService.checkAvailability(productId, quantity);

    if (!availability) {
      logger.info('miniprogram.availability.not_found', { product_id: productId });
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Product not found or not available'
      });
    }

    logger.info('miniprogram.availability.check', {
      product_id: productId,
      requested_quantity: quantity,
      available: availability.available,
      is_available: availability.is_available
    });

    const latency = Date.now() - startTime;
    logger.info('miniprogram.availability.latency', { latency_ms: latency });

    res.status(200).json(availability);

  } catch (error) {
    logger.error('miniprogram.availability.error', { error: String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to check availability'
    });
  }
});

// ========== 订单相关 API ==========

/**
 * POST /miniprogram/orders
 * 创建订单
 */
router.post('/orders', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    }

    const request: CreateOrderRequest = req.body;

    // 参数校验
    if (!request.order_no) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '订单号不能为空'
      });
    }

    if (!request.product_id) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '产品ID不能为空'
      });
    }

    if (!request.travel_date) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '出行日期不能为空'
      });
    }

    if (!request.customer_breakdown || request.customer_breakdown.length === 0) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '客户明细不能为空'
      });
    }

    // 验证客户明细
    for (const item of request.customer_breakdown) {
      if (!['adult', 'child', 'elderly'].includes(item.customer_type)) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: `无效的客户类型: ${item.customer_type}`
        });
      }
      if (!item.count || item.count < 1) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: '客户数量必须大于0'
        });
      }
    }

    const response = await orderService.createOrder(userId, request);
    res.status(201).json(response);

  } catch (error: any) {
    logger.error('miniprogram.order.create.error', { error: error.message || String(error) });

    if (error.code) {
      const statusMap: Record<string, number> = {
        'PRODUCT_NOT_FOUND': 404,
        'INVENTORY_NOT_FOUND': 404,
        'CHANNEL_NOT_AVAILABLE': 400,
        'INSUFFICIENT_INVENTORY': 400
      };
      const status = statusMap[error.code] || 500;
      return res.status(status).json({
        code: error.code,
        message: error.message
      });
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '创建订单失败'
    });
  }
});

/**
 * GET /miniprogram/orders
 * 获取订单列表
 */
router.get('/orders', authenticate, paginationMiddleware({ defaultLimit: 20, maxLimit: 50 }), async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    }

    const { page, limit } = req.pagination;
    const result = await orderService.getOrderList(userId, page, limit);

    res.status(200).json({
      orders: result.orders,
      total: result.total,
      page,
      page_size: limit
    });

  } catch (error: any) {
    logger.error('miniprogram.order.list.error', { error: error.message || String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '获取订单列表失败'
    });
  }
});

/**
 * GET /miniprogram/orders/:id
 * 获取订单详情
 */
router.get('/orders/:id', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '无效的订单ID'
      });
    }

    const order = await orderService.getOrderDetail(userId, orderId);
    if (!order) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: '订单不存在'
      });
    }

    res.status(200).json(order);

  } catch (error: any) {
    logger.error('miniprogram.order.detail.error', { error: error.message || String(error) });
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '获取订单详情失败'
    });
  }
});

/**
 * POST /miniprogram/tickets/:code/qr
 * 为票券生成二维码
 *
 * 特性：
 * 1. 验证票券所有权（必须是当前用户的票券）
 * 2. 生成新二维码时，旧二维码自动失效（通过 jti 机制）
 * 3. 默认有效期 30 分钟
 *
 * @param code - 票券编码 (ticket_code)
 * @body expiry_minutes - 可选，二维码有效期（分钟），默认30，最大1440
 */
router.post('/tickets/:code/qr', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    }

    const ticketCode = req.params.code;
    if (!ticketCode || ticketCode.length < 3) {
      return res.status(400).json({
        code: 'INVALID_TICKET_CODE',
        message: '无效的票券编码'
      });
    }

    // 验证有效期参数
    let expiryMinutes = 30;
    if (req.body?.expiry_minutes !== undefined) {
      expiryMinutes = Number(req.body.expiry_minutes);
      if (isNaN(expiryMinutes) || expiryMinutes < 1 || expiryMinutes > 1440) {
        return res.status(400).json({
          code: 'INVALID_EXPIRY',
          message: '有效期必须在 1-1440 分钟之间'
        });
      }
    }

    const result = await orderService.generateTicketQR(userId, ticketCode, expiryMinutes);

    logger.info('miniprogram.ticket.qr.success', {
      ticket_code: ticketCode,
      user_id: userId,
      expires_at: result.expires_at
    });

    res.status(200).json({
      success: true,
      qr_image: result.qr_image,
      encrypted_data: result.encrypted_data,
      ticket_code: result.ticket_code,
      expires_at: result.expires_at,
      valid_for_seconds: result.valid_for_seconds,
      issued_at: new Date().toISOString(),
      jti: result.jti
    });

  } catch (error: any) {
    logger.error('miniprogram.ticket.qr.error', {
      error: error.message || String(error),
      code: error.code
    });

    if (error.code) {
      const statusMap: Record<string, number> = {
        'TICKET_NOT_FOUND': 404,
        'UNAUTHORIZED': 403,
        'INVALID_TICKET_STATUS': 400
      };
      const status = statusMap[error.code] || 500;
      return res.status(status).json({
        code: error.code,
        message: error.message
      });
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '生成二维码失败'
    });
  }
});

/**
 * POST /miniprogram/orders/:id/simulate-payment
 * 模拟支付成功（仅用于测试环境）
 *
 * 功能：
 * 1. 将订单状态从 PENDING 更新为 PAID
 * 2. 确认库存（reserved -> sold）
 * 3. 自动生成票券
 *
 * 注意：此接口仅用于开发测试，生产环境应禁用
 */
router.post('/orders/:id/simulate-payment', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: '请先登录'
      });
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: '无效的订单ID'
      });
    }

    const result = await orderService.simulatePayment(userId, orderId);

    logger.info('miniprogram.order.simulate_payment.success', {
      order_id: orderId,
      user_id: userId,
      ticket_count: result.tickets?.length || 0
    });

    res.status(200).json({
      message: '模拟支付成功',
      order: result
    });

  } catch (error: any) {
    logger.error('miniprogram.order.simulate_payment.error', {
      error: error.message || String(error),
      code: error.code
    });

    if (error.code) {
      const statusMap: Record<string, number> = {
        'ORDER_NOT_FOUND': 404,
        'INVALID_ORDER_STATUS': 400
      };
      const status = statusMap[error.code] || 500;
      return res.status(status).json({
        code: error.code,
        message: error.message
      });
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: '模拟支付失败'
    });
  }
});

export default router;
