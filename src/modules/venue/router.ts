import { Router } from 'express';
import { venueOperationsService } from './service';
import { logger } from '../../utils/logger';
import { authenticateOperator } from '../../middlewares/auth';
import { API_KEYS } from '../../middlewares/otaAuth';
import { AppDataSource } from '../../config/database';
import { VenueRepository } from './domain/venue.repository';
import { paginationMiddleware } from '../../middlewares/pagination';

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
 *                   enum: [ferry, gift, tokens, park_admission, pet_area, vip, exclusive]
 *                 description: 支持的权益类型（与产品权益一致）
 *                 example: ["ferry", "gift"]
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
 *                 description: 要核销的权益类型（与产品权益一致）
 *                 enum: [ferry, gift, tokens, park_admission, pet_area, vip, exclusive]
 *                 example: "ferry"
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
 * /venue/redemptions:
 *   get:
 *     tags: [Venue Operations]
 *     summary: 查询核销记录
 *     description: 查询核销事件记录，支持时间范围、权益类型、场馆等过滤条件
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间 (ISO 8601 格式)
 *         example: "2025-11-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间 (ISO 8601 格式)
 *         example: "2025-11-28T23:59:59Z"
 *       - in: query
 *         name: function
 *         schema:
 *           type: string
 *           enum: [ferry, gift, tokens, park_admission, pet_area, vip, exclusive]
 *         description: 按权益类型过滤（与产品权益一致）
 *       - in: query
 *         name: venue_id
 *         schema:
 *           type: integer
 *         description: 按场馆ID过滤
 *       - in: query
 *         name: result
 *         schema:
 *           type: string
 *           enum: [success, reject]
 *         description: 按核销结果过滤
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 返回数量上限 (最大 1000)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分页偏移量
 *     responses:
 *       200:
 *         description: 核销记录列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event_id:
 *                         type: integer
 *                       ticket_code:
 *                         type: string
 *                       function_code:
 *                         type: string
 *                       venue_id:
 *                         type: integer
 *                       venue_name:
 *                         type: string
 *                       operator_id:
 *                         type: integer
 *                       result:
 *                         type: string
 *                         enum: [success, reject]
 *                       reason:
 *                         type: string
 *                         nullable: true
 *                       ts:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   description: 匹配的总记录数
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       400:
 *         description: 请求参数无效
 *       500:
 *         description: 服务器内部错误
 */
router.get('/redemptions', paginationMiddleware({ defaultLimit: 100, maxLimit: 1000, style: 'offset' }), async (req, res) => {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    const functionCode = req.query.function as string | undefined;
    const venueIdStr = req.query.venue_id as string | undefined;
    const result = req.query.result as 'success' | 'reject' | undefined;

    // Get pagination from middleware
    const { limit, offset } = req.pagination;

    // Parse and validate dates
    let from: Date | undefined;
    let to: Date | undefined;

    if (fromStr) {
      from = new Date(fromStr);
      if (isNaN(from.getTime())) {
        return res.status(400).json({
          error: 'INVALID_DATE',
          message: 'Invalid "from" date format. Use ISO 8601 format.'
        });
      }
    }

    if (toStr) {
      to = new Date(toStr);
      if (isNaN(to.getTime())) {
        return res.status(400).json({
          error: 'INVALID_DATE',
          message: 'Invalid "to" date format. Use ISO 8601 format.'
        });
      }
    }

    // Validate from < to
    if (from && to && from > to) {
      return res.status(400).json({
        error: 'INVALID_DATE_RANGE',
        message: '"from" date must be before "to" date'
      });
    }

    // Default to last 24 hours if no dates provided
    if (!from && !to) {
      to = new Date();
      from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Parse venue_id
    let venueId: number | undefined;
    if (venueIdStr) {
      venueId = parseInt(venueIdStr, 10);
      if (isNaN(venueId)) {
        return res.status(400).json({
          error: 'INVALID_VENUE_ID',
          message: 'venue_id must be a valid integer'
        });
      }
    }

    // Validate result parameter
    if (result && !['success', 'reject'].includes(result)) {
      return res.status(400).json({
        error: 'INVALID_RESULT',
        message: 'result must be "success" or "reject"'
      });
    }

    logger.info('venue.redemptions.query', {
      from: from?.toISOString(),
      to: to?.toISOString(),
      function: functionCode,
      venue_id: venueId,
      result,
      limit,
      offset
    });

    // Check if database is initialized
    if (!AppDataSource.isInitialized) {
      // Return empty results in mock mode
      logger.info('venue.redemptions.mock_mode', { message: 'Database not initialized, returning empty results' });
      return res.status(200).json({
        events: [],
        total: 0,
        limit,
        offset
      });
    }

    // Query redemption events
    const repository = new VenueRepository(AppDataSource);
    const { events, total } = await repository.queryRedemptionEvents({
      from,
      to,
      functionCode,
      venueId,
      result,
      limit,
      offset
    });

    // Transform events to response format
    const responseEvents = events.map(event => {
      const additionalData = event.additional_data || {};
      return {
        event_id: event.event_id,
        ticket_code: event.ticket_code,
        function_code: event.function_code,
        // 场馆信息
        venue_id: event.venue_id,
        venue_code: additionalData.venue_code || null,
        venue_name: additionalData.venue_name || event.venue?.venue_name || null,
        // 操作员信息
        operator_id: event.operator_id,
        operator_name: additionalData.operator_name || null,
        // 票券信息
        ticket_type: additionalData.ticket_type || null,
        product_id: additionalData.product_id || null,
        product_name: additionalData.product_name || null,
        customer_name: additionalData.customer_name || null,
        customer_type: additionalData.customer_type || null,
        // 核销结果
        session_code: event.session_code,
        result: event.result,
        reason: event.reason || null,
        remaining_uses_after: event.remaining_uses_after,
        ts: event.redeemed_at.toISOString()
      };
    });

    logger.info('venue.redemptions.success', {
      count: responseEvents.length,
      total,
      duration_ms: Date.now() - startTime
    });

    res.status(200).json({
      events: responseEvents,
      total,
      limit,
      offset
    });

  } catch (error) {
    logger.error('venue.redemptions.error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      duration_ms: Date.now() - startTime
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to query redemption events'
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