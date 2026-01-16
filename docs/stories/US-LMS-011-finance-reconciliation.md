---
id: US-LMS-011
title: "Daily Reconciliation & Cash Management"
owner: Product
status: "Draft"
priority: High
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-004", "US-LMS-010"]
enhances: ["US-LMS-013"]
cards: []
---

# US-LMS-011: Daily Reconciliation & Cash Management

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Finance Manager
**I want to** perform daily reconciliation of loan payments, disbursements, and investor returns
**So that** I can ensure accurate cash position, identify discrepancies, and maintain financial integrity

---

## Scope

### In Scope
- Daily payment reconciliation dashboard
- Cash position monitoring across all accounts
- Discrepancy identification and resolution workflow
- Bank statement import and matching (BAI2, MT940, CSV)
- Virtual Account reconciliation
- Exception handling and manual adjustment with dual approval

### Out of Scope
- Real-time bank connectivity (batch file only)
- Multi-currency reconciliation (Phase 2)
- Automated discrepancy resolution (Phase 2)
- Integration with external treasury systems (Phase 2)

---

## Acceptance Criteria

### A. Daily Reconciliation Dashboard
- **Given** finance manager logs in at start of day
- **When** accessing reconciliation dashboard
- **Then** system displays yesterday's transactions summary
- **And** shows unmatched items count and value
- **And** shows pending reconciliations
- **And** shows cash position by account (operating, escrow, investor, collections)

### B. Automated Payment Matching
- **Given** payments received via Virtual Accounts
- **When** system processes bank file
- **Then** payments are auto-matched to loans with 95%+ accuracy
- **And** matched items are posted to respective loans
- **And** unmatched items are flagged for manual review

### C. Discrepancy Resolution
- **Given** a payment discrepancy is identified (amount mismatch, duplicate, or orphan)
- **When** finance analyst investigates
- **Then** system provides transaction audit trail
- **And** allows adjustment entry with reason code
- **And** requires supervisor approval for adjustments >$1,000
- **And** logs all actions for audit

### D. Cash Position Report
- **Given** end of business day
- **When** finance manager requests cash position
- **Then** system shows real-time balances across all accounts
- **And** shows intraday movement summary (inflows/outflows)
- **And** highlights any accounts below threshold

### E. Bank File Import
- **Given** bank file is available (BAI2, MT940, or CSV format)
- **When** finance analyst uploads file
- **Then** system validates file format and structure
- **And** parses transactions with proper date/amount/reference
- **And** queues transactions for matching

### F. Manual Adjustment
- **Given** discrepancy requires manual adjustment
- **When** finance analyst creates adjustment entry
- **Then** system requires reason code selection
- **And** creates offsetting entries to balance
- **And** routes to supervisor for approval if >$1,000
- **And** adjustment is applied only after approval

---

## Business Rules

1. **Reconciliation Timing**
   - Bank files must be processed within 2 hours of receipt
   - Day-end reconciliation must complete before GL close
   - All unmatched items must have an assigned owner

2. **Matching Rules**
   - Virtual Account number matches loan ID exactly
   - Amount tolerance: $0.01 (exact match required)
   - Date tolerance: same business day or T+1

3. **Adjustment Controls**
   - Adjustments <$100: Analyst can approve
   - Adjustments $100-$1,000: Team Lead approval required
   - Adjustments >$1,000: Manager approval required
   - All adjustments require reason code and documentation

4. **Exception Categories**
   - AMOUNT_MISMATCH: Payment amount doesn't match due amount
   - DUPLICATE: Same reference processed multiple times
   - ORPHAN: Payment with no matching loan
   - TIMING: Payment received outside expected window

5. **Audit Requirements**
   - All reconciliation actions logged with timestamp and user
   - Adjustment history retained for 7 years
   - Monthly reconciliation reports archived

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Bank file import service |
| TBD | Draft | Payment matching engine |
| TBD | Draft | Reconciliation dashboard UI |
| TBD | Draft | Adjustment workflow |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-013 | Provides reconciled data for investor distributions |

---

## Non-Functional Requirements

- Reconciliation batch must complete within 2 hours
- Dashboard load time <3 seconds
- Support for files up to 100,000 transactions
- All adjustments require dual approval (maker-checker)
- Audit trail for all reconciliation actions
