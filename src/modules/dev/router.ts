import { Router } from 'express';
import { authenticateOperator } from '../../middlewares/auth';
import { mockStore } from '../../core/mock/store';
import { logger } from '../../utils/logger';

const router = Router();

// POST /dev/reset - reset in-memory mock data to initial seed
router.post('/reset', authenticateOperator, (req, res) => {
  try {
    mockStore.resetAll();
    const stats = mockStore.getStats();
    logger.info('dev.reset.success', stats as any);
    res.json({ result: 'ok', message: 'Mock data reset to seed', stats });
  } catch (error) {
    logger.error('dev.reset.error', { error: String(error) });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Reset failed' });
  }
});

export default router;

