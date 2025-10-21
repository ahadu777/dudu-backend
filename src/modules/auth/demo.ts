import { Router, Request, Response } from 'express';
import { generateToken } from '../../middlewares/auth.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// POST /demo-token - Generate a demo JWT token for testing
router.post('/demo-token', (req: Request, res: Response) => {
  try {
    const { user_id = 123, email = 'john.doe@example.com' } = req.body;

    // Generate a real JWT token using our auth middleware
    const token = generateToken({ id: user_id, email });

    logger.info('demo.token.generated', { user_id, email });

    res.status(200).json({
      token,
      user_id,
      email,
      expires_in: '7d',
      message: 'Demo token generated successfully'
    });

  } catch (error) {
    logger.error('demo.token.error', { error: String(error) });
    res.status(500).json({
      code: 'TOKEN_GENERATION_FAILED',
      message: 'Failed to generate demo token'
    });
  }
});

export default router;