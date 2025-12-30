# PRD-009-2: Credit Decision Engine

## Document Metadata
```yaml
prd_id: "PRD-009-2"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-12-29"
last_updated: "2025-12-29"
related_stories: ["US-LMS-003"]
implementation_cards: ["decision-engine"]
compliance_frameworks: ["FCRA", "ECOA", "TILA"]
dependencies: ["PRD-009-1"]
dependents: ["PRD-009-3"]
```

## Executive Summary

**Problem Statement**: Financial institutions need an automated, consistent, and defensible credit decisioning system that can evaluate loan applications quickly while maintaining fair lending compliance and providing clear reason codes for all decisions.

**Solution Overview**: Automated credit decisioning engine with configurable rules, credit bureau integration, scoring model support, and manual review workflows. Provides FCRA-compliant adverse action notices and maintains comprehensive audit trails for regulatory examination.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Decision Engine Latency | <2 seconds | P95 end-to-end |
| Straight-Through Processing Rate | >70% | Auto-approved / Total applications |
| Manual Review SLA | <15 minutes | Average review time |
| Adverse Action Accuracy | 100% | FCRA-compliant reason codes |
| Fair Lending Compliance | Zero findings | Disparate impact monitoring |

**Timeline**: Phase 1 (Q1) - Foundation

---

## Business Context

### Business Value

- Consistent, defensible credit decisions
- Reduced time-to-decision
- Fair lending compliance through documented criteria
- Automated processing for majority of applications
- Clear reason codes for all decisions

### User Personas

| Persona | Role | Primary Needs |
|---------|------|---------------|
| **Credit Officer** | Underwriting & decisioning | Efficient review queue, decision support tools |
| **Risk Manager** | Portfolio oversight | Decision analytics, model performance |

---

## Product Specification

**Description**: Automated credit decisioning with configurable rules, credit scoring integration, and manual review workflows.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Credit Bureau Integration | Pull credit reports and scores | Support: Experian, Equifax, TransUnion; soft/hard pulls |
| Automated Decision Rules | No-code rule configuration | Rules engine with AND/OR logic; version control |
| Credit Scoring Models | Internal/external score integration | Support FICO, VantageScore, custom ML models |
| Decision Outcomes | Approve, Decline, Refer for Review | Each outcome with reason codes (FCRA-compliant) |
| Manual Review Queue | Workflow for referred applications | Assignment, escalation, SLA tracking |
| Adverse Action Notices | Automated denial notifications | FCRA-compliant; reason codes; credit score disclosure |

**Decision Flow**:
```
Application Submit (from PRD-009-1)
    ↓
Credit Bureau Pull (configurable: soft/hard)
    ↓
Fraud/Identity Score Check
    ↓
Automated Rules Evaluation
    ├── Pass All Rules → AUTO-APPROVE
    ├── Fail Hard Cutoffs → AUTO-DECLINE + Adverse Action
    └── Partial Match → REFER TO MANUAL REVIEW
            ↓
      Credit Officer Review
            ├── Approve with Conditions
            ├── Request Additional Documentation
            └── Decline + Adverse Action
```

**Priority**: High

---

## User Flows

### Flow 1: Automated Decision

```
START
  │
  ▼
[Application received from Origination (PRD-009-1)]
  │
  ▼
[Pull credit report from bureau]
  │
  ▼
[Calculate credit scores (FICO, VantageScore, custom)]
  │
  ▼
[Evaluate automated rules]
  │
  ├── [PASS ALL] ──────────────► [AUTO-APPROVE]
  │                                      │
  │                                      ▼
  │                              [Generate offer (PRD-009-3)]
  │
  ├── [FAIL HARD CUTOFFS] ──────► [AUTO-DECLINE]
  │                                      │
  │                                      ▼
  │                              [Generate Adverse Action Notice]
  │                                      │
  │                                      ▼
  │                              [Send to borrower]
  │                                      │
  │                                      ▼
  │                              END
  │
  └── [PARTIAL MATCH] ──────────► [REFER TO MANUAL REVIEW]
            │
            ▼
      [Assign to Credit Officer]
            │
            ▼
      [Credit Officer Review]
            │
      ┌─────┼─────┐
      ▼     ▼     ▼
  [Approve] [Counteroffer] [Decline]
      │     │     │
      ▼     ▼     ▼
  [Continue to offer] [Route to borrower] [Adverse Action]
      │
      ▼
END
```

### Flow 2: Manual Review

```
START
  │
  ▼
[Application referred to manual review]
  │
  ▼
[System assigns to Credit Officer based on workload/expertise]
  │
  ▼
[Credit Officer opens review queue]
  │
  ▼
[Review application details]
  ├── View credit report
  ├── View identity verification results
  ├── View uploaded documents
  └── View decision engine reason codes
  │
  ▼
[Make decision]
  │
  ├── [APPROVE] ──────────────► [Document decision rationale] ──► [Continue to offer]
  │
  ├── [COUNTEROFFER] ─────────► [Specify modified terms] ────────► [Route to borrower]
  │
  ├── [REQUEST DOCS] ─────────► [Specify required documents] ────► [Pause; await docs]
  │
  └── [DECLINE] ──────────────► [Select reason codes] ───────────► [Adverse Action]
  │
  ▼
[System logs decision with full audit trail]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Decision** | Credit decision record | decision_id, application_id, outcome, reason_codes, model_version, decision_at |
| **CreditReport** | Credit bureau data | report_id, application_id, bureau, scores, tradelines, inquiries |
| **DecisionRule** | Automated rule definition | rule_id, name, conditions, outcome, version, effective_date |
| **ReviewAssignment** | Manual review assignment | assignment_id, application_id, officer_id, assigned_at, status |
| **AdverseAction** | Denial notice record | adverse_action_id, application_id, reason_codes, sent_at, acknowledged_at |

### Entity Relationships

```
Application (1) ──────────< (N) Decision
Application (1) ──────────< (1) CreditReport
Decision (1) ─────────────< (1) AdverseAction (if declined)
Application (1) ──────────< (1) ReviewAssignment (if referred)
DecisionRule (1) ─────────< (N) Decision (evaluated rules)
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Credit Bureaus | Experian, Equifax, TransUnion | Credit reports, scores | Critical |
| ML Model Service | Internal/external | Custom scoring models | High |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-1 | Application data | Decision input |
| Communication Service | Adverse action notices | Notification delivery |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **FCRA** | Adverse action notices with reason codes | Automated notice generation with specific denial reasons |
| **FCRA** | Credit score disclosure | Include credit score in adverse action |
| **ECOA** | Fair lending; no discrimination | Model monitoring for disparate impact; fair lending reports |
| **ECOA** | Adverse action timing | 30-day notice requirement; automated tracking |
| **TILA** | APR disclosure | Include in approval offers |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Credit Risk** | Underwriting criteria; concentration limits |
| **Compliance Risk** | Fair lending monitoring; reason code validation |
| **Model Risk** | Model versioning; performance monitoring |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|-------------|
| Decision Engine Latency | <2 seconds | P95 end-to-end |
| Credit Bureau Pull | <5 seconds | P95 API response |
| Rules Evaluation | <500ms | P95 processing time |
| Manual Review Queue Load | <100 applications | Per officer capacity |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Credit Report Security | Encrypted storage; access logging |
| Decision Audit Trail | Immutable logs; full traceability |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M2.1 | Credit bureau integration | Pull credit reports; parse scores |
| M2.2 | Rules engine v1 | Rule-based decisions; version control |
| M2.3 | Decision engine core | Automated approve/decline/refer |
| M2.4 | Manual review queue | Assignment, workflow, SLA tracking |
| M2.5 | Adverse action notices | FCRA-compliant generation and delivery |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Which credit bureau(s) for primary/secondary pulls? | Risk | Week 2 | Integration scope |
| OQ-2 | Support for custom ML models in v1? | Risk | Week 3 | Scope |
| OQ-3 | Real-time vs. batch credit pulls? | Engineering | Week 2 | Performance |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Credit bureau integration delays | Medium | High | Early POC; multiple vendor options |
| Fair lending compliance gaps | Low | Critical | Proactive model monitoring; external review |
| Decision accuracy issues | Medium | High | Extensive testing; manual review fallback |

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
1. Credit bureau vendor evaluation
2. Rules engine architecture design
3. Fair lending monitoring framework
4. User story elaboration

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-12-29

