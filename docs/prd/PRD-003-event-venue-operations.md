# Product Requirements Document Template

## Document Metadata
```yaml
prd_id: "PRD-003"
product_area: "Operations"
owner: "Product Management"
status: "Draft"
created_date: "2025-11-04"
last_updated: "2025-11-19"
related_stories: ["US-001", "US-002", "US-004", "US-005", "US-006", "US-013"]
implementation_cards: ["tickets-scan", "operators-login", "validators-sessions", "reports-redemptions"]
```

## Executive Summary
**Problem Statement**: Hong Kong ferry terminals require efficient validation of multi-function packages like Premium Plan ($288) tickets that include unlimited ferry boarding + single gift redemption + 10 playground tokens. Current manual checking takes 5+ minutes per passenger during peak boarding, while paper ticket duplication creates fraud risk for high-value packages.

**Solution Overview**: Transform Central Pier and Cheung Chau Terminal operations with QR-based validation that handles complex Premium/Pet/Deluxe packages. Single scan validates specific entitlements (ferry unlimited, gifts once, tokens decremented) while preventing JTI duplication fraud across all terminals and redemption points.

**Success Metrics**: Reduce Premium Plan validation from 5 minutes to <10 seconds, eliminate 100% of package fraud through JTI tracking, process 500+ daily ferry boardings with 99.9% uptime, generate $145K Y1 revenue from 2 pilot terminals.

**Timeline**: Q1 2026 Central Pier + Cheung Chau deployment, Q2 2026 Hong Kong ferry network expansion, Q3-Q4 2026 regional ferry terminal scaling.

## Story Integration & Flow Context

### Current System Flow
**Existing Flow**: Complete ticket purchase and basic scanning infrastructure already implemented
```
Order Create → Payment Webhook → Tickets Issuance → QR Token → Scanning
   US-001        US-004          US-004        US-001      US-002
```

### PRD Enhancement Point
**Enhancement**: Transforms basic QR scanning (US-002) into sophisticated venue operations platform that handles multi-function packages with cross-terminal fraud prevention and real-time analytics.

**Impact on Stories**:
- **US-001, US-004**: No changes - payment and issuance flow remains unchanged
- **US-002**: Enhanced with multi-function validation, persistent fraud detection, venue analytics
- **US-013**: New story implementing comprehensive venue operations capabilities

### Dependencies & Prerequisites
- **Foundation Stories**: US-001 (ticket purchase), US-004 (payment → issuance) must remain functional
- **Enhanced Stories**: US-002 (scanning) will be significantly enhanced with venue operations features
- **New Implementation**: US-013 (venue operations platform) will implement the complete PRD-003 vision

## Business Context

### Market Opportunity
- **Market Size**: 50+ cruise/ferry terminals across Hong Kong/Macau region, 200+ entertainment venues
- **Customer Segments**: Primary (cruise terminals), Secondary (entertainment venues), Tertiary (corporate events)
- **Competitive Landscape**: Manual checking (slow), basic scanners (limited), no comprehensive fraud prevention solutions
- **Business Impact**: $145K Y1 → $800K Y2 revenue, $250K annual fraud prevention savings per venue

### Customer Research
- **User Personas**: Ferry terminal operators, cruise pier staff, venue security personnel
- **User Journey**: Paper ticket checking → QR-based validation for multi-function packages
- **Pain Points**: Complex package validation (ferry + gifts + tokens), fraud through duplicate paper tickets, queue bottlenecks during peak boarding
- **Real Usage Pattern**: Premium Plan passengers need multiple scans - ferry boarding (unlimited), gift redemption (once), playground tokens (10 times)
- **Validation**: Current ferry terminals report 15+ minute boarding delays during peak times, paper ticket duplication observed

### Business Requirements
- **Revenue Goals**: $2K/month/venue + $0.10/scan, target 5 venues Q1 2026
- **Operational Constraints**: 99.9% uptime requirement, 7-year audit retention, GDPR compliance
- **Brand Guidelines**: Professional venue operations platform, enterprise-grade reliability
- **Partnership Requirements**: Integration with existing venue booking systems, terminal hardware compatibility

## Product Specification

### Core Features
**Multi-Function Package Validation**
- **Description**: Single QR scan validates specific entitlements within Premium Plan ($288), Pet Plan ($188), and Deluxe Tea Set ($788) packages
- **Business Value**: Handles complex entitlements - Premium Plan includes unlimited ferry boarding + single gift redemption + 10 playground tokens, Pet Plan includes ferry + pet transport + gift, Deluxe includes ferry + premium tea service + souvenir
- **User Value**: Central Pier operators scan once and system automatically tracks: ferry boarding (unlimited uses), gift collection (single use), playground tokens (decremented per use)
- **Acceptance Criteria**:
  - Premium Plan: Unlimited ferry Central↔Cheung Chau, single gift at either terminal, 10 playground token decrements
  - Pet Plan: Ferry + pet transport validation, single gift redemption
  - Deluxe Tea Set: Ferry + tea service validation at Cheung Chau, souvenir pickup once
- **Priority**: High

**Cross-Terminal JTI Fraud Prevention**
- **Description**: Persistent JTI (JWT Token ID) tracking prevents same QR token reuse across Central Pier, Cheung Chau Terminal, and all redemption points
- **Business Value**: Eliminates ticket duplication fraud - single Premium Plan ($288) ticket cannot be photocopied and used by multiple passengers
- **User Value**: Operators get instant "ALREADY REDEEMED" alerts when fraudulent QR codes are scanned, no training needed
- **Acceptance Criteria**: Block duplicate JTI usage across all terminals; <2 second fraud detection; immutable audit trail for dispute resolution
- **Priority**: High

**Real-Time Ferry Package Analytics**
- **Description**: Track Premium/Pet/Deluxe package usage patterns across Central Pier and Cheung Chau Terminal
- **Business Value**: Optimize ferry schedules based on Premium Plan boarding patterns, track gift redemption rates by terminal, monitor playground token usage for capacity planning
- **User Value**: Terminal managers see live passenger flow by package type, popular gift redemption locations, peak boarding times
- **Acceptance Criteria**: Real-time dashboard showing package-specific metrics - ferry boarding frequency, gift redemption conversion rates, token usage patterns by time/location
- **Priority**: Medium

### Technical Requirements
- **Performance**: <2 second QR validation response during peak ferry boarding (500+ passengers/hour at Central Pier), 1000+ scans/hour capacity for Premium Plan multi-function validation, 99.9% uptime during ferry operation hours
- **Multi-Function Logic**: Handle complex entitlement validation - Premium Plan requires tracking ferry boardings (unlimited), gift redemptions (once), playground tokens (decremented), all tied to single JTI
- **Cross-Terminal Synchronization**: Real-time JTI fraud detection across Central Pier, Cheung Chau Terminal, gift shops, playground areas - prevent duplicate QR usage within seconds
- **Ferry Terminal Integration**: REST API compatibility with existing ferry booking systems, QR scanner SDK for terminal devices, webhook support for boarding notifications
- **Audit & Compliance**: 7-year immutable audit trails for all Premium/Pet/Deluxe package redemptions, regulatory reporting for ferry passenger manifests, GDPR compliance for passenger data

### Design Requirements
- **User Experience**: Mobile-first operator interface, clear validation feedback, minimal training required
- **Accessibility**: Touch-friendly interface, clear visual/audio feedback, multi-language support
- **Responsive Design**: iOS/Android device support, web dashboard for venue managers
- **Branding**: Professional enterprise interface, venue-customizable branding options

## Business Rules & Logic

### Pricing Strategy
- **Pricing Model**: Fixed monthly license + per-transaction fees
- **Price Points**: $2K/month/venue + $0.10/successful_scan
- **Discounts**: Volume discounts for venue management companies (10+ venues)
- **Currency**: USD for international venues, local currency for regional markets

### Business Logic
- **Multi-Function Validation Rules**:
  - Premium Plan ($288): Ferry scans always allowed (unlimited), gift redemption only if not previously redeemed, playground tokens decremented if remaining_uses > 0
  - Pet Plan ($188): Ferry + pet transport validation, single gift redemption
  - Deluxe Tea Set ($788): Ferry boarding allowed, tea service validation at Cheung Chau only, souvenir pickup once
- **JTI Fraud Prevention**: Block any redemption if JTI already exists in redemption history across Central Pier, Cheung Chau Terminal, gift shops, playground
- **State Transitions**: Premium Plan ticket: assigned → active → (ferry: unlimited, gift: single_use, tokens: counted) → fully_redeemed when all entitlements exhausted
- **Location-Specific Rules**: Tea service only valid at Cheung Chau Terminal, playground tokens only at designated areas, gifts redeemable at either terminal
- **Operator Session Rules**: Terminal operators must have active session before scanning, sessions tied to specific location (Central/Cheung Chau), expire after 8 hours

### Data Requirements
- **Data Sources**: Existing US-002 ticket issuance system, venue operator sessions
- **Data Storage**: 7-year retention for audit trails, real-time replication for fraud detection
- **Data Privacy**: GDPR compliance for passenger data, anonymized analytics
- **Data Quality**: Immutable audit logs, tamper-proof redemption records

## Success Metrics & KPIs

### Business Metrics
- **Revenue Metrics**: $145K Y1 ARR from Central Pier + Cheung Chau Terminal deployments, $800K Y2 ARR expansion to 15+ ferry terminals across Hong Kong
- **Ferry Operations**: 90% reduction in boarding validation time (from 5 minutes manual checking to <10 seconds QR scan), 100% Premium Plan fraud prevention across terminals
- **Package Performance**: >90% Central Pier terminal satisfaction, <2% Premium/Pet/Deluxe package validation complaints, 85%+ gift redemption rate

### Product Metrics
- **Ferry Boarding Metrics**: 250K Premium Plan boardings Y1 (500/day avg), 2M total package scans Y2 including gifts and tokens, 99.9% uptime during ferry operation hours
- **Multi-Function Performance**: <2 second validation time for complex Premium Plan entitlements (ferry + gift + token validation), 1000+ scans/hour capacity during peak boarding
- **Fraud Prevention**: 0% successful JTI duplication across Central/Cheung Chau terminals, <1% false positives on legitimate Premium Plan re-boardings

### Leading Indicators
- **Ferry Terminal Adoption**: Central Pier pilot deployment success, 1000+ Premium Plan validations without fraud incidents
- **Risk Indicators**: >5% false positives on unlimited ferry boardings, >3 second validation during peak passenger loads, terminal operator churn
- **Package Analytics**: Premium Plan gift redemption conversion rates >80%, playground token usage patterns, ferry boarding frequency per package

### Core System Requirements

#### Real-Time Fraud Detection
- **Requirement**: Block duplicate QR token usage across all venue devices
- **Technical Need**: Persistent redemption history with millisecond-level synchronization
- **Database Driver**: Cross-device state coordination requires persistent storage

#### Comprehensive Audit Trails
- **Requirement**: Immutable record of every redemption attempt (success/failure)
- **Compliance Need**: Regulatory audit trails for revenue verification
- **Database Driver**: Audit logs must persist beyond session/device restarts

#### Multi-Operator Coordination
- **Requirement**: Multiple operators at same venue sharing real-time state
- **Technical Need**: Concurrent access to shared redemption state
- **Database Driver**: Mock data insufficient for multi-device coordination

#### Venue Analytics Dashboard
- **Requirement**: Real-time capacity monitoring and redemption analytics
- **Business Need**: Venue operations management and capacity planning
- **Database Driver**: Historical data aggregation requires persistent storage

### Performance Requirements
- **Scan Response Time**: <2 seconds (including fraud check)
- **Concurrent Operators**: Support 10+ simultaneous scanners per venue
- **Peak Load**: 1000+ scans/hour during cruise boarding
- **Offline Resilience**: 5-minute buffer for network interruptions

### Security & Compliance
- **Data Privacy**: GDPR compliance for passenger data
- **Audit Trail**: Immutable redemption logs for 7-year retention
- **Fraud Prevention**: Real-time duplicate detection across all devices
- **Access Control**: Role-based permissions for operators vs venue managers

---

## 🚀 Product Strategy & Roadmap

### Phase 1: Pilot Venue Foundation (Q1 2026)
**Deliverable**: Production-ready system for 2 pilot cruise terminals

**Core Features**:
- Real-time QR validation with fraud detection
- Multi-operator support with shared state
- Basic venue analytics dashboard
- Complete audit trail system

**Success Criteria**:
- 2 signed pilot venue agreements
- 10,000+ successful redemptions without fraud incidents
- <10 second average validation time
- 99.9% system uptime during pilot period

### Phase 2: Enhanced Analytics & Integration (Q2 2026)
**Deliverable**: Advanced venue management features

**Enhanced Features**:
- Real-time capacity monitoring and alerts
- Integration with existing venue booking systems
- Advanced fraud pattern detection
- Operator performance analytics

**Success Criteria**:
- 5 total venue partnerships
- Advanced analytics adoption by 100% of venues
- 50% reduction in manual oversight requirements

### Phase 3: Market Expansion (Q3-Q4 2026)
**Deliverable**: Scalable platform for diverse venue types

**Expansion Features**:
- White-label venue branding options
- API integration for third-party booking systems
- Advanced reporting and business intelligence
- Multi-language support for international venues

**Success Criteria**:
- 15+ total venue partnerships
- $500K+ annual recurring revenue
- Expansion beyond Hong Kong market

---

## 👥 Stakeholder Analysis & Requirements

### Primary Stakeholders

#### Venue Operations Managers
**Role**: Day-to-day operations oversight
**Key Requirements**:
- Real-time visibility into redemption status and queue lengths
- Instant alerts for fraud attempts or system issues
- Simple operator training and management tools
- Comprehensive reporting for operational optimization

**Success Metrics**: Reduced operational costs, improved customer throughput

#### Venue Security Directors
**Role**: Fraud prevention and compliance
**Key Requirements**:
- Zero tolerance for successful fraud attempts
- Complete audit trails for investigation and compliance
- Real-time alerts for suspicious activity patterns
- Integration with existing security systems

**Success Metrics**: Zero successful fraud incidents, complete audit compliance

#### Terminal Operators (End Users)
**Role**: Front-line ticket validation
**Key Requirements**:
- Instant scan-to-decision feedback (<2 seconds)
- Clear visual/audio cues for validation results
- Minimal training requirements (<5 minutes)
- Reliable operation during peak passenger loads

**Success Metrics**: Faster passenger processing, reduced validation errors

### Secondary Stakeholders

#### Cruise/Ferry Line Partners
**Role**: Ticket issuance and passenger experience
**Requirements**: Seamless integration with existing ticketing systems
**Success Metrics**: Improved passenger satisfaction, reduced boarding delays

#### Regulatory Authorities
**Role**: Compliance and audit oversight
**Requirements**: Complete audit trails and compliance reporting
**Success Metrics**: Simplified audit processes, regulatory compliance

---

## 🏗️ Implementation Strategy

### Technical Implementation Approach

#### Database Transition Strategy
**Foundation**: Leverage existing US-002 mock implementation
- ✅ QR validation logic already proven
- ✅ Atomic redemption mechanics working
- ✅ Fraud detection patterns established

**Current Payment → Ticket Flow**:
```
Order Create → Payment Webhook → Tickets Issuance → QR Token → Scanning
   US-001        US-004          US-004        US-001      US-002
```

**PRD-003 Enhancement**: Transforms basic scanning (US-002) into sophisticated venue operations platform that handles multi-function packages (Premium Plan: ferry + gift + tokens) with cross-terminal fraud prevention and real-time analytics.

**Database Necessity Drivers**:
1. **Multi-venue deployment** requires persistent shared state
2. **Audit compliance** needs immutable historical records
3. **Real-time fraud detection** across multiple devices
4. **Venue analytics** require data aggregation and reporting

#### Service Architecture Evolution
```typescript
// Current: Mock-based single-device validation
const redemption = mockDataStore.validateAndRedeem(qrToken);

// Target: Multi-function ferry terminal validation
const redemption = await ferryOperationsService.validatePackageEntitlement({
  qrToken,
  terminalId: 'central-pier' | 'cheung-chau',
  function: 'ferry_boarding' | 'gift_redemption' | 'playground_token',
  operatorId,
  deviceId
});

// Example: Premium Plan package validation
// - Ferry boarding: Always allowed (unlimited)
// - Gift redemption: Check if already redeemed
// - Playground tokens: Decrement remaining_uses
```

### Ferry Terminal Selection Criteria
**Central Pier + Cheung Chau Terminal (Pilot Sites)**:
- **High volume**: 500+ daily Premium Plan passengers during peak ferry season
- **High-value packages**: Premium Plan ($288), Pet Plan ($188), Deluxe Tea Set ($788) create significant fraud motivation
- **Multi-function complexity**: Single tickets include ferry boarding (unlimited), gift redemption (once), playground tokens (counted) requiring sophisticated validation
- **Existing infrastructure**: QR scanner compatibility, ferry boarding terminal integration readiness
- **Partnership commitment**: 3-month pilot with Hong Kong ferry operators

### Success Measurement Framework
**Weekly KPIs**:
- Redemption volume and success rate
- Fraud attempt detection and blocking
- Operator training time and error rates
- System uptime and performance metrics

**Monthly Business Reviews**:
- Venue partnership satisfaction scores
- Revenue impact and cost savings
- Market expansion opportunities
- Technical performance optimization

---

## 🎯 Go-to-Market Strategy

### Pilot Venue Acquisition (Q1 2026)
**Target**: 2 cruise terminals in Hong Kong

**Value Proposition**:
- "Eliminate ticket fraud while processing 10x more passengers"
- "Transform 5-minute validation into 10-second seamless experience"
- "Complete audit compliance with zero additional training"

**Pilot Program Benefits**:
- 3-month free trial with full system implementation
- Dedicated technical support and on-site training
- Custom integration with existing terminal systems
- Performance guarantee: <10 second validation or full refund

### Marketing & Sales Strategy
**Direct Venue Partnership**:
- Terminal operations conference presentations
- Case study development from pilot successes
- Industry publication thought leadership

**Channel Partnership**:
- Integration with existing terminal management software vendors
- Partnership with security system integrators
- Collaboration with cruise line technology departments

### Pricing Strategy
**Pilot Phase**: Free implementation + success-based fees
**Scale Phase**: $2K/month/venue + $0.10/successful_scan
**Enterprise**: Custom pricing for venue management company partnerships

---

## ⚠️ Risk Analysis & Mitigation

### Technical Risks

#### Risk: Database Performance Under Peak Load
**Impact**: System slowdown during high-volume events
**Probability**: Medium
**Mitigation**:
- Database connection pooling and read replicas
- Caching layer for frequent queries
- Load testing with 10x expected peak capacity

#### Risk: Network Connectivity Disruption
**Impact**: Operators unable to validate tickets
**Probability**: Medium
**Mitigation**:
- 5-minute offline operation buffer
- Automatic sync when connectivity restored
- Manual override procedures for extended outages

### Business Risks

#### Risk: Venue Adoption Resistance
**Impact**: Slow market penetration
**Probability**: Medium
**Mitigation**:
- Comprehensive ROI demonstration with pilot results
- Industry reference customers and case studies
- Flexible implementation and pricing options

#### Risk: Competitive Response
**Impact**: Market share erosion
**Probability**: Low
**Mitigation**:
- Rapid feature development and market expansion
- Strong venue partnerships with exclusive agreements
- Patent filing for core fraud detection algorithms

### Operational Risks

#### Risk: Fraud Detection False Positives
**Impact**: Valid customers denied entry
**Probability**: Low
**Mitigation**:
- Comprehensive testing with edge case scenarios
- Manual override capabilities for venue managers
- Real-time support hotline for dispute resolution

---

## 📊 Appendices

### Appendix A: Technical Architecture Diagram
```
Venue Operator Device → Venue Operations API → Fraud Detection Engine
                                              ↓
                      Audit Trail Database ← Redemption Processor
                                              ↓
                      Analytics Dashboard ← Real-time Event Stream
```

### Appendix B: Competitive Analysis Matrix
| Feature | Manual Checking | Basic Scanners | Our Solution |
|---------|----------------|----------------|---------------|
| Fraud Prevention | Poor | Limited | Excellent |
| Operator Training | Hours | Hours | Minutes |
| Real-time Analytics | None | Basic | Comprehensive |
| Audit Compliance | Manual | Limited | Automated |
| Multi-device Coordination | None | None | Native |

### Appendix C: Revenue Model Details
**Fixed Costs**: $2K/month/venue (covers software licensing, support, updates)
**Variable Costs**: $0.10/scan (covers transaction processing, fraud detection, analytics)
**Premium Services**: Custom integrations, dedicated support, advanced analytics

---

## 🔄 Document Control

**Version History**:
- v1.0 (Nov 4, 2025): Initial PRD creation for venue operations platform

**Review & Approval**:
- [ ] Product Management Review
- [ ] Engineering Architecture Review
- [ ] Business Development Approval
- [ ] Legal & Compliance Sign-off

**Next Steps**:
1. Stakeholder review and feedback incorporation
2. Technical architecture validation with engineering
3. Pilot venue identification and outreach
4. Resource allocation and timeline finalization

---

## Implementation Strategy

### Phased Approach
**Phase 1**: Pilot venue foundation (Q1 2026) - Production-ready system for 2 cruise terminals with real-time fraud detection and audit trails
**Phase 2**: Enhanced analytics & integration (Q2 2026) - Advanced venue management features and booking system integration
**Phase 3**: Market expansion (Q3-Q4 2026) - Scalable platform for diverse venue types with white-label options

### Resource Requirements
- **Engineering**: 2 backend developers, 1 mobile developer, database specialist
- **Design**: UX/UI designer for venue operator interface and analytics dashboard
- **Product**: Product manager for venue partnerships and requirements refinement
- **Operations**: DevOps for multi-venue deployment, customer success for venue onboarding

### Risk Assessment
- **Technical Risks**: Database performance under peak load, network connectivity disruption
- **Business Risks**: Venue adoption resistance, competitive response from existing solutions
- **Operational Risks**: Fraud detection false positives, venue integration complexity
- **Mitigation Strategies**: Load testing, offline operation buffer, comprehensive pilot program

## Appendices

### Research Evidence
- **User Research**: 15% duplicate ticket fraud rate in manual systems, 5+ minute validation times
- **Market Research**: 50+ terminals in Hong Kong/Macau region, $50K+ annual fraud losses per venue
- **Technical Research**: US-002 mock implementation proves QR validation feasibility

### Dependencies
- **Internal Dependencies**: US-002 ticket scanning system, existing QR token generation
- **External Dependencies**: Venue hardware compatibility, network connectivity requirements
- **Technical Dependencies**: Database infrastructure, mobile device support, audit compliance

### Glossary
- **Business Terms**: Venue (cruise terminal, entertainment facility), Operator (front-line staff), Validation (ticket authenticity check)
- **Technical Terms**: QR Token (time-limited ticket identifier), JTI (unique token identifier), Redemption (ticket usage)
- **Acronyms**: QR (Quick Response), API (Application Programming Interface), GDPR (General Data Protection Regulation)

---

## Document Review Process

### Stakeholder Review
- [ ] Product Owner approval
- [ ] Engineering feasibility review
- [ ] Design review
- [ ] Legal/Compliance review
- [ ] Business stakeholder approval

### Implementation Readiness
- [ ] User stories created (US-013)
- [ ] Technical cards defined (venue-operations-enhancement)
- [ ] Design mockups completed
- [ ] Success metrics defined and measurable
- [ ] Implementation plan approved

## Implementation Readiness Validation

### Dependency Verification
```yaml
implementation_readiness:
  all_related_stories_exist: true  # US-001, US-002, US-004 exist in _index.yaml
  foundation_stories_functional: true  # US-001, US-004 payment flow working
  test_data_available: true  # Products 106-108 available, operators can be created
  acceptance_criteria_measurable: true  # <2sec validation, JTI blocking, etc.
  technical_dependencies_resolved: false  # Database mode required, multi-terminal setup
  resource_allocation_confirmed: false  # Pending team capacity assessment
```

### Pre-Implementation Checklist
**Story Dependencies**:
- [x] All `related_stories` exist in `docs/stories/_index.yaml`
- [x] Foundation stories US-001, US-004 are implemented and tested
- [x] No circular dependencies with other PRDs

**Technical Readiness**:
- [x] Required APIs/services available (existing redeem module)
- [ ] Database schema changes identified (venue_id, cross-terminal tracking)
- [ ] Third-party integrations confirmed (terminal hardware compatibility)
- [ ] Performance requirements achievable (<2sec, 1000+ scans/hour)

**Testing Readiness**:
- [x] Test environment can be configured (database mode + multiple operators)
- [x] Test data can be generated (Premium Plan orders via US-001 flow)
- [x] All test scenarios have clear success criteria (defined in Testing Guide)
- [x] Edge cases are testable (fraud, concurrent scanning, zero tokens)

**Resource Readiness**:
- [ ] Engineering team has required skills (database operations, performance optimization)
- [ ] Timeline accounts for dependency completion (database infrastructure setup)
- [ ] QA capacity available for testing requirements (multi-terminal testing)
- [ ] Design resources allocated if needed (venue operator interface)

### Risk Assessment
**High Risk Factors** (any "yes" requires mitigation plan):
- [ ] Depends on unproven technology/APIs
- [x] Requires changes to core system components (scanning logic, database schema)
- [ ] Timeline compressed due to external deadlines
- [x] Resource constraints (database infrastructure, multi-terminal testing setup)
- [ ] Multiple competing PRDs affecting same stories

**Mitigation Strategies**:
- **Core system changes**: Implement incrementally, maintain backward compatibility with existing US-002 scanning
- **Database infrastructure**: Phase 1 with basic persistent storage, Phase 2 with performance optimization
- **Multi-terminal testing**: Start with mock multi-terminal setup, gradually add real terminal hardware
- **Fallback plan**: If database performance issues, fall back to enhanced mock mode with persistent storage

---

## Testing Guide

### Test Environment Setup
**Prerequisites**:
- Stories US-001, US-002, US-004 must be functional
- Database mode required: `USE_DATABASE=true`
- Products 106 (Premium $288), 107 (Pet $188), 108 (Deluxe $788) active in catalog
- Multiple operator sessions logged in at different terminal IDs

### Core Test Scenarios

#### Premium Plan Multi-Function Validation
**Setup**: Create Premium Plan order via US-001 → US-004 flow, obtain QR token

**Test Cases**:
1. **Ferry Boarding (Unlimited)**:
   - Scan QR at Central Pier for ferry boarding → Should succeed
   - Scan same QR multiple times → Should succeed each time
   - Verify audit log shows multiple ferry redemptions

2. **Gift Redemption (Single Use)**:
   - Scan QR at gift shop → Should succeed first time
   - Scan same QR at gift shop again → Should fail with "ALREADY_REDEEMED"
   - Scan at different gift location → Should still fail (cross-terminal tracking)

3. **Playground Tokens (Counted)**:
   - Scan QR at playground → Should succeed, decrement from 10 to 9
   - Repeat 9 more times → Should succeed each time, reaching 0
   - Scan when tokens = 0 → Should fail with "NO_REMAINING_USES"

#### Cross-Terminal Fraud Prevention
**Setup**: Same QR token, multiple terminal operators

**Test Cases**:
1. **JTI Duplication**:
   - Operator A scans QR at Central Pier → Success
   - Operator B scans identical JTI at Cheung Chau → Should fail "DUPLICATE_JTI"
   - Verify <2 second fraud detection response time

2. **Concurrent Scanning**:
   - Two operators scan same QR simultaneously → Only one should succeed
   - Verify audit trail shows both attempts with clear success/failure

#### Performance & Edge Cases
**Test Cases**:
1. **Performance**: 1000+ scans within 1 hour, each <2 seconds response
2. **Network Failure**: Scan during connectivity issues → Graceful handling
3. **Invalid QR**: Scan expired/malformed QR → Clear error message
4. **Operator Session**: Scan without valid operator session → Authentication error

### Validation Criteria
**Success Metrics**:
- Ferry boarding: Unlimited scans succeed, audit log accurate
- Gift redemption: Single success then persistent failure across terminals
- Playground tokens: Accurate decremental counting, zero-state handling
- Fraud prevention: 100% JTI duplication blocking, <2 second detection
- Performance: <2 second validation, 1000+ scans/hour capacity

### Test Data Requirements
**Orders**: Premium Plan (106), Pet Plan (107), Deluxe Tea Set (108)
**Operators**: Multiple active sessions with different terminal assignments
**Locations**: Central Pier, Cheung Chau Terminal, gift shops, playground areas

---

**Template Version**: 1.0
**Last Updated**: 2025-11-04
**Template Usage**: PRD-003 establishes business foundation for transforming US-002 QR validation into revenue-generating venue operations platform