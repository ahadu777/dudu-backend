import { Router } from 'express';

const router = Router();

// POST /tickets/:code/qr-token - Generate QR token
router.post('/:code/qr-token', (_req, res) => {
  // TODO: Team B - Implement QR token generation
  res.json({ token: 'mock.jwt', expires_in: 60 });
});

// POST /tickets/scan - Scan and redeem ticket
router.post('/scan', (req, res) => {
  // TODO: Team C - Implement ticket scanning
  // Mock implementation for integration proof
  const { function_code } = req.body;

  // Simulate entitlements with remaining uses
  const mockEntitlements = [
    { function_code: 'ferry', remaining_uses: function_code === 'ferry' ? 0 : 1 },
    { function_code: 'bus', remaining_uses: 2 },
    { function_code: 'mrt', remaining_uses: 1 }
  ];

  res.json({
    result: 'success',
    ticket_status: 'active',
    entitlements: mockEntitlements,
    ts: new Date().toISOString()
  });
});

export default router;