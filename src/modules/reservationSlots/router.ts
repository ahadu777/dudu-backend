import { Router } from 'express';
import { ReservationSlotsController } from './controller';

const router = Router();
const controller = new ReservationSlotsController();

/**
 * @route GET /api/reservation-slots/available
 * @description Get available reservation slots for calendar display
 * @query month - YYYY-MM format (optional, defaults to current month)
 * @query date - YYYY-MM-DD format (optional, filters to specific date)
 * @query orq - Organization ID (required)
 * @returns {SlotWithCapacityStatus[]} Array of slots with capacity status
 */
router.get('/available', (req, res) => controller.getAvailableSlots(req, res));

export default router;
