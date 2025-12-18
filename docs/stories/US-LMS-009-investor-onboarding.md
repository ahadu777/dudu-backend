---
id: US-LMS-009
title: Investor Registration & Accreditation
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-15"
last_updated: "2025-01-15"
business_requirement: "PRD-009-11"
depends_on:
  - US-LMS-001  # KYC/AML pattern
cards:
  - lms-investor-registration
  - lms-investor-accreditation
  - lms-investor-kyc
---

## Business goal
Enable investors to register, verify accredited investor status (SEC Rule 501), and complete onboarding to participate in marketplace lending.

## Actors
- Investor (individual or institutional)
- Compliance Officer (accreditation review)
- KYC Provider (mock: MockKYC-Provider)
- AML Screener (mock: MockAML-Screener)

## Scope (in)
- Investor registration (individual and institutional)
- Accreditation documentation upload
- Automated accreditation verification (income/net worth)
- KYC/AML verification
- Investment preference configuration
- Bank account verification for funding
- Status tracking (PENDING_ACCREDITATION → ACCREDITED | REJECTED)

## Out of scope (now)
- Institutional investor complex structures
- Real SEC filing integration
- Secondary market trading
- Real-time accreditation verification (manual review required)

## Acceptance (Given/When/Then)

**Scenario A — Individual Investor Registration**
- Given a new investor visits the platform
- When they submit registration with personal information (name, DOB, SSN, email, address)
- Then the system creates an investor record with status PENDING_ACCREDITATION
- And investor is prompted to provide accreditation documentation

**Scenario B — Accreditation Documentation Upload**
- Given investor has registered
- When investor uploads accreditation documents (tax returns, bank statements, net worth statement)
- Then documents are stored securely
- And status updates to PENDING_REVIEW
- And case is routed to Compliance Officer queue

**Scenario C — Automated Accreditation Check (Individual)**
- Given investor has uploaded documentation
- When system analyzes income/net worth data
- And income ≥ $200K (single) or $300K (joint) OR net worth ≥ $1M
- Then accreditation status updates to ACCREDITED
- And investor can proceed to complete profile

**Scenario D — Manual Accreditation Review**
- Given investor documentation requires manual review
- When Compliance Officer reviews documentation
- Then officer can approve or reject accreditation
- And investor is notified of decision
- And status updates to ACCREDITED or REJECTED

**Scenario E — KYC/AML Verification**
- Given investor is accredited
- When KYC/AML verification is triggered
- Then identity verification completes
- And watchlist screening completes
- And investor status is ACCREDITED_VERIFIED
- And investor can configure investment preferences

**Scenario F — Investment Preference Configuration**
- Given investor is accredited and verified
- When investor sets investment preferences (loan types, risk tiers, min/max amounts)
- Then preferences are saved
- And investor is ready to fund loans
- And auto-allocation can begin (if enabled)

**Scenario G — Bank Account Verification**
- Given investor wants to fund loans
- When investor adds bank account information
- Then account is verified via Plaid/mock provider
- And account is linked for funding and returns
- And investor can begin investing

**Scenario H — Institutional Investor Registration**
- Given an institutional investor (fund, trust, entity) registers
- When they provide entity information and accreditation documentation
- Then entity verification is performed
- And accreditation is verified per institutional rules
- And institutional investor can proceed

**Scenario I — Idempotent Registration**
- Given an investor with email already exists
- When same email is submitted again
- Then system returns existing investor record (200, not 201)
- And no duplicate is created

## Mock Behavior Rules

| Income/Net Worth | Accreditation Status | Auto-Approve |
|------------------|----------------------|--------------|
| Income ≥ $200K (single) | ACCREDITED | Yes |
| Income ≥ $300K (joint) | ACCREDITED | Yes |
| Net worth ≥ $1M | ACCREDITED | Yes |
| Income $150K-$199K | PENDING_REVIEW | No |
| Net worth $500K-$999K | PENDING_REVIEW | No |
| Below thresholds | REJECTED | No |

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
- Accreditation documents encrypted at rest
- Audit log for all verification attempts
- P99 response time < 10s for registration
- Accreditation review SLA: 24 hours

## Data notes
- Investor status enum: PENDING_ACCREDITATION, PENDING_REVIEW, ACCREDITED, ACCREDITED_VERIFIED, REJECTED
- Investor type: INDIVIDUAL, INSTITUTIONAL
- Accreditation criteria: SEC Rule 501 (income or net worth)
- Investment preferences: loan_type[], risk_tier[], min_amount, max_amount, auto_allocate
- Bank accounts: funding_account, returns_account

## Links
- Mock providers: MockKYC-Provider, MockAML-Screener, MockBank-Verification
- Related: US-LMS-001 (KYC/AML pattern), US-LMS-010 (investment management)

