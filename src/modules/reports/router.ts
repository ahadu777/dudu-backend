import { Router } from 'express';

const router = Router();

// GET /reports/redemptions - Get redemption reports
router.get('/redemptions', (_req, res) => {
  // TODO: Team C - Implement redemption reporting
  res.json({ events: [] });
});

export default router;