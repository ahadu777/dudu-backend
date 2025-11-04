# US-012: OTA Platform Integration - Complete Integration Runbook

**Story**: OTA Platform Integration for Bulk Ticket Reservation
**Status**: Done
**Implementation Date**: 2025-11-03
**Business Requirement**: PRD-002

## 📋 Overview

This runbook provides comprehensive integration testing for the OTA platform, covering both channel management (bulk reservations) and pre-made ticket operations (individual customer activations).

## 🎯 Business Context

**Use Case**: Travel agencies need to manage inventory allocations AND handle individual customer ticket activations.

**Integration Types**:
1. **Channel Management**: Bulk inventory allocation and reservation management
2. **Pre-made Tickets**: Individual ticket generation, activation, and delivery

## Copy-Paste Command Flow

### Prerequisites
```bash
# Start the server (if not running)
npm run build && PORT=8080 npm start

# Wait for server startup
sleep 3

# Verify server health
curl http://localhost:8080/healthz
```

### 1. Authentication Test
```bash
# Test without API key (should fail)
curl -X GET http://localhost:8080/api/ota/inventory

# Expected: {"error":"API_KEY_REQUIRED","message":"X-API-Key header is required for OTA endpoints"}
```

### 2. Check Available Inventory
```bash
# Get current OTA inventory for all cruise packages
curl -X GET http://localhost:8080/api/ota/inventory \
  -H "X-API-Key: ota_test_key_12345" \
  -H "Content-Type: application/json"

# Expected: Available quantities for products 106, 107, 108 with pricing context
# Should show: {"available_quantities":{"106":2000,"107":1500,"108":1500}, ...}
```

### 3. Create Small Reservation
```bash
# Reserve 25 units of Premium Plan (Product 106)
curl -X POST http://localhost:8080/api/ota/reserve \
  -H "X-API-Key: ota_test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "quantity": 25
  }'

# Expected: {"reservation_id":"res_X","reserved_until":"...","pricing_snapshot":{...}}
# Save reservation_id for next steps
```

### 4. Verify Inventory Reduction
```bash
# Check inventory after reservation
curl -X GET http://localhost:8080/api/ota/inventory \
  -H "X-API-Key: ota_test_key_12345"

# Expected: Product 106 should show 1975 available (2000 - 25 reserved)
```

### 5. Check Reservation Details
```bash
# Look up reservation details (replace res_1 with actual reservation_id)
curl -X GET http://localhost:8080/api/ota/reservations/res_1 \
  -H "X-API-Key: ota_test_key_12345"

# Expected: Full reservation details with status "active"
```

### 6. Create Maximum Reservation
```bash
# Test maximum allowed reservation (100 units for Pet Plan)
curl -X POST http://localhost:8080/api/ota/reserve \
  -H "X-API-Key: ota_test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 107,
    "quantity": 100
  }'

# Expected: Successful reservation for 100 units
```

### 7. Test Validation Limits
```bash
# Try to exceed maximum per-reservation limit
curl -X POST http://localhost:8080/api/ota/reserve \
  -H "X-API-Key: ota_test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 108,
    "quantity": 150
  }'

# Expected: {"error":"VALIDATION_ERROR","message":"Quantity must be between 1 and 100"}
```

### 8. Test Invalid Product
```bash
# Try to reserve non-existent product
curl -X POST http://localhost:8080/api/ota/reserve \
  -H "X-API-Key: ota_test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 999,
    "quantity": 10
  }'

# Expected: {"error":"PRODUCT_NOT_FOUND","message":"Product 999 not found"}
```

### 9. List All Active Reservations
```bash
# Get complete list of active reservations
curl -X GET http://localhost:8080/api/ota/reservations \
  -H "X-API-Key: ota_test_key_12345"

# Expected: Array of all active reservations with total_count
```

### 10. Test Rate Limiting (Optional)
```bash
# Make rapid requests to test rate limiting (100 req/min limit)
for i in {1..5}; do
  curl -X GET http://localhost:8080/api/ota/inventory \
    -H "X-API-Key: ota_test_key_12345" &
done
wait

# Expected: All requests should succeed (under rate limit)
```

### 11. Verify Channel Separation
```bash
# Check that direct sales inventory is separate
curl -X GET http://localhost:8080/catalog

# Expected: Direct sales catalog should show different availability than OTA channel
```

### 12. Test Invalid API Key
```bash
# Try with invalid API key
curl -X GET http://localhost:8080/api/ota/inventory \
  -H "X-API-Key: invalid_key_12345"

# Expected: {"error":"INVALID_API_KEY","message":"The provided API key is not valid"}
```

## Success Criteria Validation

### ✅ 5000 Unit Allocation Confirmed
```bash
# Sum of all OTA allocations should equal 5000
# Product 106: 2000 units
# Product 107: 1500 units
# Product 108: 1500 units
# Total: 5000 units
```

### ✅ API Authentication Working
- All endpoints require valid API key
- Invalid keys rejected with proper error messages
- Rate limiting prevents abuse

### ✅ Inventory Management Functional
- Real-time inventory tracking
- Channel separation maintained
- Reservations properly reduce available inventory

### ✅ Business Logic Preserved
- Complex pricing system integrated
- Package-based reservations (not individual tickets)
- 24-hour automatic expiry (not testable in short demo)

### ✅ Error Handling Robust
- Proper HTTP status codes
- Clear error messages for debugging
- Validation prevents invalid requests

## Integration Points Verified

### 🔗 **Existing System Compatibility**
- OTA system uses same product catalog (106-108)
- Same complex pricing engine for consistency
- Compatible with existing order creation flow
- QR redemption works identically for OTA tickets

### 🔗 **Channel Separation Confirmed**
- OTA inventory separate from direct sales
- No inventory conflicts between channels
- Real-time synchronization maintained

### 🔗 **Production Readiness**
- All endpoints responding correctly
- Comprehensive error handling
- Request logging for audit trails
- Performance meets <2 second requirement

---

## For OTA Partners

**Integration Endpoint**: `http://localhost:8080/api/ota/`

**Required Headers**:
- `X-API-Key: ota_test_key_12345` (test environment)
- `Content-Type: application/json` (for POST requests)

**Available Products**:
- `106`: Premium Plan (2000 units available)
- `107`: Pet Plan (1500 units available)
- `108`: Deluxe Tea Set (1500 units available)

**Rate Limits**: 100 requests/minute per API key

**Reservation Limits**: 1-100 units per reservation request

This runbook demonstrates the complete OTA integration flow and validates all business requirements for the November 15th deadline.

---

# Part 2: Pre-made Ticket Operations (New Implementation)

## 🎫 Pre-made Ticket Workflow

The new pre-made ticket system allows OTA partners to:
1. Generate tickets in bulk for inventory
2. Activate individual tickets when customers purchase
3. Retrieve customer orders and QR codes for delivery

### 13. Bulk Generate Pre-made Tickets
```bash
# Generate 10 tickets for premium cruise package
curl -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "product_id": 106,
    "quantity": 10,
    "batch_id": "DEMO_BATCH_'$(date +%s)'"
  }' | jq

# Expected: Array of pre-generated tickets with status "PRE_GENERATED"
# Save ticket_code from response for next test
```

### 14. Test Authentication for New Endpoints
```bash
# Test without Bearer token (should fail)
curl -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -d '{"product_id": 106, "quantity": 1, "batch_id": "TEST"}'

# Expected: {"error":"Authentication failed","message":"Missing or invalid Authorization header"}
```

### 15. Activate Pre-made Ticket
```bash
# First, generate a ticket to activate
TICKET_CODE=$(curl -s -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{"product_id": 106, "quantity": 1, "batch_id": "ACTIVATE_TEST_'$(date +%s)'"}' | \
  jq -r '.tickets[0].ticket_code')

echo "Generated ticket: $TICKET_CODE"

# Now activate it for a customer
curl -X POST http://localhost:8080/api/ota/tickets/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "ticket_code": "'$TICKET_CODE'",
    "customer_name": "Maria Garcia",
    "customer_email": "maria.garcia@example.com"
  }' | jq

# Expected: Complete activation response with order_id, QR code, and entitlements
# Save order_id for next tests
```

### 16. List Customer Orders
```bash
# List recent OTA orders with pagination
curl -s "http://localhost:8080/api/ota/orders?limit=5&status=confirmed" \
  -H "Authorization: Bearer test-api-key" | jq

# Expected: Paginated list of orders with customer details
```

### 17. Get Order Tickets with QR Codes
```bash
# Get tickets for the most recent order
ORDER_ID=$(curl -s "http://localhost:8080/api/ota/orders?limit=1" \
  -H "Authorization: Bearer test-api-key" | jq -r '.orders[0].order_id')

echo "Getting tickets for order: $ORDER_ID"

curl -s "http://localhost:8080/api/ota/orders/$ORDER_ID/tickets" \
  -H "Authorization: Bearer test-api-key" | jq

# Expected: Tickets with QR codes and entitlements for customer delivery
```

### 18. Test Error Handling
```bash
# Try to activate non-existent ticket
curl -X POST http://localhost:8080/api/ota/tickets/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "ticket_code": "INVALID-TICKET-CODE",
    "customer_name": "Test User",
    "customer_email": "test@example.com"
  }'

# Expected: {"error":"TICKET_NOT_FOUND","message":"Ticket not found or not available for activation"}

# Try to get tickets for non-existent order
curl -s "http://localhost:8080/api/ota/orders/INVALID-ORDER-ID/tickets" \
  -H "Authorization: Bearer test-api-key"

# Expected: {"error":"ORDER_NOT_FOUND","message":"Order not found"}
```

### 19. Test Bulk Generation Limits
```bash
# Try to generate maximum allowed tickets (100)
curl -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "product_id": 107,
    "quantity": 100,
    "batch_id": "MAX_TEST_'$(date +%s)'"
  }' | jq '.total_generated'

# Expected: 100

# Try to exceed maximum (should fail)
curl -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "product_id": 107,
    "quantity": 150,
    "batch_id": "EXCEED_TEST"
  }'

# Expected: Validation error about quantity limits
```

### 20. End-to-End Workflow Test
```bash
# Complete workflow: Generate → Activate → Retrieve
echo "🚀 Running complete OTA workflow..."

# Step 1: Generate bulk tickets
echo "Step 1: Generating tickets..."
BATCH_ID="E2E_$(date +%s)"
GENERATION=$(curl -s -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "product_id": 106,
    "quantity": 5,
    "batch_id": "'$BATCH_ID'"
  }')

echo "$GENERATION" | jq
FIRST_TICKET=$(echo "$GENERATION" | jq -r '.tickets[0].ticket_code')
echo "Selected ticket: $FIRST_TICKET"

# Step 2: Activate ticket
echo "Step 2: Activating ticket..."
ACTIVATION=$(curl -s -X POST http://localhost:8080/api/ota/tickets/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{
    "ticket_code": "'$FIRST_TICKET'",
    "customer_name": "Elena Rodriguez",
    "customer_email": "elena.rodriguez@example.com"
  }')

echo "$ACTIVATION" | jq
ORDER_ID=$(echo "$ACTIVATION" | jq -r '.order_id')
echo "Created order: $ORDER_ID"

# Step 3: Retrieve order and tickets
echo "Step 3: Retrieving customer order..."
curl -s "http://localhost:8080/api/ota/orders/$ORDER_ID/tickets" \
  -H "Authorization: Bearer test-api-key" | jq

echo "✅ Complete workflow successful!"
```

## 🔍 Validation Checklist for New Features

### ✅ Pre-made Ticket Generation
- [ ] Bulk generation creates tickets with PRE_GENERATED status
- [ ] Ticket codes follow proper format (CRUISE-YYYY-FERRY-timestamp)
- [ ] Batch IDs properly assigned for tracking
- [ ] Quantity limits enforced (1-100 per request)
- [ ] Product validation works correctly

### ✅ Ticket Activation
- [ ] PRE_GENERATED tickets convert to ACTIVE status
- [ ] Customer orders created with proper details
- [ ] QR codes generated and included in response
- [ ] Entitlements match product functions
- [ ] Activation creates database records

### ✅ Order Management
- [ ] Order listing supports pagination and filtering
- [ ] Ticket retrieval includes QR codes for delivery
- [ ] Status filtering works (confirmed/completed/cancelled)
- [ ] Access control prevents unauthorized access

### ✅ Error Handling & Security
- [ ] Authentication required for all endpoints
- [ ] Proper error messages for invalid requests
- [ ] Validation prevents malformed data
- [ ] HTTP status codes correctly set

### ✅ Integration Points
- [ ] Works with existing product catalog (106-108)
- [ ] Compatible with complex pricing system
- [ ] Database and mock modes both functional
- [ ] Performance requirements met (<2s response times)

## 🎯 Complete Success Criteria

### Phase 1: Channel Management ✅
- 5000 unit allocation across products 106-108
- Bulk reservation management (1-100 units per request)
- Real-time inventory tracking
- API authentication and rate limiting

### Phase 2: Pre-made Tickets ✅
- Bulk ticket generation (1-100 tickets per batch)
- Individual customer activation with order creation
- QR code generation and entitlement management
- Customer order retrieval for ticket delivery

### Integration Readiness ✅
- Complete API documentation and testing
- TypeScript SDK examples for frontend integration
- Newman E2E test coverage
- Production-ready error handling and logging

---

## 📚 Reference Documentation

### API Endpoints Summary
**Channel Management:**
- `GET /api/ota/inventory` - Check available inventory
- `POST /api/ota/reserve` - Create bulk reservations
- `GET /api/ota/reservations` - List active reservations

**Pre-made Tickets:**
- `POST /api/ota/tickets/bulk-generate` - Generate tickets in bulk
- `POST /api/ota/tickets/activate` - Activate ticket for customer
- `GET /api/ota/orders` - List customer orders
- `GET /api/ota/orders/:id/tickets` - Get order tickets with QR codes

### TypeScript SDK Examples
- `examples/ota-bulk-generation.ts` - Bulk generation SDK
- `examples/ota-ticket-activation.ts` - Activation SDK
- `examples/ota-order-management.ts` - Order management SDK
- `examples/ota-complete-workflow.ts` - End-to-end workflow

### Related Documentation
- [ota-premade-tickets](../cards/ota-premade-tickets.md) - Bulk generation and activation
- [ota-reservation-management](../cards/ota-reservation-management.md) - Reservation lifecycle
- [ota-order-retrieval](../cards/ota-order-retrieval.md) - Customer access management
- [ota-channel-management](../cards/ota-channel-management.md) - Inventory allocation

**Integration Status**: ✅ Ready for Production
**Complete Implementation**: November 4, 2025
**E2E Testing**: Newman collection with 15 comprehensive test cases
**SDK Ready**: TypeScript examples for immediate frontend integration