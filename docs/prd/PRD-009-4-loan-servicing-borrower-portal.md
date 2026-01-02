# PRD-009-4: Loan Servicing & Borrower Portal

## Document Metadata
```yaml
prd_id: "PRD-009-4"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-12-29"
last_updated: "2025-12-29"
related_stories: ["US-LMS-005"]
implementation_cards: ["borrower-portal"]
compliance_frameworks: ["TILA", "FCRA", "GLBA", "PCI-DSS"]
dependencies: ["PRD-009-3"]
dependents: ["PRD-009-5", "PRD-009-8"]
```

## Executive Summary

**Problem Statement**: Borrowers need convenient, self-service access to their loan accounts for payments, statements, and account management, while reducing call center volume and improving customer satisfaction.

**Solution Overview**: Self-service borrower portal providing loan dashboard, payment processing, document access, profile management, and account servicing capabilities. Supports multiple payment methods and provides real-time account information.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Portal Adoption Rate | >80% | Active users / Total borrowers |
| Self-Service Payment Rate | >70% | Portal payments / Total payments |
| Call Center Volume Reduction | >30% | Pre vs. post portal |
| Customer Satisfaction (CSAT) | >85% | Post-interaction survey |
| Payment Processing Time | <2 seconds | P95 API response |

**Timeline**: Phase 3 (Q3) - Servicing

---

## Business Context

### Business Value

- Reduce call center volume
- Improve borrower satisfaction
- Enable 24/7 account access
- Reduce operational costs
- Increase payment convenience

### User Personas

| Persona | Role | Primary Needs |
|---------|------|---------------|
| **Borrower** | Loan customer | Easy payments, account info, document access |
| **Call Center Agent** | Customer support | Reduced ticket volume, escalation support |

---

## Product Specification

**Description**: Self-service borrower portal for loan management, payments, and account servicing.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Account Dashboard | Loan summary, balance, next payment | Real-time balance; payment history |
| Payment Processing | One-time and recurring payments | ACH, debit card, credit card; instant confirmation |
| Payment Schedule | Amortization schedule display | Principal/interest breakdown; remaining balance |
| Document Access | Statements, tax forms, contracts | Download as PDF; 7-year retention |
| Profile Management | Update contact information | Address, phone, email; verification required |
| Early Payoff | Payoff quote and processing | Real-time quote; 10-day payoff letter |
| Hardship Requests | Deferment/modification requests | Intake form; auto-route to collections |

**Priority**: High

---

## User Flows

### Flow 1: Borrower Self-Service Payment

```
START
  │
  ▼
[Borrower logs into portal]
  │
  ▼
[View loan dashboard: balance, next payment, history]
  │
  ▼
[Select "Make Payment"]
  │
  ▼
[Choose payment type]
  ├── [Regular Payment] ───────► [Confirm scheduled amount]
  ├── [Extra Principal] ───────► [Enter additional amount]
  └── [Payoff] ────────────────► [Request payoff quote]
  │
  ▼
[Select payment method]
  ├── [Saved ACH account]
  ├── [New ACH account] ───────► [Enter bank details] ──► [Micro-deposit verify]
  └── [Debit/Credit card]
  │
  ▼
[Confirm payment details]
  │
  ▼
[Process payment]
  │
  ├── SUCCESS ────────────────► [Display confirmation] ──► [Send receipt email]
  │
  └── FAILURE ────────────────► [Display error] ──► [Suggest retry or alternative]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Payment** | Payment transaction | payment_id, loan_id, amount, type, status, effective_date |
| **PaymentMethod** | Saved payment method | method_id, borrower_id, type, last4, verified |
| **RecurringPayment** | Scheduled payment | recurring_id, loan_id, amount, frequency, next_date |
| **PayoffQuote** | Early payoff quote | quote_id, loan_id, payoff_amount, valid_until |
| **HardshipRequest** | Deferment/modification request | request_id, loan_id, type, status, submitted_at |

### Entity Relationships

```
Loan (1) ─────────────────< (N) Payment
Loan (1) ─────────────────< (N) RecurringPayment
Loan (1) ─────────────────< (N) PayoffQuote
Loan (1) ─────────────────< (N) HardshipRequest
Borrower (1) ──────────────< (N) PaymentMethod
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Payment Processing | Plaid, Dwolla, Stripe | ACH, card payments | Critical |
| Communication | SendGrid, Twilio | Email, SMS notifications | High |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-3 | Active loans | Portal data source |
| PRD-009-8 | Communication automation | Payment confirmations, reminders |
| Authentication Service | User authentication | Portal access |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **TILA** | Payment application disclosure | Clear payment allocation rules |
| **FCRA** | Credit report accuracy | Payment reporting accuracy |
| **GLBA** | Privacy notice | Annual privacy notice delivery |
| **PCI-DSS** | Card data security | Tokenization; no card storage |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Payment Risk** | Payment validation; fraud checks |
| **Data Privacy** | Encryption; access controls |
| **Operational Risk** | Payment reconciliation; error handling |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|-------------|
| Portal Load Time | <3 seconds | P95 page load |
| Payment Processing | <2 seconds | P95 API response |
| Real-Time Balance | <500ms | P95 query time |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Authentication | MFA support; session timeout |
| Payment Data | PCI-DSS compliance; tokenization |
| Data Encryption | TLS 1.3; encrypted storage |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M4.1 | Borrower portal MVP | Dashboard, statements, profile |
| M4.2 | Payment processing | One-time and recurring payments |
| M4.3 | Document access | Statements, tax forms, contracts |
| M4.4 | Early payoff | Payoff quote and processing |
| M4.5 | Hardship requests | Intake form; routing |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Support for international payments? | Product | Week 2 | Scope |
| OQ-2 | Mobile app vs. responsive web? | Product | Week 3 | UX design |
| OQ-3 | Real-time vs. batch payment processing? | Engineering | Week 2 | Performance |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Payment processing errors | Low | Critical | Extensive testing; validation |
| Portal adoption low | Medium | Medium | UX testing; user education |
| Security vulnerabilities | Low | Critical | Security review; penetration testing |

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-29 | Principal PM | Initial PRD creation from PRD-009 |

**Review & Approval**:
- [ ] Product Management Review
- [ ] Engineering Architecture Review
- [ ] Security Review
- [ ] UX Review

**Next Steps**:
1. UX design for portal
2. Payment processor integration
3. Security architecture review
4. User story elaboration

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-12-29

