import { Router } from 'express';
import { venueOperationsService } from './service';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * @swagger
 * /venue/sessions:
 *   post:
 *     summary: Create venue operator session (Enhanced US-002)
 *     description: Creates an operator session tied to a specific venue for PRD-003 multi-terminal operations
 *     tags: [Venue Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - venue_code
 *               - operator_id
 *               - operator_name
 *             properties:
 *               venue_code:
 *                 type: string
 *                 description: Venue identifier (central-pier, cheung-chau, gift-shop-central)
 *                 example: "central-pier"
 *               operator_id:
 *                 type: integer
 *                 description: Operator user ID
 *                 example: 1001
 *               operator_name:
 *                 type: string
 *                 description: Operator display name
 *                 example: "Alice Chan"
 *               terminal_device_id:
 *                 type: string
 *                 description: Physical terminal device identifier
 *                 example: "TERMINAL-CP-001"
 *               duration_hours:
 *                 type: integer
 *                 description: Session duration in hours (default 8)
 *                 example: 8
 *     responses:
 *       201:
 *         description: Venue session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session_code:
 *                   type: string
 *                   example: "VS-1699123456789-abc123def"
 *                 venue_code:
 *                   type: string
 *                   example: "central-pier"
 *                 venue_name:
 *                   type: string
 *                   example: "Central Pier Terminal"
 *                 operator_name:
 *                   type: string
 *                   example: "Alice Chan"
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-11-04T16:00:00.000Z"
 *                 supported_functions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["ferry_boarding", "gift_redemption"]
 */
router.post('/sessions', async (req, res) => {
  const { venue_code, operator_id, operator_name, terminal_device_id, duration_hours } = req.body;

  if (!venue_code || !operator_id || !operator_name) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'venue_code, operator_id, and operator_name are required'
    });
  }

  try {
    const session = await venueOperationsService.createVenueSession({
      venueCode: venue_code,
      operatorId: operator_id,
      operatorName: operator_name,
      terminalDeviceId: terminal_device_id,
      durationHours: duration_hours
    });

    if (!session) {
      return res.status(404).json({
        error: 'VENUE_NOT_FOUND',
        message: `Venue ${venue_code} not found or inactive`
      });
    }

    logger.info('venue.session.created', {
      session_code: session.session_code,
      venue_code: session.venue_code,
      operator_id,
      terminal_device: terminal_device_id
    });

    res.status(201).json(session);

  } catch (error) {
    logger.error('venue.session.create.error', {
      venue_code,
      operator_id,
      error: (error as Error).message
    });

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create venue session'
    });
  }
});

/**
 * @swagger
 * /venue/scan:
 *   post:
 *     summary: Enhanced venue scanning with fraud prevention (PRD-003)
 *     description: Validates QR tokens with cross-terminal fraud detection and venue-specific analytics
 *     tags: [Venue Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qr_token
 *               - function_code
 *               - session_code
 *             properties:
 *               qr_token:
 *                 type: string
 *                 description: JWT QR token from ticket
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               function_code:
 *                 type: string
 *                 description: Function being redeemed
 *                 enum: [ferry_boarding, gift_redemption, playground_token]
 *                 example: "ferry_boarding"
 *               session_code:
 *                 type: string
 *                 description: Active venue session code
 *                 example: "VS-1699123456789-abc123def"
 *               terminal_device_id:
 *                 type: string
 *                 description: Physical terminal device identifier
 *                 example: "TERMINAL-CP-001"
 *     responses:
 *       200:
 *         description: Scan processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   enum: [success, reject]
 *                   example: "success"
 *                 ticket_status:
 *                   type: string
 *                   example: "active"
 *                 entitlements:
 *                   type: array
 *                   items:
 *                     type: object
 *                   example: [{"function_code": "ferry_boarding", "remaining_uses": 999}]
 *                 remaining_uses:
 *                   type: integer
 *                   example: 999
 *                 venue_info:
 *                   type: object
 *                   properties:
 *                     venue_code:
 *                       type: string
 *                       example: "central-pier"
 *                     venue_name:
 *                       type: string
 *                       example: "Central Pier Terminal"
 *                     terminal_device:
 *                       type: string
 *                       example: "TERMINAL-CP-001"
 *                 performance_metrics:
 *                   type: object
 *                   properties:
 *                     response_time_ms:
 *                       type: integer
 *                       example: 156
 *                     fraud_checks_passed:
 *                       type: boolean
 *                       example: true
 *                 ts:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-11-04T12:34:56.789Z"
 *       422:
 *         description: Validation failed (fraud detected, expired token, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   example: "reject"
 *                 reason:
 *                   type: string
 *                   example: "ALREADY_REDEEMED"
 *                 performance_metrics:
 *                   type: object
 *                 ts:
 *                   type: string
 */
router.post('/scan', async (req, res) => {
  const { qr_token, function_code, session_code, terminal_device_id } = req.body;

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
      sessionCode: session_code,
      terminalDeviceId: terminal_device_id
    });

    // Return appropriate HTTP status based on result
    const statusCode = result.result === 'success' ? 200 : 422;
    res.status(statusCode).json(result);

  } catch (error) {
    logger.error('venue.scan.error', {
      function_code,
      terminal_device: terminal_device_id,
      error: (error as Error).message
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
 *         description: Analytics time window in hours
 *         example: 24
 *     responses:
 *       200:
 *         description: Venue analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 venue_code:
 *                   type: string
 *                   example: "central-pier"
 *                 period:
 *                   type: object
 *                   properties:
 *                     hours:
 *                       type: integer
 *                       example: 24
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     total_scans:
 *                       type: integer
 *                       example: 1250
 *                     successful_scans:
 *                       type: integer
 *                       example: 1195
 *                     fraud_attempts:
 *                       type: integer
 *                       example: 3
 *                     success_rate:
 *                       type: number
 *                       example: 95.6
 *                     fraud_rate:
 *                       type: number
 *                       example: 0.24
 *                     function_breakdown:
 *                       type: object
 *                       properties:
 *                         ferry_boarding:
 *                           type: integer
 *                           example: 800
 *                         gift_redemption:
 *                           type: integer
 *                           example: 250
 *                         playground_token:
 *                           type: integer
 *                           example: 145
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

export default router;