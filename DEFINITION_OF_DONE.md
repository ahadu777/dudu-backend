# Definition of Done & Change Management

## What "Done" Actually Means

A feature is **DONE** when:

### ✅ Functional Requirements
1. **All card requirements implemented** - Every rule, invariant, and test case
2. **Endpoint works** - Returns correct status codes and data
3. **Idempotency works** - Duplicate requests handled gracefully
4. **Error cases handled** - All documented error scenarios return proper responses
5. **Logging complete** - Structured JSON logs for observability
6. **Metrics recorded** - Basic counters for monitoring

### ✅ Technical Requirements
1. **TypeScript compiles** - No build errors
2. **Server runs** - No runtime crashes
3. **Mock data updated** - Test data supports the feature
4. **Pattern consistent** - Follows existing code patterns

### ✅ Testing Requirements
1. **Manual test passes** - Curl commands work as expected
2. **Idempotency verified** - Second call returns same result
3. **Error cases tested** - Invalid inputs handled correctly

### ✅ Documentation Requirements
1. **Card status updated** - Marked as "Done" with timestamp
2. **Example provided** - Working curl command documented

## Current State: What's Actually DONE

### ✅ Completed Features (Tested & Working)

#### 1. GET /catalog
- **Status**: DONE
- **Test**:
```bash
curl http://localhost:8080/catalog
```
- **Returns**: List of active products with functions
- **Implements**: Card requirements including logging, metrics, sorting

#### 2. POST /orders
- **Status**: DONE
- **Test**:
```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":101,"qty":2}],"channel_id":1,"out_trade_no":"TEST-001","user_id":123}'
```
- **Returns**: Order ID with PENDING_PAYMENT status
- **Features**: Idempotent, inventory reservation, payload hash validation

#### 3. POST /payments/notify
- **Status**: DONE
- **Test**:
```bash
# First create order, then:
curl -X POST http://localhost:8080/payments/notify \
  -H "Content-Type: application/json" \
  -d '{"order_id":10001,"payment_status":"SUCCESS","paid_at":"2025-01-01T12:00:00Z","signature":"abc123"}'
```
- **Returns**: Success with ticket issuance
- **Features**: Synchronous ticket creation, rollback on failure, idempotent

#### 4. Ticket Issuance (Internal)
- **Status**: DONE
- **Type**: Internal service (not an endpoint)
- **Called by**: Payment webhook
- **Features**: Creates tickets with entitlements, unique codes, idempotent

## How to Handle User Story Changes

### When Requirements Change

#### 1. Identify the Impact
```bash
# See what's currently done
node scripts/progress-report.js

# Find affected modules
grep -r "affected_feature" src/modules/
```

#### 2. Update the Card
Edit `/docs/cards/<feature>.md`:
- Add new requirements
- Update status to "In Progress"
- Note what's changing in comments

#### 3. Modify Implementation

**For Small Changes** (same logic flow):
```bash
# Edit the module directly
vim src/modules/<name>/router.ts

# Rebuild and test
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
```

**For Large Changes** (different approach):
```bash
# Create new version
cp -r src/modules/orders src/modules/orders.v2

# Implement changes
# Switch when ready
```

#### 4. Test Thoroughly
```bash
# Test new requirements
curl [new endpoint or parameters]

# Verify old functionality still works
curl [existing tests]
```

#### 5. Update Documentation
- Update card with new "Done" timestamp
- Add new curl examples
- Note breaking changes if any

### Example: Adding a Field

**Scenario**: Add `customer_email` to order

1. **Update Card**:
```yaml
# In /docs/cards/order-create.md
## Request
{
  "items": [...],
  "customer_email": "user@example.com",  # NEW
  "out_trade_no": "..."
}
```

2. **Update Code**:
```typescript
// In src/modules/orders/service.ts
interface CreateOrderRequest {
  items: OrderItem[];
  customer_email?: string;  // NEW
  out_trade_no: string;
}

// In handler
const order = {
  ...existingFields,
  customer_email: request.customer_email || null  // NEW
};
```

3. **Test**:
```bash
npm run build
# Restart server
curl -X POST http://localhost:8080/orders \
  -d '{"customer_email":"test@example.com",...}'
```

### Example: Changing Business Logic

**Scenario**: Change from sync to async ticket issuance

1. **Create New Card**:
```bash
cp docs/cards/tickets-issuance.md docs/cards/tickets-issuance-async.md
# Edit to describe async behavior
```

2. **Keep Old Code**:
```typescript
// Rename existing
mv src/modules/tickets/service.ts src/modules/tickets/service.sync.ts
```

3. **Implement New**:
```typescript
// src/modules/tickets/service.ts
import { publish } from '../../core/events/bus';

async issueTicketsAsync(orderId: number) {
  // Publish event instead
  await publish('orders.paid', { orderId });
}
```

4. **Feature Flag** (optional):
```typescript
const useAsync = process.env.ASYNC_TICKETS === 'true';
if (useAsync) {
  await ticketService.issueTicketsAsync(orderId);
} else {
  await ticketService.issueTicketsForPaidOrder(orderId);
}
```

## Tracking Changes

### Version in Cards
```yaml
---
card: "Order create (idempotent)"
version: 2  # Increment on changes
changelog:
  - v2: Added customer_email field
  - v1: Initial implementation
---
```

### Version in Code
```typescript
// src/modules/orders/router.ts
/**
 * Order Creation API
 * @version 2.0
 * @changelog
 * - v2.0: Added customer_email support
 * - v1.0: Initial idempotent implementation
 */
```

## What's NOT Done Yet

### Pending Features (Cards exist but not implemented)
- GET /my/tickets - List user's tickets
- POST /tickets/:code/qr-token - Generate QR codes
- POST /operators/login - Gate operator authentication
- POST /validators/sessions - Session management
- POST /tickets/scan - QR code scanning
- GET /reports/redemptions - Redemption reporting

### Missing Components
- Real database (using mock)
- Authentication (no JWT yet)
- Real payment gateway integration
- QR code generation
- Push notifications
- Email notifications

## Quick Status Check

```bash
# What's implemented?
ls -la src/modules/

# What endpoints work?
curl http://localhost:8080/healthz
curl http://localhost:8080/catalog
curl -X POST http://localhost:8080/orders -d '...'
curl -X POST http://localhost:8080/payments/notify -d '...'

# What's the card status?
grep -h "^status:" docs/cards/*.md | sort | uniq -c

# Full report
node scripts/progress-report.js
```

## Remember

**"Done" means**:
1. It works (tested with curl)
2. It handles errors (won't crash)
3. It's idempotent (safe to retry)
4. It's logged (observable)
5. Card is updated (status: Done)

**"Done" does NOT mean**:
- Perfect code
- 100% test coverage
- Production ready
- Fully optimized
- Feature complete

We're building an MVP - "Done" means it works reliably for the happy path and handles basic error cases.