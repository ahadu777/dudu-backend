# APPENDICES

**Page 111 of [TOTAL] | CONFIDENTIAL**

---

## Appendix A: Complete User Story Catalog

### A.1 Borrower User Stories

- **US-LMS-001**: Borrower Registration with KYC/AML Verification
- **US-LMS-002**: Loan Application Submission
- **US-LMS-003**: Automated Credit Decision Engine
- **US-LMS-004**: Loan Offers, Signing, and Disbursement
- **US-LMS-005**: Loan Servicing & Borrower Portal
- **US-LMS-006**: Compliance & Audit Trail

### A.2 Guarantor User Stories

- **US-LMS-007**: Guarantor Registration & Verification
- **US-LMS-008**: Guarantor Portal & Guarantee Activation

### A.3 Investor User Stories

- **US-LMS-009**: Investor Registration & Accreditation
- **US-LMS-010**: Investor Portfolio & Loan Funding

*(Full user story details provided in Part 4)*

---

## Appendix B: Data Model Schema

### B.1 Core Tables

**borrowers**:
- borrower_id (PK, UUID)
- ssn_hash (encrypted)
- name, dob, address, contact
- kyc_status, aml_status, status
- created_at, updated_at

**applications**:
- application_id (PK, UUID)
- borrower_id (FK)
- product_id (FK)
- status, amount_requested, term_requested
- submitted_at, decision_at
- created_at, updated_at

**loans**:
- loan_id (PK, UUID)
- application_id (FK)
- principal, rate, term
- status, disbursed_at, maturity_date
- created_at, updated_at

**payments**:
- payment_id (PK, UUID)
- loan_id (FK)
- amount, type, status
- effective_date
- principal_applied, interest_applied
- created_at, updated_at

**decisions**:
- decision_id (PK, UUID)
- application_id (FK)
- outcome, decision_type
- reason_codes (JSON)
- model_version
- decision_at
- created_at

**audit_logs**:
- log_id (PK, UUID)
- entity_type, entity_id
- action, actor_id
- timestamp
- delta (JSON)
- ip_address
- created_at

*(Complete schema available in database migration files)*

---

## Appendix C: API Endpoint Reference

### C.1 Borrower APIs

**Base URL**: `/api/v1`

**Endpoints**:
- `POST /borrowers` - Register borrower
- `GET /borrowers/{id}` - Get borrower details
- `PUT /borrowers/{id}` - Update borrower
- `POST /borrowers/{id}/applications` - Submit application
- `GET /applications/{id}` - Get application status
- `GET /loans/{id}` - Get loan details
- `POST /loans/{id}/payments` - Make payment
- `GET /loans/{id}/payoff-quote` - Get payoff quote
- `GET /loans/{id}/statements` - Get statements

### C.2 Credit Officer APIs

- `GET /review-queue` - Get review queue
- `POST /applications/{id}/decision` - Make decision
- `GET /applications/{id}/credit-report` - View credit report
- `POST /applications/{id}/request-docs` - Request additional documents

### C.3 Admin APIs

- `GET /audit-logs` - Query audit logs
- `POST /products` - Create product
- `PUT /products/{id}` - Update product
- `GET /reports/{type}` - Generate report
- `POST /users` - Create user
- `PUT /users/{id}/roles` - Update user roles

*(Complete API documentation available in OpenAPI/Swagger format)*

---

## Appendix D: Compliance Framework Mapping

### D.1 Regulatory Framework Coverage

| Framework | Modules Covered | Key Requirements |
|-----------|-----------------|------------------|
| **FCRA** | Decision, Compliance | Adverse action notices, credit report disputes |
| **ECOA** | Decision, Compliance | Fair lending, disparate impact monitoring |
| **TILA** | Fulfillment, Servicing | APR disclosure, rescission rights |
| **RESPA** | Fulfillment | Loan estimate, good faith estimate |
| **FDCPA** | Collections | Collection practices, call restrictions |
| **TCPA** | Communication | Consent tracking, time restrictions |
| **GDPR** | All modules | Data protection, right to erasure |
| **SOC2** | Compliance | Security controls, audit logging |
| **ISO27001** | Compliance | ISMS, security management |
| **PCI-DSS** | Servicing | Payment card security |

### D.2 Compliance Checklist

**FCRA Compliance**:
- [ ] Adverse action notices with reason codes
- [ ] Credit score disclosure
- [ ] Credit report dispute handling
- [ ] 30-day notice requirement

**ECOA Compliance**:
- [ ] Fair lending monitoring
- [ ] Disparate impact analysis
- [ ] No discrimination in underwriting
- [ ] Adverse action timing compliance

**TILA Compliance**:
- [ ] APR and finance charge disclosure
- [ ] Truth in Lending disclosures
- [ ] Right of rescission (where applicable)
- [ ] Payment schedule disclosure

**GDPR Compliance**:
- [ ] Data minimization
- [ ] Right to access
- [ ] Right to rectification
- [ ] Right to erasure
- [ ] Data portability
- [ ] Consent management
- [ ] Breach notification (72 hours)

---

## Appendix E: Glossary

**ACID**: Atomicity, Consistency, Isolation, Durability - database transaction properties

**ACH**: Automated Clearing House - electronic payment network

**AML**: Anti-Money Laundering - regulatory compliance requirement

**APR**: Annual Percentage Rate - cost of credit expressed as yearly rate

**DPD**: Days Past Due - number of days a payment is overdue

**DTI**: Debt-to-Income Ratio - borrower's monthly debt payments divided by monthly income

**ECOA**: Equal Credit Opportunity Act - US federal law prohibiting credit discrimination

**ESIGN**: Electronic Signatures in Global and National Commerce Act - US law on e-signatures

**FCRA**: Fair Credit Reporting Act - US federal law regulating credit reporting

**FICO**: Fair Isaac Corporation - credit scoring model

**GDPR**: General Data Protection Regulation - EU data protection law

**GLBA**: Gramm-Leach-Bliley Act - US financial privacy law

**HMDA**: Home Mortgage Disclosure Act - US law requiring mortgage data reporting

**KYC**: Know Your Customer - identity verification process

**LMS**: Loan Management System - this platform

**OFAC**: Office of Foreign Assets Control - US sanctions enforcement

**PEP**: Politically Exposed Person - higher risk individual for AML

**PII**: Personally Identifiable Information - data that can identify an individual

**RBAC**: Role-Based Access Control - authorization model

**RESPA**: Real Estate Settlement Procedures Act - US mortgage law

**RTO**: Recovery Time Objective - maximum acceptable downtime

**RPO**: Recovery Point Objective - maximum acceptable data loss

**SOC2**: System and Organization Controls 2 - security audit framework

**TILA**: Truth in Lending Act - US consumer credit law

**VA**: Virtual Account - unique account identifier for payment reconciliation

**WCAG**: Web Content Accessibility Guidelines - accessibility standards

---

## Appendix F: Mock Provider Specifications

### F.1 MockKYC-Provider

**Behavior Rules**:
- SSN ending in 0000 → FAILED (confidence 0)
- SSN ending in 1111 → MANUAL_REVIEW (confidence 65)
- All others → VERIFIED (confidence 85-100)

**API Endpoint**: `POST /mock/kyc/verify`
**Response**: `{ "status": "VERIFIED", "confidence": 95 }`

### F.2 MockAML-Screener

**Behavior Rules**:
- Name contains "BLOCKED" → BLOCKED (risk 100)
- Name contains "PEP" → POTENTIAL_MATCH (risk 85)
- All others → CLEAR (risk 0-20)

**API Endpoint**: `POST /mock/aml/screen`
**Response**: `{ "status": "CLEAR", "risk_score": 10 }`

### F.3 MockCredit-Bureau

**Behavior Rules**:
- SSN last 4: 0001-0100 → Score 300-549 (Poor)
- SSN last 4: 0101-0300 → Score 550-649 (Fair)
- SSN last 4: 0301-0600 → Score 650-719 (Good)
- SSN last 4: 0601-0900 → Score 720-779 (Very Good)
- SSN last 4: 0901-9999 → Score 780-850 (Excellent)
- SSN last 4: 0000 → ERROR

**API Endpoint**: `POST /mock/credit/pull`
**Response**: `{ "score": 720, "tradelines": [...], "utilization": 0.25 }`

*(Complete mock provider documentation available in development environment)*

---

## Appendix G: Reference Documents

### G.1 Related PRDs

- PRD-009-1: Customer Origination & KYC/AML
- PRD-009-2: Credit Decision Engine
- PRD-009-3: Loan Fulfillment & Disbursement
- PRD-009-4: Loan Servicing & Borrower Portal
- PRD-009-5: Collections & Recovery
- PRD-009-6: Product Configuration Platform
- PRD-009-7: Reporting & Analytics
- PRD-009-8: Communication Automation
- PRD-009-9: Compliance & Audit Trail
- PRD-009-10: Guarantor Management
- PRD-009-11: Investor Management

### G.2 Related User Stories

All user stories (US-LMS-001 through US-LMS-010) are documented in Part 4 of this PRD.

### G.3 External References

- Vec WooCommerce PRD v2.3 (structure reference)
- lms-info.md (system overview)
- Implementation cards and technical specifications

---

**— END OF DOCUMENT —**

**Loan Management System (LMS) — Complete Production PRD v1.0**
**Complete Consolidated Edition — All Modules + User Stories**
**January 15, 2025**
**CONFIDENTIAL — FOR INTERNAL USE ONLY**

**Page 120 of [TOTAL] | CONFIDENTIAL**

