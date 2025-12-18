---
id: US-LMS-001
title: Borrower Registration with KYC/AML Verification
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
cards:
  - lms-borrower-registration
  - lms-kyc-verification
  - lms-aml-screening
---

## Business goal
Enable a prospective borrower to register and complete identity verification (KYC) and anti-money laundering (AML) screening before applying for a loan.

## Actors
- Borrower (applicant)
- KYC Provider (mock: MockKYC-Provider)
- AML Screener (mock: MockAML-Screener)
- Compliance Officer (for manual review)

## Scope (in)
- Borrower registration with PII capture
- Automated KYC identity verification
- Automated AML/watchlist screening
- Status tracking (PENDING_KYC → VERIFIED | KYC_FAILED | PENDING_REVIEW)

## Out of scope (now)
- Biometric verification (facial recognition)
- Document upload during registration
- Real third-party KYC/AML provider integration

## Acceptance (Given/When/Then)

**Scenario A — Registration**
- Given a new user visits the registration portal
- When they submit valid personal information (name, DOB, SSN, email, phone, address)
- Then the system creates a borrower record with status PENDING_KYC
- And triggers automatic KYC verification

**Scenario B — KYC Verification Success**
- Given KYC provider returns confidence score ≥ 85%
- When the verification completes
- Then borrower status updates to VERIFIED (pending AML)
- And AML screening is triggered automatically

**Scenario C — KYC Verification Failure**
- Given KYC provider returns confidence score < 70%
- When the verification completes
- Then borrower status updates to KYC_FAILED
- And borrower is notified with next steps

**Scenario D — AML Screening Clear**
- Given borrower passes KYC and AML returns no matches
- When screening completes
- Then borrower status is VERIFIED
- And borrower is eligible to apply for loans

**Scenario E — AML Watchlist Match**
- Given AML screening finds a potential match (PEP, OFAC, sanctions)
- When the match is identified
- Then borrower status updates to PENDING_REVIEW
- And case is routed to Compliance Officer queue

**Scenario F — Idempotent Registration**
- Given a borrower with email already exists
- When same email is submitted again
- Then system returns existing borrower record (200, not 201)
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

## Non-functional constraints
- Idempotency on email (unique constraint)
- SSN encrypted at rest (AES-256)
- Audit log for all verification attempts
- P99 response time < 2s for combined onboarding

## Data notes
- Borrower status enum: PENDING_KYC, KYC_FAILED, PENDING_REVIEW, VERIFIED
- KYC verification stored with confidence_score and check details
- AML screening stored with risk_score and match details

## Links
- Mock providers: MockKYC-Provider, MockAML-Screener
