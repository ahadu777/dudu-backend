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

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Runbook 已有内容生成。

### Round 1: 核心功能 (5 scenarios)

- [ ] **TC-OTA-001**: 生成 B2B2C Reseller 批次
  - 操作: 提交批量生成请求（包含 reseller_metadata 和 batch_metadata）
  - **Expected**: 返回 201，包含 batch_id 和 5 张预生成票券及二维码

- [ ] **TC-OTA-002**: 验证数据库持久化
  - 操作: 在数据库中查询 ota_ticket_batches 表
  - **Expected**: 找到对应批次记录，reseller_metadata 正确存储

- [ ] **TC-OTA-003**: 验证 JSON 索引性能
  - 操作: 使用 JSON_EXTRACT 查询 campaign_type = 'flash_sale'
  - **Expected**: 查询成功返回包含新批次的统计数量

- [ ] **TC-OTA-004**: 激活票券（工作日定价）
  - 操作: 激活票券，customer_type=adult，visit_date 为工作日（2025-11-19）
  - **Expected**: 返回 200，status: ACTIVE，ticket_price: 288 HKD（工作日成人价）

- [ ] **TC-OTA-005**: 激活票券（周末定价）
  - 操作: 激活票券，customer_type=child，visit_date 为周末（2025-11-23）
  - **Expected**: 返回 200，ticket_price: 218 HKD（儿童价 188 + 周末溢价 30）

### Round 2: 异常场景 (3 scenarios)

- [ ] **TC-OTA-006**: 缺少 API Key 认证
  - 操作: 不带 X-API-Key header 提交批量生成请求
  - **Expected**: 返回 401，错误信息 "API_KEY_REQUIRED"

- [ ] **TC-OTA-007**: 无效票券码激活
  - 操作: 使用不存在的票券码进行激活
  - **Expected**: 返回 404 或 400，错误信息包含票券不存在提示

- [ ] **TC-OTA-008**: Mock 模式行为验证
  - 操作: 切换到 USE_DATABASE=false，提交相同批量生成请求
  - **Expected**: 返回可预测的票券码（如 CRUISE-2025-PREMIUM-50001），无数据库持久化

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 新增 QA E2E Checklist |
| 1.0 | 2024-12-06 | System | 初始版本 |