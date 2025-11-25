# RESTful API Design Guide

## Overview
All API endpoints in this project MUST follow RESTful design principles. This guide provides detailed standards, examples, and validation patterns.

## Core Principles

### 1. Resource Naming (Use Plural Nouns)

**Standard Pattern:**
```bash
✅ CORRECT:
GET    /venues              # Get list of venues
GET    /venues/:id          # Get single venue
POST   /venues              # Create venue
PUT    /venues/:id          # Update venue
DELETE /venues/:id          # Delete venue

❌ WRONG:
GET    /venue/venues        # Path redundancy
GET    /getVenues           # Verb in URL
POST   /createVenue         # Verb in URL
GET    /venue_list          # Underscore + unclear naming
```

### 2. HTTP Methods (Correct Usage)

```bash
GET    /resources           # Retrieve list (Safe, Idempotent)
GET    /resources/:id       # Retrieve single resource (Safe, Idempotent)
POST   /resources           # Create new resource
PUT    /resources/:id       # Full update (Idempotent)
PATCH  /resources/:id       # Partial update (Idempotent)
DELETE /resources/:id       # Delete resource (Idempotent)
```

### 3. Custom Actions (When Standard CRUD Doesn't Fit)

#### 3.1 Resource-Level Actions

对**单个资源**执行的自定义操作，使用 `/:id/action` 模式：

```bash
✅ CORRECT: Action on specific resource (资源优先)
POST   /orders/:id/cancel       # 对订单123执行取消操作
POST   /orders/:id/refund       # 对订单123执行退款操作
POST   /tickets/:id/activate    # 对票券456执行激活操作
POST   /users/:id/suspend       # 对用户789执行暂停操作

❌ WRONG: Action before ID (动作优先 - 不推荐)
POST   /orders/cancel/:id       # 语义不清晰
POST   /tickets/activate/:id    # 非主流模式
```

**为什么 `/:id/action` 更好？**
- ✅ 符合 RESTful 资源层级设计（Resource-Oriented）
- ✅ 语义清晰："对资源X执行操作Y"
- ✅ 业界标准（GitHub, Stripe, AWS 等主流 API）
- ✅ 路由结构清晰：`/resource/:id/*` 表示对单个资源的所有操作

#### 3.2 Collection-Level Actions

对**资源集合**执行的操作，动作直接跟在集合后：

```bash
✅ CORRECT: Action on collection
POST   /venues/scan             # 场馆扫描操作（无需特定 venue_id）
POST   /orders/batch-import     # 批量导入订单
POST   /tickets/batch-generate  # 批量生成票券

❌ WRONG: Unclear scope
POST   /scan_venue              # 动词在顶层
POST   /batch_import_orders     # 下划线 + 动词在顶层
```

## Module Registration Pattern

```typescript
// In src/modules/index.ts
app.use('/venues', venueRouter);      // ✅ Plural resource name
app.use('/orders', ordersRouter);     // ✅ Plural resource name
app.use('/tickets', ticketsRouter);   // ✅ Plural resource name

// In module router.ts
router.get('/', ...)                  // ✅ Maps to GET /venues
router.get('/:id', ...)               // ✅ Maps to GET /venues/:id
router.post('/', ...)                 // ✅ Maps to POST /venues
router.post('/scan', ...)             // ✅ Maps to POST /venues/scan (custom action)
router.post('/:id/cancel', ...)       // ✅ Maps to POST /venues/:id/cancel
```

## Common Anti-Patterns to Avoid

### Path Redundancy
```bash
❌ GET /venue/venues           # Should be: GET /venue (if singular module) or GET /venues
```

### Verbs in Resource URLs
```bash
❌ GET /getUsers               # Should be: GET /users
❌ POST /createOrder           # Should be: POST /orders
```

### Action Before ID (Wrong Pattern)
```bash
❌ POST /orders/cancel/:id     # ❌ 动作优先 - 非主流
❌ POST /tickets/refund/:id    # ❌ 语义不清晰

✅ POST /orders/:id/cancel     # ✅ 资源优先 - 业界标准
✅ POST /tickets/:id/refund    # ✅ 清晰的资源层级
```

### Unclear Actions
```bash
❌ POST /orders/process        # What does "process" mean? Be specific:
✅ POST /orders/:id/confirm    # ✅ Clear action
✅ POST /orders/:id/ship       # ✅ Clear action
```

### Wrong HTTP Methods
```bash
❌ GET /orders/delete/:id      # Should be: DELETE /orders/:id
❌ POST /users/get/:id         # Should be: GET /users/:id
```

### Forcing CRUD for State Changes
```bash
❌ PUT  /orders/:id            # body: {status: "cancelled"}
❌ PATCH /tickets/:id          # body: {active: false}

✅ POST /orders/:id/cancel     # ✅ Explicit action
✅ POST /tickets/:id/deactivate # ✅ Clear intent
```

## Real-World Examples from This Project

### ✅ CORRECT Examples
```bash
GET    /venue                          # Venue list (fixed from /venue/venues)
POST   /venue/scan                     # Venue scan action
GET    /api/ota/tickets                # OTA ticket list
POST   /api/ota/orders                 # Create OTA order
GET    /qr/:code/info                  # QR code info
POST   /qr/decrypt                     # QR decryption action
```

### ❌ WRONG Examples (Lessons Learned)
```bash
GET    /venue/venues                   # Fixed to: GET /venue
                                       # Lesson: Check module prefix + router path
```

## Industry Standards (业界标准)

### GitHub API
```bash
POST   /repos/:owner/:repo/issues/:id/lock
POST   /repos/:owner/:repo/pulls/:id/merge
```

### Stripe API
```bash
POST   /v1/subscriptions/:id/cancel
POST   /v1/invoices/:id/pay
```

### AWS API
```bash
POST   /queues/:queueName/purge
DELETE /buckets/:bucketName/objects/:key
```

## AI Implementation Workflow

### Step 1: Check Module Registration
```bash
grep "app.use.*Router" src/modules/index.ts
# Identify module prefix (e.g., '/venues', '/orders')
```

### Step 2: Design Router Paths
```typescript
// If module is registered as app.use('/venues', venueRouter)
router.get('/', ...)        // → GET /venues ✅
router.get('/:id', ...)     // → GET /venues/:id ✅
router.post('/', ...)       // → POST /venues ✅
router.post('/:id/cancel', ...) // → POST /venues/:id/cancel ✅
```

### Step 3: Validate Final URLs
```bash
# Before implementing, confirm final URL is RESTful:
# Module prefix + Router path = Final URL
'/venues' + '/' = GET /venues ✅
'/venues' + '/:id' = GET /venues/:id ✅
'/venues' + '/:id/cancel' = POST /venues/:id/cancel ✅
```

### Step 4: Ask User for Clarification (if uncertain)
- "Should this be `/venues` (plural) or `/venue` (singular)?"
- "Is this a CRUD operation or custom action?"
- "What's the most RESTful way to represent this operation?"

## Documentation Requirements

All API cards must include RESTful compliance check:

```markdown
## RESTful Compliance Check

- [x] Resource name is plural noun
- [x] No path redundancy
- [x] HTTP methods match semantics
- [x] Custom actions use clear verbs
- [x] Full URL path verified: `[module_prefix] + [router_path]`

**Final Endpoints:**
- GET /venues - List all venues ✅
- POST /venues/:id/cancel - Cancel venue ✅
```

## Quick Reference Table

| Scenario | Correct Pattern | Wrong Pattern |
|----------|----------------|---------------|
| 获取资源列表 | `GET /venues` | `GET /venue/venues` |
| 获取单个资源 | `GET /venues/:id` | `GET /getVenue/:id` |
| 创建资源 | `POST /venues` | `POST /createVenue` |
| 取消订单 | `POST /orders/:id/cancel` | `POST /orders/cancel/:id` |
| 退款票券 | `POST /tickets/:id/refund` | `POST /tickets/refund/:id` |
| 场馆扫描 | `POST /venues/scan` | `POST /scan/venues` |
| 批量导入 | `POST /orders/batch-import` | `POST /batch-import/orders` |

## Validation Checklist

Before implementing any API endpoint:

- [ ] **Path uses plural nouns** (e.g., `/venues` not `/venue`)
- [ ] **No path redundancy** (e.g., not `/venue/venues`)
- [ ] **HTTP method matches intent** (GET for read, POST for create/actions, etc.)
- [ ] **Custom actions follow pattern**:
  - [ ] Resource-level: `/:id/action` (e.g., `/orders/:id/cancel`) ✅
  - [ ] Collection-level: `/action` (e.g., `/venues/scan`) ✅
  - [ ] NOT `action/:id` (e.g., `/cancel/:id`) ❌
- [ ] **Module prefix + router path = final URL** is logical and clean
- [ ] **Ask user if uncertain** about any design decision

## Case Study: Venue Module Fix (2025-11-25)

### Original Issue
```bash
❌ GET /venue/venues    # Path redundancy
```

### Analysis
```typescript
// src/modules/index.ts
app.use('/venue', venueRouter);  // Module prefix: /venue

// src/modules/venue/router.ts
router.get('/venues', ...)       // Router path: /venues

// Result: /venue + /venues = /venue/venues ❌ (redundant!)
```

### Solution
```typescript
// Keep module prefix
app.use('/venue', venueRouter);  // Module prefix: /venue

// Fix router path
router.get('/', ...)             // Router path: /

// Result: /venue + / = /venue ✅ (clean!)
```

### Lesson Learned
Always validate: **Module prefix + Router path = Final URL**

---

**Last Updated**: 2025-11-25
**Validated By**: Real project implementation
