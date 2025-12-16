# US-015: Ticket Reservation & Validation - Directus Integration Guide

**Story:** US-015 Ticket Reservation & Validation
**Related PRD:** PRD-007
**Cards:** reservation-slot-management, customer-reservation-portal, operator-validation-scanner
**Status:** ✅ Complete (Directus Integration)
**Last Updated:** 2025-11-27

---

## 🎯 Overview

This guide provides **copy-paste commands** for testing US-015 with **Directus CMS** as the data source.

**Key Differences from Mock Mode:**
- Uses real Directus collections for tickets, reservations, and slots
- Validates ticket `status = 'ACTIVATED'` before allowing reservations
- Returns UUIDs for IDs instead of sequential numbers
- Customer contact info fetched from Directus ticket records

**User Journeys:**
1. **Customer** → View slots → Validate ticket → Create reservation
2. **Operator** → Login → Scan QR → Validate ticket → Allow/Deny entry

---

## 🚀 Prerequisites

```bash
# 1. Ensure server is running with Directus enabled
export USE_DIRECTUS=true
npm start

# 2. Health check
curl http://localhost:8080/healthz

# Expected: {"status":"ok","timestamp":"..."}

# 3. Verify Directus connection
# Check logs for: "directus.connection.success"
```

---

## 📅 Journey 1: Customer Reservation Flow (Directus)

### Step 1.1: View Available Slots (Calendar)

```bash
# Get all slots for December 2025
curl -s "http://localhost:8080/api/reservation-slots/available?month=2025-12" \
  | python -m json.tool | head -80

# Expected: Grouped by date with slots array
# Response structure (Directus mode):
# {
#   "success": true,
#   "data": [
#     {
#       "date": "2025-12-01",
#       "slots": [
#         {
#           "id": "550e8400-e29b-41d4-a716-446655440000",
#           "start_time": "09:00:00",
#           "end_time": "12:00:00",
#           "total_capacity": 200,
#           "available_count": 150,
#           "capacity_status": "AVAILABLE",
#           "status": "ACTIVE"
#         },
#         {
#           "id": "660e8400-e29b-41d4-a716-446655440001",
#           "start_time": "14:00:00",
#           "end_time": "17:00:00",
#           "total_capacity": 200,
#           "available_count": 25,
#           "capacity_status": "LIMITED",
#           "status": "ACTIVE"
#         }
#       ]
#     },
#     {
#       "date": "2025-12-02",
#       "slots": [...]
#     }
#   ]
# }
#
# Capacity Status Rules (Directus):
# - AVAILABLE: > 50% slots remaining (available > 100 for capacity 200)
# - LIMITED: 1-50% slots remaining (available 1-100 for capacity 200)
# - FULL: 0% slots remaining (available = 0)
```

---

### Step 1.2: Validate Ticket (Directus Checks Real Status)

```bash
# Test with ACTIVATED ticket from Directus
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251201-ABC123",
    "orq": 1
  }' | python -m json.tool

# Expected Success Response (Directus):
# {
#   "success": true,
#   "valid": true,
#   "ticket": {
#     "ticket_code": "TKT-20251201-ABC123",
#     "product_id": 101,
#     "product_name": "Hong Kong Disneyland 1-Day Ticket",
#     "status": "ACTIVATED",
#     "expires_at": "2025-12-31T23:59:59.000Z",
#     "reserved_at": null,
#     "customer_email": "alice@example.com",
#     "customer_phone": "+852-9123-4567",
#     "order_id": 12345
#   }
# }
```

**Test Invalid Ticket:**
```bash
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "INVALID-TICKET-999",
    "orq": 1
  }' | python -m json.tool

# Expected Error (Directus query returns null):
# {
#   "success": false,
#   "valid": false,
#   "error": "Ticket not found"
# }
```

**Test Non-Activated Ticket (Directus Validation):**
```bash
# Directus checks: ticket.status !== 'ACTIVATED'
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-PENDING-001",
    "orq": 1
  }' | python -m json.tool

# Expected Error (Directus validates activation):
# {
#   "success": false,
#   "valid": false,
#   "error": "Ticket must be activated before making a reservation"
# }
```

**Test Already Reserved Ticket:**
```bash
curl -s -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-ALREADY-RESERVED",
    "orq": 1
  }' | python -m json.tool

# Expected Error (Directus checks existing reservations):
# {
#   "success": false,
#   "valid": false,
#   "error": "Ticket already has an active reservation"
# }
```

---

### Step 1.3: Create Reservation (Directus Writes to CMS)

```bash
# Create reservation with customer info from ticket
# Directus will: (1) Create reservation record (2) Update ticket status to RESERVED
curl -s -X POST http://localhost:8080/api/reservations/create \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251201-ABC123",
    "slot_id": "550e8400-e29b-41d4-a716-446655440000",
    "orq": 1
  }' | python -m json.tool

# Expected Success (Directus creates reservation + updates ticket):
# {
#   "success": true,
#   "data": {
#     "reservation_id": "770e8400-e29b-41d4-a716-446655440002",
#     "ticket_code": "TKT-20251201-ABC123",
#     "slot_id": 550,
#     "slot_date": "2025-12-01",
#     "slot_time": "09:00-12:00",
#     "customer_email": "alice@example.com",
#     "customer_phone": "+852-9123-4567",
#     "status": "RESERVED",
#     "created_at": "2025-11-27T10:30:00.000Z"
#   }
# }
```

**Create Reservation with Override Contact Info:**
```bash
# Provide customer_email and customer_phone to override ticket info
curl -s -X POST http://localhost:8080/api/reservations/create \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251201-XYZ456",
    "slot_id": "1",
    "customer_email": "bob@custom.com",
    "customer_phone": "+852-8888-9999",
    "orq": 1
  }' | python -m json.tool

# Directus will use provided contact info instead of fetching from ticket
```

---

### Step 1.4: Verify Slot Capacity Updated (Directus Auto-Updates)

```bash
# Check slot capacity decreased after reservation
curl -s "http://localhost:8080/api/reservation-slots/available?month=2025-12" \
  | python -m json.tool

# Expected: available_count decreased by 1 for the reserved slot
# Directus automatically updates slot.available_count when reservation is created
```

---

## 🔐 Journey 2: On-Site Verification Flow (QR Decrypt + Venue Scan)

> **Primary Flow**: This is the production flow for on-site ticket verification.

### Step 2.1: Operator Login

```bash
# Login as operator to get session token
curl -s -X POST http://localhost:8080/operators/auth \
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
#     "operator_name": "Operator OP-001",
#     "terminal_id": "GATE-A1",
#     "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "expires_at": "2025-12-16T22:30:00.000Z"
#   }
# }

# Save the token for subsequent requests
export OPERATOR_TOKEN="<session_token from response>"
```

---

### Step 2.2: Generate QR Code for Ticket

```bash
# Generate encrypted QR code for ticket
curl -s -X POST http://localhost:8080/qr/public/TKT-20251201-ABC123 \
  -H "Content-Type: application/json" \
  -d '{"expiry_minutes": 30}' | python -m json.tool

# Expected:
# {
#   "success": true,
#   "ticket_code": "TKT-20251201-ABC123",
#   "encrypted_data": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
#   "qr_image": "data:image/png;base64,...",
#   "expires_at": "2025-12-16T13:00:00.000Z"
# }

# Save encrypted_data for venue scan
export QR_TOKEN="<encrypted_data from response>"
```

---

### Step 2.3: Decrypt QR Code (POST /qr/decrypt)

```bash
# Operator scans QR code - decrypt to get ticket info
curl -s -X POST http://localhost:8080/qr/decrypt \
  -H "Content-Type: application/json" \
  -d "{\"encrypted_data\": \"$QR_TOKEN\"}" | python -m json.tool

# Expected:
# {
#   "ticket_code": "TKT-20251201-ABC123",
#   "jti": "unique-token-id",
#   "ticket_info": {
#     "status": "RESERVED",
#     "product_name": "Hong Kong Disneyland 1-Day Ticket",
#     "customer_email": "alice@example.com",
#     "reserved_date": "2025-12-16",
#     "slot_time": "09:00-12:00"
#   },
#   "iat": 1702723200,
#   "exp": 1702725000
# }
```

---

### Step 2.4: Venue Scan to Redeem Ticket (POST /venue/scan)

```bash
# Redeem ticket entitlement (requires operator auth)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -d "{
    \"qr_token\": \"$QR_TOKEN\",
    \"function_code\": \"ferry\",
    \"venue_code\": \"central-pier\"
  }" | python -m json.tool

# Expected Success:
# {
#   "result": "success",
#   "ticket_code": "TKT-20251201-ABC123",
#   "function_code": "ferry",
#   "redeemed_at": "2025-12-16T10:30:00.000Z",
#   "operator_id": "OP-001"
# }

# Expected Rejection (already used):
# {
#   "result": "reject",
#   "reason": "Entitlement already redeemed",
#   "redeemed_at": "2025-12-16T09:00:00.000Z"
# }
```

---

### Step 2.5: Error Scenarios

**Invalid QR Token:**
```bash
curl -s -X POST http://localhost:8080/qr/decrypt \
  -H "Content-Type: application/json" \
  -d '{"encrypted_data": "invalid-token"}' | python -m json.tool

# Expected: 400 Bad Request
# {"error": "Invalid or expired QR token"}
```

**Venue Scan Without Auth:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Content-Type: application/json" \
  -d '{"qr_token": "some-token", "function_code": "ferry"}' | python -m json.tool

# Expected: 401 Unauthorized
# {"error": "Operator authentication required"}
```

---

## 🔐 Journey 3: Legacy Operator Validation Flow (Display Only)

> **Note**: This flow is for display validation (GREEN/YELLOW/RED) only.
> For actual ticket redemption, use Journey 2 (QR Decrypt + Venue Scan).

### Step 3.1: Operator Login (Legacy)

```bash
# Login as operator (currently mock, Directus operators collection coming soon)
curl -s -X POST http://localhost:8080/operators/auth \
  -H "Content-Type: application/json" \
  -d '{
    "operator_id": "OP-001",
    "password": "password123",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected (mock auth, Directus validation TODO):
# {
#   "success": true,
#   "data": {
#     "operator_id": "OP-001",
#     "operator_name": "Operator OP-001",
#     "terminal_id": "GATE-A1",
#     "session_token": "hex-token-64-chars",
#     "expires_at": "2025-11-27T22:30:00.000Z"
#   }
# }
```

---

### Step 2.2: Validate Ticket (QR Scan) - GREEN (Directus Validation)

```bash
# Scan RESERVED ticket with valid reservation for today
curl -s -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251127-GREEN",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected GREEN (Directus checks: status=RESERVED + reservation.slot_date=today):
# {
#   "success": true,
#   "validation_result": {
#     "ticket_code": "TKT-20251127-GREEN",
#     "status": "RESERVED",
#     "color_code": "GREEN",
#     "message": "Valid reservation - Allow entry",
#     "details": {
#       "customer_email": "valid@example.com",
#       "slot_date": "2025-11-27",
#       "slot_time": "09:00:00-12:00:00",
#       "product_name": "Hong Kong Disneyland 1-Day Ticket"
#     },
#     "allow_entry": true
#   }
# }
```

---

### Step 2.3: Validate Ticket (QR Scan) - YELLOW (Directus Validation)

```bash
# Scan ticket with reservation for DIFFERENT date
curl -s -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251128-YELLOW",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected YELLOW (Directus checks: reservation.slot_date != today):
# {
#   "success": true,
#   "validation_result": {
#     "ticket_code": "TKT-20251128-YELLOW",
#     "status": "RESERVED",
#     "color_code": "YELLOW",
#     "message": "Warning: Reservation is for 2025-11-28, not today",
#     "details": {
#       "customer_email": "warning@example.com",
#       "slot_date": "2025-11-28",
#       "slot_time": "14:00:00-17:00:00",
#       "product_name": "Hong Kong Disneyland 1-Day Ticket"
#     },
#     "allow_entry": false
#   }
# }
```

---

### Step 2.4: Validate Ticket (QR Scan) - RED (Directus Validation)

```bash
# Scan ticket that is NOT RESERVED (Directus checks status)
curl -s -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-ACTIVATED-ONLY",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected RED (Directus: ticket.status !== 'RESERVED'):
# {
#   "success": true,
#   "validation_result": {
#     "ticket_code": "TKT-ACTIVATED-ONLY",
#     "status": "ACTIVATED",
#     "color_code": "RED",
#     "message": "Ticket not reserved - Deny entry",
#     "details": {
#       "customer_email": "N/A",
#       "slot_date": "N/A",
#       "slot_time": "N/A",
#       "product_name": "Hong Kong Disneyland 1-Day Ticket"
#     },
#     "allow_entry": false
#   }
# }
```

**Scan Invalid Ticket:**
```bash
curl -s -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TOTALLY-INVALID",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "orq": 1
  }' | python -m json.tool

# Expected RED (Directus query returns null):
# {
#   "success": true,
#   "validation_result": {
#     "ticket_code": "TOTALLY-INVALID",
#     "status": "INVALID",
#     "color_code": "RED",
#     "message": "Invalid ticket - Deny entry",
#     "details": {
#       "customer_email": "N/A",
#       "slot_date": "N/A",
#       "slot_time": "N/A",
#       "product_name": "N/A"
#     },
#     "allow_entry": false
#   }
# }
```

---

### Step 2.5: Verify Ticket Entry - ALLOW (Directus Updates Status)

```bash
# Operator allows entry - Directus updates ticket.status = 'VERIFIED'
curl -s -X POST http://localhost:8080/operators/verify-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-20251127-GREEN",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "validation_decision": "ALLOW",
    "orq": 1
  }' | python -m json.tool

# Expected (Directus updates: ticket.status + reservation.status to VERIFIED):
# {
#   "success": true,
#   "data": {
#     "ticket_code": "TKT-20251127-GREEN",
#     "verification_status": "VERIFIED",
#     "verified_at": "2025-11-27T12:45:30.000Z",
#     "operator_id": "OP-001",
#     "terminal_id": "GATE-A1"
#   }
# }
```

---

### Step 2.6: Verify Ticket Entry - DENY (Directus Logs Decision)

```bash
# Operator denies entry - Directus logs denial (does NOT update ticket status)
curl -s -X POST http://localhost:8080/operators/verify-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_code": "TKT-SUSPICIOUS-001",
    "operator_id": "OP-001",
    "terminal_id": "GATE-A1",
    "validation_decision": "DENY",
    "orq": 1
  }' | python -m json.tool

# Expected (Directus logs denial but ticket remains in original status):
# {
#   "success": true,
#   "data": {
#     "ticket_code": "TKT-SUSPICIOUS-001",
#     "verification_status": "DENIED",
#     "verified_at": "2025-11-27T12:50:00.000Z",
#     "operator_id": "OP-001",
#     "terminal_id": "GATE-A1"
#   }
# }
```

---

## 📊 Directus Collections Used

### 1. `tickets` Collection
Fields:
- `ticket_code` (string, unique)
- `status` (enum: PENDING_PAYMENT, ACTIVATED, RESERVED, VERIFIED, EXPIRED, CANCELLED)
- `product_id` (integer)
- `customer_email` (string)
- `customer_phone` (string)
- `expires_at` (datetime)
- `reserved_at` (datetime)
- `verified_at` (datetime)
- `verified_by` (string, operator_id)
- `order_id` (integer)

### 2. `ticket_reservations` Collection
Fields:
- `id` (uuid, primary key)
- `ticket_id` (string, references ticket_code)
- `slot_id` (uuid, references reservation_slots.id)
- `customer_email` (string)
- `customer_phone` (string)
- `status` (enum: RESERVED, VERIFIED, CANCELLED)
- `reserved_at` (datetime)
- `updated_at` (datetime)

### 3. `reservation_slots` Collection
Fields:
- `id` (uuid, primary key)
- `date` (date)
- `start_time` (time)
- `end_time` (time)
- `total_capacity` (integer)
- `available_count` (integer)
- `status` (enum: ACTIVE, CLOSED, SUSPENDED)

---

## ✅ Directus Validation Logic Summary

### Customer Reservation:
1. ✅ **Ticket Validation**: `status = 'ACTIVATED'` (blocks PENDING_PAYMENT, RESERVED, VERIFIED)
2. ✅ **Duplicate Check**: No active reservation for ticket
3. ✅ **Expiry Check**: `expires_at > now()`
4. ✅ **Create Reservation**: Insert into `ticket_reservations`
5. ✅ **Update Ticket**: Set `status = 'RESERVED'`, `reserved_at = now()`
6. ✅ **Update Slot**: Decrement `available_count`

### Operator Validation:
1. ✅ **Ticket Exists**: Query `tickets` by `ticket_code`
2. ✅ **Status Check**: Must be `status = 'RESERVED'`
3. ✅ **Fetch Reservation**: Get reservation + slot details
4. ✅ **Date Validation**: Compare `slot.date` with today (Hong Kong timezone UTC+8)
5. ✅ **Color Code**:
   - 🟢 **GREEN**: RESERVED + date matches today
   - 🟡 **YELLOW**: RESERVED but date mismatch
   - 🔴 **RED**: Not RESERVED or not found
6. ✅ **Verify Entry (ALLOW)**: Update `ticket.status = 'VERIFIED'`, `reservation.status = 'VERIFIED'`

---

## 🐛 Troubleshooting Directus Mode

**Issue: "Ticket not found" for valid ticket**
```bash
# Check Directus connection
# Look for logs: "directus.connection.success"
```

**Issue: "Ticket must be activated" for activated ticket**
```bash
# Verify ticket status in Directus admin panel
# Ensure status field is exactly 'ACTIVATED' (case-sensitive)
```

**Issue: Slot capacity not updating**
```bash
# Check Directus permissions for reservation_slots collection
# Ensure API has write access to update available_count
```

---

**Status:** ✅ Directus integration complete
**Mode:** Directus CMS (`USE_DIRECTUS=true`)
**Collections:** tickets, ticket_reservations, reservation_slots
**Ready for:** Production use, Hong Kong timezone validation


**Status:** ✅ All endpoints tested and working
**Mode:** Mock service (USE_DATABASE=false)
**Ready for:** Newman automation, Frontend integration
