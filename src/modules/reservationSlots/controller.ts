import { Request, Response } from 'express';
import { ReservationSlotsServiceMock } from './service.mock';
import { GetSlotsQuery } from './types';
import { logger } from '../../utils/logger';

export class ReservationSlotsController {
  private service: ReservationSlotsServiceMock;

  constructor() {
    this.service = new ReservationSlotsServiceMock();
  }

  /**
   * GET /api/reservation-slots/available
   * Returns available slots for calendar display with capacity status
   */
  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { month, date, orq } = req.query;

      // Validate required parameter
      if (!orq) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: orq',
        });
        return;
      }

      // Validate month format if provided
      if (month && typeof month === 'string' && !/^\d{4}-\d{2}$/.test(month)) {
        res.status(400).json({
          success: false,
          error: 'Invalid month format. Expected YYYY-MM',
        });
        return;
      }

      // Validate date format if provided
      if (date && typeof date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD',
        });
        return;
      }

      const query: GetSlotsQuery = {
        month: month as string | undefined,
        date: date as string | undefined,
        orq: parseInt(orq as string, 10),
      };

      const slots = await this.service.getAvailableSlots(query);

      // Calculate metadata
      const uniqueDates = new Set(slots.map(s => s.date)).size;
      const queryMonth = month || new Date().toISOString().substring(0, 7);

      res.status(200).json({
        success: true,
        data: slots,
        metadata: {
          month: queryMonth,
          total_slots: slots.length,
          unique_dates: uniqueDates,
        },
      });

      logger.info('slots.api.retrieved', {
        query,
        slot_count: slots.length,
        unique_dates: uniqueDates,
      });
    } catch (error) {
      logger.error('slots.api.error', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve slots',
      });
    }
  }
}
