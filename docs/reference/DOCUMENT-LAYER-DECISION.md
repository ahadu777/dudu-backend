# Document Layer Decision Tree: PRD vs Story vs Card

## Overview
AI must determine the correct documentation layer before creating anything.

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

## Decision Process

When user describes a requirement, AI asks these questions in order:

### Question 1: Is this a NEW product domain?

```bash
# Check if this requires a new PRD
grep -ri "product-domain-keywords" docs/prd/

# Examples:
用户: "我想做一个会员积分系统"
AI判断: NEW product domain → Create PRD-006: Loyalty Program

用户: "我想让用户能够查看订单历史"
AI判断: Existing domain (Cruise Ticketing) → Continue to Question 2
```

**Create new PRD if:**
- ✅ New business model or revenue stream
- ✅ New customer segment or market
- ✅ New product category (e.g., Loyalty vs Ticketing)
- ✅ Requires separate success metrics and business goals

**PRD scope guidelines:**
- Minimum: 1 Story (simple single-purpose products)
- Typical: 3-8 Stories (most products)
- Complex: 8-15 Stories (large platforms)
- Warning: >15 Stories → Consider splitting PRD

### Question 2: Is this a NEW user capability?

```bash
# If existing product domain, check if Story already exists
grep -ri "capability-keywords" docs/stories/
grep -ri "user.*journey" docs/prd/PRD-XXX.md

# Examples:
用户: "我想让用户能够导出订单数据"
AI执行:
  grep -ri "导出\|export.*order" docs/stories/  # Not found
  grep -ri "export\|analytics" docs/prd/PRD-001.md  # Found in PRD as planned feature

AI决策:
  "PRD-001已定义Order Analytics，但没有对应Story。
   建议: 创建 US-XXX under PRD-001"
```

**Create new Story if:**
- ✅ New end-to-end user journey
- ✅ New actor or user role
- ✅ Crosses multiple technical components (requires multiple Cards)
- ✅ Has distinct acceptance criteria

**Story can be shared across PRDs if:**
- ✅ It's a foundational capability (e.g., US-001: Buy & Redeem)
- ✅ Multiple product domains use identical workflow
- ✅ Avoids duplicate implementation

### Question 3: Is this a NEW API endpoint or enhancement?

```bash
# If enhancing existing Story, check if Card exists
grep -r "endpoint-path" docs/cards/*.md
grep -r "GET\|POST.*path" docs/cards/*.md

# Examples:
用户: "订单列表需要添加分页"
AI判断: Enhancement to existing Card → Update order-list card

用户: "需要新增批量删除订单的API"
AI判断: New endpoint → Create new Card under existing Story
```

**Create new Card if:**
- ✅ New API endpoint
- ✅ New database table
- ✅ New external integration
- ✅ Distinct technical component

**Update existing Card if:**
- ✅ Adding fields to existing endpoint
- ✅ Enhancing existing functionality
- ✅ Performance optimization

## Decision Matrix

| User Request | Layer | Action | Example |
|-------------|-------|--------|---------|
| "我想做会员积分系统" | **PRD** | Create PRD-006 | New product domain |
| "用户能查看订单历史" | **Story** | Create US-XXX | New user capability |
| "订单列表需要分页" | **Card** | Update card | Enhance existing API |
| "修复分页的bug" | **Code** | Update code | Bug fix |

## Real Examples from Project

### Example 1: DeepTravel Platform (New PRD)

**User Request**: "我想做一个小程序旅游平台，包含搜索、订座、支付等功能"

**AI Analysis**:
```bash
# Check existing PRDs
grep -ri "小程序\|miniapp\|wechat" docs/prd/
# Result: Not found

# Decision: This is a NEW product domain
```

**AI Action**: Create PRD-006: DeepTravel Platform
- Multiple stories: Search, Seat Lock, Payment, Bundle Tickets
- New business model: WeChat Mini-program commerce
- Distinct success metrics: Mini-program user engagement

### Example 2: Order Export (New Story)

**User Request**: "我想让用户能够导出订单数据为Excel"

**AI Analysis**:
```bash
# Check PRD
grep -ri "export\|analytics" docs/prd/PRD-001.md
# Result: "Order Analytics" mentioned as planned feature

# Check Stories
grep -ri "export.*order" docs/stories/
# Result: Not found

# Decision: NEW Story under existing PRD
```

**AI Action**: Create US-XXX: Order Data Export
- Under PRD-001 (Cruise Ticketing)
- New user capability (not previously implemented)
- Multiple cards needed (export API, format conversion, download)

### Example 3: Add Pagination (Update Card)

**User Request**: "订单列表需要添加分页功能"

**AI Analysis**:
```bash
# Check existing Card
grep -A 20 "GET /orders" docs/cards/order-list.md
# Result: Card exists, pagination not implemented

# Decision: ENHANCE existing Card
```

**AI Action**: Update `docs/cards/order-list.md`
- Add `page` and `limit` parameters
- Update response format with pagination metadata
- No new Story needed (same user capability)

## Common Mistakes to Avoid

**Mistake 1: Creating new Story for minor enhancement**
```
❌ User: "订单列表需要排序"
   AI: Creates new US-XXX "Order Sorting Feature"

✅ Correct: Update existing order-list Card
   - Same user capability (viewing orders)
   - Just adds sorting parameter
```

**Mistake 2: Creating new Card for same endpoint**
```
❌ User: "订单创建需要添加备注字段"
   AI: Creates new Card "order-create-with-notes"

✅ Correct: Update existing order-create Card
   - Same endpoint (POST /orders)
   - Just adds optional field
   - Version history in same file
```

**Mistake 3: Missing PRD for new product domain**
```
❌ User: "我想做会员系统"
   AI: Creates US-XXX "Member Management" directly

✅ Correct: Create PRD-006 first
   - New product domain (Loyalty Program)
   - Then create Stories under it
   - Proper business context and metrics
```

## Workflow Integration

**Step 0: Before creating ANY documentation**
```bash
# Always search first
grep -ri "keywords" docs/prd/ docs/stories/ docs/cards/

# Ask the three questions:
# 1. New product domain? → PRD
# 2. New user capability? → Story
# 3. New endpoint/enhancement? → Card
```

**Step 1: Validate with user if uncertain**
```
🤖 我发现这个需求可能属于 [PRD/Story/Card] 层：
   理由: [Explanation]

   是否正确？如不正确，请说明业务场景。
```

**Step 2: Update metadata after creation**
```yaml
# docs/stories/_index.yaml
- id: US-XXX
  title: [User capability description]
  cards: [list of technical Cards]
  enhances: [related Stories]
  business_requirement: "PRD-XXX"  # Link to PRD
```

---

**Related Documents**:
- `docs/prd/` - Product requirement documents
- `docs/stories/` - User story specifications
- `docs/cards/` - Technical implementation cards
- `CLAUDE.md` - Main AI workflow guide
