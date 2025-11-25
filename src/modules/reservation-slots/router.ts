import { Router } from 'express';
import { ReservationSlotController } from './controller';

const router = Router();
const controller = new ReservationSlotController();

/**
 * Operator Slot Management Endpoints
 */

/**
 * @route POST /api/operator/slots/create
 * @description Create new reservation slot
 * @access Operator
 * @body {venue_id: number, date: string, start_time: string, end_time: string, total_capacity: number, orq: number}
 */
router.post('/operator/slots/create', (req, res) => controller.createSlot(req, res));

/**
 * @route PUT /api/operator/slots/:slot_id
 * @description Update existing slot (capacity or status)
 * @access Operator
 * @params slot_id (UUID)
 * @body {total_capacity?: number, status?: SlotStatus}
 */
router.put('/operator/slots/:slot_id', (req, res) => controller.updateSlot(req, res));

/**
 * @route DELETE /api/operator/slots/:slot_id
 * @description Delete or close slot
 * @access Operator
 * @params slot_id (UUID)
 */
router.delete('/operator/slots/:slot_id', (req, res) => controller.deleteSlot(req, res));

/**
 * @route GET /api/operator/slots
 * @description List slots with filters
 * @access Operator
 * @query venue_id, date_from, date_to, status, orq
 */
router.get('/operator/slots', (req, res) => controller.getSlots(req, res));

/**
 * Customer Slot Availability Endpoint
 */

/**
 * @route GET /api/reservation-slots/available
 * @description Get available slots for customer reservation
 * @access Public
 * @query month (YYYY-MM), orq, venue_id (optional)
 */
router.get('/reservation-slots/available', (req, res) => controller.getAvailableSlots(req, res));

export default router;
