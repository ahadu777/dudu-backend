---
id: US-LMS-019
title: "Investor Risk Analytics & Portfolio Monitoring"
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-009", "US-LMS-010"]
enhances: ["US-LMS-010"]
cards: []
---

# US-LMS-019: Investor Risk Analytics & Portfolio Monitoring

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As an** Investor
**I want to** access advanced analytics and risk monitoring tools for my portfolio
**So that** I can make informed investment decisions, track portfolio health, and proactively manage risk exposure

---

## Scope

### In Scope
- Portfolio risk metrics dashboard
- Loan-level performance tracking
- Delinquency and default monitoring
- Diversification analysis
- Benchmark comparison (platform average)
- Custom alert configuration
- Vintage analysis
- Risk-adjusted return calculations

### Out of Scope
- Predictive default modeling (Phase 2)
- AI-driven investment recommendations (Phase 2)
- Real-time market data integration (Phase 2)
- Custom report builder (Phase 2)

---

## Acceptance Criteria

### A. Risk Dashboard
- **Given** investor accesses analytics portal
- **When** dashboard loads
- **Then** system displays:
  - Portfolio weighted average credit score
  - Geographic concentration (by state/region)
  - Loan type distribution
  - Current delinquency rate (30/60/90+ DPD)
  - Projected loss rate (based on aging)
  - Comparison to platform average for each metric

### B. Early Warning Alerts
- **Given** investor configures risk alerts
- **When** a loan in portfolio shows early warning signs
- **Then** system sends alert when:
  - Payment pattern changes (e.g., late payments increase)
  - Borrower credit score drops >20 points
  - Loan enters 30 DPD
  - Borrower requests hardship
- **And** alert includes loan details and recommended action
- **And** alerts delivered via email and portal notification

### C. Vintage Analysis
- **Given** investor wants to analyze performance by origination period
- **When** vintage report is requested
- **Then** system shows:
  - Cumulative default curves by vintage (month of origination)
  - 12/24/36 month loss rates
  - Comparison to benchmark vintage
  - Cohort size and current status breakdown
- **And** allows drill-down to loan list

### D. Diversification Score
- **Given** investor's portfolio allocation
- **When** diversification analysis runs
- **Then** system calculates diversification score (0-100) based on:
  - Credit score distribution
  - Geographic spread
  - Loan term distribution
  - Industry/purpose distribution
- **And** identifies concentration risks
- **And** suggests rebalancing opportunities
- **And** shows impact of suggested changes

### E. Loan-Level Performance
- **Given** investor wants to review individual loans
- **When** accessing loan detail
- **Then** system shows:
  - Current status and DPD
  - Payment history (timeline view)
  - Remaining principal and projected returns
  - Borrower credit score (anonymized)
  - Risk grade and any changes
- **And** allows filtering/sorting of loan list

### F. Benchmark Comparison
- **Given** investor portfolio has performance data
- **When** benchmark report is viewed
- **Then** system shows investor metrics vs platform average:
  - Return rate
  - Default rate
  - Delinquency rate
  - Average credit score
- **And** indicates where investor is above/below benchmark
- **And** shows percentile ranking

### G. Export and Download
- **Given** investor needs data for external analysis
- **When** export is requested
- **Then** system provides:
  - Portfolio summary CSV
  - Loan-level detail CSV
  - Performance metrics Excel
  - Charts as PNG/PDF
- **And** data reflects current state as of export date

---

## Business Rules

1. **Risk Metrics Calculation**
   - Weighted Average Credit Score: Sum(Principal * Score) / Total Principal
   - Delinquency Rate: DPD Principal / Total Principal
   - Projected Loss: Based on aging bucket × historical loss rate

2. **Diversification Scoring**
   - Geographic: >10 states = max score, <3 states = min score
   - Credit: Spread across grades = higher score
   - Concentration limit: No single loan >5% of portfolio

3. **Alert Thresholds** (Default, configurable)
   - Credit score drop: 20 points
   - Payment late: 5 days past due
   - Portfolio delinquency: 5% of principal
   - Single loan default: Any 90+ DPD

4. **Vintage Cohorts**
   - Grouped by month of origination
   - Minimum 50 loans per cohort for display
   - Historical vintages shown for 60 months

5. **Data Refresh**
   - Dashboard metrics: Daily (overnight batch)
   - Alerts: Real-time (within 1 hour of trigger event)
   - Vintage analysis: Weekly (Sunday night)

6. **Data Privacy**
   - Borrower PII not visible to investors
   - Credit scores shown as ranges (e.g., 700-720)
   - Geographic data at state level only

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Risk analytics engine |
| TBD | Draft | Alert configuration service |
| TBD | Draft | Vintage analysis batch job |
| TBD | Draft | Portfolio dashboard UI |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-010 | Investor has analytics to complement basic portfolio view |

---

## Non-Functional Requirements

- Analytics refresh daily (overnight batch)
- Historical data available for 5 years
- Export to CSV/Excel for further analysis
- Mobile-responsive analytics dashboard
- Dashboard load time <5 seconds
- Support for portfolios with 10,000+ loans
