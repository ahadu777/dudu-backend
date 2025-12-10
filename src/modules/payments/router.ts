/**
 * 支付路由
 * 支持 Wallyt 微信小程序支付
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { authenticate } from '../../middlewares/auth';
import { getWallytPaymentService } from './wallyt-payment.service';
import { isWallytConfigured } from './wallyt.client';
import { parseRequestBody } from './xml.util';
import type { WallytNotification } from './wallyt.types';

const router = Router();

// ========== Wallyt 支付接口 ==========

/**
 * 创建预支付订单 (Wallyt)
 * POST /payments/wechat/prepay
 *
 * 需要认证，从 JWT 中获取用户信息
 */
router.post('/wechat/prepay', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId, openid } = req.body;
    const userId = req.user?.id;

    // 验证参数
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    if (!orderId || typeof orderId !== 'number') {
      return res.status(422).json({
        code: 'INVALID_ORDER_ID',
        message: 'orderId (number) is required'
      });
    }

    if (!openid || typeof openid !== 'string') {
      return res.status(422).json({
        code: 'INVALID_OPENID',
        message: 'openid is required'
      });
    }

    // 检查 Wallyt 配置
    if (!isWallytConfigured()) {
      return res.status(503).json({
        code: 'PAYMENT_NOT_CONFIGURED',
        message: 'Payment service is not configured'
      });
    }

    // 获取客户端 IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '0.0.0.0';

    // 调用支付服务
    const paymentService = getWallytPaymentService();
    const result = await paymentService.createPrepay(userId, orderId, openid, clientIp);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('payment.prepay.error', { error: error.message, code: error.code });

    const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404
      : error.code === 'INVALID_ORDER_STATUS' ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      code: error.code || 'PREPAY_ERROR',
      message: error.message || 'Failed to create prepay order'
    });
  }
});

/**
 * Wallyt 支付回调通知
 * POST /payments/wallyt/notify
 *
 * Wallyt 服务器调用，XML 格式
 */
router.post('/wallyt/notify', async (req: Request, res: Response) => {
  try {
    // 解析请求体 (可能是 XML 字符串或已解析的对象)
    const notification = parseRequestBody<WallytNotification>(req.body);

    logger.info('payment.wallyt.notify.received', {
      out_trade_no: notification.out_trade_no,
      pay_result: notification.pay_result
    });

    // 处理通知
    const paymentService = getWallytPaymentService();
    const result = await paymentService.handleNotification(notification);

    // Wallyt 要求返回纯字符串 "success" 或 "fail"
    if (result.success) {
      res.send('success');
    } else {
      res.send('fail');
    }
  } catch (error: any) {
    logger.error('payment.wallyt.notify.error', { error: error.message });
    res.send('fail');
  }
});

/**
 * 查询支付状态
 * GET /payments/status/:orderId
 */
router.get('/status/:orderId', authenticate, async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    if (isNaN(orderId)) {
      return res.status(422).json({
        code: 'INVALID_ORDER_ID',
        message: 'Invalid order ID'
      });
    }

    const paymentService = getWallytPaymentService();
    const status = await paymentService.queryPaymentStatus(orderId);

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    logger.error('payment.status.error', { error: error.message });

    res.status(error.code === 'ORDER_NOT_FOUND' ? 404 : 500).json({
      success: false,
      code: error.code || 'STATUS_ERROR',
      message: error.message || 'Failed to query payment status'
    });
  }
});

/**
 * 申请退款
 * POST /payments/refund
 *
 * 需要认证
 */
router.post('/refund', authenticate, async (req: Request, res: Response) => {
  try {
    const { orderId, refundAmount, reason } = req.body;
    const userId = req.user?.id;

    // 验证参数
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    if (!orderId || typeof orderId !== 'number') {
      return res.status(422).json({
        code: 'INVALID_ORDER_ID',
        message: 'orderId (number) is required'
      });
    }

    if (refundAmount !== undefined && (typeof refundAmount !== 'number' || refundAmount <= 0)) {
      return res.status(422).json({
        code: 'INVALID_REFUND_AMOUNT',
        message: 'refundAmount must be a positive number'
      });
    }

    // 检查 Wallyt 配置
    if (!isWallytConfigured()) {
      return res.status(503).json({
        code: 'PAYMENT_NOT_CONFIGURED',
        message: 'Payment service is not configured'
      });
    }

    // 调用退款服务
    const paymentService = getWallytPaymentService();
    const result = await paymentService.refund({
      orderId,
      refundAmount,
      reason
    });

    if (result.status === 'FAILED') {
      return res.status(500).json({
        success: false,
        code: 'REFUND_FAILED',
        message: result.errorMessage,
        data: result
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('payment.refund.error', { error: error.message, code: error.code });

    const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404
      : error.code === 'PAYMENT_NOT_FOUND' ? 404
      : error.code === 'INVALID_ORDER_STATUS' ? 400
      : error.code === 'REFUND_AMOUNT_EXCEEDS_LIMIT' ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      code: error.code || 'REFUND_ERROR',
      message: error.message || 'Failed to process refund'
    });
  }
});

export default router;
