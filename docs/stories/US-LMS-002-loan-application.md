---
id: US-LMS-002
title: Loan Application Submission
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
depends_on:
  - US-LMS-001  # Borrower must be verified
cards:
  - lms-loan-application
  - lms-credit-pull
---

## Business goal
Enable a verified borrower to submit a loan application with employment and income information, triggering a credit bureau pull for decisioning.

## Actors
- Borrower (verified applicant)
- Credit Bureau (mock: MockCredit-Bureau)
- System (application processor)

## Scope (in)
- Loan application submission with income/employment data
- Credit bureau pull (mock)
- Application status tracking
- Eligibility validation (only VERIFIED borrowers)

## Out of scope (now)
- Document upload (pay stubs, bank statements)
- Co-applicant support
- Real credit bureau integration

## Acceptance (Given/When/Then)

**Scenario A — Submit Application**
- Given borrower is VERIFIED
- When borrower submits loan application with valid data (amount, term, purpose, income)
- Then system creates application with status SUBMITTED
- And returns unique application_id

**Scenario B — Credit Pull Success**
- Given application is SUBMITTED
- When system initiates credit pull
- Then credit report data is retrieved (score, tradelines, utilization)
- And application status updates to CREDIT_PULLED

**Scenario C — Unverified Borrower Rejected**
- Given borrower status is not VERIFIED
- When borrower attempts to submit application
- Then system returns 403 "Borrower not eligible for application"

**Scenario D — Application Status Check**
- Given borrower has submitted an application
- When borrower queries application status
- Then system returns current status and timeline of all status changes

**Scenario E — Idempotent Application**
- Given borrower_id + out_application_no already exists
- When same combination is submitted again
- Then system returns existing application (200)
- And no duplicate is created

**Scenario F — Credit Bureau Unavailable**
- Given SSN ends in 0000 (mock error trigger)
- When credit pull is attempted
- Then system returns 503 Service Unavailable
- And application status updates to CREDIT_PULL_FAILED

## Mock Credit Score Rules

| SSN Last 4 | Credit Score | Derogatories |
|------------|--------------|--------------|
| 0001-0100 | 300-549 (Poor) | 3+ |
| 0101-0300 | 550-649 (Fair) | 1-2 |
| 0301-0600 | 650-719 (Good) | 0 |
| 0601-0900 | 720-779 (Very Good) | 0 |
| 0901-9999 | 780-850 (Excellent) | 0 |
| 0000 | ERROR | - |

## Non-functional constraints
- Idempotency on borrower_id + out_application_no
- Credit report encrypted at rest
- Audit log for credit pulls (compliance requirement)
- P99 credit pull response < 3s

## Data notes
- Application status enum: DRAFT, SUBMITTED, CREDIT_PULLED, CREDIT_PULL_FAILED
- Credit pull stores: score, tradelines, utilization, derogatories, bankruptcies
- DTI calculated from: annual_income vs requested monthly payment

## Links
- API: POST /lms/applications, GET /lms/applications/:id, POST /lms/credit/pull
- Mock provider: MockCredit-Bureau
