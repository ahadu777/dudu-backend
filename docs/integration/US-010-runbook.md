# US-010 — Admin Package Configuration (Templates & Route Fares)

Guided flow to exercise the admin configuration APIs delivered in this iteration: package template versioning and route fare revisions.

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Admin auth**: Mock endpoints require no auth but assume admin context
- **Server running**: `npm run build && PORT=8080 npm start`
- **Fresh state**: Optionally reset mock store via `POST /demo/reset` if previous runs mutated data

## Step-by-Step Flow

### Demo Preview
- 启动服务：`npm run start`
- 打开浏览器访问 `http://localhost:8080/demo/admin-packages`
- 页面提供模板列表、版本历史、线路票价配置与回滚的即时反馈，可直接观察 API 效果。

### 1. Create Initial Package Template (v1)
```bash
curl -s -X POST http://localhost:8080/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -d '{
        "name": "Weekend Explorer",
        "description": "2-day multi-attraction pass",
        "status": "draft",
        "entitlements": [
          {
            "function_code": "museum",
            "label": "Museum entry",
            "quantity": 2,
            "redemption_channel": "mobile",
            "requires_id_verification": false,
            "validity_type": "relative",
            "validity_duration_days": 7
          }
        ],
        "pricing": {
          "currency": "USD",
          "tiers": [
            {
              "tier_id": "base",
              "name": "Base",
              "customer_types": ["adult"],
              "price": 120,
              "currency": "USD"
            }
          ]
        }
      }' | jq '.'
```

**Expected**: `201` with `idempotent: false`, `version: v1.0.0`, and a generated `templateId`.

### 2. Upsert Same Payload (Idempotent)
```bash
curl -s -X POST http://localhost:8080/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -d '{ ...same payload as above... }' | jq '.'
```

**Expected**: `200` with `idempotent: true`, confirming no duplicate version created.

### 3. Create New Version (v1.0.1)
```bash
curl -s -X POST http://localhost:8080/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -d '{
        "name": "Weekend Explorer",
        "version": "v1.0.1",
        "description": "Adds aquarium access",
        "status": "active",
        "entitlements": [
          { "function_code": "museum", "label": "Museum entry", "quantity": 2, "redemption_channel": "mobile", "requires_id_verification": false, "validity_type": "relative", "validity_duration_days": 7 },
          { "function_code": "aquarium", "label": "Aquarium entry", "quantity": 1, "redemption_channel": "operator", "requires_id_verification": true, "validity_type": "absolute", "validity_start_at": "2025-11-01T00:00:00Z", "validity_end_at": "2026-01-31T23:59:59Z" }
        ],
        "pricing": {
          "currency": "USD",
          "tiers": [
            { "tier_id": "base", "name": "Base", "customer_types": ["adult"], "price": 120, "currency": "USD" },
            { "tier_id": "family", "name": "Family", "customer_types": ["adult", "child"], "price": 210, "currency": "USD" }
          ]
        }
      }' | jq '.'
```

**Expected**: `201` with `version: v1.0.1`.

### 4. Inspect Template History
```bash
TEMPLATE_ID=$(curl -s http://localhost:8080/admin/packages/templates | jq -r '.templates[0].templateId')
curl -s http://localhost:8080/admin/packages/templates/$TEMPLATE_ID/versions | jq '.'
```

**Expected**: Array containing both `v1.0.0` and `v1.0.1` entries with timestamps.

### 5. Configure Route Fares (Revision 1)
```bash
curl -s -X PUT http://localhost:8080/admin/routes/fares/RT-001 \
  -H 'Content-Type: application/json' \
  -d '{
        "fares": [
          { "passenger_type": "adult", "price": 35, "currency": "USD" },
          { "passenger_type": "child", "price": 20, "currency": "USD" }
        ],
        "lockMinutes": 45,
        "blackoutDates": ["2025-12-31"]
      }' | jq '.'
```

**Expected**: `200` with `revision: 1`.

### 6. Update Route Fares (Revision 2)
```bash
curl -s -X PUT http://localhost:8080/admin/routes/fares/RT-001 \
  -H 'Content-Type: application/json' \
  -d '{
        "fares": [
          { "passenger_type": "adult", "price": 32, "currency": "USD" },
          { "passenger_type": "child", "price": 18, "currency": "USD" },
          { "passenger_type": "elderly", "price": 15, "currency": "USD" }
        ],
        "lockMinutes": 30
      }' | jq '.'
```

**Expected**: `200` with `revision: 2` and updated fares.

### 7. Retrieve Route Fare History
```bash
curl -s http://localhost:8080/admin/routes/fares/RT-001/history | jq '.'
```

**Expected**: History containing both revisions (1 and 2).

### 8. Restore Previous Revision
```bash
curl -s -X POST http://localhost:8080/admin/routes/fares/RT-001/restore | jq '.'
```

**Expected**: `200` response reflecting the earlier fare setup (prices 35/20, lockMinutes 45).

### 9. Confirm Current Configuration
```bash
curl -s http://localhost:8080/admin/routes/fares/RT-001 | jq '.'
```

**Expected**: Matches revision 1 and `blackoutDates` restored.

### 10. Negative Checks
- **Template version conflict**: Re-run step 3 with altered payload but identical `version` to expect `409`.
- **Route restore without history**: Call restore twice consecutively → second call returns `409`.

## Validation Summary
- [ ] Template creation idempotency proven (`201` then `200 idempotent`)
- [ ] Template history lists all versions
- [ ] Route fare revisions maintain history and allow rollback
- [ ] Restore endpoint blocks when no prior revision exists
- [ ] Error conditions return documented status codes

## Next Steps
- Automate with Newman collection (`reports/newman/admin-package-config.json`)
- Wire examples under `examples/admin-package-config.ts`
