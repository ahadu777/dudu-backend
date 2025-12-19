# API Change Management

## Change Type Classification

| Change Type | Breaking? | Example |
|------------|-----------|---------|
| **Non-breaking** | ✅ Safe | Add optional field `customer_note?: string` |
| **Breaking** | ❌ Dangerous | Remove/rename/require fields |
| **Business Logic** | ⚠️ Depends | Change pricing formula |
| **New Endpoint** | ✅ Safe | Add `GET /orders/:id/history` |

## Document Update Matrix

| Change Type | PRD? | Story? | Card? | Version? |
|------------|------|--------|-------|----------|
| Add optional field | ❌ | ❌ | ✅ | ❌ |
| Add required field | ⚠️ | ⚠️ | ✅ | ✅ v2 |
| Remove/rename field | ⚠️ | ⚠️ | ✅ | ✅ v2 |
| Business logic | ✅ | ⚠️ | ✅ | ⚠️ |

## Non-Breaking Changes

```bash
# Step 1: Find affected Card
grep -A 30 "POST /orders" docs/cards/order-create.md

# Step 2: Update Card (same file, no version)
# Add field to request schema and example

# Step 3: Update TypeScript types

# Step 4: Reality Check - verify backward compatibility
curl -X POST http://localhost:8080/api/orders \
  -d '{"items":[...], "new_field": "test"}'  # With new field

curl -X POST http://localhost:8080/api/orders \
  -d '{"items":[...]}'  # Without new field (must still work)
```

## Breaking Changes

**MUST warn user:**
```
🚨 这是 BREAKING CHANGE，现有客户端会失败。
   选项：
   1️⃣ 迁移期间同时支持两个字段
   2️⃣ 创建版本化端点 (/v2/orders)
   3️⃣ 强制立即迁移（通知所有客户端）

   您的选择？
```

**Version in SAME Card file:**
```markdown
## Version History

### v2 (Current) - 2025-11-19
**Breaking Change**: channel_id → partner_id

POST /v2/orders
- partner_id: string (NEW)

**Migration from v1:**
channel_id: 1 → partner_id: "ota_partner"

### v1 (Deprecated) - Remove by 2026-03-31
POST /orders
- channel_id: number (DEPRECATED)
```

**Principles:**
- ✅ Same Card file manages versions
- ❌ DO NOT create order-create-v2.md

## Business Logic Changes

**MUST warn user:**
```
🚨 业务逻辑变更会影响 total_price 值！
   所有依赖旧计算方式的客户端会看到不同结果。
```

**Update sequence:**
1. Update PRD (business rule changed)
2. Update Card (API response changed)
3. Add PRD business rules test
4. Check if Story affected (if UX changed)

## Decision Flow

```
User: "API需要修改..."
         ↓
AI分类: Non-breaking? Breaking? Business?
         ↓
┌────────┴────────┐
│                 │
非破坏性           破坏性/业务逻辑
│                 │
更新Card           ⚠️ 警告用户
(同一文件)          │
│                 ├─ 版本化? → Card添加版本章节
测试向后兼容        ├─ Story受影响? → 更新Story
                  └─ PRD变化? → 更新PRD
```
