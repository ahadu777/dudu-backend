import { Router } from 'express';
import { venueOperationsService } from './service';
import { logger } from '../../utils/logger';
import { authenticateOperator } from '../../middlewares/auth';
import { API_KEYS } from '../../middlewares/otaAuth';

const router = Router();

// ============================================================================
// IMPORTANT: Route Order Matters!
// Static paths (/scan) must come BEFORE dynamic paths (/:venue_id)
// Paths with suffixes (/:venue_code/analytics) must come BEFORE bare params (/:venue_id)
// ============================================================================

// ============================================================================
// Venue CRUD Operations
// ============================================================================

/**
 * @swagger
 * /venue:
 *   get:
 *     summary: 获取场馆列表
 *     description: 返回场馆列表，可选择是否包含已停用的场馆
 *     tags: [Venue Management]
 *     parameters:
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含已停用的场馆
 *     responses:
 *       200:
 *         description: Successfully retrieved venue list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 venues:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Venue'
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    const partner = apiKey ? API_KEYS.get(apiKey) : undefined;
    const includeInactive = req.query.include_inactive === 'true';

    // OTA partner → only their venues; miniprogram → all venues
    const result = await venueOperationsService.getAllVenues({
      includeInactive,
      partnerId: partner?.partner_id
    });

    res.json(result);
  } catch (error) {
    logger.error('venues.list.error', {
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve venues list'
    });
  }
});

/**
 * @swagger
 * /venue:
 *   post:
 *     summary: 创建新场馆
 *     description: 创建一个新的场馆
 *     tags: [Venue Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - venue_code
 *               - venue_name
 *               - venue_type
 *             properties:
 *               venue_code:
 *                 type: string
 *                 description: 场馆唯一代码
 *                 example: "new-pier"
 *               venue_name:
 *                 type: string
 *                 description: 场馆名称
 *                 example: "New Pier Terminal"
 *               venue_type:
 *                 type: string
 *                 description: 场馆类型
 *                 enum: [ferry_terminal, gift_shop, playground]
 *                 example: "ferry_terminal"
 *               location_address:
 *                 type: string
 *                 description: 场馆地址
 *                 example: "123 Harbor Road"
 *               supported_functions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 支持的功能列表
 *                 example: ["ferry_boarding", "gift_redemption"]
 *               is_active:
 *                 type: boolean
 *                 description: 是否启用
 *                 default: true
 *     responses:
 *       201:
 *         description: Venue created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Venue'
 *       400:
 *         description: Invalid request or duplicate venue_code
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
  const { venue_code, venue_name, venue_type, location_address, supported_functions, is_active } = req.body;

  // Validate required fields
  if (!venue_code || !venue_name || !venue_type) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'venue_code, venue_name and venue_type are required'
    });
  }

  // Get partner_id from api-key
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const partner = apiKey ? API_KEYS.get(apiKey) : undefined;

  try {
    const venue = await venueOperationsService.createVenue({
      venue_code,
      venue_name,
      venue_type,
      location_address,
      supported_functions,
      is_active,
      partner_id: partner?.partner_id || null
    });

    res.status(201).json(venue);
  } catch (error) {
    const errorMsg = (error as Error).message;

    if (errorMsg.includes('already exists')) {
      return res.status(400).json({
        error: 'DUPLICATE_VENUE_CODE',
        message: errorMsg
      });
    }

    logger.error('venue.create.error', {
      venue_code,
      error: errorMsg,
      stack: (error as Error).stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create venue'
    });
  }
});

// ============================================================================
// Venue Operations (MUST be before /:venue_id routes)
// ============================================================================

/**
 * @swagger
 * /venue/scan:
 *   post:
 *     summary: 核销票券权益（需要操作员JWT认证）
 *     description: 扫码核销票券的指定权益，通过JTI+function_code防止重复核销，自动记录操作员信息
 *     tags: [Venue Operations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qr_token
 *               - function_code
 *             properties:
 *               qr_token:
 *                 type: string
 *                 description: 加密的QR码字符串（格式：iv:encrypted:authTag:signature）
 *                 example: "a1b2c3d4:e5f6g7h8:i9j0k1l2:m3n4o5p6"
 *               function_code:
 *                 type: string
 *                 description: 要核销的权益类型
 *                 enum: [ferry_boarding, gift_redemption, playground_token]
 *                 example: "ferry_boarding"
 *               venue_code:
 *                 type: string
 *                 description: 场馆代码（可选，用于场馆选择和功能验证）
 *                 example: "central-pier"
 *     responses:
 *       200:
 *         description: Scan processed successfully
 *       401:
 *         description: 未认证或操作员token无效
 *       422:
 *         description: 核销失败（重复核销、无权益、QR过期等）
 */
router.post('/scan', authenticateOperator, async (req, res) => {
  const { qr_token, function_code, venue_code } = req.body;

  if (!qr_token || !function_code) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'qr_token and function_code are required'
    });
  }

  try {
    const result = await venueOperationsService.validateAndRedeem({
      qrToken: qr_token,
      functionCode: function_code,
      venueCode: venue_code,
      operator: req.operator!
    });

    const statusCode = result.result === 'success' ? 200 : 422;
    res.status(statusCode).json(result);

  } catch (error) {
    logger.error('venue.scan.error', {
      function_code,
      operator_id: req.operator?.operator_id,
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    res.status(500).json({
      result: 'reject',
      reason: 'INTERNAL_ERROR',
      performance_metrics: {
        response_time_ms: 0,
        fraud_checks_passed: false
      },
      ts: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /venue/{venue_code}/analytics:
 *   get:
 *     summary: Get venue performance analytics (PRD-003 metrics)
 *     description: Returns real-time analytics for venue operations including fraud detection and success rates
 *     tags: [Venue Operations]
 *     parameters:
 *       - in: path
 *         name: venue_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Venue identifier
 *         example: "central-pier"
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Analytics time window in hours (1-168)
 *     responses:
 *       200:
 *         description: Venue analytics data
 *       400:
 *         description: Invalid hours parameter
 *       404:
 *         description: Venue not found
 */
router.get('/:venue_code/analytics', async (req, res) => {
  const { venue_code } = req.params;
  const hours = parseInt(req.query.hours as string) || 24;

  if (hours < 1 || hours > 24 * 7) {
    return res.status(400).json({
      error: 'INVALID_HOURS',
      message: 'Hours must be between 1 and 168 (7 days)'
    });
  }

  try {
    const analytics = await venueOperationsService.getVenueAnalytics(venue_code, hours);
    res.json(analytics);

  } catch (error) {
    logger.error('venue.analytics.error', {
      venue_code,
      hours,
      error: (error as Error).message
    });

    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({
        error: 'VENUE_NOT_FOUND',
        message: `Venue ${venue_code} not found`
      });
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve venue analytics'
    });
  }
});

// ============================================================================
// Venue CRUD by ID (dynamic routes - MUST be after static routes)
// ============================================================================

/**
 * @swagger
 * /venue/{venue_id}:
 *   get:
 *     summary: 获取场馆详情
 *     description: 根据ID获取场馆详细信息
 *     tags: [Venue Management]
 *     parameters:
 *       - in: path
 *         name: venue_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 场馆ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Venue details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Venue'
 *       404:
 *         description: Venue not found
 *       500:
 *         description: Internal server error
 */
router.get('/:venue_id', async (req, res) => {
  const venueId = parseInt(req.params.venue_id);

  if (isNaN(venueId)) {
    return res.status(400).json({
      error: 'INVALID_VENUE_ID',
      message: 'venue_id must be a number'
    });
  }

  try {
    const venue = await venueOperationsService.getVenueById(venueId);

    if (!venue) {
      return res.status(404).json({
        error: 'VENUE_NOT_FOUND',
        message: `Venue with ID ${venueId} not found`
      });
    }

    res.json(venue);
  } catch (error) {
    logger.error('venue.get.error', {
      venue_id: venueId,
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve venue'
    });
  }
});

/**
 * @swagger
 * /venue/{venue_id}:
 *   put:
 *     summary: 更新场馆信息
 *     description: 更新指定场馆的信息
 *     tags: [Venue Management]
 *     parameters:
 *       - in: path
 *         name: venue_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 场馆ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               venue_code:
 *                 type: string
 *               venue_name:
 *                 type: string
 *               venue_type:
 *                 type: string
 *               location_address:
 *                 type: string
 *               supported_functions:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Venue updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Venue'
 *       400:
 *         description: Invalid request or duplicate venue_code
 *       404:
 *         description: Venue not found
 *       500:
 *         description: Internal server error
 */
router.put('/:venue_id', async (req, res) => {
  const venueId = parseInt(req.params.venue_id);

  if (isNaN(venueId)) {
    return res.status(400).json({
      error: 'INVALID_VENUE_ID',
      message: 'venue_id must be a number'
    });
  }

  const { venue_code, venue_name, venue_type, location_address, supported_functions, is_active } = req.body;

  try {
    const venue = await venueOperationsService.updateVenue(venueId, {
      venue_code,
      venue_name,
      venue_type,
      location_address,
      supported_functions,
      is_active
    });

    if (!venue) {
      return res.status(404).json({
        error: 'VENUE_NOT_FOUND',
        message: `Venue with ID ${venueId} not found`
      });
    }

    res.json(venue);
  } catch (error) {
    const errorMsg = (error as Error).message;

    if (errorMsg.includes('already exists')) {
      return res.status(400).json({
        error: 'DUPLICATE_VENUE_CODE',
        message: errorMsg
      });
    }

    logger.error('venue.update.error', {
      venue_id: venueId,
      error: errorMsg,
      stack: (error as Error).stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update venue'
    });
  }
});

/**
 * @swagger
 * /venue/{venue_id}:
 *   delete:
 *     summary: 删除场馆
 *     description: 软删除指定场馆（设置 deleted_at 时间戳）
 *     tags: [Venue Management]
 *     parameters:
 *       - in: path
 *         name: venue_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 场馆ID
 *     responses:
 *       200:
 *         description: Venue deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Venue deleted successfully"
 *       404:
 *         description: Venue not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:venue_id', async (req, res) => {
  const venueId = parseInt(req.params.venue_id);

  if (isNaN(venueId)) {
    return res.status(400).json({
      error: 'INVALID_VENUE_ID',
      message: 'venue_id must be a number'
    });
  }

  try {
    const success = await venueOperationsService.deleteVenue(venueId);

    if (!success) {
      return res.status(404).json({
        error: 'VENUE_NOT_FOUND',
        message: `Venue with ID ${venueId} not found`
      });
    }

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    logger.error('venue.delete.error', {
      venue_id: venueId,
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete venue'
    });
  }
});

export default router;