---
id: US-LMS-018
title: "Loan Modification & Hardship Programs"
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-005"]
enhances: ["US-LMS-005"]
cards: []
---

# US-LMS-018: Loan Modification & Hardship Programs

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Borrower experiencing financial hardship
**I want to** request loan modifications and access hardship programs through self-service
**So that** I can manage my financial situation and avoid default while keeping my loan in good standing

---

## Scope

### In Scope
- Self-service hardship application submission
- Financial situation assessment
- Modification options calculation and presentation
- Forbearance program enrollment
- Deferment program enrollment
- Payment plan setup
- Modification agreement execution
- Status tracking throughout process

### Out of Scope
- Principal reduction programs (Phase 2)
- Loan assumption/transfer (Phase 2)
- Deed-in-lieu processing (Phase 2)
- Short sale facilitation (Phase 2)

---

## Acceptance Criteria

### A. Hardship Application
- **Given** borrower is experiencing financial hardship
- **When** borrower accesses modification portal
- **Then** system presents hardship application with:
  - Hardship reason selection (job loss, medical, disaster, divorce, death, military, other)
  - Current income/expense form
  - Document upload for verification (pay stubs, bank statements)
- **And** borrower can save and resume application
- **And** application submitted for review

### B. Financial Assessment
- **Given** hardship application is submitted
- **When** workout team reviews
- **Then** system calculates:
  - Current DTI (Debt-to-Income) ratio
  - Post-modification DTI for each option
  - Affordability score
- **And** determines eligibility for each program

### C. Modification Options Presentation
- **Given** hardship application is approved for workout
- **When** workout engine evaluates
- **Then** system presents available options:
  - Rate Reduction: New rate, monthly payment, term
  - Term Extension: Extended term, monthly payment, total interest
  - Forbearance: Pause duration, resumption date, catch-up plan
  - Payment Plan: Reduced payment amount, duration, balloon
- **And** shows comparison to current terms
- **And** shows total cost of each option

### D. Forbearance Enrollment
- **Given** borrower selects forbearance option
- **When** borrower accepts terms
- **Then** system:
  - Enrolls borrower in forbearance (up to 6 months)
  - Pauses collection activity
  - Updates loan status to FORBEARANCE
  - Schedules end-of-forbearance notification (30 days before)
- **And** borrower receives confirmation with terms

### E. Deferment Enrollment
- **Given** borrower qualifies for deferment
- **When** borrower accepts deferment terms
- **Then** system:
  - Moves missed payments to end of loan
  - Recalculates maturity date
  - Updates loan schedule
  - Updates loan status
- **And** borrower receives modified loan agreement

### F. Payment Plan Setup
- **Given** borrower cannot make full payment but can pay partial
- **When** payment plan is configured
- **Then** system:
  - Creates repayment schedule to cure delinquency (3-12 months)
  - Sets up auto-scheduled payments (if authorized)
  - Calculates catch-up amount per month
  - Updates loan status to PAYMENT_PLAN
- **And** borrower receives plan confirmation

### G. Modification Agreement
- **Given** borrower selects a modification option
- **When** borrower is ready to commit
- **Then** system generates modification agreement with:
  - Original terms
  - Modified terms
  - Effective date
  - Borrower acknowledgments
- **And** collects e-signature
- **And** provides signed copy to borrower

### H. Status Tracking
- **Given** borrower has submitted hardship application
- **When** borrower checks status
- **Then** system shows:
  - Current application status
  - Documents received/pending
  - Next steps required
  - Estimated decision date
  - Contact information for questions

---

## Business Rules

1. **Hardship Eligibility**
   - Loan must be 30+ DPD or imminent default risk
   - Borrower must demonstrate hardship cause
   - No more than 2 modifications in loan lifetime
   - Property must be primary residence (for mortgage)

2. **Program Limits**
   - Forbearance: Maximum 6 months (extendable to 12)
   - Rate Reduction: Maximum 2% below current rate
   - Term Extension: Maximum 40 years from origination
   - Payment Plan: Maximum 12 months to cure

3. **Document Requirements**
   - Hardship letter (written explanation)
   - Income documentation (pay stubs, tax returns)
   - Expense documentation (bank statements)
   - Proof of hardship (layoff letter, medical bills, etc.)

4. **Decision Timeline**
   - Initial response: 5 business days
   - Decision (complete application): 30 days
   - Escalation if no decision by day 25

5. **Forbearance Terms**
   - No payments required during forbearance
   - Interest continues to accrue
   - At end: Repayment plan, deferment, or modification
   - No late fees during forbearance

6. **Trial Period**
   - Some modifications require 3-month trial
   - Must make trial payments on time
   - Successful trial converts to permanent modification

7. **Reporting**
   - Modified loans tracked separately for portfolio analysis
   - Re-default rate monitored
   - CARES Act reporting requirements (if applicable)

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Hardship application workflow |
| TBD | Draft | Workout calculation engine |
| TBD | Draft | Modification agreement service |
| TBD | Draft | Forbearance management |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-005 | Borrower can access hardship programs from portal |

---

## Non-Functional Requirements

- Hardship decision within 30 days
- Modified loans tracked separately for reporting
- Modification history retained indefinitely
- Compliance with CARES Act provisions (if applicable)
- Self-service application available 24/7
- Support for document upload up to 25MB total
