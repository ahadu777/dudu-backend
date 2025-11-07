import { Router } from 'express';
import { WeChatAuthController } from './application/wechat-auth.controller';
import { authenticate } from '../../middlewares/auth';

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

export default router;
