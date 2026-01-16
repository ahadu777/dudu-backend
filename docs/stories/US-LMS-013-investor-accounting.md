---
id: US-LMS-013
title: "Investor Accounting & Distributions"
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-010", "US-LMS-011"]
enhances: ["US-LMS-010"]
cards: []
---

# US-LMS-013: Investor Accounting & Distributions

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Finance Manager / Investor Accounting Specialist
**I want to** manage investor capital accounts and automate return distributions
**So that** investors receive accurate, timely distributions and I can maintain proper investor accounting records

---

## Scope

### In Scope
- Investor capital account management
- Pro-rata distribution calculations
- Return distribution processing (principal + interest)
- Investor statements (monthly)
- Annual 1099-INT generation
- Loss allocation for defaulted loans
- Investor fee calculations
- Distribution reconciliation

### Out of Scope
- Real-time distributions (batch only)
- Cryptocurrency distributions (Phase 2)
- Non-US tax reporting (Phase 2)
- Investor-level waterfall structures (Phase 2)

---

## Acceptance Criteria

### A. Payment Distribution
- **Given** borrower payment is received on a loan with multiple investors
- **When** distribution job runs
- **Then** system calculates pro-rata share for each investor
- **And** splits principal and interest correctly per investor ownership
- **And** deducts any applicable platform fees
- **And** queues ACH credits to investor accounts
- **And** updates investor capital account balances

### B. Monthly Investor Statement
- **Given** end of month
- **When** statement generation runs
- **Then** each investor receives statement showing:
  - Beginning balance
  - Investments made during period
  - Returns received (principal + interest)
  - Losses allocated
  - Fees charged
  - Ending balance
  - YTD totals
- **And** statement is available in investor portal
- **And** email notification sent to investor

### C. Default Loss Allocation
- **Given** a loan is charged off
- **When** loss allocation runs
- **Then** system calculates each investor's pro-rata share of loss
- **And** adjusts investor capital accounts accordingly
- **And** generates loss allocation notice to each investor
- **And** updates portfolio metrics

### D. Annual 1099 Generation
- **Given** tax year end (December 31)
- **When** 1099 process runs (by January 31)
- **Then** system generates 1099-INT for each investor with interest income >$10
- **And** 1099 includes correct recipient TIN, interest amount, backup withholding
- **And** supports electronic filing with IRS
- **And** provides investor portal access to tax documents

### E. Fee Calculation
- **Given** investor has funded loans
- **When** fee calculation runs
- **Then** system calculates platform fee per investor agreement
- **And** fee is deducted before distribution
- **And** fee income is recorded in appropriate GL account
- **And** fee detail shown on investor statement

### F. Distribution Reconciliation
- **Given** distributions have been processed
- **When** reconciliation report is run
- **Then** system shows total payments received from borrowers
- **And** shows total distributions to investors
- **And** shows platform fee retained
- **And** verifies sum balances (borrower payments = investor distributions + fees)

---

## Business Rules

1. **Pro-Rata Calculation**
   - Investor share = Investor investment / Total loan amount
   - Applied to both principal and interest
   - Calculated to 8 decimal places, rounded to 2 for payment

2. **Distribution Priority**
   - Platform fees deducted first
   - Interest distributed next
   - Principal distributed last
   - No distributions if loan in forbearance

3. **Fee Structure** (Default)
   - Platform fee: 1% of interest collected
   - Fee calculated per payment
   - Minimum fee: $0.01
   - Fee waived if investor balance <$100

4. **1099 Requirements**
   - Issue 1099-INT if interest >$10 for tax year
   - Include backup withholding if W-9 not on file
   - Electronic filing required if >250 forms
   - Corrected 1099 process for errors

5. **Loss Allocation**
   - Losses allocated proportionally to ownership
   - Loss reduces investor capital account
   - Loss impacts investor's cost basis
   - Recovery payments credited if loan recovers

6. **Statement Delivery**
   - Monthly statements by 5th of following month
   - Annual tax documents by January 31
   - Statements available in portal for 7 years

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Distribution calculation engine |
| TBD | Draft | Investor statement generator |
| TBD | Draft | 1099 generation service |
| TBD | Draft | Fee calculation service |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-010 | Investor sees distributions in portal |

---

## Non-Functional Requirements

- Distribution accuracy to 2 decimal places
- Investor capital accounts must reconcile to total portfolio
- Tax document generation by January 31
- Support for both individual and institutional investors
- Batch processing for 10,000+ investors
- Statement generation <5 minutes for full investor base
