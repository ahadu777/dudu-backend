# Document Layer Decision

## Three-Layer Hierarchy

```
PRD (Product Requirements)     ← Product domain, business context, success metrics
  ↓ has many
Stories (User Capabilities)    ← User journeys, acceptance criteria
  ↓ has many
Cards (Technical Implementation) ← API endpoints, database schemas
  ↓ maps to
Code (src/modules/)            ← Actual implementation
```

## Decision Questions

### Question 1: Is this a NEW product domain?

**Create new PRD if:**
- ✅ New business model or revenue stream
- ✅ New customer segment or market
- ✅ New product category
- ✅ Requires separate success metrics

### Question 2: Is this a NEW user capability?

**Create new Story if:**
- ✅ New end-to-end user journey
- ✅ New actor or user role
- ✅ Crosses multiple technical components
- ✅ Has distinct acceptance criteria

### Question 3: Is this a NEW API endpoint?

**Create new Card if:**
- ✅ New API endpoint
- ✅ New database table
- ✅ New external integration

**Update existing Card if:**
- ✅ Adding fields to existing endpoint
- ✅ Enhancing existing functionality
- ✅ Performance optimization

## Decision Matrix

| User Request | Layer | Action |
|-------------|-------|--------|
| "我想做会员积分系统" | **PRD** | Create PRD |
| "用户能查看订单历史" | **Story** | Create Story |
| "订单列表需要分页" | **Card** | Update Card |
| "修复分页的bug" | **Code** | Update code |

## Common Mistakes

**Mistake 1: Creating new Story for minor enhancement**
```
❌ User: "订单列表需要排序"
   AI: Creates new US-XXX "Order Sorting Feature"

✅ Correct: Update existing order-list Card
```

**Mistake 2: Creating new Card for same endpoint**
```
❌ User: "订单创建需要添加备注字段"
   AI: Creates new Card "order-create-with-notes"

✅ Correct: Update existing order-create Card
```

**Mistake 3: Missing PRD for new product domain**
```
❌ User: "我想做会员系统"
   AI: Creates US-XXX "Member Management" directly

✅ Correct: Create PRD first, then Stories under it
```

## Validation Template

```
🤖 我发现这个需求可能属于 [PRD/Story/Card] 层：
   理由: [Explanation]

   是否正确？如不正确，请说明业务场景。
```
