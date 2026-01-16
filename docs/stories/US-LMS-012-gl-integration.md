---
id: US-LMS-012
title: "Financial Reporting & GL Integration"
owner: Product
status: "Draft"
priority: High
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-011"]
enhances: []
cards: []
---

# US-LMS-012: Financial Reporting & GL Integration

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Finance Manager / Controller
**I want to** automate generation of financial reports and General Ledger entries
**So that** I can ensure accurate financial statements, reduce manual effort, and meet regulatory reporting requirements

---

## Scope

### In Scope
- Automated GL journal entry generation
- Interest accrual calculations (actual/360, 30/360)
- Loan loss provisioning reports (CECL/ALLL)
- Regulatory financial reports (Call Report data)
- Month-end close support
- Portfolio aging and delinquency reports
- Trial balance generation

### Out of Scope
- Direct GL system integration (file export only - Phase 2)
- Consolidation across multiple entities (Phase 2)
- Real-time GL posting (batch only)
- GAAP vs IFRS dual reporting (Phase 2)

---

## Acceptance Criteria

### A. Daily GL Entries
- **Given** end of day processing completes
- **When** GL batch runs
- **Then** system generates journal entries for:
  - New disbursements (DR: Loans Receivable, CR: Cash)
  - Payments received (DR: Cash, CR: Loans Receivable/Interest Income)
  - Interest accrual (DR: Accrued Interest, CR: Interest Income)
  - Fee income (DR: Cash/Receivable, CR: Fee Income)
  - Charge-offs (DR: Allowance, CR: Loans Receivable)
- **And** entries are posted to GL with unique batch ID
- **And** batch is balanced (debits = credits)

### B. Interest Accrual
- **Given** active loan portfolio
- **When** daily accrual job runs
- **Then** system calculates accrued interest for each loan
- **And** uses correct day count method per product config (actual/360 or 30/360)
- **And** updates accrued interest balance on loan
- **And** generates accrual GL entries

### C. Loan Loss Provisioning
- **Given** portfolio aging data
- **When** provisioning report is requested
- **Then** system calculates CECL/ALLL reserves based on:
  - Aging buckets (Current, 1-30, 31-60, 61-90, 90+)
  - Historical loss rates by product
  - Economic factors (if configured)
- **And** provides drill-down to loan level detail
- **And** shows period-over-period comparison

### D. Month-End Close
- **Given** last business day of month
- **When** month-end close is initiated
- **Then** system runs all outstanding accruals
- **And** generates trial balance
- **And** produces portfolio summary report
- **And** locks period for further transactions
- **And** creates close audit record

### E. Portfolio Aging Report
- **Given** finance manager requests aging report
- **When** report is generated
- **Then** system shows loans by aging bucket
- **And** shows principal, interest, and total by bucket
- **And** shows trend vs prior period
- **And** allows export to Excel

### F. GL Export File
- **Given** GL entries are generated
- **When** export is requested
- **Then** system creates file in configured format
- **And** includes all required fields (account, amount, date, reference)
- **And** file is available for download or SFTP transfer

---

## Business Rules

1. **GL Account Mapping**
   - Each transaction type maps to specific GL accounts
   - Account mapping is configurable by product
   - Sub-ledger detail maintained for all entries

2. **Accrual Methods**
   - Actual/360: (Principal * Rate * Days) / 360
   - 30/360: Assumes 30 days per month, 360 per year
   - Method configured at product level

3. **Provisioning Rates** (Default)
   - Current: 0.5%
   - 1-30 DPD: 2%
   - 31-60 DPD: 10%
   - 61-90 DPD: 25%
   - 90+ DPD: 50%
   - Rates configurable by product and segment

4. **Period Close Rules**
   - All transactions must be posted before close
   - No backdated entries after close
   - Close can be reopened by Controller only
   - Audit trail for all close/reopen actions

5. **Reporting Periods**
   - Daily: Transaction summary, GL entries
   - Monthly: Trial balance, portfolio summary
   - Quarterly: Regulatory reports
   - Annual: Year-end close, 1099 preparation

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | GL entry generation service |
| TBD | Draft | Interest accrual engine |
| TBD | Draft | Provisioning calculator |
| TBD | Draft | Period close workflow |

---

## Non-Functional Requirements

- GL entries must balance (debits = credits)
- Support for multiple chart of accounts configurations
- Reports exportable to Excel and PDF
- Historical data retention for 7 years
- Accrual calculation P99 <1 second per loan
- Batch processing for portfolios up to 1M loans
