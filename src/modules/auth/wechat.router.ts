import { Router } from 'express';
import { WeChatAuthController } from './application/wechat-auth.controller';
import { authenticate, generateToken } from '../../middlewares/auth';
import { env } from '../../config/env';

const router = Router();
const wechatAuthController = new WeChatAuthController();

/**
 * POST /auth/wechat/login
 * WeChat mini-program login
 * Public endpoint (no authentication required)
 */
router.post('/wechat/login', async (req, res) => {
  await wechatAuthController.login(req, res);
});

/**
 * POST /auth/wechat/phone
 * Bind WeChat user phone number
 * Protected endpoint (JWT token required)
 */
router.post('/wechat/phone', authenticate, async (req, res) => {
  await wechatAuthController.bindPhone(req, res);
});

/**
 * POST /auth/test-token
 * Generate test token for automated testing
 * Only available in development/test environment
 */
router.post('/test-token', async (req, res) => {
  // 仅在非生产环境可用
  if (env.NODE_ENV === 'production') {
    return res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Endpoint not available in production'
    });
  }

  const { user_id, email } = req.body;

  if (!user_id) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'user_id is required'
    });
  }

  const token = generateToken({
    id: Number(user_id),
    email: email || `test-user-${user_id}@test.local`
  });

  res.status(200).json({
    token,
    user_id: Number(user_id),
    expires_in: '24h'
  });
});

export default router;
