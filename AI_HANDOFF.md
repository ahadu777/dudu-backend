# AI Handoff Documentation

## Quick Start for Implementing AI

### 1. Check Current State
```bash
# View project progress - THIS IS YOUR MAIN TOOL
node scripts/progress-report.js

# Check server status
curl http://localhost:8080/healthz

# Test existing endpoints
curl http://localhost:8080/catalog
curl http://localhost:8080/orders  # POST with body
curl http://localhost:8080/payments/notify  # POST with body
```

### 2. Key Files to Read First
- `/PROJECT_CONTEXT.md` - Full system overview
- `/docs/IMPLEMENTATION_PLAYBOOK.md` - How to implement cards
- `/src/core/mock/data.ts` - Mock data store (your data source)
- `/docs/cards/*.md` - Card status and requirements

### 3. PROVEN Card Implementation Workflow

#### Step 1: Read the card
Look for the card in `/docs/cards/<slug>.md` and check:
- `status` field (should be "Ready")
- Implementation requirements
- Rules & invariants
- Error cases

#### Step 2: Update status to "In Progress"
Edit the frontmatter in `/docs/cards/<slug>.md`:
```yaml
status: "In Progress"
last_update: "2025-10-19T22:30:00+0800"
```

#### Step 3: Implement using mock data
- Use `mockDataStore` from `/src/core/mock/data.ts`
- Create module in `/src/modules/<name>/`
- **IMPORTANT: Use synchronous calls, NOT events for MVP**
- Follow patterns in existing modules

#### Step 4: Build and restart server
```bash
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
sleep 3  # Wait for server to start
```

#### Step 5: Test your implementation
```bash
# Example: Create order then process payment
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":101,"qty":2}],"channel_id":1,"out_trade_no":"TEST-001","user_id":123}'

curl -X POST http://localhost:8080/payments/notify \
  -H "Content-Type: application/json" \
  -d '{"order_id":10001,"payment_status":"SUCCESS","paid_at":"2025-01-01T12:00:00Z","signature":"abc123"}'
```

#### Step 6: Update card status to "Done"
```yaml
status: "Done"
last_update: "2025-10-19T22:40:00+0800"
```

### 4. Current Mock Data Available

#### Products (4 active, 1 inactive)
- 101: DAYPASS-001 ($99) - Day Pass
- 102: VIP-001 ($299) - VIP Pass
- 103: FAMILY-001 ($350) - Family Package
- 104: STUDENT-001 ($59) - Student Pass
- 105: SEASON-001 ($599) - Season Pass (INACTIVE/SOLD OUT)

#### Mock Data Store Methods
```typescript
// Products
mockDataStore.getProduct(id)
mockDataStore.getActiveProducts()

// Orders
mockDataStore.createOrder(order)
mockDataStore.getOrder(userId, outTradeNo)
mockDataStore.updateOrderStatus(orderId, status, paidAt?)

// Inventory
mockDataStore.reserveInventory(productId, qty)
mockDataStore.commitInventory(productId, qty)
mockDataStore.releaseInventory(productId, qty)

// Tickets
mockDataStore.createTicket(ticket)
mockDataStore.getTicketsByUser(userId)
mockDataStore.getTicketByCode(code)
```

### 5. Architecture Approach (MVP)

**IMPORTANT: We use synchronous calls, not events for MVP**

Example flow:
1. Payment webhook receives notification
2. Updates order status to PAID
3. **Directly calls** `ticketService.issueTicketsForPaidOrder(orderId)`
4. Returns success/failure synchronously

This approach:
- Simpler to debug
- Easier rollback on failures
- Clear execution flow
- Better for MVP phase

### 6. Error Handling Pattern

Use centralized error codes:
```typescript
import { ERR } from '../../core/errors/codes';

throw {
  code: ERR.PRODUCT_NOT_FOUND,
  message: 'Product not found'
};
```

### 7. Testing Checklist

For each endpoint:
- [ ] Happy path works
- [ ] Idempotency works (if applicable)
- [ ] Error cases return correct status codes
- [ ] Events are published
- [ ] Mock data is updated correctly

## Successfully Implemented Features

### ✅ Payment Webhook (Team A)
**Card:** `/docs/cards/payment-webhook.md`
**Endpoint:** POST /payments/notify
**Implementation:**
1. Validates webhook signature
2. Finds order by ID (using `mockDataStore.getOrderById`)
3. Updates status to PAID
4. Commits inventory (reserved → sold)
5. **Synchronously calls** ticket issuance
6. Rollback on failure

### ✅ Ticket Issuance (Team B)
**Card:** `/docs/cards/tickets-issuance.md`
**Module:** Internal service (not an endpoint)
**Implementation:**
1. Creates tickets for each order item
2. Generates unique codes: `TKT-{orderId}-{itemIndex}-{ticketIndex}`
3. Creates entitlements from product functions
4. Idempotent via in-memory cache

### Priority 3 - Gate Operations (Team C)
**Cards:** Multiple endpoints needed
**Endpoints:**
- POST /operators/login - Operator authentication
- POST /venue/scan - QR scanning and redemption (replaces deprecated /tickets/scan)
- POST /qr/decrypt - Decrypt QR code for display
- GET /reports/redemptions - Redemption reporting

> **Note**: `/validators/sessions` deprecated. Use operator JWT auth instead.

## Command Reference

```bash
# Build TypeScript
npm run build

# Start server (if not running)
PORT=8080 npm start

# Check progress
node scripts/progress-report.js

# Test health
curl http://localhost:8080/healthz

# Get catalog
curl http://localhost:8080/catalog

# Create order
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"TEST-001"}'
```

## Critical Success Factors for AI Implementation

### What Works Well
1. **Card-based development** - Clear requirements in markdown files
2. **Frontmatter status tracking** - Simple, visible progress
3. **Mock data store** - No database complexity during development
4. **Synchronous calls** - Easier to debug and rollback
5. **Progress script** - Instant visibility of project state

### Key Commands
```bash
# Always check progress first
node scripts/progress-report.js

# Build and restart pattern (use this exact sequence)
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
sleep 3

# Test endpoints
curl http://localhost:8080/healthz
```

### Remember
- The frontmatter in `/docs/cards/*.md` is the source of truth
- Always use `mockDataStore` for data operations
- Build TypeScript before restarting server
- Kill old processes to avoid port conflicts
- Test with curl commands, not just code review