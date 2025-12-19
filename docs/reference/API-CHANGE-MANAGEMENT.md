# API Change Management Guide

## Overview
When existing APIs evolve, AI must follow systematic update process to ensure backward compatibility and proper documentation.

## Change Type Classification

**Before making changes, classify the modification:**

| Change Type | Description | Breaking? | Example |
|------------|-------------|-----------|---------|
| **Non-breaking** | Add optional fields | ✅ Safe | Add `customer_note?: string` |
| **Breaking** | Remove/rename/require fields | ❌ Dangerous | Remove `channel_id` |
| **Business Logic** | Calculation changes | ⚠️ Depends | Change pricing formula |
| **New Endpoint** | Add new API path | ✅ Safe | Add `GET /orders/:id/history` |
| **Performance** | Optimization without behavior change | ✅ Safe | Add caching |

## Document Update Matrix

**Which layers to update based on change type:**

| Change Type | Update PRD? | Update Story? | Update Card? | Version Card? |
|------------|-------------|--------------|-------------|--------------|
| Add optional field | ❌ No | ❌ No | ✅ Yes | ❌ No |
| Add required field | ⚠️ Maybe | ⚠️ Maybe | ✅ Yes | ✅ Yes (v2) |
| Remove field | ⚠️ Maybe | ⚠️ Maybe | ✅ Yes | ✅ Yes (v2) |
| Rename field | ⚠️ Maybe | ⚠️ Maybe | ✅ Yes | ✅ Yes (v2) |
| Business logic | ✅ Yes | ⚠️ If UX changes | ✅ Yes | ⚠️ Maybe |
| New endpoint | ❌ No | ⚠️ If new capability | ✅ New section | ❌ No |

## Workflow for Each Change Type

### Type 1: Non-Breaking Changes (Adding Optional Fields)

```bash
# Example: Adding customer_note to order creation

# Step 1: Identify affected Card
grep -A 30 "POST /orders" docs/cards/order-create.md

# Step 2: Update Card (SAME FILE, no version needed)
# Add field to request schema
# Add field to example
# Update implementation notes

# Step 3: Update OpenAPI
# Add property to schema, mark as optional

# Step 4: Update TypeScript types
# Add optional property to interface

# Step 5: Update tests
# Add test case with new field
# Ensure backward compatibility (without field still works)

# Step 6: Reality Check
curl -X POST http://localhost:8080/api/orders \
  -d '{"items":[...], "customer_note": "test"}'  # With new field

curl -X POST http://localhost:8080/api/orders \
  -d '{"items":[...]}'  # Without new field (must still work)
```

**Result:**
- ✅ Card updated (same file)
- ❌ No Story/PRD changes
- ✅ Backward compatible

### Type 2: Breaking Changes (Remove/Rename Fields)

```bash
# Example: channel_id → partner_id

# Step 1: AI MUST WARN USER
🚨 "This is a BREAKING CHANGE. Existing clients will fail.
   Options:
   1️⃣ Support both fields during migration period
   2️⃣ Create versioned endpoint (/v2/orders)
   3️⃣ Force immediate migration (notify all clients)"

# Step 2: Implement versioning IN SAME CARD FILE
# Update docs/cards/order-create.md:
```

**Card Version Template:**
```markdown
## Version History

### v2 (Current) - 2025-11-19
**Breaking Change**: Replaced channel_id with partner_id

POST /v2/orders
- partner_id: string (NEW)

**Migration from v1:**
channel_id: 1 → partner_id: "ota_partner"

### v1 (Deprecated) - Remove by 2026-03-31
POST /orders
- channel_id: number (DEPRECATED)
```

**Implementation with backward compatibility:**
```typescript
// Support both versions
router.post('/orders', (req) => {
  logger.warn('Deprecated endpoint: POST /orders');
  const partner_id = mapChannelToPartner(req.body.channel_id);
  // Internally use v2 logic
});

router.post('/v2/orders', (req) => {
  // New implementation
});
```

**Steps to complete:**
```bash
# Step 3: Check if Story affected
grep "channel" docs/stories/US-*.md
# If user-facing change → update Story acceptance criteria

# Step 4: Check if PRD affected
grep "channel\|partner" docs/prd/PRD-*.md
# If business model changed → update PRD

# Step 5: Update tests
# Test both v1 (deprecated) and v2 endpoints
# Verify v1 → v2 conversion works

# Step 6: Add Migration Notes in Card
```

**Result:**
- ✅ Card updated with version sections (SAME FILE)
- ⚠️ Story updated if UX changed
- ⚠️ PRD updated if business model changed
- ✅ Migration notes in Card

### Type 3: Business Logic Changes

```bash
# Example: Order total now includes tax + shipping

# Step 1: Update PRD (business rule changed)
# docs/prd/PRD-001-cruise-ticketing-platform.md
```

**PRD Update Example:**
```markdown
## Pricing Strategy (Updated 2025-11-19)
**Total Price Calculation:**
- Subtotal: sum(item.price × qty)
- Tax: subtotal × 8%
- Shipping: calculated by weight
- **Total: subtotal + tax + shipping**
```

**Card Update Example:**
```markdown
Response:
{
  "order_id": "...",
  "subtotal": 1000,      # BREAKDOWN ADDED
  "tax": 80,             # NEW
  "shipping_fee": 50,    # NEW
  "total_price": 1130    # CHANGED CALCULATION
}
```

**Test Update Example:**
```javascript
// PRD-001-business-rules.postman_collection.json
pm.test("PRD-001: Total = subtotal + tax + shipping", () => {
  pm.expect(response.total_price).to.equal(
    response.subtotal + response.tax + response.shipping_fee
  );
});
```

```bash
# Step 4: Check if Story affected
# If user now sees tax/shipping breakdown → update Story
# If only backend calculation → no Story update

# Step 5: AI MUST WARN
🚨 "Business logic change will affect total_price values!
   All clients expecting old calculation will see different results."
```

**Result:**
- ✅ PRD updated (business rule)
- ✅ Card updated (API spec)
- ✅ PRD business-rules tests added
- ⚠️ Story updated if UX affected

## Card Version Management Best Practice

**IMPORTANT: Manage versions in SAME FILE, not new files**

```markdown
# docs/cards/order-create.md

---
card: "Order Create API"
status: "Active"
current_version: "v2"
last_updated: "2025-11-19"
---

## Current Version: v2

POST /v2/orders
[Current API specification]

---

## Version History

### v2 (2025-11-19) - Current
**Breaking Changes:**
- Replaced `channel_id` with `partner_id`

**Migration:**
// Old: { channel_id: 1 }
// New: { partner_id: "ota_partner" }

### v1 (2024-10-27) - Deprecated (Remove: 2026-03-31)
POST /orders (deprecated)
- channel_id: number (DEPRECATED)
```

**Principles:**
- ✅ Single Card file per logical endpoint
- ✅ Version sections within file
- ✅ Clear migration notes
- ✅ Deprecation timeline
- ❌ DO NOT create order-create-v2.md
- ❌ DO NOT duplicate content across files

## Quick Reference: AI Decision Flow

```
User: "API需要修改..."
         ↓
AI分类: Non-breaking? Breaking? Business?
         ↓
┌────────┴────────┐
│                 │
非破坏性           破坏性/业务逻辑
│                 │
更新Card           警告用户 + 询问策略
(same file)        │
│                 ├─ 版本化? → Card添加版本章节
测试向后兼容        ├─ Story受影响? → 更新Story
                  └─ PRD变化? → 更新PRD + 测试
```

## Real Examples

### Example 1: Adding Optional Customer Note (Non-Breaking)

**User Request**: "订单创建时希望能添加备注"

**AI Analysis**: Non-breaking change (optional field)

**Actions Taken**:
1. Updated `docs/cards/order-create.md` (same file, no version)
2. Added `customer_note?: string` to request schema
3. Updated TypeScript interface with optional property
4. Added test case with and without the field
5. Verified backward compatibility

**Result**: ✅ Deployed without breaking existing clients

### Example 2: Renaming channel_id to partner_id (Breaking)

**User Request**: "我们需要支持多个OTA合作伙伴，channel_id改为partner_id"

**AI Warning**: 🚨 BREAKING CHANGE - existing clients will fail

**User Choice**: "创建/v2端点，保留/v1兼容6个月"

**Actions Taken**:
1. Created version section in `docs/cards/order-create.md`
2. Implemented `/v2/orders` with new field
3. Added backward compatibility layer for `/orders`
4. Updated PRD-002 (business model change: multi-partner support)
5. Updated US-012 Story (acceptance criteria changed)
6. Added migration guide in Card
7. Set deprecation deadline: 2026-05-19

**Result**: ✅ Both versions working, migration path clear

### Example 3: Tax Calculation Business Logic (Business Change)

**User Request**: "现在需要在总价中加入税费和运费"

**AI Analysis**: Business logic change, affects calculations

**User Impact**: 🚨 All order totals will change

**Actions Taken**:
1. Updated PRD-001 pricing strategy section
2. Updated `docs/cards/order-create.md` response schema
3. Added breakdown fields: `subtotal`, `tax`, `shipping_fee`
4. Created PRD-001 business rules test collection
5. Updated Story acceptance criteria (users see breakdown)
6. Notified stakeholders of calculation change

**Result**: ✅ New pricing logic deployed with full transparency

---

**Related Documents**:
- `CLAUDE.md` - Main AI workflow guide
- `docs/reference/DOCUMENT-LAYER-DECISION.md` - When to update which layer
- `docs/cards/` - Technical API specifications
