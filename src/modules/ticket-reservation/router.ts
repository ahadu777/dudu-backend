import { Router } from 'express';
import { TicketReservationController } from './controller';
import { TicketReservationService } from './service';

const router = Router();
const service = new TicketReservationService(); // Using mock mode by default
const controller = new TicketReservationController(service);

// ========================================
// Customer Reservation Routes
// ========================================

/**
 * POST /api/tickets/validate
 * Validate ticket code before reservation
 */
router.post('/api/tickets/validate', (req, res) => controller.validateTicket(req, res));

/**
 * GET /api/reservation-slots/available
 * Get available reservation slots
 */
router.get('/api/reservation-slots/available', (req, res) => controller.getAvailableSlots(req, res));

/**
 * POST /api/reservations/create
 * Create reservation for ticket
 */
router.post('/api/reservations/create', (req, res) => controller.createReservation(req, res));

// ========================================
// Operator Validation Routes (DISABLED - Using operatorValidation module with Week 2 integration)
// ========================================

/**
 * POST /api/operator/validate-ticket
 * Validate ticket for venue entry
 * NOTE: These routes are now handled by the operatorValidation module
 * which integrates with Week 2 customerReservation and reservation-slots services
 */
// router.post('/api/operator/validate-ticket', (req, res) => controller.operatorValidateTicket(req, res));

/**
 * POST /api/operator/verify-ticket
 * Mark ticket as verified (allow entry)
 */
// router.post('/api/operator/verify-ticket', (req, res) => controller.operatorVerifyTicket(req, res));

export default router;
