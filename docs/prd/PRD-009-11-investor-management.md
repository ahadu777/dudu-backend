# PRD-009-11: Investor Management

## Document Metadata
```yaml
prd_id: "PRD-009-11"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-01-15"
last_updated: "2025-01-15"
related_stories: ["US-LMS-009", "US-LMS-010"]
implementation_cards: ["investor-registration", "investor-onboarding", "investor-portal", "loan-funding"]
compliance_frameworks: ["SEC", "FINRA", "BSA/AML", "KYC"]
dependencies: ["PRD-009-1", "PRD-009-2", "PRD-009-3"]
dependents: ["PRD-009-4", "PRD-009-7"]
```

## Executive Summary

**Problem Statement**: Marketplace lending platforms need to manage investors who fund loans, ensuring proper accreditation, compliance, investment tracking, and distribution of returns while meeting securities regulations.

**Solution Overview**: Comprehensive investor management system providing investor registration, accreditation verification, investment portfolio management, loan funding allocation, return distribution, and investor portal access. Supports individual and institutional investors with automated compliance checks.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Investor Onboarding Time | <10 minutes | P95 end-to-end |
| Accreditation Verification | <24 hours | Manual review SLA |
| Investment Allocation Efficiency | >95% | Funded loans / Available capital |
| Investor Portal Adoption | >80% | Active users / Total investors |
| Return Distribution Accuracy | 100% | Correct payments / Total distributions |
| Compliance Pass Rate | 100% | Accredited investors / Total investors |

**Timeline**: Phase 2 (Q2) - Credit Management

---

## Business Context

### Business Value

- Enable marketplace lending model
- Attract capital from accredited and institutional investors
- Ensure regulatory compliance (SEC, FINRA)
- Provide transparency to investors
- Automate investment allocation and returns
- Support portfolio diversification

### User Personas

| Persona | Role | Primary Needs | Success Criteria |
|---------|------|---------------|------------------|
| **Individual Investor** | Accredited investor | Portfolio view, returns tracking, easy funding | <5 min to fund a loan |
| **Institutional Investor** | Fund/entity | Bulk operations, reporting, API access | <1 hour to fund $1M |
| **Compliance Officer** | Regulatory | Accreditation verification, reporting | <24h to verify accreditation |
| **Portfolio Manager** | Operations | Investment allocation, risk management | Real-time portfolio view |

---

## Product Specification

**Description**: End-to-end investor management including registration, accreditation, investment allocation, loan funding, return distribution, and portfolio management.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Investor Registration | Capture investor information and investment preferences | Support individual and institutional; investment limits |
| Accreditation Verification | Verify accredited investor status (SEC Rule 501) | Income/net worth verification; documentation review |
| Investment Preferences | Configure investment criteria and risk tolerance | Auto-allocation rules; manual selection option |
| Loan Funding | Allocate investor capital to approved loans | Proportional allocation; minimum investment amounts |
| Return Distribution | Calculate and distribute principal/interest payments | Automated calculation; ACH distribution; tax reporting |
| Investor Portal | Self-service access for investors | Portfolio dashboard, returns, tax documents, funding |
| Portfolio Management | Track investments across loans | Real-time portfolio value; risk metrics; diversification |

**Priority**: Medium

---

## User Flows

### Flow 1: Investor Onboarding

```
START
  │
  ▼
[Investor visits platform]
  │
  ▼
[Investor registers account]
  ├── Enter personal/entity information
  ├── Provide accreditation documentation
  └── Set investment preferences
  │
  ▼
[System: Accreditation verification]
  ├── [Individual] ──► [Income/net worth check]
  └── [Institutional] ─► [Entity verification]
  │
  ├── [AUTO-APPROVE] ──► [Accredited status granted]
  │
  └── [MANUAL REVIEW] ─► [Compliance Officer review]
            │
            ├── [APPROVE] ──► [Accredited status granted]
            └── [REJECT] ───► [Investor notified; appeal process]
  │
  ▼
[Investor completes profile]
  ├── Bank account for funding
  ├── Bank account for returns
  └── Investment preferences
  │
  ▼
[Investor ready to fund loans]
  │
  ▼
END
```

### Flow 2: Loan Funding & Allocation

```
START
  │
  ▼
[Loan approved and ready for funding]
  │
  ▼
[System: Match investors to loan]
  ├── Check investment preferences
  ├── Check available capital
  └── Apply allocation rules
  │
  ▼
[Allocate investments]
  ├── [Auto-allocation] ──► [Distribute proportionally]
  └── [Manual selection] ─► [Investor selects loan]
  │
  ▼
[Collect investor funds]
  ├── ACH debit from investor account
  └── Hold in escrow until loan fully funded
  │
  ▼
[Loan fully funded]
  │
  ▼
[Release funds to borrower (disbursement)]
  │
  ▼
[Investor receives confirmation]
  │
  ▼
END
```

### Flow 3: Return Distribution

```
START
  │
  ▼
[Borrower makes payment]
  │
  ▼
[System: Calculate investor returns]
  ├── Principal repayment
  ├── Interest payment
  └── Fee allocation (if applicable)
  │
  ▼
[Distribute to investors]
  ├── Proportional to investment amount
  └── ACH credit to investor account
  │
  ▼
[Update investor portfolio]
  ├── Update loan balance
  ├── Update total returns
  └── Update portfolio value
  │
  ▼
[Investor receives notification]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Investor** | Investor record | investor_id, investor_type, accreditation_status, total_capital, available_capital |
| **Investment** | Investment in a loan | investment_id, investor_id, loan_id, investment_amount, allocation_date, status |
| **InvestorPreference** | Investment criteria | preference_id, investor_id, loan_type, risk_tier, min_amount, max_amount |
| **ReturnDistribution** | Payment to investor | distribution_id, investment_id, principal_amount, interest_amount, distribution_date |
| **InvestorPortfolio** | Portfolio snapshot | portfolio_id, investor_id, total_invested, current_value, total_returns, active_loans |

### Entity Relationships

```
Investor (1) ─────────────────< (N) Investment
Loan (1) ─────────────────────< (N) Investment
Investment (1) ────────────────< (N) ReturnDistribution
Investor (1) ─────────────────< (1) InvestorPreference
Investor (1) ─────────────────< (N) InvestorPortfolio
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Payment Processing | Plaid, Dwolla, Stripe | Investor funding and returns | Critical |
| Bank Account Verification | Plaid, Yodlee | Account validation | High |
| Tax Reporting | Internal/External | 1099 generation | Medium |
| Credit Bureaus | Experian, Equifax | Investor credit check (optional) | Low |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-1 | KYC/AML verification | Investor identity verification |
| PRD-009-2 | Credit decisioning | Loan approval for funding |
| PRD-009-3 | Loan fulfillment | Loan disbursement triggers funding |
| PRD-009-4 | Loan servicing | Payment processing triggers returns |
| PRD-009-7 | Reporting | Investor portfolio reporting |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **SEC Rule 501** | Accredited investor definition | Income ($200K/$300K) or net worth ($1M) verification |
| **SEC Regulation D** | Private placement exemption | Proper investor qualification |
| **FINRA** | Broker-dealer compliance | If applicable, proper licensing |
| **BSA/AML** | Investor screening | Same AML standards as borrowers |
| **Tax Reporting** | 1099-INT generation | Annual tax document generation |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Compliance Risk** | Accreditation verification; regulatory reporting |
| **Credit Risk** | Investment diversification limits; risk-based allocation |
| **Operational Risk** | Automated allocation; escrow management |
| **Liquidity Risk** | Capital availability tracking; funding limits |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|------------|
| Investor Registration | <10 minutes | P95 end-to-end |
| Investment Allocation | <5 seconds | P95 processing time |
| Return Distribution | <24 hours | Payment processing SLA |
| Portal Load Time | <2 seconds | P95 page load |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Data Access | Role-based permissions; investors see only their data |
| Financial Data | Encrypted at rest and in transit; PCI-DSS compliance |
| Audit Trail | Complete activity logging for financial transactions |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M11.1 | Investor registration | Registration flow operational |
| M11.2 | Accreditation verification | Verification workflow complete |
| M11.3 | Investment allocation | Auto-allocation working |
| M11.4 | Loan funding | Funding workflow operational |
| M11.5 | Return distribution | Automated distribution working |
| M11.6 | Investor portal | Self-service portal operational |
| M11.7 | Portfolio management | Portfolio tracking complete |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Support for institutional investors in v1? | Product | Week 2 | Scope |
| OQ-2 | Minimum investment amounts? | Risk | Week 2 | Business rules |
| OQ-3 | Secondary market for investments? | Product | Week 3 | Future feature |
| OQ-4 | Real-time vs. batch return distribution? | Engineering | Week 2 | Architecture |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Accreditation verification delays | Medium | Medium | Streamlined process; clear documentation |
| Investment allocation complexity | Medium | High | Phased rollout; manual override option |
| Regulatory compliance gaps | Low | Critical | Legal review; compliance officer involvement |

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
- [ ] SEC Compliance Review

**Next Steps**:
1. User story elaboration
2. Technical architecture design
3. Integration vendor evaluation
4. Regulatory compliance review
5. Sprint planning

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-01-15

