import { Router } from 'express';
import { operatorService } from './service';

const router = Router();

// POST /operators/login - Operator login
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

export default router;