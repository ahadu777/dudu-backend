import { Router } from 'express';
import { operatorService } from './service';
import { OperatorValidationController } from '../operatorValidation/controller';

const router = Router();
const validationController = new OperatorValidationController();

// POST /operators/login - Operator login (existing system)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Username and password are required'
    });
  }

  try {
    const result = await operatorService.login({ username, password });

    if (!result) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password'
      });
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Login failed'
    });
  }
});

// ========================================
// Week 3: Ticket Validation & Verification (PRD-006)
// ========================================

/**
 * POST /operators/auth - Enhanced operator authentication with session management
 * Body: {operator_id: string, password: string, terminal_id: string, orq: number}
 */
router.post('/auth', (req, res) => validationController.login(req, res));

/**
 * POST /operators/validate-ticket - Validate ticket via QR scan
 * Returns color-coded validation result (GREEN/YELLOW/RED)
 * Body: {ticket_number: string, operator_id: string, terminal_id: string, orq: number}
 */
router.post('/validate-ticket', (req, res) => validationController.validateTicket(req, res));

/**
 * POST /operators/verify-ticket - Verify ticket entry (mark as verified)
 * Body: {ticket_number: string, operator_id: string, terminal_id: string, validation_decision: 'ALLOW'|'DENY', orq: number}
 */
router.post('/verify-ticket', (req, res) => validationController.verifyTicket(req, res));

export default router;