---
id: US-LMS-021
title: "Guarantor Release & Substitution"
owner: Product
status: "Draft"
priority: Low
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-007", "US-LMS-008"]
enhances: ["US-LMS-008"]
cards: []
---

# US-LMS-021: Guarantor Release & Substitution

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Guarantor
**I want to** request release from my guarantee obligation when conditions are met
**So that** I can be freed from financial liability once the borrower has demonstrated ability to manage the loan independently

---

## Scope

### In Scope
- Guarantor release eligibility check
- Self-service release request submission
- Substitute guarantor nomination
- Credit evaluation of substitute guarantor
- Release agreement execution
- Guarantee transfer processing
- Status tracking throughout process

### Out of Scope
- Automatic release triggers (Phase 2)
- Partial guarantee release (Phase 2)
- Multiple guarantor scenarios (Phase 2)
- Cross-collateralization release (Phase 2)

---

## Acceptance Criteria

### A. Release Eligibility Check
- **Given** guarantor wants to be released from guarantee
- **When** accessing guarantee portal
- **Then** system evaluates eligibility based on:
  - Loan payment history (12+ consecutive on-time payments)
  - Current LTV ratio (<80% for secured loans)
  - Borrower credit score improvement (>50 points since origination)
  - No current delinquency
- **And** displays eligibility status with detailed criteria

### B. Release Request Submission
- **Given** guarantor meets release criteria
- **When** release request is submitted
- **Then** system:
  - Creates release case in workflow
  - Routes to credit officer for review
  - Notifies borrower of pending change
  - Sets expected decision date (15 business days)
- **And** guarantor receives confirmation with case number

### C. Request Without Meeting Criteria
- **Given** guarantor does not meet automatic release criteria
- **When** guarantor requests release anyway
- **Then** system:
  - Allows request submission with explanation
  - Requires additional documentation
  - Routes to senior credit officer
  - Notes exception request status
- **And** guarantor is informed of reduced approval likelihood

### D. Substitute Guarantor Nomination
- **Given** release requires substitute guarantor
- **When** original guarantor nominates substitute
- **Then** system:
  - Sends invitation to substitute via email
  - Substitute completes registration (US-LMS-007 flow)
  - Substitute completes KYC/AML verification
  - Substitute credit evaluation performed
- **And** results compared to original guarantor capacity

### E. Substitute Evaluation
- **Given** substitute guarantor completes verification
- **When** credit evaluation runs
- **Then** system evaluates:
  - Credit score vs original guarantor
  - Guarantee capacity vs required amount
  - DTI ratio
  - Employment stability
- **And** presents comparison report to credit officer
- **And** provides recommendation (approve/decline/conditions)

### F. Credit Officer Decision
- **Given** release request is under review
- **When** credit officer makes decision
- **Then** decision options are:
  - Approve Release (no substitute needed)
  - Approve with Substitute (substitute accepted)
  - Decline (with reason)
  - Request Additional Information
- **And** guarantor and borrower notified of decision

### G. Guarantee Transfer
- **Given** credit officer approves substitution
- **When** transfer is initiated
- **Then** system:
  - Generates release agreement for original guarantor
  - Generates guarantee agreement for substitute
  - Routes for e-signature (original guarantor → substitute → borrower)
  - Upon all signatures, updates loan guarantee records
- **And** all parties receive executed copies

### H. Release Without Substitute
- **Given** credit officer approves release without substitute
- **When** release is processed
- **Then** system:
  - Generates release agreement for guarantor
  - Routes for e-signature (guarantor → borrower → lender)
  - Upon all signatures, removes guarantor from loan
  - Updates loan to unsecured status (if applicable)
- **And** guarantor receives release confirmation

### I. Status Tracking
- **Given** release request is in progress
- **When** guarantor checks status
- **Then** system shows:
  - Current step in workflow
  - Documents pending
  - Estimated completion date
  - Contact information for questions
  - Full history of actions taken

---

## Business Rules

1. **Automatic Release Eligibility**
   - 12+ consecutive on-time payments (no 30+ DPD)
   - LTV <80% (for secured loans)
   - Borrower credit score improved >50 points OR >700
   - DTI <40% based on current income

2. **Substitute Requirements**
   - Must meet original guarantee capacity requirements
   - Credit score within 50 points of original (or higher)
   - Cannot be related to original guarantor
   - Must pass KYC/AML verification

3. **Release Fees**
   - Processing fee: $200 (non-refundable)
   - Recording fee: Varies by jurisdiction
   - Fee waived if borrower refinances

4. **Decision Timeline**
   - Standard request: 15 business days
   - Exception request: 20 business days
   - Substitute nomination: +10 business days for processing

5. **Documentation Required**
   - Release request form
   - Borrower consent acknowledgment
   - Updated income verification (if >1 year old)
   - Substitute documentation (if applicable)

6. **Notification Requirements**
   - Borrower notified at request submission
   - All parties notified at decision
   - 5-day reminder before documents expire
   - Confirmation upon release completion

7. **Restrictions**
   - No release if loan in forbearance/modification
   - No release within 6 months of origination
   - No release if collections activity pending
   - Maximum 1 release request per 12 months

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Release eligibility service |
| TBD | Draft | Substitute evaluation workflow |
| TBD | Draft | Release agreement generation |
| TBD | Draft | Guarantee transfer service |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-008 | Guarantor can initiate release from portal |

---

## Non-Functional Requirements

- Release decision within 15 business days
- Substitute must meet original guarantee capacity requirements
- All guarantee changes logged in audit trail
- Notifications to all parties at each step
- Document retention: Life of loan + 7 years
- E-signature completion within 14 days or restart
