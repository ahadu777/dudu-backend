---
id: US-LMS-005
title: Loan Servicing & Borrower Portal
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
depends_on:
  - US-LMS-004  # Loan must be ACTIVE
cards:
  - lms-borrower-portal
  - lms-payment-processing
  - lms-payoff-quote
---

## Business goal
Provide borrowers with self-service access to view loan details, make payments, and request payoff quotes through an online portal.

## Actors
- Borrower (loan holder)
- Payment Processor (ACH)
- System (balance calculator)

## Scope (in)
- Loan dashboard (balance, payments, schedule)
- One-time payment processing
- Payoff quote generation
- Payment history tracking

## Out of scope (now)
- Recurring/autopay setup
- Hardship request submission
- Multiple payment methods (card)

## Acceptance (Given/When/Then)

**Scenario A — View Loan Dashboard**
- Given borrower has an active loan
- When borrower accesses loan details
- Then system displays current balance, payoff amount, next payment due
- And shows recent payment history (last 3)
- And shows loan terms (original amount, rate, term)

**Scenario B — Make Payment**
- Given borrower wants to make a payment
- When borrower submits payment with amount and bank details
- Then system records payment with status PENDING
- And calculates principal/interest split
- And returns confirmation number

**Scenario C — Idempotent Payment**
- Given payment with same out_payment_no already exists
- When borrower submits duplicate payment
- Then system returns existing payment (200)
- And no duplicate is processed

**Scenario D — Payoff Quote**
- Given borrower wants to pay off loan early
- When borrower requests payoff quote with future date
- Then system calculates principal + accrued interest
- And provides per diem interest rate
- And quote is valid until specified date

**Scenario E — Payment Failure**
- Given ACH payment fails (NSF, invalid account)
- When failure is reported
- Then borrower is notified via email
- And payment status updates to FAILED
- And late fee is assessed if past grace period

**Scenario F — Loan Paid Off**
- Given payoff payment is received
- When balance reaches zero
- Then loan status changes to PAID_OFF
- And borrower receives satisfaction letter
- And credit bureaus notified (future)

## Non-functional constraints
- Real-time balance calculation
- Payment idempotency on out_payment_no
- Payoff quote valid for up to 30 days
- P99 dashboard load < 2s

## Data notes
- Loan status enum: ACTIVE, DELINQUENT, PAID_OFF, CHARGED_OFF
- Payment status enum: PENDING, POSTED, FAILED
- Payment split: principal_applied, interest_applied
- Per diem = (principal × rate) / 365

## Links
- API: GET /lms/loans/:id, POST /lms/loans/:id/payments, GET /lms/loans/:id/payoff-quote
