# PRD-008: DeepTravel Mini-Program Travel Booking Platform

## Document Metadata
```yaml
prd_id: "PRD-008"
product_area: "B2C Direct Sales"
owner: "Product Manager"
status: "In Progress"
version: "2.0"
created_date: "2025-11-21"
last_updated: "2025-12-12"
related_stories: ["US-010", "US-010A", "US-010B"]
business_channel: "WeChat Mini-Program (direct)"
phase_status:
  phase_1_package_booking: "Done"
  phase_2_route_booking: "Draft"
  phase_3_advanced_features: "Draft"
implementation_cards:
  - miniprogram-product-catalog
  - miniprogram-order
  - wallyt-payment
```

## Executive Summary

**Problem Statement**: Customers need a direct B2C sales channel through WeChat mini-program where end-users can:
1. Purchase package products (cruise packages with entertainment)
2. Purchase standalone route tickets (ferry/bus tickets by schedule)

**Solution Overview**: WeChat mini-program platform supporting dual booking modes:
- **Package booking**: Pre-bundled products with multiple entitlements (ferry + dining + entertainment)
- **Route booking**: Schedule-based transportation tickets (specific departure times)

**Success Metrics**:
| Metric | Target |
|--------|--------|
| B2C direct sales GMV | 30% of total revenue |
| User conversion rate | Search → booking → payment |
| Average order value | Package vs route differentiation |

**Timeline**:
- Phase 1: Package booking ✅ Done
- Phase 2: Route booking system (pending)
- Phase 3: Advanced features (future)

---

## Business Context

### Market Opportunity
**Primary Customer**: Cheung Chau Ferry Company (and similar operators)

**End-User Segments**:
- Convenience seekers (standalone transport)
- Experience seekers (packages)
- Budget-conscious travelers
- Frequent travelers

**Differentiation**: **Dual-mode booking** (packages + standalone routes) vs competitors' single-mode

### Business Model
Our Role: Ticketing platform technology provider

**Revenue Channels**:
- Direct (Mini-program): B2C direct sales
- OTA Partners (PRD-002): B2B channel
- Resellers (PRD-002): B2B bulk reservation

---

## Core Features

### Feature 1: Package Product Booking ✅ Done
Pre-bundled products with multiple entitlements (ferry + dining + entertainment)
- **Business Value**: Higher AOV, upsell opportunities
- **User Value**: Simplified decision-making, bundled value
- **Priority**: High

### Feature 2: Route Schedule Search & Booking
Schedule-based transportation tickets by origin/destination/date
- **Business Value**: Capture non-package demand, maximize seat utilization
- **User Value**: Flexibility, schedule selection, transparent pricing
- **Priority**: High

### Feature 3: Unified Search Hub
Single search returning both packages and routes for comparison
- **Business Value**: Product discovery, intelligent upselling
- **User Value**: Convenient comparison shopping
- **Priority**: Medium

### Feature 4: WeChat Mini-Program Integration
Native WeChat experience with login, payment, notifications
- **Business Value**: Leverage WeChat ecosystem (1B+ users)
- **User Value**: No app installation, seamless payment
- **Priority**: High

### Feature 5: My Tickets & Order Management
View tickets, QR codes, manage orders, handle cancellations
- **Business Value**: Reduce customer service load
- **User Value**: Easy access, order history, cancellation options
- **Priority**: High

---

## Business Rules

### Dual Inventory System
| Type | Inventory Model | Pricing Model |
|------|-----------------|---------------|
| Package Products | Product-based allocation | Complex multi-variable pricing |
| Route Tickets | Schedule-based (date + time + seat class) | Schedule-based rules |

### Channel Allocation
- "direct" channel = Mini-program inventory pool
- Both systems use multi-channel allocation model
- Unified seat locking (15-minute reservation timeout)

### Pricing Strategy
- **Packages**: Bundled value pricing, dynamic by timing and customer type
- **Routes**: Schedule-based, peak/off-peak differentiation, seat class premium

### Cancellation Policy
| Window | Refund |
|--------|--------|
| >24 hours before travel | 100% |
| 12-24 hours before travel | 50% |
| <12 hours before travel | 0% |

---

## Success Metrics & KPIs

### Business Metrics
- Direct Channel GMV
- Package vs Route Revenue split
- Average Order Value by type
- Inventory utilization rate
- Booking conversion rate

### Product Metrics
- Daily Active Users
- Booking mode split (package vs route)
- Repeat purchase rate
- Search-to-booking time

### Performance Metrics
- Availability accuracy (target: >99.9%)
- Payment success rate (target: >98%)
- Ticket issuance speed (target: <3s)
- Mini-program load time (target: <2s)

---

## Implementation Strategy

### Phase 1: Package Booking ✅ Done
- Package product listing and booking
- WeChat payment integration
- QR ticket issuance

### Phase 2: Route Booking (Next)
- Route and schedule management
- Schedule-based inventory
- Route search and booking flow

### Phase 3: Unified Experience (Future)
- Single search hub
- Intelligent recommendations
- Advanced cancellation/refund

### Phase 4: Advanced Features (Future)
- Loyalty program integration
- AI recommendations
- Group booking

---

## Risk Assessment

| Risk Category | Risk | Mitigation |
|---------------|------|------------|
| Business | Users prefer single-mode platforms | A/B testing, user feedback |
| Business | Pricing complexity confusion | Clear display, comparison tools |
| Operational | Support team complexity | Training, documentation |
| Technical | Mini-program performance | Caching, optimized queries |
| Technical | WeChat API changes | Graceful degradation, monitoring |

---

## Dependencies

### Internal
- PRD-001: Complex pricing, QR ticketing, inventory
- PRD-002: Multi-channel allocation model

### External
- WeChat Platform APIs
- Customer route schedule data
- Payment gateway

---

## Open Questions

1. How will customers decide inventory allocation ratios between channels?
2. How frequently do ferry/bus schedules change?
3. Who sets route ticket base prices?
4. Should packages include specific schedule selections?
5. Do route tickets require passenger ID verification?

---

## Technical Specifications

> **Note**: Detailed technical specifications have been moved to implementation cards per documentation standards.

| Specification | Card Reference |
|---------------|----------------|
| Product catalog API | `miniprogram-product-catalog` |
| Order management API | `miniprogram-order` |
| Payment integration | `wallyt-payment` |
| Route booking (Phase 2) | Cards to be created |

---

**Document Control:**
- **Version**: 2.0 (Slimmed per DOCUMENT-SPEC standards)
- **Previous Version**: 1.0 (733 lines) → 2.0 (~200 lines)
- **Related Stories**: US-010, US-010A, US-010B
