---
id: US-LMS-010
title: Investor Portfolio & Loan Funding
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-15"
last_updated: "2025-01-15"
business_requirement: "PRD-009-11"
depends_on:
  - US-LMS-009  # Investor must be accredited
  - US-LMS-003  # Loan must be approved
  - US-LMS-004  # Loan fulfillment
cards:
  - lms-investor-portal
  - lms-loan-funding
  - lms-return-distribution
  - lms-portfolio-management
---

## Business goal
Enable investors to view their portfolio, fund approved loans (auto or manual), track investments, and receive returns as borrowers make payments.

## Actors
- Investor (accredited investor)
- Borrower (loan recipient)
- System (allocation engine)
- Payment Processor (ACH)

## Scope (in)
- Investor portal dashboard (portfolio view, active investments, returns)
- Loan funding allocation (auto-allocation based on preferences)
- Manual loan selection and funding
- Return distribution (principal and interest)
- Portfolio tracking (total invested, current value, returns)
- Investment history and statements

## Out of scope (now)
- Secondary market trading
- Loan buyback/sellback
- Real-time portfolio rebalancing
- Advanced portfolio analytics
- Tax document generation (1099-INT)

## Acceptance (Given/When/Then)

**Scenario A — View Investor Portfolio**
- Given investor has funded loans
- When investor accesses portal dashboard
- Then system displays total invested amount
- And shows current portfolio value
- And displays total returns (principal + interest received)
- And lists all active investments with loan details
- And shows investment performance metrics

**Scenario B — Auto-Allocation to Loan**
- Given a loan is approved and ready for funding
- And investor has auto-allocation enabled with matching preferences
- When system allocates investments
- Then investor capital is allocated proportionally (based on available capital and preferences)
- And investment record is created
- And funds are debited from investor account
- And investor is notified of new investment

**Scenario C — Manual Loan Selection**
- Given investor has available capital
- When investor browses available loans
- And selects a loan to fund
- Then investment amount is specified
- And funds are debited from investor account
- And investment record is created
- And loan funding progress is updated

**Scenario D — Loan Fully Funded**
- Given multiple investors have allocated to a loan
- When total allocated capital reaches loan amount
- Then loan status updates to FUNDED
- And funds are released from escrow to borrower (disbursement)
- And all investors are notified of successful funding
- And loan becomes active

**Scenario E — Return Distribution (Principal)**
- Given borrower makes a payment on an active loan
- When payment is processed
- Then principal portion is distributed to investors proportionally
- And ACH credit is initiated to investor returns account
- And investment balance is reduced
- And portfolio value is updated
- And investor is notified of return

**Scenario F — Return Distribution (Interest)**
- Given borrower makes a payment on an active loan
- When payment is processed
- Then interest portion is distributed to investors proportionally
- And ACH credit is initiated to investor returns account
- And total returns counter is incremented
- And portfolio value is updated
- And investor is notified of return

**Scenario G — Multiple Investments**
- Given investor has funded multiple loans
- When investor views portfolio
- Then system displays all investments grouped by status (active, paid off, defaulted)
- And shows aggregate metrics (total invested, total returns, ROI)
- And provides investment-level details (loan info, payment history, returns)

**Scenario H — Investment Limits**
- Given investor has set maximum investment per loan
- When auto-allocation attempts to exceed limit
- Then allocation is capped at maximum
- And remaining capital is available for other loans
- And investor is notified if limit reached

**Scenario I — Loan Default Impact**
- Given a loan in investor's portfolio becomes delinquent/defaulted
- When default is processed
- Then investment status updates to DEFAULTED
- And portfolio value reflects loss
- And investor is notified of default
- And collections process begins (separate workflow)

**Scenario J — Loan Paid Off**
- Given a loan in investor's portfolio is fully repaid
- When final payment is processed
- Then investment status updates to PAID_OFF
- And final returns are distributed
- And investment is moved to history
- And investor is notified of loan completion

## Non-functional constraints
- Real-time portfolio value calculation
- Investment allocation within 5 seconds (P95)
- Return distribution within 24 hours of borrower payment
- Payment processing idempotency
- Portal load time < 2s (P95)
- Portfolio updates within 1 minute of payment

## Data notes
- Investment status enum: PENDING_FUNDING, ACTIVE, PAID_OFF, DEFAULTED, CANCELLED
- Portfolio metrics: total_invested, current_value, total_returns, roi_percentage, active_loans_count
- Return types: PRINCIPAL, INTEREST, FEE
- Allocation types: AUTO, MANUAL
- Investment linked to investor_id and loan_id
- Proportional distribution based on investment_amount / total_loan_amount

## Links
- API: GET /lms/investors/:id/portfolio, POST /lms/investments, GET /lms/investors/:id/returns
- Related: US-LMS-004 (loan fulfillment), US-LMS-005 (loan servicing), US-LMS-009 (investor onboarding)

