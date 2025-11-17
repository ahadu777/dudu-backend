# B2B2C Reseller Billing - Integration Runbook

## 🎯 Business Scenario
OTA partners can generate bulk tickets with enhanced B2B2C reseller functionality, including pricing snapshots, campaign tracking, and usage-based billing tied to ticket redemption.

## 🔧 Prerequisites
```bash
# 1. Server running with database mode
export USE_DATABASE=true && npm start

# 2. Valid API credentials
API_KEY="ota_test_key_12345"  # Has tickets:bulk-generate permission
BASE_URL="http://localhost:8080"

# 3. Database verification commands ready
DB_HOST=wp-blue.cqsqnun7uqvc.ap-east-1.rds.amazonaws.com
DB_USERNAME=dudu
DB_PASSWORD='dudu_251101@dev'
DB_DATABASE=dudu
```

## 🚀 Complete Integration Flow

### Step 1: Generate B2B2C Reseller Batch
```bash
curl -X POST $BASE_URL/api/ota/tickets/bulk-generate \
-H "Content-Type: application/json" \
-H "X-API-Key: $API_KEY" \
-d '{
  "batch_id": "INTG_TEST_B2B2C_001",
  "partner_id": "test_partner",
  "product_id": 106,
  "quantity": 5,
  "distribution_mode": "reseller_batch",
  "reseller_metadata": {
    "intended_reseller": "Premium Travel Partners Ltd",
    "commission_rate": 0.18,
    "markup_percentage": 0.30,
    "payment_terms": "net_45",
    "auto_invoice": true,
    "billing_contact": "finance@premiumtravel.com",
    "settlement_currency": "HKD"
  },
  "batch_metadata": {
    "campaign_type": "flash_sale",
    "campaign_name": "Hong Kong Harbor Premium Flash Sale",
    "promotion_code": "HK2024FLASH",
    "target_demographic": "luxury_travelers",
    "geographic_focus": "Asia Pacific",
    "valid_until": "2025-12-31T23:59:59Z"
  }
}' | python3 -m json.tool
```

**Expected Response**: 201 with complete batch details and 5 pre-generated tickets with QR codes.

### Step 2: Verify Database Persistence
```bash
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
-e "SELECT batch_id, partner_id, total_quantity, distribution_mode, status, tickets_generated, JSON_EXTRACT(reseller_metadata, '$.intended_reseller') as reseller FROM ota_ticket_batches WHERE batch_id = 'INTG_TEST_B2B2C_001';"
```

**Expected Result**: 1 row showing batch persisted with correct reseller metadata.

### Step 3: Verify JSON Index Performance
```bash
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
-e "SELECT COUNT(*) as flash_sale_count FROM ota_ticket_batches WHERE JSON_EXTRACT(batch_metadata, '$.campaign_type') = 'flash_sale';"
```

**Expected Result**: Count includes our new batch (validates JSON index works).

### Step 4: Activate Individual Ticket (Weekday Pricing)
```bash
# Extract ticket_code from Step 1 response, then:
TICKET_CODE="CRUISE-2025-FERRY-XXXXXXXXX"  # Replace with actual code

curl -X POST $BASE_URL/api/ota/tickets/$TICKET_CODE/activate \
-H "Content-Type: application/json" \
-H "X-API-Key: $API_KEY" \
-d '{
  "customer_details": {
    "name": "Alice Chen",
    "email": "alice.chen@example.com",
    "phone": "+85212345678"
  },
  "customer_type": "adult",
  "visit_date": "2025-11-19",
  "payment_reference": "PAY-PREMIUM-2024-001"
}' | python3 -m json.tool
```

**Expected Response**: 200 with order_id, status: "ACTIVE", ticket_price: 288 (weekday adult price), currency: "HKD".

### Step 4b: Activate Weekend Ticket (Weekend Pricing)
```bash
# Test weekend pricing with different customer type
TICKET_CODE_2="CRUISE-2025-FERRY-YYYYYYYYY"  # Replace with second ticket code

curl -X POST $BASE_URL/api/ota/tickets/$TICKET_CODE_2/activate \
-H "Content-Type: application/json" \
-H "X-API-Key: $API_KEY" \
-d '{
  "customer_details": {
    "name": "Bob Li",
    "email": "bob.li@example.com",
    "phone": "+85298765432"
  },
  "customer_type": "child",
  "visit_date": "2025-11-23",
  "payment_reference": "PAY-PREMIUM-2024-002"
}' | python3 -m json.tool
```

**Expected Response**: 200 with ticket_price: 218 (child base 188 + weekend premium 30), currency: "HKD".

### Step 5: Verify Mock vs Database Behavior
```bash
# Test same request in mock mode
export USE_DATABASE=false && npm start

curl -X POST $BASE_URL/api/ota/tickets/bulk-generate \
-H "Content-Type: application/json" \
-H "X-API-Key: $API_KEY" \
-d '{
  "batch_id": "MOCK_TEST_002",
  "product_id": 106,
  "quantity": 3,
  "distribution_mode": "reseller_batch",
  "reseller_metadata": {
    "intended_reseller": "Mock Test Agency"
  },
  "batch_metadata": {
    "campaign_type": "test_campaign"
  }
}' | python3 -m json.tool
```

**Expected Differences**:
- Mock: Predictable ticket codes (CRUISE-2025-PREMIUM-50001)
- Database: Random ticket codes (CRUISE-2025-FERRY-timestamp)
- Mock: No database persistence
- Database: Full persistence with JSON indexing

## ✅ Success Criteria Checklist

- [ ] **Bulk Generation**: 201 response with correct batch structure
- [ ] **Database Persistence**: Batch record in ota_ticket_batches table
- [ ] **JSON Metadata**: Reseller and campaign metadata properly stored
- [ ] **JSON Index**: Campaign type queries work efficiently
- [ ] **Ticket Activation**: Individual tickets can be activated successfully
- [ ] **Pricing Snapshots**: Locked pricing captured at generation time
- [ ] **Dual Mode**: Both database and mock modes work correctly
- [ ] **API Security**: Authentication and permissions enforced
- [ ] **Error Handling**: Invalid requests return proper 4xx responses

## 🔍 Validation Commands

### Quick Health Check
```bash
curl $BASE_URL/healthz
curl $BASE_URL/docs  # Verify Swagger UI loads
```

### Database Connection Test
```bash
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE -e "SHOW TABLES LIKE 'ota_ticket_batches';"
```

### API Permission Test
```bash
# Should fail without API key
curl -X POST $BASE_URL/api/ota/tickets/bulk-generate \
-H "Content-Type: application/json" \
-d '{"batch_id": "TEST", "product_id": 106, "quantity": 1}'

# Expected: 401 {"error": "API_KEY_REQUIRED"}
```

## 🎯 Business Value Demonstrated

1. **B2B2C Revenue Streams**: Reseller metadata enables commission tracking
2. **Campaign Analytics**: JSON-indexed campaign data for performance analysis
3. **Usage-Based Billing**: Ticket redemption tied to revenue tracking
4. **Pricing Stability**: Locked pricing snapshots prevent margin erosion
5. **Operational Efficiency**: Bulk generation reduces per-ticket overhead
6. **Multi-Partner Support**: Partner isolation ensures data security

This runbook validates complete B2B2C reseller billing functionality with real database persistence and comprehensive error handling.