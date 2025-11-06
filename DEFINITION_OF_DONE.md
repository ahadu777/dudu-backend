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
5. **Database queries validated** - All repository queries checked for:
   - Correct use of TypeORM operators (In(), Like(), etc.)
   - No undefined where clauses that bypass filtering
   - Array parameters properly handled (use In() for arrays)
   - Query result matches expected filter criteria

### ✅ Testing Requirements
1. **Manual test passes** - Curl commands work as expected
2. **Idempotency verified** - Second call returns same result
3. **Error cases tested** - Invalid inputs handled correctly
4. **Parameter variations tested** - All parameter combinations work correctly:
   - Single values vs arrays/lists
   - Empty/null vs populated
   - Optional vs required parameters
   - Query string variations (single value, comma-separated, etc.)
5. **Query result validation** - Database queries actually filter correctly:
   - Multi-value filters return only requested items (not all items)
   - Single-value filters return only matching item
   - Empty filters handled appropriately (all vs none)
6. **Edge cases beyond happy path**:
   - Boundary conditions (min/max values)
   - Array operations (empty array, single item, multiple items)
   - Database query edge cases (undefined where clauses, type mismatches)

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
6. **Parameter variations tested** (single vs multiple, empty vs populated)
7. **Database queries verified** (filters actually work, no undefined where clauses)

**"Done" does NOT mean**:
- Perfect code
- 100% test coverage
- Production ready
- Fully optimized
- Feature complete

We're building an MVP - "Done" means it works reliably for the happy path **and all parameter variations** and handles basic error cases.

## 🚨 Critical Testing Checklist

### For Endpoints with Query Parameters
- [ ] Test with single value: `?product_ids=106`
- [ ] Test with multiple values: `?product_ids=106,107,108`
- [ ] Test with empty parameter: `?product_ids=` (if allowed)
- [ ] Test without parameter: (no query string) (if optional)
- [ ] **Verify results match requested filters** - Don't return all items when filtering by specific IDs

### For Database Queries with Arrays
- [ ] Single value: `where: { id: value }` or `where: { id: In([value]) }`
- [ ] Multiple values: `where: { id: In([value1, value2]) }` (NEVER use `undefined`)
- [ ] Empty array: Handle appropriately (return empty or error)
- [ ] **Code review**: Check for conditional `undefined` in where clauses (common bug pattern)

### Bug Pattern to Watch For
```typescript
// ❌ BAD - Returns all items when array.length > 1
where: { product_id: productIds.length === 1 ? productIds[0] : undefined }

// ✅ GOOD - Always filters correctly
where: { product_id: In(productIds) }
```

## 🔒 Security Standards (PRD-003)

### Input Validation Requirements
- [ ] **Email validation**: Reject invalid email formats (regex validation)
- [ ] **HTML sanitization**: Strip or reject HTML tags in user inputs (prevent XSS)
- [ ] **String length limits**: Enforce maximum lengths (customer_name: 200, email: 255, etc.)
- [ ] **Integer validation**: Reject floats for integer fields (product_id, quantity)
- [ ] **Content-Type validation**: Require `application/json` for POST/PUT/PATCH
- [ ] **JSON parsing errors**: Handle malformed JSON gracefully

### Security Checklist
- [ ] **SQL Injection prevention**: Use parameterized queries (TypeORM handles this)
- [ ] **XSS prevention**: Sanitize/reject HTML tags in inputs
- [ ] **Rate limiting**: Implement per-session/operator rate limits (200 req/min for scanning)
- [ ] **Authentication**: JWT verification for QR tokens
- [ ] **Authorization**: Venue session validation
- [ ] **Error messages**: Don't leak sensitive information (database errors, internal paths)

### Security Test Cases
- [ ] XSS injection attempts rejected
- [ ] SQL injection attempts prevented
- [ ] Email format validated
- [ ] Integer fields reject floats
- [ ] String length limits enforced
- [ ] Rate limiting enforced

## 🔄 Transaction & Concurrency Requirements (PRD-003)

### Transaction Safety
- [ ] **Atomic operations**: Critical flows wrapped in database transactions
- [ ] **Pessimistic locking**: Use `SELECT FOR UPDATE` for JTI duplicate checks
- [ ] **Rollback on error**: All database errors cause transaction rollback
- [ ] **No partial state**: Failed operations don't leave inconsistent data

### Concurrency Control
- [ ] **Race condition prevention**: Concurrent scans of same QR token handled correctly
- [ ] **JTI duplicate detection**: Pessimistic lock prevents duplicate redemptions
- [ ] **Connection pool**: Configured appropriately (default: 10, production: 20+)
- [ ] **Deadlock prevention**: Transaction ordering prevents deadlocks

### Transaction Test Cases
- [ ] Concurrent scanning: Same QR scanned simultaneously → only one succeeds
- [ ] Transaction rollback: Database error during redemption → no partial state
- [ ] JTI locking: Pessimistic lock prevents race conditions

## ⚡ Performance Requirements (PRD-003)

### Response Time Requirements
- [ ] **Mean response time**: <1000ms
- [ ] **95th percentile**: <2000ms
- [ ] **Maximum response time**: <3000ms
- [ ] **JTI lookup**: <100ms (indexed query)

### Throughput Requirements
- [ ] **Scanning capacity**: 1000+ scans/hour
- [ ] **Concurrent operators**: Support 10+ simultaneous operators
- [ ] **Error rate**: <1% under load

### Performance Optimization Checklist
- [ ] **Database indexes**: Created for frequently queried columns (jti, ticket_code, function_code)
- [ ] **Query optimization**: No N+1 queries, efficient joins
- [ ] **Connection pooling**: Configured appropriately
- [ ] **Response compression**: Enabled (gzip)
- [ ] **Logging optimization**: Non-blocking, structured logging
- [ ] **Caching**: Implemented where appropriate (venue data, function mappings)

### Performance Test Cases
- [ ] Response time validation: 100 scans, 95% <2 seconds
- [ ] Throughput validation: 1000+ scans/hour
- [ ] Concurrent operator scenarios: 10 operators scanning simultaneously
- [ ] Connection pool stress test: 50 concurrent requests

## 📋 Business Logic Validation Requirements (PRD-003)

### Multi-Function Package Validation
- [ ] **UNLIMITED functions** (ferry_boarding): Always allow, don't check remaining_uses, don't decrement
- [ ] **SINGLE_USE functions** (gift_redemption): Check redemption history (not remaining_uses), reject if already redeemed
- [ ] **COUNTED functions** (playground_token): Check remaining_uses, decrement on success
- [ ] **Function code translation**: Product codes mapped to PRD-003 standard codes

### Location-Specific Validation
- [ ] **Venue function support**: Check venue supports requested function code
- [ ] **Location restrictions**: Validate location-specific rules (e.g., tea_set only at cheung-chau)
- [ ] **Cross-terminal prevention**: Single-use functions checked globally (not per-venue)

### Business Logic Test Cases
- [ ] Unlimited ferry boarding: 5 scans, all succeed, no decrement
- [ ] Single-use gift: First succeeds, second fails with ALREADY_REDEEMED
- [ ] Counted tokens: 10 scans succeed, 11th fails with NO_REMAINING
- [ ] Cross-terminal gift: Redeem at central-pier, try cheung-chau, fails
- [ ] Location-specific: Tea set fails at central-pier, succeeds at cheung-chau

## Real Example: PRD-002 Bug (Commit e23c9b14b5ca687a4b2e3e22dd4df7c0b361508f)

**What was wrong**:
- Original code: `where: { product_id: productIds.length === 1 ? productIds[0] : undefined }`
- When `productIds = [106, 107, 108]`, the where clause became `undefined`
- Result: Query returned ALL products instead of filtering by requested IDs
- Impact: OTA inventory endpoint returned incorrect data for multi-product queries

**How to catch it**:
1. Test with multiple product IDs: `GET /api/ota/inventory?product_ids=106,107,108`
2. Verify response only contains products 106, 107, 108 (not all products)
3. Code review: Check for `undefined` in where clauses
4. Verify TypeORM `In()` operator is used for array filtering

**The fix**:
```typescript
// Fixed version
where: { product_id: In(productIds) }
```