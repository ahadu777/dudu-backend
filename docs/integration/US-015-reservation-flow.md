# US-015: Ticket Reservation & Validation - Integration Runbook

**Story:** US-015 Ticket Reservation & Validation
**Cards:** reservation-slot-management, customer-reservation-portal, operator-validation-scanner
**Status:** ✅ Complete
**Last Updated:** 2025-11-14

---

## 🎯 Overview

This runbook provides **copy-paste commands** to test the complete ticket reservation and validation flow end-to-end.

**User Journeys:**
1. **Customer** → View slots → Validate ticket → Enter contact → Create reservation
2. **Operator** → Login → Scan QR → Validate ticket → Allow/Deny entry

---

## 🚀 Prerequisites

```bash
# 1. Ensure server is running
curl http://localhost:8080/healthz

# Expected: {"status":"ok","timestamp":"..."}

# 2. Check modules loaded
curl http://localhost:8080/healthz | grep -q "ok" && echo "✅ Server ready"
```

---

## 📅 Journey 1: Customer Reservation Flow

### Step 1.1: View Available Slots (Calendar)

```bash
# Get all slots for November 2025
curl -s "http://localhost:8080/api/reservation-slots/available?month=2025-11&orq=1" \
  | python -m json.tool | head -50

# Expected: Array of slots with capacity_status (AVAILABLE/LIMITED/FULL)
# Example output:
# {
#   "success": true,
#   "data": [
#     {
#       "id": 1,
#       "date": "2025-11-14",
#       "start_time": "09:00:00",
#       "end_time": "11:00:00",
#       "capacity_status": "AVAILABLE",
#       "available_count": 122
#     }
#   ]
# }
```

### Step 1.2: Get Slots for Specific Date

```bash
# Filter to Nov 14, 2025
curl -s "http://localhost:8080/api/reservation-slots/available?date=2025-11-14&orq=1" \
  | python -m json.tool

# Expected: 4 time slots for the day (09:00, 12:00, 15:00, 18:00)
```

### Step 1.3: Validate Ticket

```bash
# Test with activated ticket
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-001",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": true, "valid": true, "ticket": {...}}
```

**Test Invalid Ticket:**
```bash
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "INVALID-TICKET",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": false, "valid": false, "error": "Ticket not found"}
```

### Step 1.4: Verify Contact Information

```bash
curl -s -X POST http://localhost:8080/api/tickets/verify-contact \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-001",
    "visitor_name": "Alice Wang",
    "visitor_phone": "+86-13800138000",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": true, "message": "Contact information verified"}
```

**Test Invalid Contact:**
```bash
curl -s -X POST http://localhost:8080/api/tickets/verify-contact \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-001",
    "visitor_name": "A",
    "visitor_phone": "invalid",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": false, "error": "Valid visitor name is required"}
```

### Step 1.5: Create Reservation

```bash
# Create reservation for Nov 14, 12:00 PM slot
curl -s -X POST http://localhost:8080/api/reservations/create \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-001",
    "slot_id": 2,
    "visitor_name": "Alice Wang",
    "visitor_phone": "+86-13800138000",
    "orq": 1
  }' | python -m json.tool

# Expected:
# {
#   "success": true,
#   "data": {
#     "reservation_id": 1,
#     "ticket_number": "TKT-001-20251114-001",
#     "slot_id": 2,
#     "slot_date": "2025-11-14",
#     "slot_time": "12:00:00 - 14:00:00",
#     "visitor_name": "Alice Wang",
#     "status": "RESERVED"
#   }
# }
```

### Step 1.6: Verify Slot Capacity Updated

```bash
# Check slot 2 capacity decreased
curl -s "http://localhost:8080/api/reservation-slots/available?date=2025-11-14&orq=1" \
  | python -m json.tool \
  | grep -A 5 '"id": 2'

# Expected: booked_count increased by 1, available_count decreased by 1
```

---

## 🔐 Journey 2: Operator Validation Flow

### Step 2.1: Operator Login

```bash
# Login as operator OP-001
curl -s -X POST http://localhost:8080/api/operator/login \
  -H "Content-Type: application/json" \
  -d '{
    "operator_id": "OP-001",
    "password": "password123",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected:
# {
#   "success": true,
#   "data": {
#     "operator_id": "OP-001",
#     "operator_name": "Zhang Wei",
#     "terminal_id": "GATE-A1",
#     "session_token": "...",
#     "expires_at": "2025-11-14T22:28:30.020Z"
#   }
# }

# Save session token for later (optional in mock mode)
```

**Test Invalid Login:**
```bash
curl -s -X POST http://localhost:8080/api/operator/login \
  -H "Content-Type: application/json" \
  -d '{
    "operator_id": "OP-999",
    "password": "wrong",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": false, "error": "Invalid operator credentials"}
```

### Step 2.2: Validate Ticket (QR Scan) - GREEN

```bash
# Scan ticket with valid reservation
curl -s -X POST http://localhost:8080/api/operator/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-003",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected: color_code = "GREEN", allow_entry = true
```

### Step 2.3: Validate Ticket (QR Scan) - YELLOW

```bash
# Scan already verified ticket
curl -s -X POST http://localhost:8080/api/operator/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-004",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected: color_code = "YELLOW", message = "Warning: Ticket already verified"
```

### Step 2.4: Validate Ticket (QR Scan) - RED

```bash
# Scan invalid ticket
curl -s -X POST http://localhost:8080/api/operator/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "INVALID-TICKET",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected: color_code = "RED", allow_entry = false, message = "Ticket not found"
```

### Step 2.5: Verify Ticket Entry - ALLOW

```bash
# Operator allows entry
curl -s -X POST http://localhost:8080/api/operator/verify-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-003",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "validation_decision": "ALLOW",
    "orq": 1
  }' | python -m json.tool

# Expected:
# {
#   "success": true,
#   "data": {
#     "ticket_number": "TKT-001-20251114-003",
#     "verification_status": "VERIFIED",
#     "verified_at": "...",
#     "operator_id": "OP-001",
#     "terminal_id": "GATE-A1"
#   }
# }
```

### Step 2.6: Verify Ticket Entry - DENY

```bash
# Operator denies entry
curl -s -X POST http://localhost:8080/api/operator/verify-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "TKT-001-20251114-005",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "validation_decision": "DENY",
    "orq": 1
  }' | python -m json.tool

# Expected: {"success": true, "data": {"verification_status": "DENIED", ...}}
```

---

## 🧪 Complete End-to-End Test Script

```bash
#!/bin/bash
# Complete US-015 E2E Test

echo "🚀 Starting US-015 Integration Test..."

# Health check
echo "\n1️⃣ Health Check"
curl -s http://localhost:8080/healthz | grep -q "ok" && echo "✅ Server OK" || exit 1

# Customer Flow
echo "\n2️⃣ Customer: Get Available Slots"
SLOTS=$(curl -s "http://localhost:8080/api/reservation-slots/available?date=2025-11-14&orq=1")
echo "$SLOTS" | grep -q "success" && echo "✅ Slots retrieved" || exit 1

echo "\n3️⃣ Customer: Validate Ticket"
VALIDATION=$(curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-001-20251114-002","orq":1}')
echo "$VALIDATION" | grep -q '"valid":true' && echo "✅ Ticket valid" || exit 1

echo "\n4️⃣ Customer: Verify Contact"
CONTACT=$(curl -s -X POST http://localhost:8080/api/tickets/verify-contact \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-001-20251114-002","visitor_name":"Bob Chen","visitor_phone":"+86-13900139000","orq":1}')
echo "$CONTACT" | grep -q '"success":true' && echo "✅ Contact verified" || exit 1

echo "\n5️⃣ Customer: Create Reservation"
RESERVATION=$(curl -s -X POST http://localhost:8080/api/reservations/create \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-001-20251114-002","slot_id":3,"visitor_name":"Bob Chen","visitor_phone":"+86-13900139000","orq":1}')
echo "$RESERVATION" | grep -q '"reservation_id"' && echo "✅ Reservation created" || exit 1

# Operator Flow
echo "\n6️⃣ Operator: Login"
LOGIN=$(curl -s -X POST http://localhost:8080/api/operator/login \
  -H "Content-Type: application/json" \
  -d '{"operator_id":"OP-002","password":"password123","terminal_id":"GATE-B2","orq":1}')
echo "$LOGIN" | grep -q '"session_token"' && echo "✅ Operator logged in" || exit 1

echo "\n7️⃣ Operator: Validate Ticket (GREEN)"
SCAN=$(curl -s -X POST http://localhost:8080/api/operator/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-001-20251114-003","operator_id":"OP-002","terminal_id":"GATE-B2","orq":1}')
echo "$SCAN" | grep -q '"color_code"' && echo "✅ QR validation done" || exit 1

echo "\n8️⃣ Operator: Verify Entry"
VERIFY=$(curl -s -X POST http://localhost:8080/api/operator/verify-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-001-20251114-003","operator_id":"OP-002","terminal_id":"GATE-B2","validation_decision":"ALLOW","orq":1}')
echo "$VERIFY" | grep -q '"verification_status"' && echo "✅ Entry verified" || exit 1

echo "\n✨ All tests passed! US-015 integration complete."
```

**Save and run:**
```bash
chmod +x test-us015.sh
./test-us015.sh
```

---

## 📊 Test Data Reference

### Available Test Tickets

| Ticket Number | Status | Use Case |
|--------------|--------|----------|
| TKT-001-20251114-001 | ACTIVATED | Fresh ticket for new reservation |
| TKT-001-20251114-002 | ACTIVATED | Fresh ticket for testing |
| TKT-001-20251114-003 | RESERVED | Has reservation, test validation |
| TKT-001-20251114-004 | VERIFIED | Already used, expect YELLOW |
| TKT-001-20251114-005 | EXPIRED | Expired ticket, expect RED |

### Available Operators

| Operator ID | Name | Password | Terminal |
|------------|------|----------|----------|
| OP-001 | Zhang Wei | password123 | GATE-A1 |
| OP-002 | Li Ming | password123 | GATE-B2 |
| OP-003 | Wang Fang | password123 | GATE-C3 |

### Available Slots (Nov 14, 2025)

| Slot ID | Time | Capacity | Status |
|---------|------|----------|--------|
| 1 | 09:00 - 11:00 | 200 | AVAILABLE |
| 2 | 12:00 - 14:00 | 200 | LIMITED |
| 3 | 15:00 - 17:00 | 200 | AVAILABLE |
| 4 | 18:00 - 20:00 | 200 | LIMITED |

---

## ✅ Expected Results Summary

**Customer Journey:**
1. ✅ View slots → Returns calendar with capacity status
2. ✅ Validate ticket → Confirms ticket eligible for reservation
3. ✅ Verify contact → Validates name/phone format
4. ✅ Create reservation → Links ticket to time slot
5. ✅ Slot capacity → Auto-updates booked_count

**Operator Journey:**
1. ✅ Login → Returns session token
2. ✅ Scan QR → Returns GREEN/YELLOW/RED color code
3. ✅ Verify entry → Marks ticket as VERIFIED or DENIED

**Color Code Logic:**
- 🟢 **GREEN** → Valid reservation, allow entry
- 🟡 **YELLOW** → Warning (no reservation, already verified), manual review
- 🔴 **RED** → Invalid ticket, deny entry

---

## 🐛 Troubleshooting

**Server not responding:**
```bash
npm run build && npm start
```

**Endpoints returning 404:**
```bash
# Check routes registered
curl http://localhost:8080/api/reservation-slots/available?orq=1
```

**Mock data not seeded:**
```bash
# Restart server - mock services seed on initialization
pkill -f "node dist/index.js"
npm start
```

---

**Status:** ✅ All endpoints tested and working
**Mode:** Mock service (USE_DATABASE=false)
**Ready for:** Newman automation, Frontend integration
