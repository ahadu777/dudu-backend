# PRD-006: DeepTravel Mini-Program Travel Booking Platform

## Document Metadata
```yaml
prd_id: "PRD-006"
product_area: "B2C Direct Sales"
owner: "Product Manager"
status: "Draft"
created_date: "2025-11-21"
last_updated: "2025-11-21"
related_stories: ["US-010", "US-010A", "US-010B"]
business_channel: "WeChat Mini-Program (direct)"
```

## Executive Summary

**Problem Statement**: Customers (e.g., Cheung Chau Ferry Company) need a direct B2C sales channel through WeChat mini-program where end-users can:
1. Purchase package products (cruise packages with entertainment)
2. Purchase standalone route tickets (ferry/bus tickets by schedule)

**Solution Overview**: WeChat mini-program platform supporting dual booking modes:
- **Package booking**: Pre-bundled products with multiple entitlements (ferry + dining + entertainment)
- **Route booking**: Schedule-based transportation tickets (specific departure times)

**Success Metrics**:
- B2C direct sales channel GMV (target: 30% of total revenue)
- Package vs route ticket sales ratio visibility
- User conversion rate (search → booking → payment)
- Average order value differentiation (package vs route)

**Timeline**:
- Phase 1: Package booking (leverage existing PRD-001 foundation)
- Phase 2: Route booking system (new schedule-based inventory)
- Phase 3: Advanced features (recommendations, loyalty integration)

---

## Business Context

### Market Opportunity

**Primary Customer**: Cheung Chau Ferry Company (and similar transportation + entertainment operators)

**End-User Segments**:
- **Convenience seekers**: Want standalone transportation tickets without forced packages
- **Experience seekers**: Prefer all-inclusive packages for full-day trips
- **Budget-conscious travelers**: Compare package value vs individual ticket pricing
- **Frequent travelers**: Regular commuters needing flexible booking options

**Competitive Landscape**:
- Traditional package operators: Limited flexibility (package-only sales)
- Pure transportation platforms: Missing entertainment bundling opportunities
- Our differentiation: **Dual-mode booking** (packages + standalone routes)

### Business Model Clarity

**Our Role**: Ticketing platform technology provider

**Revenue Flow**:
```
[Customer's Products]
    └─ Distributed via multiple channels:
        ├─ Direct (Mini-program - PRD-006): B2C direct sales
        ├─ OTA Partners (PRD-002): B2B channel distribution
        └─ Resellers (PRD-002): B2B bulk reservation
```

**Inventory Allocation**:
- All products use multi-channel allocation model
- "direct" channel = Mini-program inventory pool
- Package products and route tickets both support channel allocation

---

## Product Specification

### Core Features

---

### **Feature 1: Package Product Booking**

**Description**:
End-users browse and purchase pre-bundled package products (e.g., Premium Plan with ferry + dining + playground tokens).

**Business Value**:
- Leverage existing package inventory system (PRD-001)
- Higher average order value (bundled pricing)
- Upsell opportunity for customers who only need transportation

**User Value**:
- Simplified decision-making (pre-configured bundles)
- Value perception (bundle discount vs individual items)
- One-stop experience planning

**Acceptance Criteria**:
- [ ] Display all active package products from "direct" channel inventory
- [ ] Show package inclusions (ferry + dining + entertainment functions)
- [ ] Dynamic pricing based on customer type (adult/child/elderly) and timing (weekday/weekend)
- [ ] Inventory availability real-time display
- [ ] Seat locking during checkout (15-minute reservation)
- [ ] WeChat payment integration
- [ ] QR ticket issuance with function entitlements

**Priority**: High (leverages existing foundation)

---

### **Feature 2: Route Schedule Search & Booking**

**Description**:
End-users search for transportation routes by origin/destination/date, select specific departure schedule, and purchase standalone tickets.

**Business Value**:
- Capture demand from users who don't want packages
- Maximize seat utilization across all inventory channels
- Enable price differentiation by schedule timing (peak/off-peak)

**User Value**:
- Flexibility to buy only what's needed (no forced bundling)
- Schedule selection based on travel plans
- Transparent pricing by departure time

**Acceptance Criteria**:
- [ ] Search routes by origin, destination, travel date
- [ ] Display available schedules with departure/arrival times
- [ ] Show real-time seat availability per schedule
- [ ] Support multiple passenger types (adult/child/senior) with differentiated pricing
- [ ] Support seat class selection (standard/VIP) where applicable
- [ ] Schedule-based inventory deduction (by date + schedule + seat class + passenger type)
- [ ] WeChat payment integration (same as packages)
- [ ] QR ticket issuance for route tickets

**Priority**: High (core differentiation)

---

### **Feature 3: Unified Search Hub**

**Description**:
Single search interface that returns both package products and route schedules, allowing users to compare options.

**Business Value**:
- Maximize product discovery (users see all options)
- Intelligent upselling (show package value vs standalone pricing)
- Data-driven insights on user preferences (package vs route)

**User Value**:
- Convenient comparison shopping
- Informed decision-making
- Flexibility to choose booking mode

**Acceptance Criteria**:
- [ ] Single search form (origin, destination, date)
- [ ] Results show both:
  - Package products available for this route
  - Route schedules available for this date
- [ ] Clear differentiation in UI (package vs route)
- [ ] Pricing comparison visibility
- [ ] Easy navigation to respective booking flows

**Priority**: Medium (enhances user experience)

---

### **Feature 4: WeChat Mini-Program Integration**

**Description**:
Native WeChat mini-program experience with WeChat login, payment, and notification capabilities.

**Business Value**:
- Leverage WeChat ecosystem (1B+ users)
- Higher conversion rate (native payment)
- Lower customer acquisition cost

**User Value**:
- No additional app installation
- Familiar WeChat UX
- Seamless payment experience

**Acceptance Criteria**:
- [ ] WeChat OAuth login
- [ ] WeChat payment integration
- [ ] Template message notifications (order confirmation, ticket issuance, travel reminders)
- [ ] Share functionality (invite friends to book together)
- [ ] Mini-program performance optimization (load time <2s)

**Priority**: High (platform requirement)

---

### **Feature 5: My Tickets & Order Management**

**Description**:
Users view purchased tickets (both package and route), check QR codes, manage orders, and handle cancellations.

**Business Value**:
- Reduce customer service load (self-service)
- Clear ticket validation process
- Refund policy enforcement

**User Value**:
- Easy ticket access before travel
- Order history tracking
- Flexible cancellation when needed

**Acceptance Criteria**:
- [ ] Display all tickets (package + route) in unified view
- [ ] Show ticket status (ACTIVE, USED, EXPIRED, CANCELLED)
- [ ] QR code display for redemption
- [ ] Order details (travel date, passenger info, amount paid)
- [ ] Cancellation request flow (with policy rules)
- [ ] Refund status tracking

**Priority**: High (core user journey)

---

## Business Rules & Logic

### Dual Inventory System

**Package Products** (inherited from PRD-001):
```yaml
Source: Products table
Inventory Model: Multi-channel allocation per product
Example:
  Product 106 (Premium Plan):
    direct: {allocated: 1000, reserved: 0, sold: 0}
    full_access: {allocated: 500, reserved: 173, sold: 0}

Pricing: Complex multi-variable pricing engine
  - Base price + weekend premium
  - Customer type discounts (child/elderly)
  - Special event pricing
```

**Route Tickets** (new system):
```yaml
Source: Routes → Schedules → Schedule Inventory
Inventory Model: Multi-channel allocation per schedule + date + seat class + passenger type
Example:
  Schedule 101 (8:00 Ferry), Date 2025-12-01, Standard Seat, Adult:
    direct: {allocated: 300, reserved: 0, sold: 0}
    full_access: {allocated: 100, reserved: 0, sold: 0}

Pricing: Schedule-based pricing rules
  - Base price by seat class (standard/VIP)
  - Peak hour surcharge
  - Weekend/holiday multiplier
  - Customer type discounts (child/senior)
```

### Channel Allocation Rules

**"direct" Channel = Mini-Program Inventory**:
- All bookings through mini-program deduct from "direct" channel allocation
- Inventory isolation from OTA partners and resellers
- Real-time availability based on allocated - reserved - sold

**Inventory Consistency**:
- Package products and route tickets use same allocation model
- Shared inventory management service logic
- Unified seat locking mechanism (15-minute reservation timeout)

### Pricing Strategy

**Package Products**:
- Bundled value pricing (discount vs individual components)
- Dynamic pricing by timing (weekday/weekend) and customer type
- Fixed package composition (cannot customize)

**Route Tickets**:
- Competitive market pricing (aligned with standalone ticket market)
- Schedule-based differentiation (peak/off-peak timing)
- Seat class premium (VIP vs standard)
- Volume potential (frequent travelers)

**Pricing Transparency**:
- Show package value breakdown (e.g., "Save $50 vs buying separately")
- Clear route ticket pricing by schedule
- No hidden fees

### Booking Flow Rules

**Common Flow** (both package and route):
1. User searches/browses products
2. Selects product/schedule
3. System locks inventory for 15 minutes
4. User completes WeChat payment
5. System issues QR ticket immediately
6. Payment webhook activates reservation → converts to "sold"

**Package-Specific Rules**:
- Single product selection (cannot mix multiple packages in one order)
- Travel date selection required (for dynamic pricing)
- Customer type required for each passenger

**Route-Specific Rules**:
- Schedule selection required (specific departure time)
- Travel date inherent in schedule selection
- Passenger details required (name, ID number for some routes)
- Seat class selection (where applicable)

### Cancellation & Refund Policy

**Cancellation Windows**:
- **>24 hours before travel**: Full refund (100%)
- **12-24 hours before travel**: Partial refund (50%)
- **<12 hours before travel**: No refund (0%)

**Inventory Return**:
- Cancelled tickets return to "direct" channel allocation
- Refund amount based on cancellation window
- Automatic refund processing via WeChat payment

---

## User Scenarios & Journeys

### Scenario 1: Experience-Seeking Family (Package Booking)

**User Profile**: Family with 2 adults + 2 children planning weekend trip to Cheung Chau

**Journey**:
1. Opens DeepTravel mini-program
2. Browses "Featured Packages" tab
3. Selects "Premium Plan" (ferry + dining + playground)
4. Chooses weekend date (sees dynamic pricing: Adult $318, Child $188)
5. Adds 2 adults + 2 children to cart
6. Reviews total: $1,012
7. Proceeds to WeChat payment
8. Receives 4 QR tickets (each with ferry + dining + playground entitlements)

**Success Criteria**: Smooth bundle purchase, clear value perception, immediate ticket issuance

---

### Scenario 2: Commuter Traveler (Route Booking)

**User Profile**: Solo adult needing ferry ticket for specific morning departure

**Journey**:
1. Opens DeepTravel mini-program
2. Selects "Book Tickets" tab
3. Searches: Central → Cheung Chau, Date: 2025-12-01
4. Views available schedules:
   - 8:00 AM (Standard: $50, VIP: $80) - Available
   - 9:00 AM (Standard: $50, VIP: $80) - Available
   - 10:00 AM (Standard: $60, VIP: $90) - Peak pricing
5. Selects 8:00 AM, Standard seat, 1 Adult
6. Enters passenger name
7. Proceeds to WeChat payment ($50)
8. Receives 1 QR ticket for 8:00 AM ferry

**Success Criteria**: Fast schedule selection, clear pricing, no forced bundling

---

### Scenario 3: Value Comparison Shopper

**User Profile**: Budget-conscious traveler comparing options

**Journey**:
1. Opens DeepTravel mini-program
2. Uses unified search: Central → Cheung Chau, Date: 2025-12-01
3. Sees results:
   - **Package Option**: Premium Plan - $318 (ferry + dining + playground)
   - **Route Option**: 8:00 AM Ferry - $50 (transport only)
4. Calculates: "If I want dining + playground separately, would cost $80 more"
5. Decides package has better value
6. Proceeds with package booking

**Success Criteria**: Easy comparison, informed decision, upsell success

---

## Success Metrics & KPIs

### Business Metrics

**Revenue Metrics**:
- **Direct Channel GMV**: Monthly gross merchandise value via mini-program
- **Package Revenue**: Total from package product sales
- **Route Revenue**: Total from standalone route ticket sales
- **Average Order Value**: Package AOV vs Route AOV comparison
- **Upsell Rate**: Users who viewed routes but bought packages

**Operational Metrics**:
- **Inventory Utilization**: Sold / Allocated ratio for "direct" channel
- **Booking Conversion Rate**: (Orders / Searches) %
- **Payment Success Rate**: (Paid Orders / Initiated Payments) %
- **Cancellation Rate**: (Cancelled Orders / Total Orders) %

### Product Metrics

**User Engagement**:
- **Daily Active Users (DAU)**: Unique users opening mini-program
- **Search Volume**: Package searches vs route searches
- **Booking Mode Split**: Package bookings vs route bookings (%)
- **Repeat Purchase Rate**: Users with >1 order in 30 days

**User Experience**:
- **Search-to-Booking Time**: Average time from search to payment
- **Mini-Program Load Time**: <2s target
- **Customer Satisfaction (CSAT)**: Post-trip survey rating
- **Customer Support Tickets**: Volume and category breakdown

**Performance Metrics**:
- **Availability Accuracy**: Inventory sync errors (target: <0.1%)
- **Payment Success Rate**: >98% target
- **Ticket Issuance Speed**: <3s after payment confirmation
- **QR Redemption Success**: First-scan success rate >99%

---

## Implementation Strategy

### Phased Approach

**Phase 1: Package Booking Foundation** (2-3 weeks)
- Leverage existing PRD-001 catalog and complex pricing
- WeChat mini-program UI for package browsing
- WeChat payment integration
- QR ticket display (my tickets page)
- "direct" channel inventory deduction

**Deliverables**:
- [ ] Package product listing page
- [ ] Package detail & booking flow
- [ ] WeChat payment integration
- [ ] My tickets page
- [ ] Basic order management

**Validation**: End-users can purchase package products via mini-program

---

**Phase 2: Route Booking System** (4-6 weeks)
- Route and schedule master data management (admin backend)
- Schedule-based inventory allocation system
- Route search & booking flow
- Schedule pricing rules engine
- Route QR ticket issuance

**Deliverables**:
- [ ] Route & schedule admin APIs (backend)
- [ ] Route search interface (mini-program)
- [ ] Schedule booking flow
- [ ] Route ticket issuance
- [ ] Unified "My Tickets" (package + route)

**Validation**: End-users can search schedules and purchase route tickets

---

**Phase 3: Unified Experience** (2-3 weeks)
- Single search hub (package + route results)
- Intelligent recommendations (suggest packages when viewing routes)
- Advanced order management (cancellation, refund)
- Performance optimization

**Deliverables**:
- [ ] Unified search interface
- [ ] Package value comparison display
- [ ] Cancellation & refund flow
- [ ] Mini-program performance tuning

**Validation**: Users can compare packages vs routes in single search

---

**Phase 4: Advanced Features** (Future)
- Loyalty program integration (PRD-005 linkage)
- AI-powered schedule recommendations
- Group booking functionality
- Travel insurance upsell

---

## Technical Architecture Principles

**Note**: Detailed technical implementation will be defined in Cards. PRD focuses on business requirements.

**Key Architectural Decisions** (business-driven):

1. **Dual Inventory Model**:
   - Package products: Product-based inventory
   - Route tickets: Schedule-based inventory (by date + schedule + seat class + passenger type)
   - Reason: Different business models require different granularity

2. **Unified Channel Allocation**:
   - Both systems use multi-channel allocation model
   - "direct" channel represents mini-program inventory pool
   - Reason: Consistent inventory management across products

3. **Pricing Engine Reuse**:
   - Package pricing: Reuse complex-pricing-engine (PRD-001)
   - Route pricing: Extend pricing engine for schedule-based rules
   - Reason: Leverage existing dynamic pricing capabilities

4. **Ticket Format Consistency**:
   - Both package and route tickets use QR code format
   - Same redemption validation process
   - Reason: Unified operator experience at redemption points

---

## Risk Assessment

### Business Risks

**Market Acceptance**:
- **Risk**: Users may prefer package-only or route-only platforms (not dual-mode)
- **Mitigation**: A/B testing of unified search vs separate tabs, user feedback collection

**Pricing Complexity**:
- **Risk**: Too many pricing variables confuse users (package dynamic pricing + route schedule pricing)
- **Mitigation**: Clear pricing display, comparison tools, transparent value communication

**Inventory Fragmentation**:
- **Risk**: "direct" channel allocation insufficient for high demand periods
- **Mitigation**: Dynamic allocation adjustment, real-time monitoring, allocation optimization

### Operational Risks

**Customer Service Complexity**:
- **Risk**: Support team needs to handle both package and route booking issues
- **Mitigation**: Comprehensive training, clear documentation, separate escalation paths

**Refund Processing**:
- **Risk**: Cancellation policy enforcement for both product types
- **Mitigation**: Automated refund workflows, clear policy display at booking time

**Schedule Changes**:
- **Risk**: Route operator changes schedules (cancellations, delays)
- **Mitigation**: Real-time schedule sync, automatic user notifications, rebooking assistance

### Technical Risks

**Mini-Program Performance**:
- **Risk**: Dual inventory queries slow down search experience
- **Mitigation**: Caching strategies, optimized database queries, progressive loading

**Inventory Sync**:
- **Risk**: Real-time availability inconsistency between systems
- **Mitigation**: Seat locking mechanism, reservation timeout, oversell prevention logic

**WeChat Platform Dependencies**:
- **Risk**: WeChat API changes or service disruptions
- **Mitigation**: Graceful degradation, fallback payment options, regular API monitoring

---

## Success Criteria & Acceptance

### Phase 1 Success Criteria (Package Booking)

**Business Success**:
- [ ] "direct" channel package sales generate >$10,000 GMV in first month
- [ ] Package booking conversion rate >5% (searches to purchases)
- [ ] <5% cancellation rate

**User Success**:
- [ ] >90% users successfully complete package purchase without support
- [ ] CSAT score >4.0/5.0 for package booking experience
- [ ] <1% payment failures

**Technical Success**:
- [ ] Mini-program load time <2s
- [ ] Inventory accuracy >99.9%
- [ ] QR ticket generation success >99.5%

---

### Phase 2 Success Criteria (Route Booking)

**Business Success**:
- [ ] Route ticket sales represent 30-50% of total mini-program GMV
- [ ] Route booking conversion rate comparable to package booking (within 20% difference)
- [ ] Clear understanding of package vs route user preferences (data collected)

**User Success**:
- [ ] >85% users successfully complete route booking without support
- [ ] CSAT score >4.0/5.0 for route booking experience
- [ ] <10% booking errors (wrong schedule/date selection)

**Technical Success**:
- [ ] Schedule search response time <1s
- [ ] Schedule inventory accuracy >99.9% (no overselling)
- [ ] Dual inventory deduction working correctly (no conflicts)

---

### Phase 3 Success Criteria (Unified Experience)

**Business Success**:
- [ ] >20% of route viewers upgrade to package purchase (upsell success)
- [ ] Average order value increases 15% compared to Phase 1 (package-only)

**User Success**:
- [ ] >70% users find unified search "very helpful" in comparison
- [ ] Clear user preference data (package-first vs route-first shoppers)

---

## Dependencies & Assumptions

### Dependencies

**Internal Dependencies**:
- **PRD-001 Foundation**: Complex pricing engine, QR ticketing system, inventory management
- **PRD-002 Channel System**: Multi-channel allocation model, "direct" channel configuration
- **WeChat Authentication**: OAuth login, user profile management

**External Dependencies**:
- **WeChat Platform**: Mini-program APIs, payment SDK, template messages
- **Customer Route Data**: Accurate schedule information from ferry/bus operators
- **Payment Gateway**: WeChat Pay stability and compliance

### Assumptions

**Business Assumptions**:
- [ ] Customers are willing to provide accurate route schedule data
- [ ] "direct" channel will receive sufficient inventory allocation (30-50% of total)
- [ ] Users prefer WeChat mini-program over standalone app
- [ ] Package and route ticket demand can coexist profitably

**User Assumptions**:
- [ ] End-users understand the difference between package and route booking
- [ ] WeChat payment is primary preferred payment method
- [ ] Mobile-first experience meets user expectations

**Technical Assumptions**:
- [ ] WeChat mini-program performance meets business requirements
- [ ] Real-time inventory sync is achievable with current infrastructure
- [ ] Dual inventory model can scale to multiple routes and schedules

---

## Open Questions

1. **Inventory Allocation Strategy**:
   - How will customers decide "direct" vs "OTA" vs "reseller" allocation ratios?
   - Should there be dynamic reallocation based on channel performance?

2. **Route Schedule Volatility**:
   - How frequently do ferry/bus schedules change?
   - What's the process for handling last-minute schedule cancellations?

3. **Pricing Authority**:
   - Who sets route ticket base prices (customer or platform)?
   - How are peak/off-peak rules defined (manual or algorithmic)?

4. **Package-Route Relationship**:
   - Should packages include specific schedule selections (e.g., "Premium Plan with 8:00 AM ferry")?
   - Or remain flexible (any available schedule on travel date)?

5. **User Data Requirements**:
   - Do route tickets require passenger ID verification (name, ID number)?
   - Are there regulatory requirements for transportation ticket booking?

---

## Related Documents

**PRDs**:
- **PRD-001**: Cruise Ticketing Platform (package foundation, complex pricing, QR ticketing)
- **PRD-002**: OTA Platform Integration (multi-channel allocation, B2B channel management)
- **PRD-005**: Loyalty Program (future integration for repeat travelers)

**Stories**:
- **US-010**: DeepTravel 小程序全链路购票与核销体验 (parent epic)
- **US-010A**: DeepTravel 旅客闭环体验 (traveler booking journey)
- **US-010B**: DeepTravel 运营支撑体系 (operations backend)

**Cards** (to be created):
- Package browsing & booking flow
- Route search & schedule selection
- Unified search hub
- WeChat payment integration
- Route & schedule admin backend
- Inventory allocation management
- My tickets & order management

---

## Document Status

**Status**: Draft - Business requirements defined, awaiting stakeholder review

**Next Steps**:
1. Review with customer stakeholders (confirm route booking business model)
2. Validate inventory allocation assumptions
3. Define detailed user stories (US-010, US-010A, US-010B)
4. Create technical implementation cards

**Approval**:
- [ ] Product Owner
- [ ] Business Stakeholder (Customer - e.g., Cheung Chau Ferry Company)
- [ ] Technical Lead
- [ ] UX Designer (mini-program experience)

---

**Last Updated**: 2025-11-21
**Document Owner**: Product Manager
**Next Review Date**: TBD
