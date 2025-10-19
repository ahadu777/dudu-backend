import { Router } from 'express';
import { OrderController } from './controller';

const router = Router();
const orderController = new OrderController();

// POST /orders - Create order with idempotency
router.post('/', orderController.createOrder);

export default router;