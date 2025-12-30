# PRD-009-6: Product Configuration Platform

## Document Metadata
```yaml
prd_id: "PRD-009-6"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-12-29"
last_updated: "2025-12-29"
related_stories: ["US-LMS-007"]
implementation_cards: []
compliance_frameworks: ["TILA", "RESPA"]
dependencies: []
dependents: ["PRD-009-1", "PRD-009-2", "PRD-009-3"]
```

## Executive Summary

**Problem Statement**: Financial institutions need a flexible, no-code platform to rapidly configure loan products, pricing, fees, and business rules without IT dependency, enabling product experimentation and market responsiveness.

**Solution Overview**: No-code product configuration platform allowing operations teams to define loan products, set pricing structures, configure fees, establish eligibility rules, and customize workflows. Supports product versioning and change management with audit trails.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Product Launch Time | <1 week | From config to live |
| Configuration Errors | <1% | Validation failures |
| Product Versioning | 100% | All changes versioned |
| No-Code Usage Rate | >90% | Configs without IT support |

**Timeline**: Phase 4 (Q4) - Optimization

---

## Business Context

### Business Value

- Rapid product launch
- Reduced IT dependency
- Product experimentation capability
- Market responsiveness
- Reduced configuration errors

### User Personas

| Persona | Role | Primary Needs |
|---------|------|---------------|
| **Operations Admin** | System configuration | Product setup, workflow management, user administration |
| **Product Manager** | Product strategy | Product configuration, pricing, testing |

---

## Product Specification

**Description**: No-code interface for defining loan products, pricing, fees, and business rules.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Product Definition | Loan type, amount range, term range | Personal, auto, mortgage, business loan types |
| Interest Rate Configuration | Fixed, variable, promotional rates | Rate tables; floor/ceiling; index-based |
| Fee Structure | Origination, late, prepayment fees | Flat, percentage, tiered fee options |
| Eligibility Rules | Minimum criteria for product | Credit score, income, employment requirements |
| Workflow Configuration | Approval chains, document requirements | Per-product customization |
| Product Versioning | Change management with audit trail | Effective dates; rollback capability |

**Priority**: Medium

---

## User Flows

### Flow 1: Product Configuration

```
START
  │
  ▼
[Operations Admin opens product config]
  │
  ▼
[Create new product or edit existing]
  │
  ▼
[Define product basics]
  ├── Loan type
  ├── Amount range
  └── Term range
  │
  ▼
[Configure interest rates]
  ├── Rate type (fixed/variable)
  ├── Rate table
  └── Promotional rates
  │
  ▼
[Set fee structure]
  ├── Origination fees
  ├── Late fees
  └── Prepayment fees
  │
  ▼
[Define eligibility rules]
  ├── Minimum credit score
  ├── Income requirements
  └── Employment requirements
  │
  ▼
[Configure workflow]
  ├── Approval chain
  └── Document requirements
  │
  ▼
[Validate configuration]
  │
  ├── VALID ──────────────► [Save with version] ──► [Set effective date]
  │
  └── INVALID ─────────────► [Display errors] ─────► [Fix and retry]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Product** | Loan product definition | product_id, name, type, status, version |
| **ProductVersion** | Product version record | version_id, product_id, effective_date, config_json |
| **RateTable** | Interest rate configuration | rate_table_id, product_id, rate_type, rates |
| **FeeStructure** | Fee configuration | fee_structure_id, product_id, fees_json |
| **EligibilityRule** | Eligibility criteria | rule_id, product_id, conditions_json |
| **WorkflowConfig** | Workflow configuration | workflow_id, product_id, steps_json |

### Entity Relationships

```
Product (1) ────────────────< (N) ProductVersion
Product (1) ────────────────< (1) RateTable
Product (1) ────────────────< (1) FeeStructure
Product (1) ────────────────< (N) EligibilityRule
Product (1) ────────────────< (1) WorkflowConfig
```

---

## Integration Requirements

### External Integrations

None - internal platform capability

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| PRD-009-1 | Product selection | Application intake |
| PRD-009-2 | Eligibility rules | Decision engine |
| PRD-009-3 | Pricing, fees | Offer generation |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **TILA** | APR calculation accuracy | Validation of rate/fee configurations |
| **RESPA** | Fee disclosure | Accurate fee structure |
| **State Laws** | Usury limits | Rate ceiling validation |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Configuration Risk** | Validation rules; testing environment |
| **Compliance Risk** | Regulatory checks; approval workflow |
| **Operational Risk** | Version control; rollback capability |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|-------------|
| Config UI Load Time | <2 seconds | P95 page load |
| Validation Time | <1 second | P95 processing |
| Product Activation | <5 minutes | From save to active |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Access Control | Role-based permissions |
| Audit Trail | All changes logged |
| Change Approval | Multi-level approval for production |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M6.1 | Product definition UI | Create/edit products |
| M6.2 | Rate configuration | Fixed/variable rates |
| M6.3 | Fee structure config | All fee types |
| M6.4 | Eligibility rules engine | Rule builder |
| M6.5 | Product versioning | Version control; rollback |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Support for complex rate structures? | Product | Week 2 | Scope |
| OQ-2 | Testing environment for configs? | Engineering | Week 3 | Workflow |
| OQ-3 | Approval workflow complexity? | Operations | Week 2 | Process |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Configuration errors | Medium | High | Validation rules; testing |
| Complex rate structures | Medium | Medium | Phased rollout; templates |
| User adoption | Medium | Medium | Training; documentation |

---

## Document Control

**Version History**:
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-29 | Principal PM | Initial PRD creation from PRD-009 |

**Review & Approval**:
- [ ] Product Management Review
- [ ] Engineering Architecture Review
- [ ] Operations Review

**Next Steps**:
1. UI/UX design for config interface
2. Validation rule framework
3. Versioning architecture
4. User story elaboration

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-12-29

