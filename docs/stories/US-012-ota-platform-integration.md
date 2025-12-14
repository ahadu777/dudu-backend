---
id: US-012
title: OTA Platform Integration for Bulk Ticket Reservation
owner: Product
status: "Done"
priority: High
created_date: "2025-11-03"
completed_date: "2025-11-06"
business_requirement: "PRD-002"
enhances:
  - US-001  # Extends ticket system to OTA channel
depends_on:
  - US-001  # Core ticketing foundation required
cards:
  - ota-channel-management
  - ota-reseller-management
  - ota-order-retrieval
  - ota-premade-tickets
  - ota-reservation-management
---

# US-012: OTA Platform Integration for Bulk Ticket Reservation

## Story Analysis

### 1. Story Understanding

#### Core Story
**As an** external OTA (Online Travel Agency) platform
**I want** to reserve 5000 ticket package units from the cruise ticketing system
**So that** I can sell packages to my customers and distribute batches to sub-resellers for expanded market reach

#### B2B2C Enhancement Story *(NEW)*
**As an** OTA platform operator
**I want** to generate batches of 100+ tickets for distribution to other sellers
**So that** I can expand my distribution network without direct partnership management overhead

#### Business Context
- **Business Driver**: PRD-001 cruise package expansion through external sales channels
- **Market Opportunity**: OTA platforms need guaranteed inventory for bulk sales
- **Revenue Impact**: Expand market reach while maintaining current business model
- **Timeline Constraint**: Nov 15, 2025 deadline for 5000 ticket availability

#### Acceptance Criteria
- [x] OTA 平台可预订指定数量的套餐库存（产品 106-108）
- [x] 预订的库存在激活或过期前不会被直销渠道售出
- [x] OTA 平台可实时查询库存可用状态
- [x] OTA 支付通知触发自动出票
- [x] OTA 渠道票券的二维码核销流程与直销票券一致
- [x] 系统确保 OTA 接口需要身份验证才能访问
- [x] 系统分渠道追踪库存，确保销售渠道之间相互隔离
- [x] OTA 平台可按条件查询已生成票券（状态、批次、日期范围、分页）
- [x] 系统确保 OTA 合作伙伴只能访问自己的票券

#### B2B2C Enhancement Acceptance Criteria *(NEW)*
- [x] OTA 可批量生成 100+ 张票券，并追踪分销商元数据
- [x] 批次票券包含目标分销商信息以便审计追溯
- [x] 分销商批次有延长的暂定销售期（直销 7 天，分销批次 30 天，当前未强制执行）
- [x] 票券激活时记录分销商到客户的链路追踪
- [x] 批次分发不影响 OTA 直销库存分配

#### Reseller Master Data Management *(NEW - 2025-11-14)*
**Database Schema:**
- [x] Centralized reseller registry table (ota_resellers) with auto-increment primary key
- [x] Each reseller linked to specific OTA partner via partner_id foreign key
- [x] Unique constraint on (partner_id + reseller_code) prevents duplicates
- [x] Commission rate configuration per reseller (customizable, default 10%)
- [x] Contract lifecycle tracking (start_date, end_date, status)
- [x] Settlement cycle configuration (weekly/monthly/quarterly)
- [x] Regional assignment and tier-based categorization
- [x] Batch table references reseller via reseller_id foreign key (nullable)
- [x] Data migration extracts existing resellers from batch JSON metadata

**Reseller Management Capabilities (Implemented 2025-11-14):**
- [x] OTA 平台可查看其所有分销商列表
- [x] OTA 平台可新增分销商（必填：编码、名称）
- [x] OTA 平台可查看单个分销商详情
- [x] OTA 平台可更新分销商信息（佣金比例、等级等）
- [x] OTA 平台可停用分销商（软删除）
- [x] 系统确保分销商数据隔离（只能访问自己的分销商）
- [x] Mock 模式测试通过率 100%
- [x] OpenAPI 文档已更新

**Business Logic:**
- [x] 账单汇总支持跨所有分销商聚合查询
- [ ] 数据库模式测试待 migration 011 修复后执行

#### Ticket Lifecycle Enhancement Acceptance Criteria *(NEW - 2025-11-14)*
- [x] OTA 票券支持"已使用"状态
- [x] 当票券所有权益全部核销后，系统自动将票券标记为"已使用"
- [x] OTA 平台和普通用户均可查询票券状态和剩余权益（无需生成二维码）
- [x] 场馆核销流程中 session_code 为可选参数
- [x] 权益全部使用完毕时自动触发状态更新
- [x] "已使用"票券正确反映在库存对账和结算报表中

### 2. Business Rules Extraction

#### Inventory Allocation Rules
1. **Channel Separation**: OTA inventory pool separate from direct sales
   - Product 106 (Premium): 2000 units allocated to OTA
   - Product 107 (Pet Plan): 1500 units allocated to OTA
   - Product 108 (Deluxe): 1500 units allocated to OTA
   - Total: 5000 package units reserved for OTA sales

2. **Reservation Rules**:
   - OTA can reserve inventory without immediate payment
   - Reserved inventory expires after 24 hours if not activated
   - Activation occurs when OTA payment webhook received

3. **Pricing Rules**:
   - OTA uses same complex pricing engine (weekend/weekday, customer types)
   - Package compositions remain identical (function codes unchanged)
   - Customer discount information exposed via inventory API for dynamic pricing
   - Customer pricing scenarios:
     * Product 106 (Premium): Adult $288/$318, Child $188/$218 (saves $100), Elderly $238/$268 (saves $50), Student $238/$268 (saves $50)
     * Product 107 (Standard): Adult $188/$228, Child $38/$78 (saves $150), Family $88/$128 (saves $100), Elderly $113/$153 (saves $75)
     * Product 108 (Luxury): Adult $788/$868, VIP $588/$668 (saves $200), Elderly $688/$768 (saves $100)
   - OTA partners receive complete discount matrix for implementing their own pricing logic

#### Authentication & Security Rules
1. **API Access**: OTA endpoints require API key authentication
2. **Rate Limiting**: Maximum 100 requests/minute per OTA partner
3. **Audit Requirements**: All OTA transactions logged for reconciliation

#### Integration Rules
1. **Payment Flow**: OTA payment notifications use existing `/payments/notify` webhook
2. **Ticket Generation**: Same ticket issuance service creates tickets with entitlements
3. **QR System**: Identical QR generation and redemption for OTA tickets

### 3. API Endpoints Needed

```yaml
# Enhanced endpoint for reseller batch support
/api/ota/tickets/bulk-generate:                          # NEW ENDPOINT
  post:
    summary: Generate ticket batches for reseller distribution
    request:
      - product_id: package to generate
      - quantity: number of tickets (1-5000)
      - distribution_mode: "direct_sale" | "reseller_batch"
      - reseller_metadata: { intended_reseller, batch_purpose }
    response:
      - batch_id: unique batch identifier
      - tickets: array of pre-generated tickets with QR codes
      - reseller_metadata: distribution tracking info
      - expires_at: 暂定销售期 (Provisional sales period, 当前未强制执行)
    errors: 400, 401, 403, 422

/api/ota/inventory:
  get:
    summary: Get real-time package availability for OTA
    parameters:
      - product_ids: array of package IDs
      - date_range: optional availability window
    response:
      - available_quantities: { product_id: available_count }
      - pricing_context: complex pricing rules
    errors: 401, 403, 422

/api/ota/reserve:
  post:
    summary: Reserve package inventory for OTA sales
    request:
      - product_id: package to reserve
      - quantity: number of units
      - reservation_expires_at: optional expiry time
    response:
      - reservation_id: unique identifier
      - reserved_until: expiration timestamp
      - pricing_snapshot: current pricing for package
    errors: 400, 401, 403, 409, 422

/api/ota/orders:
  post:
    summary: Create order using reserved inventory
    request:
      - reservation_id: from previous reserve call
      - customer_details: user information
      - pricing_context: customer type, timing
    response:
      - order_id: created order identifier
      - payment_required: amount and currency
      - webhook_url: for payment notifications
    errors: 400, 401, 404, 409, 422

/api/ota/activate:
  post:
    summary: Activate reservation after payment
    request:
      - order_id: order to activate
      - payment_reference: OTA payment ID
    response:
      - tickets: array of issued tickets with QR codes
      - activation_status: success/failed
    errors: 400, 401, 404, 409

/api/ota/tickets:
  get:
    summary: Query pre-made tickets with optional filters
    parameters:
      - status: Filter by PRE_GENERATED or ACTIVE
      - batch_id: Filter by batch identifier
      - created_after: Date range start (ISO 8601)
      - created_before: Date range end (ISO 8601)
      - page: Page number (default: 1)
      - limit: Results per page (default: 100, max: 1000)
    response:
      - tickets: array of ticket summaries
      - total_count: total matching tickets
      - page: current page number
      - page_size: results per page
    errors: 422, 401, 403

/qr/{ticket_code}/info:                                      # NEW ENDPOINT (2025-11-14)
  get:
    summary: Get ticket status and entitlements without generating QR
    security:
      - ApiKeyAuth: []  # For OTA partners
      - BearerAuth: []  # For normal users
    parameters:
      - ticket_code: string (path)
    response:
      - ticket_code: string
      - ticket_type: "OTA" | "NORMAL"
      - status: "PRE_GENERATED" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED"
      - entitlements: array of {function_code, remaining_uses}
      - can_generate_qr: boolean
      - product_info: {id, name}
    errors: 401, 403, 404
```

### 4. Data Impact Analysis

#### Existing Tables Modified
- **product_inventory**: Add `channel_allocations` JSON field
  - Structure: `{"ota": {"allocated": 2000, "reserved": 150, "sold": 850}}`
  - Tracks per-channel inventory breakdown

- **orders**: Add `channel_id` and `reservation_id` fields
  - Links orders to specific sales channels
  - Enables reservation → order → ticket traceability

#### New Tables Required
- **channel_reservations**: Track temporary inventory holds
  - Fields: reservation_id, product_id, quantity, expires_at, status
  - Purpose: Manage time-limited inventory reservations

- **api_keys**: Authenticate external OTA platforms
  - Fields: key_hash, partner_name, permissions, rate_limits
  - Purpose: Secure OTA API access

#### Migration Requirements
- **Backfill existing data**: No (new functionality)
- **Breaking changes**: No (additive changes only)
- **Performance impact**: Low (additional indexes on new fields)

#### 票据过期机制说明 (Ticket Expiry Mechanism) - 当前状态
**重要**: 票据暂定为永久有效 (Tickets are provisionally valid permanently)

**过期时间区分 (Expiry Distinctions)**:
1. **二维码过期 (QR Code Expiry)**: ✅ 已执行 (30分钟默认)
   - 临时安全令牌, 过期后可重新生成
2. **批次过期 (Batch expires_at)**: ❌ 暂定未执行
   - 存储: direct_sale 7天, reseller_batch 30天
   - 用途: 业务参考, 不影响票据实际有效性
3. **票据状态 (Ticket Status)**:
   - 定义: PRE_GENERATED, ACTIVE, USED, EXPIRED, CANCELLED
   - 当前使用: PRE_GENERATED → ACTIVE → USED
   - EXPIRED: 已定义但未使用 (tickets remain valid indefinitely)

### 5. Integration Impact Analysis

#### Existing Cards Enhanced
- **order-create**: Modify to support channel-specific inventory checking
- **payment-webhook**: Handle OTA payment notifications with reservation activation
- **catalog-endpoint**: Add channel-aware availability responses

#### New Integration Points
- **OTA Authentication**: API key middleware for secure access
- **Channel Inventory**: Real-time sync between direct and OTA sales
- **Reservation Management**: Background job to expire unused reservations
- **Audit Logging**: Enhanced tracking for multi-channel sales

### 6. Proposed Cards Breakdown

#### 1. **ota-channel-management**
- **Team**: A - Commerce
- **Purpose**: Core OTA inventory allocation and reservation system
- **Endpoints**: `/api/ota/inventory`, `/api/ota/reserve`
- **Dependencies**: catalog-endpoint, order-create
- **Priority**: High (blocks OTA integration)

#### 2. **ota-authentication-middleware**
- **Team**: C - Identity & Access
- **Purpose**: Secure API access for external OTA platforms
- **Endpoints**: Middleware for all `/api/ota/*` routes
- **Dependencies**: None
- **Priority**: High (security requirement)

#### 3. **ota-order-processing**
- **Team**: A - Commerce
- **Purpose**: OTA-specific order creation and activation flow
- **Endpoints**: `/api/ota/orders`, `/api/ota/activate`
- **Dependencies**: ota-channel-management, order-create, payment-webhook
- **Priority**: High (core business flow)

#### 4. **channel-inventory-tracking**
- **Team**: A - Commerce
- **Purpose**: Real-time inventory synchronization across sales channels
- **Endpoints**: Internal services for inventory management
- **Dependencies**: ota-channel-management
- **Priority**: Medium (operational monitoring)

## Implementation Priority

### Phase 1 (Nov 2-5): Core Infrastructure
1. **ota-channel-management**: Inventory allocation and reservation
2. **ota-authentication-middleware**: Secure API access

### Phase 2 (Nov 6-10): Business Logic
3. **ota-order-processing**: Order creation and activation flow
4. **channel-inventory-tracking**: Multi-channel inventory sync

### Phase 3 (Nov 11-15): Testing & Deployment
- Integration testing with 5000 package scenarios
- Load testing and performance validation
- Production deployment and monitoring setup

## Success Criteria

### Business Metrics
- **5000 package units** successfully allocated to OTA by Nov 15
- **Zero inventory conflicts** between direct and OTA sales
- **<2 second response time** for all OTA API endpoints
- **99.9% uptime** for OTA integration during testing period

### Technical Validation
- **End-to-end flow**: OTA reserve → order → payment → ticket → QR redemption
- **Complex pricing**: Weekend/weekday and customer type pricing works via OTA
- **Idempotency**: Multiple OTA requests don't create duplicate reservations
- **Security**: API key authentication prevents unauthorized access

## Risk Mitigation

### Technical Risks
- **Inventory race conditions**: Mitigated by database-level locking
- **Complex pricing integration**: Leverage existing US-011 implementation
- **Authentication security**: Standard API key patterns with rate limiting

### Business Risks
- **Channel conflict**: Clear inventory separation and real-time monitoring
- **OTA integration complexity**: Phased rollout with comprehensive testing
- **Timeline pressure**: Well-scoped implementation using existing patterns

---

**Story Status**: In Progress
**Next Steps**: Create technical cards following established templates
**Dependencies**: Existing US-001 (ticketing platform) and US-011 (complex pricing) must remain functional