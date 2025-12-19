# US-016: Ticket Activation and Time-Slot Reservation - Integration Runbook

**Story:** US-016 Ticket Activation and Time-Slot Reservation System
**Related PRD:** PRD-006
**Cards:** ticket-activation, time-slot-reservation, reservation-validation-scanning
**Status:** 📋 Draft (Not Yet Implemented)
**Last Updated:** 2025-11-27

---

## ⚠️ Implementation Status

**This runbook is based on PRD-006 specifications for ticket activation features that are NOT YET IMPLEMENTED.**

Currently implemented features from PRD-007 (US-015):
- ✅ Ticket reservation system
- ✅ Operator validation with color codes
- ✅ Slot management

Features pending implementation from PRD-006:
- ❌ Ticket activation (inactive → active transition)
- ❌ Dual purchase modes (immediate vs deferred activation)
- ❌ Activation-based reservation eligibility

For working operator validation endpoints, see [US-015-runbook.md](US-015-runbook.md).

---

## 🎯 Overview

This runbook provides **copy-paste commands** to test the complete ticket activation and time-slot reservation flow end-to-end.

**User Journeys:**
1. **Customer (Pre-Made Mode)** → Purchase → Activate ticket → Reserve time slot → Arrive at venue
2. **Customer (Immediate Mode)** → Purchase (auto-activated) → Reserve time slot → Arrive at venue
3. **Operator** → Scan ticket → Validate activation & reservation → Allow/Deny entry

**Key Features:**
- Two-phase ticket lifecycle (inactive → active → reserved)
- Dual purchase modes (immediate vs pre-made)
- Enhanced operator scanning with reservation validation

---

## 🚀 Prerequisites

```bash
# 1. Ensure server is running
curl http://localhost:8080/healthz

# Expected: {"status":"ok","timestamp":"..."}

# 2. Verify activation module loaded
curl http://localhost:8080/healthz | grep -q "ok" && echo "✅ Server ready"
```

---

## 📋 Test Scenarios

### Scenario 1: Pre-Made Ticket with Activation Flow

#### Step 1: Purchase Ticket (Inactive Status)
```bash
# Create order for pre-made ticket (defaults to inactive)
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "test-premade-001",
    "activation_mode": "deferred"
  }'

# Expected: Order created, tickets status = "inactive"
# Save ticket_id from response
```

#### Step 2: Activate Ticket
```bash
# Activate the inactive ticket
TICKET_ID="<ticket_id_from_step1>"

curl -X POST http://localhost:8080/api/tickets/${TICKET_ID}/activate \
  -H "Content-Type: application/json"

# Expected: {"status":"active","activated_at":"2025-11-27T..."}
```

#### Step 3: Check Activation Status
```bash
curl http://localhost:8080/api/tickets/${TICKET_ID}/status

# Expected: {"ticket_id":"...","status":"active","activation_mode":"deferred"}
```

#### Step 4: Create Time-Slot Reservation
```bash
# Reserve ticket for specific date/time
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "'${TICKET_ID}'",
    "reserved_date": "2025-12-01",
    "reserved_time_slot": "morning"
  }'

# Expected: Reservation created with reservation_id
# Save reservation_id from response
```

#### Step 5: Operator Validation (Enhanced Scan)
```bash
# Operator scans ticket on reserved date
curl -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "<ticket_code>",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }'

# Expected (on correct date):
# {
#   "success": true,
#   "validation_result": {
#     "color_code": "GREEN",
#     "status": "RESERVED",
#     "message": "Valid reservation - Allow entry"
#   }
# }

# Expected (on wrong date):
# {
#   "success": true,
#   "validation_result": {
#     "color_code": "YELLOW",
#     "message": "Warning: Reservation is for 2025-12-01, not today"
#   }
# }
```

---

### Scenario 2: Immediate Mode (Auto-Activation)

#### Step 1: Purchase Ticket (Immediate Mode)
```bash
# Create order with immediate activation
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "test-immediate-001",
    "activation_mode": "immediate"
  }'

# Expected: Order created, tickets status = "active" (auto-activated)
# Save ticket_id from response
```

#### Step 2: Verify Auto-Activation
```bash
TICKET_ID="<ticket_id_from_step1>"

curl http://localhost:8080/api/tickets/${TICKET_ID}/status

# Expected: {"status":"active","activation_mode":"immediate","activated_at":"2025-11-27T..."}
```

#### Step 3: Create Reservation (Same as Scenario 1 Step 4)
```bash
# Immediate mode tickets can directly make reservations
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "'${TICKET_ID}'",
    "reserved_date": "2025-12-01",
    "reserved_time_slot": "afternoon"
  }'
```

---

### Scenario 3: Validation Error Cases

#### Case 1: Inactive Ticket Scan
```bash
# Try to scan inactive ticket (not yet activated)
curl -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "<inactive_ticket_code>",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }'

# Expected:
# {
#   "success": true,
#   "validation_result": {
#     "color_code": "RED",
#     "message": "Ticket not activated - Deny entry"
#   }
# }
```

#### Case 2: Active Ticket Without Reservation
```bash
# Scan active ticket that has no reservation
curl -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "<active_ticket_no_reservation>",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }'

# Expected (based on business rules):
# {
#   "success": true,
#   "validation_result": {
#     "color_code": "YELLOW",
#     "message": "Warning: No reservation found for this ticket"
#   }
# }
```

#### Case 3: Reservation Modification
```bash
# Modify existing reservation
RESERVATION_ID="<reservation_id>"

curl -X PUT http://localhost:8080/api/reservations/${RESERVATION_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "reserved_date": "2025-12-05",
    "reserved_time_slot": "evening"
  }'

# Expected: Reservation updated
```

#### Case 4: Cancel Reservation
```bash
# Cancel reservation (returns ticket to active with no reservation)
curl -X DELETE http://localhost:8080/api/reservations/${RESERVATION_ID}

# Expected: {"status":"cancelled","ticket_status":"active"}
```

---

## 🧪 Newman E2E Tests

```bash
# Run complete activation and reservation test suite
npx newman run postman/auto-generated/us-016-activation-reservation.postman_collection.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman/us-016-activation-reservation.xml

# Expected: All tests pass
# - Ticket activation flow (deferred mode)
# - Ticket activation flow (immediate mode)
# - Reservation creation and modification
# - Operator validation with reservation checks
# - Error handling for all validation scenarios
```

---

## 📊 Expected Outcomes

### ✅ Success Criteria (When Implemented)
- [ ] Pre-made tickets default to `inactive` status
- [ ] Activation endpoint transitions `inactive` → `active`
- [ ] Immediate mode tickets auto-activate on purchase
- [ ] Only active tickets can create reservations
- [ ] Operator scanning shows activation + reservation status
- [ ] Date validation prevents wrong-day entry
- [ ] Reservation modification updates date/time slot
- [ ] Cancellation returns ticket to active (no reservation)

### 📈 Performance Targets
- Activation endpoint: < 1s response time
- Reservation creation: < 2s response time
- Operator scan validation: < 1s response time (critical path)

---

## 🔍 Troubleshooting

### Issue: Cannot activate already active ticket
**Solution:** Check ticket status first. Once activated, tickets cannot return to inactive.

### Issue: Reservation creation fails with "Ticket not active"
**Solution:** Verify ticket has been activated via `/api/tickets/:ticket_id/status`

### Issue: Operator scan shows "WRONG_DATE"
**Solution:** Verify reservation date matches current date. Check reservation details via `/api/reservations/:reservation_id`

### Issue: Immediate mode not auto-activating
**Solution:** Ensure `activation_mode: "immediate"` is set in order creation request

---

## 📚 Related Documentation

- **PRD-006:** Ticket Activation and Time-Slot Reservation System
- **PRD-007:** Ticket Reservation & Validation (Implemented - see US-015)
- **Story:** US-016 (Ticket Activation and Time-Slot Reservation)
- **Implemented Story:** US-015 (Reservation & Validation)
- **Cards:**
  - ticket-activation (pending)
  - time-slot-reservation (pending)
  - reservation-validation-scanning (implemented)
- **Related Stories:**
  - US-001 (Base ticketing system)
  - US-015 (Implemented reservation & operator validation)

---

**Note:** This runbook documents the planned PRD-006 ticket activation features. For currently working operator validation endpoints, refer to [US-015-runbook.md](US-015-runbook.md).
