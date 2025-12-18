---
id: US-LMS-008
title: Guarantor Portal & Guarantee Activation
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-15"
last_updated: "2025-01-15"
business_requirement: "PRD-009-10"
depends_on:
  - US-LMS-007  # Guarantor must be verified
  - US-LMS-004  # Loan must be active
  - US-LMS-005  # Loan servicing exists
cards:
  - lms-guarantor-portal
  - lms-guarantee-activation
  - lms-guarantor-notifications
---

## Business goal
Provide guarantors with self-service access to view their guarantee obligations and enable automated guarantee activation workflow when borrower defaults.

## Actors
- Guarantor (guarantee provider)
- Borrower (loan holder)
- Collections Agent (recovery)
- Payment Processor (ACH)

## Scope (in)
- Guarantor portal dashboard (guarantee status, borrower loan status)
- Guarantee activation workflow (automated trigger on default)
- Guarantor payment processing (full/partial payment)
- Guarantee status tracking
- Notification system (email/SMS)

## Out of scope (now)
- Guarantee agreement signing (covered in US-LMS-004)
- Guarantor financial monitoring dashboard
- Guarantee dispute resolution workflow
- Multiple guarantee activations

## Acceptance (Given/When/Then)

**Scenario A — View Guarantor Dashboard**
- Given guarantor has an active guarantee
- When guarantor accesses portal
- Then system displays guarantee details (amount, loan info, borrower info)
- And shows borrower loan status (current, delinquent, defaulted)
- And shows guarantee status (ACTIVE, INACTIVE, ACTIVATED)
- And displays guarantee activation history (if any)

**Scenario B — Guarantee Activation Trigger**
- Given borrower loan is 90+ days past due (DPD ≥ 90)
- When system detects default condition
- Then guarantee status updates to ACTIVATION_PENDING
- And guarantor is notified via email and SMS
- And collections agent is assigned to case

**Scenario C — Guarantor Full Payment**
- Given guarantee is activated and guarantor is notified
- When guarantor makes full payment of guarantee amount
- Then payment is processed via ACH
- And loan balance is satisfied
- And guarantee status updates to ACTIVATED_CLOSED
- And borrower is notified of loan satisfaction
- And collections case is closed

**Scenario D — Guarantor Partial Payment**
- Given guarantee is activated
- When guarantor makes partial payment
- Then payment is applied to loan balance
- And guarantee amount is reduced proportionally
- And guarantee status remains ACTIVATED
- And collections continues for remaining balance

**Scenario E — Guarantee Dispute**
- Given guarantee is activated
- When guarantor disputes the activation
- Then dispute is logged
- And case is routed to manual review
- And guarantee status updates to DISPUTED
- And collections agent is notified

**Scenario F — Guarantee Not Activated (Borrower Cures)**
- Given borrower loan becomes delinquent but cures before 90 DPD
- When borrower makes payment to bring loan current
- Then guarantee remains ACTIVE (not activated)
- And guarantor is notified that borrower has cured
- And activation workflow is cancelled

**Scenario G — Guarantor Portal Access**
- Given guarantor has registered
- When guarantor logs into portal
- Then guarantor can view all their guarantees
- And filter by status (active, activated, closed)
- And view guarantee history and payment records

## Non-functional constraints
- Real-time guarantee status updates
- Guarantee activation within 24 hours of default
- Payment processing idempotency
- Notification delivery within 1 hour
- Portal load time < 2s (P95)

## Data notes
- Guarantee status enum: ACTIVE, ACTIVATION_PENDING, ACTIVATED, ACTIVATED_CLOSED, DISPUTED, INACTIVE
- Activation trigger: DPD ≥ 90 (configurable)
- Guarantee amount can be full loan amount or partial
- Payment types: FULL_PAYMENT, PARTIAL_PAYMENT
- Guarantor can have multiple guarantees (different loans)

## Links
- Related: US-LMS-005 (loan servicing), US-LMS-006 (collections)

