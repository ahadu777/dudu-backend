import { Request, Response } from 'express';
import { WeChatAuthService } from './wechat-auth.service';
import {
  validateWeChatLoginRequest,
  validateWeChatPhoneRequest,
  WeChatLoginResponseDto,
  WeChatPhoneBindingResponseDto,
} from './dto';
import { logger } from '../../../utils/logger';
import { AppError } from '../../../middlewares/errorHandler';

export class WeChatAuthController {
  private wechatAuthService: WeChatAuthService;

  constructor() {
    this.wechatAuthService = new WeChatAuthService();
  }

  /**
   * POST /auth/wechat/login
   * WeChat mini-program login endpoint
   *
   * @swagger
   * /auth/wechat/login:
   *   post:
   *     tags: [Authentication]
   *     summary: WeChat mini-program login
   *     description: Exchange WeChat temporary code for JWT token and user profile
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *             properties:
   *               code:
   *                 type: string
   *                 description: Temporary code from wx.login() (5-minute validity)
   *                 example: "081AbcDef2GHIJK3lmnOpq4RS56TuVw7x8yZ9"
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                   description: JWT token (7-day validity)
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                     name:
   *                       type: string
   *                     wechat_openid:
   *                       type: string
   *                     phone:
   *                       type: string
   *                       nullable: true
   *                     auth_type:
   *                       type: string
   *                     created_at:
   *                       type: string
   *                       format: date-time
   *                 needs_phone:
   *                   type: boolean
   *                   description: Indicates if user needs to bind phone number
   *       400:
   *         description: Invalid request (code missing or invalid)
   *       401:
   *         description: WeChat authentication failed (code expired/invalid)
   *       500:
   *         description: Internal server error
   */
  async login(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    logger.info('wechat_auth.login.entry', { body: req.body });

    try {
      // Validate request body
      const validation = validateWeChatLoginRequest(req.body);
      if (!validation.valid) {
        logger.warn('wechat_auth.login.validation_failed', {
          errors: validation.errors,
        });
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          errors: validation.errors,
        });
        return;
      }

      const { code } = req.body;

      logger.info('wechat_auth.login.request', {
        code_length: code.length,
        ip: req.ip,
      });

      // Perform WeChat login (mock or database mode)
      const result = await this.wechatAuthService.login(code);

      const response: WeChatLoginResponseDto = {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          wechat_openid: result.user.wechat_openid,
          phone: result.user.phone || null,
          auth_type: result.user.auth_type,
          created_at: 'created_at' in result.user ? result.user.created_at : result.user.createdAt,
        },
        needs_phone: result.needs_phone,
      };

      logger.info('wechat_auth.login.success', {
        user_id: result.user.id,
        needs_phone: result.needs_phone,
        duration_ms: Date.now() - startTime,
      });

      res.status(200).json(response);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle known WeChat API errors
      if (error.message === 'WECHAT_CODE_INVALID') {
        logger.warn('wechat_auth.login.code_invalid', {
          duration_ms: duration,
        });
        res.status(401).json({
          code: 'WECHAT_AUTH_FAILED',
          message: 'WeChat code expired or already used',
        });
        return;
      }

      if (error.message === 'WECHAT_CODE_FORMAT_INVALID') {
        logger.warn('wechat_auth.login.code_format_invalid', {
          duration_ms: duration,
        });
        res.status(422).json({
          code: 'INVALID_CODE',
          message: 'Invalid code format',
        });
        return;
      }

      if (error.message === 'WECHAT_NETWORK_ERROR') {
        logger.error('wechat_auth.login.network_error', {
          duration_ms: duration,
        });
        res.status(500).json({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'WeChat API unavailable, please try again',
        });
        return;
      }

      // Generic error
      logger.error('wechat_auth.login.error', {
        error: String(error),
        stack: error.stack,
        duration_ms: duration,
      });

      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed',
      });
    }
  }

  /**
   * POST /auth/wechat/phone
   * WeChat phone number binding endpoint
   *
   * @swagger
   * /auth/wechat/phone:
   *   post:
   *     tags: [Authentication]
   *     summary: Bind WeChat user phone number
   *     description: Exchange phone authorization code for user phone number
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *             properties:
   *               code:
   *                 type: string
   *                 description: Phone authorization code from getPhoneNumber
   *                 example: "9f8e7d6c5b4a3g2h1i0j"
   *     responses:
   *       200:
   *         description: Phone binding successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 phone:
   *                   type: string
   *                   description: Phone number in E.164 format
   *                   example: "+8613800138000"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                     name:
   *                       type: string
   *                     wechat_openid:
   *                       type: string
   *                     phone:
   *                       type: string
   *                     auth_type:
   *                       type: string
   *                     created_at:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Invalid request (code missing or invalid)
   *       401:
   *         description: Unauthorized (JWT token missing/invalid)
   *       500:
   *         description: Internal server error
   */
  async bindPhone(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate request body
      const validation = validateWeChatPhoneRequest(req.body);
      if (!validation.valid) {
        logger.warn('wechat_auth.bind_phone.validation_failed', {
          errors: validation.errors,
          user_id: req.user?.id,
        });
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          errors: validation.errors,
        });
        return;
      }

      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn('wechat_auth.bind_phone.unauthorized', {
          has_user: !!req.user,
        });
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      const { code } = req.body;
      const userId = req.user.id;

      logger.info('wechat_auth.bind_phone.request', {
        user_id: userId,
        code_length: code.length,
      });

      // Perform phone binding (mock or database mode)
      const result = await this.wechatAuthService.bindPhone(userId, code);

      const response: WeChatPhoneBindingResponseDto = {
        phone: result.phone,
        user: {
          id: result.user.id,
          name: result.user.name,
          wechat_openid: result.user.wechat_openid,
          phone: result.phone,
          auth_type: result.user.auth_type,
          created_at: 'created_at' in result.user ? result.user.created_at : result.user.createdAt,
        },
      };

      logger.info('wechat_auth.bind_phone.success', {
        user_id: userId,
        phone_length: result.phone.length,
        duration_ms: Date.now() - startTime,
      });

      res.status(200).json(response);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Handle known errors
      if (error.message === 'USER_NOT_FOUND') {
        logger.warn('wechat_auth.bind_phone.user_not_found', {
          user_id: req.user?.id,
          duration_ms: duration,
        });
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
        return;
      }

      if (error.message === 'WECHAT_PHONE_CODE_INVALID') {
        logger.warn('wechat_auth.bind_phone.code_invalid', {
          user_id: req.user?.id,
          duration_ms: duration,
        });
        res.status(401).json({
          code: 'WECHAT_PHONE_CODE_INVALID',
          message: 'Phone authorization code expired or already used',
        });
        return;
      }

      if (error.message === 'WECHAT_NETWORK_ERROR') {
        logger.error('wechat_auth.bind_phone.network_error', {
          user_id: req.user?.id,
          duration_ms: duration,
        });
        res.status(500).json({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'WeChat API unavailable, please try again',
        });
        return;
      }

      // Generic error
      logger.error('wechat_auth.bind_phone.error', {
        error: String(error),
        stack: error.stack,
        user_id: req.user?.id,
        duration_ms: duration,
      });

      res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Phone binding failed',
      });
    }
  }
}
