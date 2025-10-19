# Project Context for AI Collaboration

## Project Overview
**Name:** Ticketing API System
**Type:** Multi-squad modular Express TypeScript API
**Database:** MySQL (using mock data during development)
**Port:** 8080
**Environment:** Development (no DB required for mock mode)

## Architecture
```
src/
  modules/        # Squad-owned modules
    catalog/      # Team A - Product catalog
    orders/       # Team A - Order management
    payments/     # Team A - Payment processing
    tickets/      # Team B - Ticket issuance
    operators/    # Team C - Gate operations
    redeem/       # Team C - Ticket redemption
    reports/      # Team C - Reporting
  core/
    mock/data.ts  # Centralized mock data store
    events/       # Event bus for module communication
    errors/       # Centralized error codes
```

## Key Implementation Details

### Mock Data Store (`src/core/mock/data.ts`)
- **Products:** 5 seeded (101-105), 4 active
- **Orders:** In-memory map keyed by `userId-outTradeNo`
- **Tickets:** In-memory storage with entitlements
- **Inventory:** Real-time tracking (sellable, reserved, sold)

### Event System
- **Pub/Sub:** `publish(topic, event)` / `subscribe(topic, handler)`
- **Events:**
  - `orders.created` → Published after order creation
  - `orders.paid` → Published after payment (TODO)
  - `tickets.assigned` → Published after issuance (TODO)

### Error Handling
- Centralized error codes in `src/core/errors/codes.ts`
- HTTP status mapping via `ERROR_STATUS_MAP`
- Standard format: `{ code: ERR.*, message: string }`

## Current Implementation Status

### Completed Endpoints
1. **GET /healthz** - Health check (always 200)
2. **GET /version** - Version info
3. **GET /catalog** - Returns 4 active products with inventory
4. **POST /orders** - Idempotent creation with reservation

### Mock Services Active
- `OrderService` uses `service.centralized.ts` (mock mode)
- `CatalogRouter` returns mock product data
- No database connection required

## Testing Commands
```bash
# Health check
curl http://localhost:8080/healthz

# Get catalog
curl http://localhost:8080/catalog

# Create order (idempotent)
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"TEST-001"}'
```

## Development Workflow

### For Implementing AI
1. Read `/docs/IMPLEMENTATION_PLAYBOOK.md` for process
2. Check card status in `/docs/cards/<slug>.md`
3. Use mock data store for all data operations
4. Update card frontmatter when status changes
5. Emit events as specified in cards

### For Managing AI
1. Track progress via `/docs/cards/*.md` frontmatter
2. Check `status` field: Ready → In Progress → PR → Done
3. Monitor blocking issues in cards
4. Assign next cards based on dependencies

## File Patterns
- **Routes:** `src/modules/<module>/router.ts`
- **Services:** `src/modules/<module>/service.ts`
- **Types:** `src/modules/<module>/types.ts`
- **Cards:** `/docs/cards/<slug>.md`
- **Migrations:** `/migrations/*.sql`

## Important Notes
- Server runs without database (mock mode active)
- All data persists in memory during session
- Use `mockDataStore.reset()` to clear test data
- Events are synchronous in current implementation

## Next Implementation Priority
1. Payment webhook (Team A) - Mark paid, commit inventory
2. Ticket issuance (Team B) - Subscribe to orders.paid
3. Operator endpoints (Team C) - Login and sessions