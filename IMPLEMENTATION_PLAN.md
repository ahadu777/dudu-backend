# Parallel Implementation Plan - 6 Cards to Done

## Current Status: 87% Success Score ✅
- **Foundation Quality:** 100% ✅
- **Story Validation:** 100% ✅
- **Card Completion:** 60% (6 Done, 4 Ready)

## Execution Strategy (Parallel Push)

### **Team C - Gate (Critical Path Start)**
```
1. operators-login ⚡ (15 min)
   ├─ POST /operators/login
   ├─ bcrypt.compare → JWT sign (OPERATOR_JWT_SECRET)
   └─ Return {operator_token}

2. venue-enhanced-scanning ⚡ (20 min)
   ├─ POST /venue/scan (replaces deprecated /tickets/scan)
   ├─ Verify QR (encrypted or JWT) → check jti uniqueness → 409 on replay
   ├─ Atomic: lock entitlement, decrement, insert redemption
   └─ Return {result: success/reject, ticket_status, venue_info}

> **Note**: `/validators/sessions` deprecated. Use operator JWT auth instead.
```

### **Team B - Tickets (Parallel)**
```
4. qr-token ⚡ (15 min)
   ├─ POST /tickets/{code}/qr-token
   ├─ Validate ownership/status
   ├─ Issue JWT HS256 {tid, jti, exp≤60s}
   └─ Return {token, expires_in}

5. reports-redemptions ⚡ (15 min)
   ├─ GET /reports/redemptions?from&to&function&location
   ├─ Filter mockStore.getRedemptions()
   └─ Return {events[]} sorted ts DESC
```

## Success Validation Per Card

### During Implementation:
```bash
# After each card:
npm run build           # Zero TypeScript errors
npm test               # All tests pass
node scripts/success-dashboard.js  # Progress tracking
```

### End-to-End Validation:
```bash
# Complete US-001 flow:
curl /catalog
curl -H "Authorization: Bearer user123" /my/tickets
curl -X POST /qr/TKT-123-001              # Generate encrypted QR
curl -X POST /qr/decrypt -d '{"encrypted_data":"..."}' # Decrypt to display
curl -X POST /venue/scan -d '{"qr_token":"...", "function_code":"ferry_boarding"}'
```

## Target Metrics (After 4 Remaining Cards Done)
- **Foundation Quality:** 100% (maintain)
- **Story Validation:** 100% (maintain)
- **Card Completion:** 100% (10/10 Done)
- **Overall Success:** 100% 🎯

## Quality Gates
✅ Each card uses domain.ts types exactly
✅ Error responses follow error-catalog.md
✅ Mock store operations are atomic
✅ State transitions respect state-machines.md
✅ Logging follows observability patterns

## Demo Flow Ready
```
1. Catalog → Order → Payment → Tickets (✅ Working)
2. QR Token → Operator Login → Session → Scan → Report (⏳ 2 hours)
```

**Estimated Total Time:** 60 minutes for 4 remaining cards = 100% completion target