---
id: US-LMS-007
title: Guarantor Registration & Verification
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-15"
last_updated: "2025-01-15"
business_requirement: "PRD-009-10"
depends_on:
  - US-LMS-001  # Borrower registration pattern
  - US-LMS-002  # Loan application exists
cards:
  - lms-guarantor-registration
  - lms-guarantor-kyc
  - lms-guarantor-aml
---

## Business goal
Enable guarantors to register, complete identity verification (KYC/AML), and be assessed for guarantee capacity when a borrower's loan application requires a guarantor.

## Actors
- Guarantor (credit enhancer)
- Borrower (loan applicant)
- Credit Officer (underwriting)
- KYC Provider (mock: MockKYC-Provider)
- AML Screener (mock: MockAML-Screener)
- Credit Bureau (mock: MockCredit-Bureau)

## Scope (in)
- Guarantor registration with relationship to borrower
- Automated KYC identity verification
- Automated AML/watchlist screening
- Credit report pull for financial assessment
- Guarantee capacity calculation
- Status tracking (PENDING_KYC → VERIFIED | KYC_FAILED | PENDING_REVIEW)

## Out of scope (now)
- Corporate guarantor support
- Multiple guarantors per loan
- Guarantee agreement generation (separate story)
- Real third-party provider integration

## Acceptance (Given/When/Then)

**Scenario A — Guarantor Registration**
- Given a loan application requires a guarantor
- When guarantor submits registration with valid information (name, DOB, SSN, email, phone, address, relationship to borrower)
- Then the system creates a guarantor record linked to borrower and loan
- And status is set to PENDING_KYC
- And automatic KYC verification is triggered

**Scenario B — KYC Verification Success**
- Given KYC provider returns confidence score ≥ 85%
- When the verification completes
- Then guarantor status updates to VERIFIED (pending AML)
- And AML screening is triggered automatically

**Scenario C — KYC Verification Failure**
- Given KYC provider returns confidence score < 70%
- When the verification completes
- Then guarantor status updates to KYC_FAILED
- And guarantor is notified with next steps
- And borrower is notified that guarantor verification failed

**Scenario D — AML Screening Clear**
- Given guarantor passes KYC and AML returns no matches
- When screening completes
- Then credit report pull is triggered
- And financial assessment begins

**Scenario E — Financial Assessment**
- Given guarantor passes KYC/AML and credit report is available
- When financial assessment completes
- Then guarantee capacity is calculated
- And guarantor status is VERIFIED
- And guarantor is eligible to execute guarantee agreement

**Scenario F — Credit Report Issues**
- Given credit report shows significant negative factors (score < 600, high debt)
- When financial assessment completes
- Then guarantor status updates to PENDING_REVIEW
- And case is routed to Credit Officer queue
- And manual assessment is required

**Scenario G — Idempotent Registration**
- Given a guarantor with email already exists for this loan
- When same email is submitted again
- Then system returns existing guarantor record (200, not 201)
- And no duplicate record is created

## Mock Behavior Rules

| SSN Pattern | KYC Result | Confidence |
|-------------|------------|------------|
| xxx-xx-0000 | FAILED | 0 |
| xxx-xx-1111 | MANUAL_REVIEW | 65 |
| All others | VERIFIED | 85-100 |

| Name Pattern | AML Result | Risk Score |
|--------------|------------|------------|
| Contains "BLOCKED" | BLOCKED | 100 |
| Contains "PEP" | POTENTIAL_MATCH | 85 |
| All others | CLEAR | 0-20 |

| Credit Score Range | Guarantee Capacity | Status |
|-------------------|-------------------|--------|
| 750+ | Full requested amount | VERIFIED |
| 700-749 | Up to 80% of requested | VERIFIED |
| 650-699 | Up to 50% of requested | PENDING_REVIEW |
| <650 | Requires manual review | PENDING_REVIEW |

## Non-functional constraints
- Idempotency on email + loan_id combination
- SSN encrypted at rest (AES-256)
- Audit log for all verification attempts
- P99 response time < 3s for combined onboarding
- Relationship verification (guarantor must know borrower)

## Data notes
- Guarantor status enum: PENDING_KYC, KYC_FAILED, PENDING_REVIEW, VERIFIED
- Relationship types: SPOUSE, PARENT, SIBLING, BUSINESS_PARTNER, OTHER
- Guarantee capacity calculated based on credit score, income, existing debt
- Guarantor linked to borrower_id and loan_id (via application_id)

## Links
- Mock providers: MockKYC-Provider, MockAML-Screener, MockCredit-Bureau
- Related: US-LMS-001 (borrower registration pattern)

