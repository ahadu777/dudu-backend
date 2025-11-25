import { Router } from 'express';
import { OperatorValidationController } from './controller';

const router = Router();
const controller = new OperatorValidationController();

/**
 * @route POST /api/operator/login
 * @description Operator authentication
 * @body {operator_id: string, password: string, terminal_id: string, orq: number}
 * @returns {OperatorLoginResponse}
 */
router.post('/api/operator/login', (req, res) => controller.login(req, res));

/**
 * @route POST /api/operator/validate-ticket
 * @description Validate ticket via QR scan (returns color code)
 * @body {ticket_code: string, operator_id: string, terminal_id: string, orq: number}
 * @returns {ValidateTicketResponse}
 */
router.post('/api/operator/validate-ticket', (req, res) => controller.validateTicket(req, res));

/**
 * @route POST /api/operator/verify-ticket
 * @description Verify ticket entry (operator decision: ALLOW/DENY)
 * @body {ticket_code: string, operator_id: string, terminal_id: string, validation_decision: 'ALLOW'|'DENY', orq: number}
 * @returns {VerifyTicketResponse}
 */
router.post('/api/operator/verify-ticket', (req, res) => controller.verifyTicket(req, res));

export default router;
