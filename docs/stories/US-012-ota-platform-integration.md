# US-012: OTA Platform Integration for Bulk Ticket Reservation

## Document Metadata
```yaml
story_id: "US-012"
title: "OTA Platform Integration for Bulk Ticket Reservation"
status: "In Progress"
created_date: "2025-11-03"
business_requirement: "PRD-001"
deadline: "2025-11-15"
related_stories: ["US-001", "US-011"]
```

## Story Analysis

### 1. Story Understanding

#### Core Story
**As an** external OTA (Online Travel Agency) platform
**I want** to reserve 5000 ticket package units from the cruise ticketing system
**So that** I can sell packages to my customers and have guaranteed inventory availability

#### Business Context
- **Business Driver**: PRD-001 cruise package expansion through external sales channels
- **Market Opportunity**: OTA platforms need guaranteed inventory for bulk sales
- **Revenue Impact**: Expand market reach while maintaining current business model
- **Timeline Constraint**: Nov 15, 2025 deadline for 5000 ticket availability

#### Acceptance Criteria
- [ ] OTA platform can reserve specific quantities of package inventory (Products 106-108)
- [ ] Reserved inventory is protected from direct sales until activated or expired
- [ ] Real-time availability API allows OTA to check current inventory status
- [ ] Payment notifications from OTA trigger automatic ticket issuance using existing flow
- [ ] QR redemption system works identically for OTA-sourced tickets
- [ ] API authentication prevents unauthorized access to OTA endpoints
- [ ] Channel-specific inventory tracking maintains separation between sales channels

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
   - No special OTA pricing discounts in Phase 1

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