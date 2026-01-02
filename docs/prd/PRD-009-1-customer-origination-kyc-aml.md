# PRD-009-1: Customer Origination & KYC/AML

## Document Metadata
```yaml
prd_id: "PRD-009-1"
parent_prd: "PRD-009"
category: "core"
product_area: "Lending & Credit"
owner: "Principal Product Manager"
status: "Draft"
created_date: "2025-12-29"
last_updated: "2025-12-29"
related_stories: ["US-LMS-001", "US-LMS-002"]
implementation_cards: ["customer-origination", "kyc-aml-engine"]
compliance_frameworks: ["FCRA", "BSA/AML", "GDPR", "SOC2", "ISO27001"]
dependencies: []
dependents: ["PRD-009-2"]
```

## Executive Summary

**Problem Statement**: Financial institutions need a streamlined, compliant process to capture loan applications and verify borrower identity while preventing fraud and meeting regulatory KYC/AML requirements.

**Solution Overview**: Digital loan application capture system with integrated identity verification, document verification, biometric checks, and automated watchlist screening. Supports multi-channel application intake (web, mobile, API) with progressive disclosure to minimize abandonment.

**Success Metrics**:
| Metric | Target | Measurement |
|--------|--------|-------------|
| Application Completion Rate | >75% | Completed / Started applications |
| Identity Verification Match Rate | >95% | Automated pass rate |
| KYC Processing Time | <2 minutes | P95 end-to-end |
| Application Abandonment Rate | <25% | Abandoned / Started applications |
| Fraud Detection Rate | >99% | True positive rate |

**Timeline**: Phase 1 (Q1) - Foundation

---

## Business Context

### Business Value

- Reduce application abandonment through optimized UX
- Capture structured data for automated decisioning
- Enable omnichannel application experience
- Prevent fraud and identity theft
- Meet BSA/AML regulatory requirements
- Reduce manual identity verification burden

### User Personas

| Persona | Role | Primary Needs |
|---------|------|---------------|
| **Borrower** | Loan applicant | Simple application, save & resume, document upload |
| **Compliance Officer** | KYC/AML review | Manual review queue, exception handling |

---

## Product Specification

### Module 1: Customer Origination

**Description**: Digital loan application capture with progressive disclosure, supporting web, mobile, and API channels.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Application Intake | Multi-step form with validation | Capture: name, DOB, SSN, address, employment, income, loan purpose |
| Document Upload | Secure document collection | Accept: PDF, JPG, PNG; max 10MB; virus scanning |
| Application Resume | Save and continue functionality | Resume within 30 days; no re-entry of completed fields |
| Co-Applicant Support | Joint application handling | Link applicants; aggregate income; separate credit pulls |
| Pre-Qualification | Soft-pull estimation | No credit impact; indicative rate/amount |

**Priority**: High

---

### Module 2: KYC/AML & Identity Verification

**Description**: Automated identity verification, watchlist screening, and anti-money laundering checks integrated into the origination flow.

**Core Capabilities**:

| Capability | Description | Acceptance Criteria |
|------------|-------------|---------------------|
| Identity Verification | SSN validation, address verification | Match rate >95%; fallback to manual review |
| Document Verification | ID document authenticity check | Support: driver's license, passport, state ID |
| Biometric Verification | Facial recognition with liveness detection | Match face to ID photo; detect spoofing attempts |
| Watchlist Screening | OFAC, PEP, sanctions list checks | Real-time screening; daily batch re-screening |
| AML Risk Scoring | Transaction pattern analysis | Risk score 1-100; configurable thresholds |

**Integration Requirements**:
- Primary: Jumio, Onfido, or Socure for identity
- Secondary: LexisNexis, World-Check for watchlists
- Fallback: Manual review queue with SLA tracking

**Priority**: High

---

## User Flows

### Flow 1: Application Submission

```
START
  │
  ▼
[Borrower visits application portal]
  │
  ▼
[Enter personal information: Name, DOB, SSN, Address]
  │
  ▼
[Enter employment & income details]
  │
  ▼
[Select loan purpose and desired amount]
  │
  ▼
[Upload supporting documents (optional)]
  │
  ▼
[Submit application]
  │
  ▼
[System: KYC/AML verification]
  ├── FAIL ──────────────────────────────────────────► [Manual Review Queue]
  │                                                           │
  │                                                           ▼
  │                                                    [Compliance Officer Review]
  │                                                           │
  │                                        ┌──────────────────┼──────────────────┐
  │                                        ▼                  ▼                  ▼
  │                                   [Clear KYC]      [Request Docs]      [Reject]
  │                                        │                  │                  │
  │                                        ▼                  │                  ▼
  ▼ PASS                                   │                  │            [Adverse Action]
  │                                        │                  │                  │
  ▼                                        ◄──────────────────┘                  ▼
[Application Status: VERIFIED]                                                  END
  │
  ▼
[Route to Decision Engine (PRD-009-2)]
  │
  ▼
END
```

---

## Data Model

### Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Borrower** | Individual or business applicant | borrower_id, ssn_hash, name, dob, address, contact, kyc_status |
| **Application** | Loan application record | application_id, borrower_id, product_id, status, submitted_at |
| **Document** | Uploaded document | document_id, application_id, doc_type, storage_ref, verified |
| **KYCResult** | Identity verification result | kyc_id, application_id, verification_status, risk_score, watchlist_matches |
| **CoApplicant** | Joint applicant | co_applicant_id, application_id, borrower_id, relationship |

### Entity Relationships

```
Borrower (1) ─────────────< (N) Application
Application (1) ──────────< (N) Document
Application (1) ──────────< (1) KYCResult
Application (1) ──────────< (N) CoApplicant
```

---

## Integration Requirements

### External Integrations

| Integration | Provider(s) | Purpose | Priority |
|-------------|-------------|---------|----------|
| Identity Verification | Jumio, Onfido, Socure | KYC, document verification | Critical |
| Watchlist Screening | LexisNexis, World-Check | OFAC, PEP, sanctions | Critical |
| Document Storage | AWS S3, Azure Blob | Secure document storage | High |

### Internal Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| Authentication Service | User authentication | Application portal access |
| Document Service | Document processing | Virus scanning, OCR |

---

## Compliance & Risk Considerations

### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **BSA/AML** | Customer identification program | Identity verification; document collection |
| **BSA/AML** | Suspicious activity monitoring | Risk scoring; alert generation |
| **OFAC** | Sanctions screening | Real-time watchlist checks |
| **GDPR** | Data minimization | Collect only required fields |
| **FCRA** | Credit report authorization | Consent capture before credit pull |

### Risk Management

| Risk Category | Controls |
|---------------|----------|
| **Fraud Risk** | Identity verification; biometric checks; document authenticity |
| **Compliance Risk** | Automated screening; manual review workflow; audit trail |
| **Data Privacy** | Encryption; secure storage; access controls |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Specification | Measurement |
|-------------|---------------|-------------|
| Application Load Time | <3 seconds | P95 page load |
| Form Submission Time | <1 second | P95 API response |
| KYC Processing Time | <2 minutes | P95 end-to-end |
| Document Upload Time | <5 seconds | P95 for 10MB file |

### Security Requirements

| Requirement | Specification |
|-------------|---------------|
| Data Encryption | AES-256 at rest, TLS 1.3 in transit |
| PII Protection | Tokenization; data masking in logs |
| Document Security | Virus scanning; secure storage |

---

## Rollout Milestones

| Milestone | Deliverable | Success Criteria |
|-----------|-------------|------------------|
| M1.1 | Application intake API | Complete data capture; validation |
| M1.2 | Application UI (web) | Multi-step form; save & resume |
| M1.3 | Document upload | Secure upload; virus scanning |
| M1.4 | KYC/AML integration | Identity verification; watchlist screening |
| M1.5 | Manual review queue | Compliance officer workflow |

---

## Open Questions & Risks

### Open Questions

| ID | Question | Owner | Due Date | Impact |
|----|----------|-------|----------|--------|
| OQ-1 | Which identity verification provider(s)? | Engineering | Week 2 | Integration scope |
| OQ-2 | Support for international ID documents? | Product | Week 2 | Scope |
| OQ-3 | Real-time vs. batch watchlist screening? | Compliance | Week 3 | Performance |

### Key Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Identity verification provider delays | Medium | High | Early POC; multiple vendor options |
| False positive rate too high | Medium | Medium | Tuning thresholds; manual review fallback |
| Application abandonment | Medium | High | UX testing; progressive disclosure |

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
- [ ] Security Review

**Next Steps**:
1. Vendor evaluation for identity verification
2. UX design for application flow
3. Technical architecture validation
4. User story elaboration

---

**Document Status**: Draft - Ready for Review
**Parent PRD**: PRD-009
**Last Updated**: 2025-12-29

