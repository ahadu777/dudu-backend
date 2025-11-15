import { Router } from 'express';
import { CustomerReservationController } from './controller';

const router = Router();
const controller = new CustomerReservationController();

/**
 * @route POST /api/tickets/validate
 * @description Validate ticket eligibility for reservation
 * @body {ticket_number: string, orq: number}
 * @returns {TicketValidationResponse}
 */
router.post('/tickets/validate', (req, res) => controller.validateTicket(req, res));

/**
 * @route POST /api/tickets/verify-contact
 * @description Verify visitor contact information
 * @body {ticket_number: string, visitor_name: string, visitor_phone: string, orq: number}
 * @returns {VerifyContactResponse}
 */
router.post('/tickets/verify-contact', (req, res) => controller.verifyContact(req, res));

/**
 * @route POST /api/reservations/create
 * @description Create reservation for ticket and time slot
 * @body {ticket_number: string, slot_id: number, visitor_name: string, visitor_phone: string, orq: number}
 * @returns {CreateReservationResponse}
 */
router.post('/reservations/create', (req, res) => controller.createReservation(req, res));

export default router;
