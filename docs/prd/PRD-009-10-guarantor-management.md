# PRD-009-10: Guarantor Management

## Document Metadata
```yaml
prd_id: "PRD-009-10"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-01-15"
last_updated: "2025-01-15"
related_stories: ["US-LMS-007", "US-LMS-008"]
implementation_cards: ["guarantor-registration", "guarantor-verification", "guarantor-portal"]
compliance_frameworks: ["FCRA", "ECOA", "TILA", "BSA/AML"]
dependencies: ["PRD-009-1", "PRD-009-2"]
dependents: ["PRD-009-3", "PRD-009-5"]
```

## Executive Summary

**Problem Statement**: Financial institutions need to manage guarantors who provide credit enhancement for loans, ensuring proper verification, documentation, and ongoing monitoring of guarantor obligations and financial health.

**Solution Overview**: Comprehensive guarantor management system providing registration, KYC/AML verification, guarantee agreement management, financial monitoring, and guarantor portal access. Supports multiple guarantors per loan and tracks guarantee obligations throughout the loan lifecycle.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Guarantor Verification Time | <3 minutes | P95 end-to-end |
| Guarantee Agreement Execution Rate | >90% | Signed / Required |
| Guarantor Portal Adoption | >60% | Active users / Total guarantors |
| Guarantor Financial Monitoring | Real-time | Monthly credit checks |
| Guarantee Activation Rate | <5% | Activated / Total guarantees |

**Timeline**: Phase 2 (Q2) - Credit Management

---

## Business Context

### Business Value

- Enable credit enhancement for higher-risk borrowers
- Reduce loan default risk through guarantee coverage
- Streamline guarantor onboarding and verification
- Maintain compliance with guarantee documentation requirements
- Monitor guarantor financial health proactively
- Provide transparency to guarantors about their obligations

### User Personas

| Persona | Role | Primary Needs | Success Criteria |
|---------|------|---------------|------------------|
| **Guarantor** | Credit enhancer | Clear obligations, easy portal access, status updates | <5 min to understand guarantee terms |
| **Credit Officer** | Underwriting | Guarantor verification, financial assessment | <10 min to review guarantor profile |
| **Collections Agent** | Recovery | Guarantor contact, guarantee activation workflow | <5 min to initiate guarantee claim |

---

## Product Specification

**Description**: End-to-end guarantor management including registration, verification, agreement execution, financial monitoring, and guarantee activation.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Guarantor Registration | Capture guarantor information and relationship to borrower | Support individual and corporate guarantors; relationship tracking |
| Guarantor KYC/AML | Identity verification and watchlist screening | Same standards as borrower verification; relationship verification |
| Guarantee Agreement | Generate and execute guarantee contracts | Digital signature support; guarantee amount and terms clearly stated |
| Financial Monitoring | Track guarantor credit health | Monthly credit bureau pulls; alert on significant changes |
| Guarantor Portal | Self-service access for guarantors | View guarantee status, obligations, borrower loan status |
| Guarantee Activation | Workflow to activate guarantee when borrower defaults | Automated trigger on default; notification to guarantor; payment processing |

**Priority**: Medium

---

## User Flows

### Flow 1: Guarantor Onboarding

```
START
  │
  ▼
[Borrower application requires guarantor]
  │
  ▼
[Credit Officer requests guarantor]
  │
  ▼
[Guarantor receives invitation (email/SMS)]
  │
  ▼
[Guarantor registers via portal]
  ├── Enter personal information
  ├── Verify identity (KYC)
  └── Complete AML screening
  │
  ▼
[System: Financial assessment]
  ├── Pull credit report
  ├── Calculate guarantee capacity
  └── Assess risk
  │
  ▼
[Generate guarantee agreement]
  │
  ▼
[Guarantor reviews and signs digitally]
  │
  ▼
[Guarantee active; loan can proceed]
  │
  ▼
END
```

### Flow 2: Guarantee Activation

```
START
  │
  ▼
[Borrower loan becomes delinquent (DPD > 90)]
  │
  ▼
[System: Check guarantee terms]
  │
  ▼
[Notify guarantor of potential activation]
  │
  ▼
[Collections attempts borrower recovery]
  │
  ├── [Borrower cures] ──────────► [Guarantee remains inactive]
  │
  └── [Borrower defaults] ───────► [Activate guarantee]
            │
            ▼
      [Guarantor notification]
            │
            ▼
      [Guarantor payment options]
            ├── [Full payment] ───► [Loan satisfied; guarantee closed]
            ├── [Partial payment] ─► [Loan balance reduced; guarantee continues]
            └── [Dispute] ────────► [Manual review workflow]
            │
            ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Guarantor** | Guarantor record | guarantor_id, borrower_id, loan_id, relationship_type, status, kyc_status, aml_status |
| **Guarantee** | Guarantee agreement | guarantee_id, loan_id, guarantor_id, guarantee_amount, guarantee_type, status, executed_at |
| **GuarantorCreditReport** | Credit monitoring data | report_id, guarantor_id, credit_score, pull_date, alert_flags |
| **GuaranteeActivation** | Activation record | activation_id, guarantee_id, loan_id, activation_reason, amount_due, status |

### Entity Relationships

```
Borrower (1) ─────────────────< (N) Guarantor
Loan (1) ──────────────────────< (N) Guarantee
Guarantee (1) ─────────────────< (1) GuaranteeActivation
Guarantor (1) ─────────────────< (N) GuarantorCreditReport
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Credit Bureaus | Experian, Equifax, TransUnion | Guarantor credit monitoring | High |
| Identity Verification | Jumio, Onfido | Guarantor KYC | High |
| E-Signature | DocuSign, HelloSign | Guarantee agreement execution | High |
| Payment Processing | Plaid, Dwolla | Guarantee activation payments | Medium |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-1 | KYC/AML verification | Guarantor identity verification |
| PRD-009-2 | Credit decisioning | Guarantor financial assessment |
| PRD-009-3 | Loan fulfillment | Guarantee agreement execution |
| PRD-009-5 | Collections | Guarantee activation workflow |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **FCRA** | Credit report disclosure for guarantors | Provide credit report copy upon request |
| **ECOA** | Fair lending for guarantors | No discrimination in guarantee requirements |
| **TILA** | Guarantee disclosure | Clear terms in guarantee agreement |
| **BSA/AML** | Guarantor screening | Same AML standards as borrowers |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Credit Risk** | Guarantor financial monitoring; capacity assessment |
| **Compliance Risk** | Proper documentation; regulatory disclosures |
| **Operational Risk** | Automated monitoring; timely activation |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|------------|
| Guarantor Registration | <3 minutes | P95 end-to-end |
| Credit Report Pull | <5 seconds | P95 API response |
| Portal Load Time | <2 seconds | P95 page load |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Data Access | Role-based permissions; guarantor can only see their guarantees |
| Audit Trail | Complete activity logging |
| Data Encryption | PII encrypted at rest and in transit |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M10.1 | Guarantor registration | Registration flow operational |
| M10.2 | Guarantor verification | KYC/AML integration working |
| M10.3 | Guarantee agreement | Digital signature integration |
| M10.4 | Financial monitoring | Credit bureau integration |
| M10.5 | Guarantor portal | Self-service portal operational |
| M10.6 | Guarantee activation | Activation workflow complete |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Support for corporate guarantors in v1? | Product | Week 2 | Scope |
| OQ-2 | Guarantee amount limits? | Risk | Week 2 | Business rules |
| OQ-3 | Multiple guarantors per loan? | Product | Week 2 | Data model |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Guarantor verification delays | Medium | Medium | Streamlined process; clear communication |
| Guarantee activation disputes | Low | High | Clear documentation; dispute resolution workflow |

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-15 | Principal PM | Initial PRD creation |

**Review & Approval**:
- [ ] Product Management Review
- [ ] Engineering Architecture Review
- [ ] Risk & Compliance Review
- [ ] Legal Review

**Next Steps**:
1. User story elaboration
2. Technical architecture design
3. Integration vendor evaluation
4. Sprint planning

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-01-15

