/**
 * LMS Router
 * RESTful API endpoints for Loan Management System
 */

import { Router, Request, Response } from 'express';
import { lmsService } from './service';
import { CreateBorrowerRequest, CreateApplicationRequest } from './types';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============ Borrower Endpoints ============

/**
 * POST /lms/borrowers
 * Register a new borrower
 */
router.post('/borrowers', async (req: Request, res: Response) => {
  const requestId = uuidv4();
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  try {
    const body = req.body as CreateBorrowerRequest;

    // Validate required fields
    if (!body.first_name || !body.last_name || !body.email || !body.ssn || !body.date_of_birth || !body.address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: first_name, last_name, email, ssn, date_of_birth, address',
        request_id: requestId
      });
    }

    // Validate SSN format (9 digits)
    if (!/^\d{9}$/.test(body.ssn)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid SSN format. Must be 9 digits.',
        request_id: requestId
      });
    }

    const borrower = await lmsService.createBorrower(body, idempotencyKey);

    logger.info('lms.api.borrower.created', { request_id: requestId, borrower_id: borrower.id });

    res.status(201).json({
      success: true,
      data: borrower,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.borrower.create.failed', { request_id: requestId, error: message });

    if (message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: message,
        request_id: requestId
      });
    }

    res.status(500).json({
      success: false,
      error: message,
      request_id: requestId
    });
  }
});

/**
 * GET /lms/borrowers
 * List all borrowers
 */
router.get('/borrowers', (_req: Request, res: Response) => {
  const borrowers = lmsService.listBorrowers();

  res.json({
    success: true,
    data: borrowers,
    meta: { total: borrowers.length }
  });
});

/**
 * GET /lms/borrowers/:id
 * Get a specific borrower
 */
router.get('/borrowers/:id', (req: Request, res: Response) => {
  const borrower = lmsService.getBorrower(req.params.id);

  if (!borrower) {
    return res.status(404).json({
      success: false,
      error: 'Borrower not found'
    });
  }

  res.json({
    success: true,
    data: borrower
  });
});

// ============ KYC Endpoints ============

/**
 * POST /lms/borrowers/:id/kyc
 * Run KYC verification
 */
router.post('/borrowers/:id/kyc', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const { ssn } = req.body;

    if (!ssn || !/^\d{9}$/.test(ssn)) {
      return res.status(400).json({
        success: false,
        error: 'Valid SSN required (9 digits)',
        request_id: requestId
      });
    }

    const result = await lmsService.verifyKYC(req.params.id, ssn);

    logger.info('lms.api.kyc.verified', {
      request_id: requestId,
      borrower_id: req.params.id,
      status: result.status
    });

    res.json({
      success: true,
      data: result,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.kyc.failed', { request_id: requestId, error: message });

    if (message === 'Borrower not found') {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

/**
 * GET /lms/borrowers/:id/kyc
 * Get KYC status
 */
router.get('/borrowers/:id/kyc', (req: Request, res: Response) => {
  const borrower = lmsService.getBorrower(req.params.id);
  if (!borrower) {
    return res.status(404).json({ success: false, error: 'Borrower not found' });
  }

  const result = lmsService.getKYCStatus(req.params.id);

  res.json({
    success: true,
    data: result || { status: 'pending', message: 'KYC verification not yet performed' }
  });
});

// ============ AML Endpoints ============

/**
 * POST /lms/borrowers/:id/aml
 * Run AML screening
 */
router.post('/borrowers/:id/aml', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const result = await lmsService.screenAML(req.params.id);

    logger.info('lms.api.aml.screened', {
      request_id: requestId,
      borrower_id: req.params.id,
      status: result.status
    });

    res.json({
      success: true,
      data: result,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.aml.failed', { request_id: requestId, error: message });

    if (message === 'Borrower not found') {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

/**
 * GET /lms/borrowers/:id/aml
 * Get AML status
 */
router.get('/borrowers/:id/aml', (req: Request, res: Response) => {
  const borrower = lmsService.getBorrower(req.params.id);
  if (!borrower) {
    return res.status(404).json({ success: false, error: 'Borrower not found' });
  }

  const result = lmsService.getAMLStatus(req.params.id);

  res.json({
    success: true,
    data: result || { status: 'pending', message: 'AML screening not yet performed' }
  });
});

// ============ Credit Endpoints ============

/**
 * POST /lms/borrowers/:id/credit
 * Pull credit report
 */
router.post('/borrowers/:id/credit', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const { ssn, pull_type = 'soft' } = req.body;

    if (!ssn || !/^\d{9}$/.test(ssn)) {
      return res.status(400).json({
        success: false,
        error: 'Valid SSN required (9 digits)',
        request_id: requestId
      });
    }

    const report = await lmsService.pullCredit(req.params.id, ssn, pull_type);

    logger.info('lms.api.credit.pulled', {
      request_id: requestId,
      borrower_id: req.params.id,
      score: report.credit_score
    });

    res.json({
      success: true,
      data: report,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.credit.failed', { request_id: requestId, error: message });

    if (message === 'Borrower not found') {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

/**
 * GET /lms/borrowers/:id/credit
 * Get latest credit report
 */
router.get('/borrowers/:id/credit', (req: Request, res: Response) => {
  const borrower = lmsService.getBorrower(req.params.id);
  if (!borrower) {
    return res.status(404).json({ success: false, error: 'Borrower not found' });
  }

  const report = lmsService.getCreditReport(req.params.id);

  if (!report) {
    return res.json({
      success: true,
      data: null,
      message: 'No credit report on file'
    });
  }

  res.json({
    success: true,
    data: report
  });
});

// ============ Application Endpoints ============

/**
 * POST /lms/applications
 * Create a loan application
 */
router.post('/applications', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const body = req.body as CreateApplicationRequest;

    // Validate required fields
    if (!body.borrower_id || !body.loan_type || !body.requested_amount || !body.requested_term_months) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        request_id: requestId
      });
    }

    const application = await lmsService.createApplication(body);

    logger.info('lms.api.application.created', {
      request_id: requestId,
      application_id: application.id
    });

    res.status(201).json({
      success: true,
      data: application,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.application.create.failed', { request_id: requestId, error: message });

    if (message === 'Borrower not found') {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    if (message.includes('required') || message.includes('must be')) {
      return res.status(400).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

/**
 * GET /lms/applications/:id
 * Get a loan application
 */
router.get('/applications/:id', (req: Request, res: Response) => {
  const application = lmsService.getApplication(req.params.id);

  if (!application) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  res.json({
    success: true,
    data: application
  });
});

// ============ Decision Endpoints ============

/**
 * POST /lms/applications/:id/decision
 * Run automated credit decision
 */
router.post('/applications/:id/decision', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const decision = await lmsService.runDecision(req.params.id);

    logger.info('lms.api.decision.made', {
      request_id: requestId,
      application_id: req.params.id,
      decision: decision.decision
    });

    res.json({
      success: true,
      data: decision,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.decision.failed', { request_id: requestId, error: message });

    if (message.includes('not found')) {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    if (message.includes('required')) {
      return res.status(400).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

// ============ Offer Endpoints ============

/**
 * GET /lms/applications/:id/offers
 * Get offers for an application
 */
router.get('/applications/:id/offers', (req: Request, res: Response) => {
  const application = lmsService.getApplication(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const offers = lmsService.getOffers(req.params.id);

  res.json({
    success: true,
    data: offers,
    meta: { total: offers.length }
  });
});

/**
 * POST /lms/offers/:id/accept
 * Accept a loan offer
 */
router.post('/offers/:id/accept', async (req: Request, res: Response) => {
  const requestId = uuidv4();

  try {
    const offer = await lmsService.acceptOffer(req.params.id);

    logger.info('lms.api.offer.accepted', {
      request_id: requestId,
      offer_id: req.params.id
    });

    res.json({
      success: true,
      data: offer,
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('lms.api.offer.accept.failed', { request_id: requestId, error: message });

    if (message === 'Offer not found') {
      return res.status(404).json({ success: false, error: message, request_id: requestId });
    }

    res.status(500).json({ success: false, error: message, request_id: requestId });
  }
});

// ============ Audit Endpoints ============

/**
 * GET /lms/audit
 * Get audit log
 */
router.get('/audit', (req: Request, res: Response) => {
  const { entity_type, entity_id } = req.query;

  const entries = lmsService.getAuditLog({
    entity_type: entity_type as string | undefined,
    entity_id: entity_id as string | undefined
  });

  res.json({
    success: true,
    data: entries,
    meta: { total: entries.length }
  });
});

// ============ Admin Endpoints ============

/**
 * GET /lms/stats
 * Get LMS statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: lmsService.getStats()
  });
});

/**
 * POST /lms/reset
 * Reset LMS store (for testing)
 */
router.post('/reset', (_req: Request, res: Response) => {
  lmsService.reset();

  res.json({
    success: true,
    message: 'LMS store reset successfully'
  });
});

// ============ Health Check ============

/**
 * GET /lms/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'lms',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;



