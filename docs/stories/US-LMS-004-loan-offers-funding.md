---
id: US-LMS-004
title: Loan Offers, Signing, and Disbursement
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
depends_on:
  - US-LMS-003  # Decision must be APPROVED
cards:
  - lms-offer-generation
  - lms-document-signing
  - lms-disbursement
---

## Business goal
Present approved borrowers with loan offer options, collect digital signatures on contracts, and disburse funds to their bank account.

## Actors
- Borrower (approved applicant)
- E-Signature Provider (mock: MockSign-Provider)
- Disbursement System (ACH/wire)

## Scope (in)
- Loan offer generation (multiple term options)
- Offer selection and lock-in
- Digital signature collection
- Fund disbursement via ACH

## Out of scope (now)
- Physical document mailing
- Real e-signature provider integration
- Wire transfer for large amounts

## Acceptance (Given/When/Then)

**Scenario A — Generate Offers**
- Given application is APPROVED
- When system generates offers
- Then 3 term options are provided (36/48/60 months)
- And each offer shows APR, monthly payment, total interest
- And offers expire in 14 days

**Scenario B — Select Offer**
- Given borrower reviews available offers
- When borrower selects preferred offer
- Then offer is locked in and other offers invalidated
- And contract generation is triggered
- And status updates to OFFER_SELECTED

**Scenario C — Expired Offer**
- Given offer validity period (14 days) has passed
- When borrower attempts to select offer
- Then system returns 410 Gone
- And message directs to request new offers

**Scenario D — Sign Documents**
- Given offer is selected and contracts generated
- When borrower provides signature and consents
- Then all documents are marked as signed
- And copies are sent to borrower email
- And status updates to DOCUMENTS_SIGNED

**Scenario E — Disbursement Success**
- Given documents are signed and bank account validated
- When disbursement is initiated
- Then ACH transfer is queued
- And loan status updates to DISBURSED → ACTIVE
- And borrower is notified with expected arrival date

**Scenario F — Disbursement Failure**
- Given routing number is invalid (000000000)
- When disbursement is attempted
- Then system returns 400 "Invalid routing number"
- And loan status updates to DISBURSEMENT_FAILED

**Scenario G — Missing E-Sign Consent**
- Given borrower attempts to sign without consenting
- When consent_esign is false
- Then system returns 400 "E-Sign consent required"

## Mock Disbursement Rules

| Routing Number | Result |
|----------------|--------|
| 000000000 | FAILED (invalid) |
| 999999999 | DELAYED (3 days) |
| All others | SUCCESS (1 day) |

## Non-functional constraints
- Offer expiration enforced (14 days)
- Signature timestamp and IP address recorded
- Disbursement requires final fraud check
- Idempotent offer selection (only one per application)

## Data notes
- Offer contains: amount, apr, term, monthly_payment, total_interest, expires_at
- Signing record: signature, consent flags, ip_address, timestamp
- Loan status progression: APPROVED → OFFER_SELECTED → DOCUMENTS_SIGNED → DISBURSED → ACTIVE

## Links
- API: GET /lms/applications/:id/offers, POST .../offers/:id/select, POST .../sign, POST /lms/loans/:id/disburse
- Mock provider: MockSign-Provider
