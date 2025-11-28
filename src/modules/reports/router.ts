import { Router } from 'express';
import { AppDataSource } from '../../config/database';
import { VenueRepository } from '../venue/domain/venue.repository';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * @swagger
 * /reports/redemptions:
 *   get:
 *     tags: [Reports]
 *     summary: List redemption events for reporting
 *     description: Query redemption events with optional filters for time range, function code, and venue
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of time range (ISO 8601 format)
 *         example: "2025-11-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of time range (ISO 8601 format)
 *         example: "2025-11-28T23:59:59Z"
 *       - in: query
 *         name: function
 *         schema:
 *           type: string
 *           enum: [ferry_boarding, gift_redemption, playground_token]
 *         description: Filter by function/entitlement type
 *       - in: query
 *         name: venue_id
 *         schema:
 *           type: integer
 *         description: Filter by venue ID
 *       - in: query
 *         name: result
 *         schema:
 *           type: string
 *           enum: [success, reject]
 *         description: Filter by redemption result
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of events to return (max 1000)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip for pagination
 *     responses:
 *       200:
 *         description: Redemption events list
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
 *                   description: Total number of matching events
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/redemptions', async (req, res) => {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    const functionCode = req.query.function as string | undefined;
    const venueIdStr = req.query.venue_id as string | undefined;
    const result = req.query.result as 'success' | 'reject' | undefined;
    const limitStr = req.query.limit as string | undefined;
    const offsetStr = req.query.offset as string | undefined;

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

    // Parse pagination
    let limit = parseInt(limitStr || '100', 10);
    let offset = parseInt(offsetStr || '0', 10);

    // Enforce limits
    if (isNaN(limit) || limit < 1) limit = 100;
    if (limit > 1000) limit = 1000;
    if (isNaN(offset) || offset < 0) offset = 0;

    logger.info('reports.redemptions.query', {
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
      logger.info('reports.redemptions.mock_mode', { message: 'Database not initialized, returning empty results' });
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
    const responseEvents = events.map(event => ({
      event_id: event.event_id,
      ticket_code: event.ticket_code,
      function_code: event.function_code,
      venue_id: event.venue_id,
      venue_name: event.venue?.venue_name || null,
      operator_id: event.operator_id,
      session_code: event.session_code,
      result: event.result,
      reason: event.reason || null,
      remaining_uses_after: event.remaining_uses_after,
      ts: event.redeemed_at.toISOString()
    }));

    logger.info('reports.redemptions.success', {
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
    logger.error('reports.redemptions.error', {
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

export default router;
