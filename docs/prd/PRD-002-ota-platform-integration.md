# PRD-002: OTA Platform Integration for Channel Expansion

## Document Metadata
```yaml
prd_id: "PRD-002"
category: "channel"
product_area: "Commerce"
owner: "Product Manager"
status: "Done"
version: "2.1"
created_date: "2025-11-03"
last_updated: "2025-12-29"
related_stories: ["US-012", "US-017", "US-018", "US-019"]
implementation_cards: ["ota-order-retrieval", "ota-premade-tickets", "ota-reservation-management", "ota-operator-management"]
# deprecated_cards: ["ota-channel-management", "ota-reseller-management"] - moved to _deprecated/
# merged: "PRD-005" - 2025-12-25 合并，原文件见 _deprecated/PRD-005-reseller-billing-analytics.md
enhances: "PRD-001"
```

## Executive Summary

**Problem Statement**: External OTA platforms need guaranteed inventory access to sell our cruise packages at scale, but current system only supports direct sales channel, limiting market reach and revenue potential.

**Solution Overview**: Multi-channel inventory management system with dedicated OTA API endpoints, enabling external platforms to reserve and sell cruise packages while maintaining inventory separation and pricing consistency. Includes reseller billing capabilities for B2B2C revenue sharing.

**Success Metrics**:
| Metric | Target | Status |
|--------|--------|--------|
| Package units allocated to OTA | 5000 by Nov 15, 2025 | ✅ Achieved |
| Inventory conflicts | Zero | ✅ Achieved |
| API response time | <2 seconds | ✅ Achieved |
| System uptime | 99.9% | ✅ Achieved |

**Delivery Timeline**:
- Phase 1-3: Core Infrastructure → Delivered Nov 5, 2025 ✅ (10 days early)
- Phase 4-5: QR Code & Lifecycle Enhancements → Delivered Nov 14, 2025 ✅

---

## Business Context

### Market Opportunity
- **Market Size**: External OTA platforms represent 60-70% of travel booking market
- **Primary Customers**: Travel aggregators, regional OTA platforms, corporate travel management
- **Competitive Advantage**: Multi-channel support vs. competitors' single-channel limitation

### User Personas
| Persona | Needs |
|---------|-------|
| OTA Platform Operator | Reliable inventory access, real-time availability, secure API |
| End Customer | Competitive pricing, accurate availability across platforms |
| Cruise Package Provider | Channel control, inventory visibility, pricing consistency |

### Business Requirements
- Maintain existing direct sales revenue while generating incremental OTA revenue
- Support 100+ ticket batch distribution to sub-resellers
- Multi-partner support with segregated ticket management
- Automated reservation expiry to prevent inventory blocking

---

## Core Features

### Multi-Channel Inventory Management
- Separate inventory pools for direct sales and OTA channels
- Real-time synchronization prevents overselling
- Product-specific allocation (2000+1500+1500 = 5000 units)

### OTA API Gateway
- API key authentication with partner-specific permissions
- Rate limiting (100-1000 req/min per partner)
- RESTful design following OpenAPI 3.0.3 standards

### Reservation System
- Temporary 24-hour inventory holds
- Maximum 100 units per reservation (prevents hoarding)
- Automatic expiry releases inventory

### B2B2C Reseller Batch Management
- Bulk ticket generation (100+ tickets per batch)
- Distribution modes: direct_sale (7-day window) vs reseller_batch (30-day window)
- Basic reseller tracking and batch identification

### Special Batch Pricing Override
- Custom pricing per batch independent of standard product pricing
- Pricing locked at generation survives product price changes
- Supports promotional campaigns and partner-specific pricing

### Ticket Lifecycle Management
- Status progression: PRE_GENERATED → ACTIVE → USED
- Auto-USED transition when all entitlements consumed
- Info endpoint for status/entitlements without QR generation

### QR Code System
- On-demand generation with configurable expiry (1-1440 minutes)
- AES-256-GCM encryption with HMAC-SHA256 signature
- Partner isolation ensures secure ticket access

### Reseller Billing & Analytics (merged from PRD-005)
Usage-based billing for B2B2C reseller distribution
- **Current Implementation**: Reseller data in batch metadata (`reseller_metadata`), manual query for billing reconciliation
- **Billing Model**: Charge on redemption (not purchase), commission calculation from batch pricing snapshot
- **Future Enhancement**: Automated billing engine, 7-year audit retention (when business scales)
- **Priority**: Medium

### OTA Operator Management (US-019)
OTA platforms can create and manage their own verification operators
- **Operator Creation**: OTA creates operators via API with `operators` permission
- **Scope Isolation**: Operators only see venues and redeem tickets belonging to their OTA
- **Authentication**: Operators login via existing miniprogram `/operators/login`
- **Redemption Flow**: `/qr/decrypt` + `/venue/scan` with OTA scope validation
- **Priority**: High

---

## Business Rules

### Channel Allocation Strategy
| Product | OTA Allocation | Direct Allocation | OTA % |
|---------|----------------|-------------------|-------|
| Premium Plan (106) | 2000 units | 1000 units | 66% |
| Pet Plan (107) | 1500 units | 500 units | 75% |
| Deluxe Tea Set (108) | 1500 units | 300 units | 83% |

### Pricing Consistency
- Identical complex pricing across all channels (maintains PRD-001 strategy)
- Weekend premiums and customer type discounts apply equally
- Complete discount matrix exposed via inventory API

### Ticket Expiry Mechanism
| Type | Expiry | Status |
|------|--------|--------|
| QR Code | 30 minutes default | ✅ Enforced |
| Batch (direct_sale) | 7 days | ❌ Not enforced (reference only) |
| Batch (reseller_batch) | 30 days | ❌ Not enforced (reference only) |
| Ticket validity | Permanent until used | Current behavior |

---

## Success Metrics & KPIs

### Business Metrics
- OTA channel revenue contribution (target: 15% increase)
- Partner onboarding velocity (target: 2-3 partners by Dec 2025)
- Inventory utilization rate by channel (target: >80%)

### Product Metrics
- Reservation-to-activation rate (target: >70%)
- API response time (target: <2 seconds)
- Error rate per endpoint (target: <1%)

---

## Implementation Evidence

### Completed Deliverables
- ✅ US-012: OTA Platform Integration (Story)
- ✅ 5 Implementation Cards
- ✅ Multi-partner isolation with database migration
- ✅ OTA251103 Travel Group onboarded
- ✅ Comprehensive documentation (INTEGRATION_GUIDE.md, INTEGRATION_OTA.md)

### Production Readiness
- ✅ Multi-partner API key system with rate limiting
- ✅ Request logging and error tracking
- ✅ Partner isolation verified
- ✅ End-to-end validation completed

---

## Technical Specifications

> **Note**: Detailed technical specifications have been moved to implementation cards per documentation standards.

| Specification | Card Reference |
|---------------|----------------|
| Inventory & Reservation APIs | `ota-channel-management` |
| Authentication & Security | `ota-authentication-middleware` (deprecated → merged) |
| Bulk Ticket Generation | `ota-premade-tickets` |
| Reseller Management | `ota-reseller-management` |
| Order & Ticket Retrieval | `ota-order-retrieval` |

---

## Future Enhancement Path
- **Q1 2026**: Advanced analytics dashboard
- **Q2 2026**: Dynamic pricing based on demand
- **Q3 2026**: Multi-currency support for international platforms
- **Q4 2026**: White-label booking widget

---

**Document Control:**
- **Version**: 2.0 (Slimmed per DOCUMENT-SPEC standards)
- **Previous Version**: 1.0 (945 lines) → 2.0 (~200 lines)
- **Related Documents**: PRD-001, US-012
