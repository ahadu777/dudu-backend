# Proven AI Development Workflow

## The Card-Based Development System

This workflow has been tested and validated to work efficiently with AI-driven development.

## Core Principles

1. **Cards are contracts** - Each card defines exactly what needs to be built
2. **Frontmatter tracks progress** - Simple YAML status in each card file
3. **Mock data first** - No database complexity during development
4. **Synchronous execution** - Direct function calls, not events (for MVP)
5. **Test with curl** - Immediate feedback on implementation

## The Workflow Steps

### 1. Check Progress
```bash
node scripts/progress-report.js
```
This shows you:
- What's done (✅)
- What's in progress (🔄)
- What's ready to start (📋)
- Team assignments

### 2. Pick a Card
Choose a card with status "Ready" from `/docs/cards/`

### 3. Read Requirements
Each card contains:
- **Purpose**: What problem it solves
- **Contract**: API specification
- **Rules**: Business logic
- **Invariants**: What must always be true
- **Tests**: How to verify it works

### 4. Update Status
```yaml
status: "In Progress"
last_update: "2025-10-19T22:30:00+0800"
```

### 5. Implement
Create module in `/src/modules/<name>/`:
- `router.ts` - Express routes
- `service.ts` - Business logic (if complex)

Use patterns:
```typescript
// Logging
const logger = {
  info: (event: string, data?: any) => {
    console.log(JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString()
    }));
  }
};

// Metrics
const metrics = {
  increment: (metric: string) => {
    console.log(`[METRIC] ${metric} +1`);
  }
};

// Mock data operations
import { mockDataStore } from '../../core/mock/data';
const order = mockDataStore.getOrderById(orderId);
```

### 6. Build and Restart
```bash
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
sleep 3  # Wait for startup
```

### 7. Test
```bash
# Create order
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":101,"qty":2}],"channel_id":1,"out_trade_no":"TEST-001","user_id":123}'

# Process payment
curl -X POST http://localhost:8080/payments/notify \
  -H "Content-Type: application/json" \
  -d '{"order_id":10001,"payment_status":"SUCCESS","paid_at":"2025-01-01T12:00:00Z","signature":"abc123"}'
```

### 8. Mark Complete
```yaml
status: "Done"
last_update: "2025-10-19T22:40:00+0800"
```

## What Makes This Work

### For AI
- **Clear boundaries** - Each card is self-contained
- **Explicit requirements** - No guessing what to build
- **Status visibility** - Always know what's done
- **Pattern reuse** - Copy from existing modules

### For Humans
- **Progress tracking** - See status at a glance
- **No database setup** - Mock data works immediately
- **Quick feedback** - Test with curl instantly
- **Simple updates** - Just edit markdown files

## Common Patterns

### Idempotency
```typescript
// Check if already processed
const existing = mockDataStore.getOrder(userId, outTradeNo);
if (existing && existing.status === 'PAID') {
  return res.status(200).json({
    message: 'Already processed',
    order_id: existing.id
  });
}
```

### Synchronous Calls
```typescript
// Direct service call (not events)
try {
  const tickets = await ticketService.issueTicketsForPaidOrder(orderId);
  logger.info('tickets.issued', { count: tickets.length });
} catch (error) {
  // Rollback on failure
  mockDataStore.updateOrderStatus(orderId, 'PENDING_PAYMENT');
  throw error;
}
```

### Error Handling
```typescript
import { ERR } from '../../core/errors/codes';

if (!order) {
  throw {
    code: ERR.ORDER_NOT_FOUND,
    message: `Order ${orderId} not found`
  };
}
```

## Tips for Success

1. **Always run progress report first** - Know the current state
2. **Read the entire card** - Don't skip requirements
3. **Use mock data store** - It's already set up with test data
4. **Build before restart** - TypeScript needs compilation
5. **Kill old processes** - Avoid port conflicts
6. **Test immediately** - Don't wait to verify
7. **Update status promptly** - Keep progress accurate

## Example Success Story

We implemented payment webhook + ticket issuance:
1. Read both cards (5 min)
2. Created ticket service first (dependency)
3. Created payment webhook calling tickets
4. Built and restarted server
5. Tested with curl - worked first time
6. Tested idempotency - also worked
7. Updated both cards to "Done"

Total time: ~20 minutes for two complete features

## When Things Go Wrong

### Port already in use
```bash
pkill -f "node dist/index.js"
```

### TypeScript errors
```bash
npm run build  # See exact errors
```

### Not seeing changes
1. Did you build? (`npm run build`)
2. Did you restart? (kill + start)
3. Check the right port (8080)

### Test failing
Check server logs - they show every step with structured JSON

## The Magic Formula

```
Card → Code → Build → Test → Done
```

Simple, repeatable, effective.