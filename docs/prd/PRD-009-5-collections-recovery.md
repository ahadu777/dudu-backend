# PRD-009-5: Collections & Recovery

## Document Metadata
```yaml
prd_id: "PRD-009-5"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-12-29"
last_updated: "2025-12-29"
related_stories: ["US-LMS-006"]
implementation_cards: ["collections-reporting"]
compliance_frameworks: ["FDCPA", "TCPA", "FCRA", "TILA"]
dependencies: ["PRD-009-4"]
dependents: ["PRD-009-7", "PRD-009-8"]
```

## Executive Summary

**Problem Statement**: Financial institutions need efficient delinquency management and collection workflows to minimize credit losses while maintaining strict compliance with FDCPA, TCPA, and other collection regulations.

**Solution Overview**: Collections and recovery system providing delinquency tracking, prioritized work queues, payment arrangements, multi-channel communication, skip tracing, and charge-off processing. Ensures FDCPA/TCPA compliance and optimizes collector productivity.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Delinquency Cure Rate | >60% | Cured / Total delinquent |
| Collection Efficiency | <5 min per account | Average handling time |
| Recovery Rate | >40% | Recovered / Charged-off |
| FDCPA Compliance | 100% | Zero violations |
| Work Queue Utilization | >85% | Active time / Available time |

**Timeline**: Phase 3 (Q3) - Servicing

---

## Business Context

### Business Value

- Minimize credit losses
- Maintain regulatory compliance in collections
- Optimize collector productivity
- Improve recovery rates
- Reduce operational costs

### User Personas

| Persona | Role | Primary Needs |
|---------|------|---------------|
| **Collections Agent** | Delinquency management | Work queues, payment arrangements, customer communication |
| **Collections Manager** | Team oversight | Performance metrics, queue management |

---

## Product Specification

**Description**: Delinquency management, collection workflows, and recovery operations.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Delinquency Tracking | DPD (days past due) calculation | Real-time aging buckets: 1-30, 31-60, 61-90, 90+ |
| Work Queue Management | Prioritized collector queues | Strategy-based assignment; capacity balancing |
| Payment Arrangements | Promise-to-pay, payment plans | Configurable terms; automated monitoring |
| Communication Automation | Multi-channel outreach | Email, SMS, letter; TCPA/FDCPA compliant timing |
| Skip Tracing | Locate borrower contact info | Integration with data providers |
| Charge-Off Processing | Write-off workflow | Configurable DPD threshold; accounting entries |
| Recovery Tracking | Post-charge-off collections | Agency placement; recovery rate tracking |

**Priority**: Medium

---

## User Flows

### Flow 1: Collections Workflow

```
START
  │
  ▼
[Loan becomes delinquent (DPD > 0)]
  │
  ▼
[System: Calculate DPD and aging bucket]
  │
  ▼
[Assign to collections queue based on strategy]
  │
  ▼
[Collections agent opens work queue]
  │
  ▼
[Review account details]
  ├── View payment history
  ├── View communication history
  └── View skip trace results
  │
  ▼
[Contact borrower]
  ├── [Payment Arrangement] ───► [Create payment plan] ──► [Monitor compliance]
  ├── [Promise to Pay] ────────► [Record promise] ───────► [Follow-up]
  ├── [Skip Trace] ────────────► [Request skip trace] ───► [Update contact info]
  └── [Charge-Off] ────────────► [Initiate charge-off] ───► [Accounting entry]
  │
  ▼
[Update account status]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Delinquency** | Delinquency record | delinquency_id, loan_id, dpd, aging_bucket, status |
| **CollectionQueue** | Work queue assignment | queue_id, loan_id, agent_id, priority, assigned_at |
| **PaymentArrangement** | Payment plan | arrangement_id, loan_id, terms, status, created_at |
| **PromiseToPay** | Promise record | promise_id, loan_id, amount, date, status |
| **ChargeOff** | Charge-off record | chargeoff_id, loan_id, amount, date, reason |
| **Recovery** | Recovery record | recovery_id, chargeoff_id, amount, source, date |

### Entity Relationships

```
Loan (1) ─────────────────< (N) Delinquency
Loan (1) ─────────────────< (N) CollectionQueue
Loan (1) ─────────────────< (N) PaymentArrangement
Loan (1) ─────────────────< (N) PromiseToPay
Loan (1) ─────────────────< (1) ChargeOff
ChargeOff (1) ─────────────< (N) Recovery
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Skip Tracing | LexisNexis, TLO | Locate borrower contact | Medium |
| Communication | Twilio, SendGrid, Lob | SMS, email, mail | High |
| Collection Agencies | Third-party agencies | Post-charge-off placement | Medium |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-4 | Loan data, payment history | Collections input |
| PRD-009-8 | Communication automation | Outreach delivery |
| PRD-009-7 | Reporting | Collections analytics |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **FDCPA** | Collection practices compliance | Call time restrictions; cease communication handling |
| **TCPA** | Consent for automated communications | Opt-in tracking; time-of-day restrictions |
| **FCRA** | Credit reporting accuracy | Accurate delinquency reporting |
| **TILA** | Payment application rules | Clear payment allocation |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Compliance Risk** | Automated compliance checks; audit trail |
| **Credit Risk** | Early intervention; payment arrangements |
| **Operational Risk** | Queue management; workload balancing |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|-------------|
| Queue Load Time | <2 seconds | P95 page load |
| DPD Calculation | Real-time | On payment/post |
| Work Queue Refresh | <1 second | P95 update time |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Data Access | Role-based permissions |
| Audit Trail | Complete activity logging |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M5.1 | Delinquency tracking | Real-time DPD calculation; aging buckets |
| M5.2 | Work queue management | Prioritized queues; assignment |
| M5.3 | Payment arrangements | Promise-to-pay; payment plans |
| M5.4 | Communication automation | Multi-channel outreach; compliance |
| M5.5 | Charge-off processing | Write-off workflow; accounting |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Which skip tracing provider? | Engineering | Week 2 | Integration scope |
| OQ-2 | Support for collection agencies in v1? | Product | Week 2 | Scope |
| OQ-3 | Automated vs. manual queue assignment? | Operations | Week 3 | Workflow |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FDCPA violations | Low | Critical | Compliance training; automated checks |
| Low recovery rates | Medium | Medium | Strategy optimization; agency partnerships |
| Queue overload | Medium | Medium | Capacity planning; workload balancing |

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-29 | Principal PM | Initial PRD creation from PRD-009 |

**Review & Approval**:
- [ ] Product Management Review
- [ ] Engineering Architecture Review
- [ ] Risk & Compliance Review
- [ ] Legal Review

**Next Steps**:
1. Collections strategy definition
2. Compliance framework review
3. Skip tracing vendor evaluation
4. User story elaboration

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-12-29

