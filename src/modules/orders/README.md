# Orders Module

**Owner:** Team A - Commerce

## Endpoints

- `POST /orders` - Create order with idempotency support
- `GET /orders/:id` - Get order details (TODO)
- `POST /orders/:id/cancel` - Cancel order (TODO)

## Key Features

- Idempotent order creation using `(user_id, out_trade_no)` as unique key
- Inventory reservation with atomic transactions
- Event publishing on order creation
- Payload hash comparison for duplicate detection

## Events Published

- `orders.created` - Emitted after successful order creation
- `orders.paid` - Emitted after successful payment (TODO)

## Dependencies

- Products database for pricing
- Inventory database for stock management
- Event bus for cross-module communication