# PART 4: USER STORIES & USER FLOWS

**Page 36 of [TOTAL] | CONFIDENTIAL**

---

## 19. Borrower User Stories

### 19.1 US-LMS-001: Borrower Registration with KYC/AML Verification

**Business Goal**: Enable a prospective borrower to register and complete identity verification (KYC) and anti-money laundering (AML) screening before applying for a loan.

**Actors**: Borrower (applicant), KYC Provider (mock: MockKYC-Provider), AML Screener (mock: MockAML-Screener), Compliance Officer (for manual review)

**Scope (In)**:
- Borrower registration with PII capture
- Automated KYC identity verification
- Automated AML/watchlist screening
- Status tracking (PENDING_KYC → VERIFIED | KYC_FAILED | PENDING_REVIEW)

**Acceptance Scenarios**:
- **Scenario A — Registration**: Given a new user visits the registration portal, When they submit valid personal information, Then the system creates a borrower record with status PENDING_KYC and triggers automatic KYC verification
- **Scenario B — KYC Verification Success**: Given KYC provider returns confidence score ≥ 85%, When the verification completes, Then borrower status updates to VERIFIED (pending AML) and AML screening is triggered automatically
- **Scenario C — KYC Verification Failure**: Given KYC provider returns confidence score < 70%, When the verification completes, Then borrower status updates to KYC_FAILED and borrower is notified with next steps
- **Scenario D — AML Screening Clear**: Given borrower passes KYC and AML returns no matches, When screening completes, Then borrower status is VERIFIED and borrower is eligible to apply for loans
- **Scenario E — AML Watchlist Match**: Given AML screening finds a potential match (PEP, OFAC, sanctions), When the match is identified, Then borrower status updates to PENDING_REVIEW and case is routed to Compliance Officer queue

**Mock Behavior Rules**:
- SSN ending in 0000 → KYC FAILED (confidence 0)
- SSN ending in 1111 → MANUAL_REVIEW (confidence 65)
- All others → VERIFIED (confidence 85-100)
- Name contains "BLOCKED" → AML BLOCKED (risk 100)
- Name contains "PEP" → POTENTIAL_MATCH (risk 85)
- All others → CLEAR (risk 0-20)

**Non-Functional Constraints**:
- Idempotency on email (unique constraint)
- SSN encrypted at rest (AES-256)
- Audit log for all verification attempts
- P99 response time < 2s for combined onboarding

---

### 19.2 US-LMS-002: Loan Application Submission

**Business Goal**: Enable a verified borrower to submit a loan application with employment and income information, triggering a credit bureau pull for decisioning.

**Actors**: Borrower (verified applicant), Credit Bureau (mock: MockCredit-Bureau), System (application processor)

**Scope (In)**:
- Loan application submission with income/employment data
- Credit bureau pull (mock)
- Application status tracking
- Eligibility validation (only VERIFIED borrowers)

**Acceptance Scenarios**:
- **Scenario A — Submit Application**: Given borrower is VERIFIED, When borrower submits loan application with valid data, Then system creates application with status SUBMITTED and returns unique application_id
- **Scenario B — Credit Pull Success**: Given application is SUBMITTED, When system initiates credit pull, Then credit report data is retrieved and application status updates to CREDIT_PULLED
- **Scenario C — Unverified Borrower Rejected**: Given borrower status is not VERIFIED, When borrower attempts to submit application, Then system returns 403 "Borrower not eligible for application"
- **Scenario D — Application Status Check**: Given borrower has submitted an application, When borrower queries application status, Then system returns current status and timeline of all status changes

**Mock Credit Score Rules**:
- SSN last 4: 0001-0100 → Credit Score 300-549 (Poor), 3+ derogatories
- SSN last 4: 0101-0300 → Credit Score 550-649 (Fair), 1-2 derogatories
- SSN last 4: 0301-0600 → Credit Score 650-719 (Good), 0 derogatories
- SSN last 4: 0601-0900 → Credit Score 720-779 (Very Good), 0 derogatories
- SSN last 4: 0901-9999 → Credit Score 780-850 (Excellent), 0 derogatories
- SSN last 4: 0000 → ERROR

---

### 19.3 US-LMS-003: Automated Credit Decision Engine

**Business Goal**: Automatically evaluate loan applications based on credit data and rules, producing APPROVE, DECLINE, or REFER decisions with appropriate next steps.

**Actors**: Decision Engine (automated rules), Credit Officer (for referred applications), Compliance System (adverse action notices)

**Scope (In)**:
- Automated credit decisioning based on rules
- Auto-approve, auto-decline, or refer to manual review
- Adverse action notice generation (FCRA-compliant)
- Reason code generation

**Acceptance Scenarios**:
- **Scenario A — Auto Approve**: Given credit score ≥ 700, DTI ≤ 36%, no derogatories, When decision engine evaluates application, Then outcome is APPROVED with decision_type AUTO and loan offers are generated automatically
- **Scenario B — Auto Decline**: Given credit score < 550 OR active bankruptcy OR DTI > 50%, When decision engine evaluates application, Then outcome is DECLINED with decision_type AUTO and adverse action notice is triggered with reason codes
- **Scenario C — Refer to Manual Review**: Given credit score 550-699 OR DTI 36-50% OR thin credit file, When decision engine evaluates application, Then outcome is REFERRED with decision_type AUTO and application is placed in credit officer queue
- **Scenario D — Adverse Action Notice**: Given application is DECLINED, When adverse action is generated, Then notice includes top 4 reason codes, credit score used and score range, credit bureau contact information, and rights disclosure (FCRA)

**Decision Rules**:
- Credit Score ≥ 700, DTI ≤ 36%, Derogatories = 0 → AUTO_APPROVE
- Credit Score < 550 → AUTO_DECLINE
- DTI > 50% → AUTO_DECLINE
- Derogatories ≥ 3 → AUTO_DECLINE
- Credit Score 550-699, DTI ≤ 50%, Derogatories < 3 → REFER_TO_REVIEW

---

### 19.4 US-LMS-004: Loan Offers, Signing, and Disbursement

**Business Goal**: Present approved borrowers with loan offer options, collect digital signatures on contracts, and disburse funds to their bank account.

**Actors**: Borrower (approved applicant), E-Signature Provider (mock: MockSign-Provider), Disbursement System (ACH/wire)

**Scope (In)**:
- Loan offer generation (multiple term options)
- Offer selection and lock-in
- Digital signature collection
- Fund disbursement via ACH

**Acceptance Scenarios**:
- **Scenario A — Generate Offers**: Given application is APPROVED, When system generates offers, Then 3 term options are provided (36/48/60 months) and each offer shows APR, monthly payment, total interest, and offers expire in 14 days
- **Scenario B — Select Offer**: Given borrower reviews available offers, When borrower selects preferred offer, Then offer is locked in and other offers invalidated, contract generation is triggered, and status updates to OFFER_SELECTED
- **Scenario C — Sign Documents**: Given offer is selected and contracts generated, When borrower provides signature and consents, Then all documents are marked as signed, copies are sent to borrower email, and status updates to DOCUMENTS_SIGNED
- **Scenario D — Disbursement Success**: Given documents are signed and bank account validated, When disbursement is initiated, Then ACH transfer is queued, loan status updates to DISBURSED → ACTIVE, and borrower is notified with expected arrival date

**Mock Disbursement Rules**:
- Routing Number 000000000 → FAILED (invalid)
- Routing Number 999999999 → DELAYED (3 days)
- All others → SUCCESS (1 day)

---

### 19.5 US-LMS-005: Loan Servicing & Borrower Portal

**Business Goal**: Provide borrowers with self-service access to view loan details, make payments, and request payoff quotes through an online portal.

**Actors**: Borrower (loan holder), Payment Processor (ACH), System (balance calculator)

**Scope (In)**:
- Loan dashboard (balance, payments, schedule)
- One-time payment processing
- Payoff quote generation
- Payment history tracking

**Acceptance Scenarios**:
- **Scenario A — View Loan Dashboard**: Given borrower has an active loan, When borrower accesses loan details, Then system displays current balance, payoff amount, next payment due, recent payment history (last 3), and loan terms
- **Scenario B — Make Payment**: Given borrower wants to make a payment, When borrower submits payment with amount and bank details, Then system records payment with status PENDING, calculates principal/interest split, and returns confirmation number
- **Scenario C — Payoff Quote**: Given borrower wants to pay off loan early, When borrower requests payoff quote with future date, Then system calculates principal + accrued interest, provides per diem interest rate, and quote is valid until specified date
- **Scenario D — Loan Paid Off**: Given payoff payment is received, When balance reaches zero, Then loan status changes to PAID_OFF and borrower receives satisfaction letter

---

### 19.6 US-LMS-006: Compliance & Audit Trail

**Business Goal**: Maintain immutable audit trails for all system actions and enforce role-based access control to meet regulatory examination requirements.

**Actors**: Compliance Officer (audit reviewer), Security Administrator (access control), System (audit logger), Regulator (examination)

**Scope (In)**:
- Immutable audit logging for all actions
- Audit log query by entity
- Role-based access control
- Audit log immutability enforcement

**Acceptance Scenarios**:
- **Scenario A — Audit Log Creation**: Given any action is taken in the system, When the action is executed, Then an audit log entry is created with timestamp, actor, action, entity, before/after values, IP address and session ID
- **Scenario B — Audit Log Query**: Given compliance officer needs to investigate an application, When officer queries audit logs by entity_type and entity_id, Then system returns chronological list of all actions on that entity with who, what, when, and changes
- **Scenario C — Audit Log Immutability**: Given an audit log entry exists, When any attempt is made to DELETE or UPDATE the entry, Then system returns 405 Method Not Allowed and the attempted modification is itself logged
- **Scenario D — Role-Based Access**: Given user has role "credit_officer", When user attempts to access borrower credit reports, Then access is granted, but When user attempts to access system configuration, Then access is denied with 403 Forbidden

**Non-Functional Constraints**:
- Audit logs retained for 7 years minimum
- Logs written synchronously (before response)
- No DELETE or UPDATE operations on audit_logs table
- Log storage separate from operational database

---

## 20. Guarantor User Stories

### 20.1 US-LMS-007: Guarantor Registration & Verification

**Business Goal**: Enable guarantors to register, complete identity verification (KYC/AML), and be assessed for guarantee capacity when a borrower's loan application requires a guarantor.

**Actors**: Guarantor (credit enhancer), Borrower (loan applicant), Credit Officer (underwriting), KYC Provider, AML Screener, Credit Bureau

**Scope (In)**:
- Guarantor registration with relationship to borrower
- Automated KYC identity verification
- Automated AML/watchlist screening
- Credit report pull for financial assessment
- Guarantee capacity calculation
- Status tracking (PENDING_KYC → VERIFIED | KYC_FAILED | PENDING_REVIEW)

**Acceptance Scenarios**:
- **Scenario A — Guarantor Registration**: Given a loan application requires a guarantor, When guarantor submits registration with valid information, Then the system creates a guarantor record linked to borrower and loan, status is set to PENDING_KYC, and automatic KYC verification is triggered
- **Scenario B — Financial Assessment**: Given guarantor passes KYC/AML and credit report is available, When financial assessment completes, Then guarantee capacity is calculated, guarantor status is VERIFIED, and guarantor is eligible to execute guarantee agreement
- **Scenario C — Credit Report Issues**: Given credit report shows significant negative factors (score < 600, high debt), When financial assessment completes, Then guarantor status updates to PENDING_REVIEW and case is routed to Credit Officer queue

**Guarantee Capacity Rules**:
- Credit Score 750+ → Full requested amount → VERIFIED
- Credit Score 700-749 → Up to 80% of requested → VERIFIED
- Credit Score 650-699 → Up to 50% of requested → PENDING_REVIEW
- Credit Score <650 → Requires manual review → PENDING_REVIEW

---

### 20.2 US-LMS-008: Guarantor Portal & Guarantee Activation

**Business Goal**: Provide guarantors with self-service access to view their guarantee obligations and enable automated guarantee activation workflow when borrower defaults.

**Actors**: Guarantor (guarantee provider), Borrower (loan holder), Collections Agent (recovery), Payment Processor (ACH)

**Scope (In)**:
- Guarantor portal dashboard (guarantee status, borrower loan status)
- Guarantee activation workflow (automated trigger on default)
- Guarantor payment processing (full/partial payment)
- Guarantee status tracking
- Notification system (email/SMS)

**Acceptance Scenarios**:
- **Scenario A — View Guarantor Dashboard**: Given guarantor has an active guarantee, When guarantor accesses portal, Then system displays guarantee details, borrower loan status, guarantee status, and guarantee activation history
- **Scenario B — Guarantee Activation Trigger**: Given borrower loan is 90+ days past due (DPD ≥ 90), When system detects default condition, Then guarantee status updates to ACTIVATION_PENDING, guarantor is notified via email and SMS, and collections agent is assigned to case
- **Scenario C — Guarantor Full Payment**: Given guarantee is activated and guarantor is notified, When guarantor makes full payment of guarantee amount, Then payment is processed via ACH, loan balance is satisfied, guarantee status updates to ACTIVATED_CLOSED, and collections case is closed
- **Scenario D — Guarantee Not Activated (Borrower Cures)**: Given borrower loan becomes delinquent but cures before 90 DPD, When borrower makes payment to bring loan current, Then guarantee remains ACTIVE (not activated) and guarantor is notified that borrower has cured

---

## 21. Investor User Stories

### 21.1 US-LMS-009: Investor Registration & Accreditation

**Business Goal**: Enable investors to register, verify accredited investor status (SEC Rule 501), and complete onboarding to participate in marketplace lending.

**Actors**: Investor (individual or institutional), Compliance Officer (accreditation review), KYC Provider, AML Screener

**Scope (In)**:
- Investor registration (individual and institutional)
- Accreditation documentation upload
- Automated accreditation verification (income/net worth)
- KYC/AML verification
- Investment preference configuration
- Bank account verification for funding
- Status tracking (PENDING_ACCREDITATION → ACCREDITED | REJECTED)

**Acceptance Scenarios**:
- **Scenario A — Individual Investor Registration**: Given a new investor visits the platform, When they submit registration with personal information, Then the system creates an investor record with status PENDING_ACCREDITATION and investor is prompted to provide accreditation documentation
- **Scenario B — Automated Accreditation Check**: Given investor has uploaded documentation, When system analyzes income/net worth data and income ≥ $200K (single) or $300K (joint) OR net worth ≥ $1M, Then accreditation status updates to ACCREDITED and investor can proceed to complete profile
- **Scenario C — Manual Accreditation Review**: Given investor documentation requires manual review, When Compliance Officer reviews documentation, Then officer can approve or reject accreditation, investor is notified of decision, and status updates to ACCREDITED or REJECTED

**Accreditation Rules**:
- Income ≥ $200K (single) → ACCREDITED (Auto-Approve)
- Income ≥ $300K (joint) → ACCREDITED (Auto-Approve)
- Net worth ≥ $1M → ACCREDITED (Auto-Approve)
- Income $150K-$199K → PENDING_REVIEW
- Net worth $500K-$999K → PENDING_REVIEW
- Below thresholds → REJECTED

---

### 21.2 US-LMS-010: Investor Portfolio & Loan Funding

**Business Goal**: Enable investors to view their portfolio, fund approved loans (auto or manual), track investments, and receive returns as borrowers make payments.

**Actors**: Investor (accredited investor), Borrower (loan recipient), System (allocation engine), Payment Processor (ACH)

**Scope (In)**:
- Investor portal dashboard (portfolio view, active investments, returns)
- Loan funding allocation (auto-allocation based on preferences)
- Manual loan selection and funding
- Return distribution (principal and interest)
- Portfolio tracking (total invested, current value, returns)
- Investment history and statements

**Acceptance Scenarios**:
- **Scenario A — View Investor Portfolio**: Given investor has funded loans, When investor accesses portal dashboard, Then system displays total invested amount, current portfolio value, total returns, all active investments with loan details, and investment performance metrics
- **Scenario B — Auto-Allocation to Loan**: Given a loan is approved and ready for funding and investor has auto-allocation enabled with matching preferences, When system allocates investments, Then investor capital is allocated proportionally, investment record is created, funds are debited from investor account, and investor is notified of new investment
- **Scenario C — Return Distribution**: Given borrower makes a payment on an active loan, When payment is processed, Then principal and interest portions are distributed to investors proportionally, ACH credit is initiated to investor returns account, investment balance is reduced, portfolio value is updated, and investor is notified of return
- **Scenario D — Loan Default Impact**: Given a loan in investor's portfolio becomes delinquent/defaulted, When default is processed, Then investment status updates to DEFAULTED, portfolio value reflects loss, and investor is notified of default

---

## 22. Finance Team User Stories

### 22.1 US-LMS-011: Daily Reconciliation & Cash Management

**Business Goal**: Enable finance team to perform daily reconciliation of loan payments, disbursements, and investor returns, ensuring accurate cash position and identifying discrepancies.

**Actors**: Finance Manager, Finance Analyst, System (Reconciliation Engine), Payment Processor

**Scope (In)**:
- Daily payment reconciliation dashboard
- Cash position monitoring
- Discrepancy identification and resolution workflow
- Bank statement import and matching
- Virtual Account reconciliation
- Exception handling and manual adjustment

**Acceptance Scenarios**:
- **Scenario A — Daily Reconciliation Dashboard**: Given finance manager logs in at start of day, When accessing reconciliation dashboard, Then system displays yesterday's transactions summary, unmatched items, pending reconciliations, and cash position by account
- **Scenario B — Automated Payment Matching**: Given payments received via Virtual Accounts, When system processes bank file, Then payments are auto-matched to loans with 95%+ accuracy and unmatched items are flagged for manual review
- **Scenario C — Discrepancy Resolution**: Given a payment discrepancy is identified (amount mismatch, duplicate, or orphan), When finance analyst investigates, Then system provides transaction audit trail, allows adjustment entry, and requires supervisor approval for adjustments >$1,000
- **Scenario D — Cash Position Report**: Given end of business day, When finance manager requests cash position, Then system shows real-time balances across all accounts (operating, escrow, investor, collections) with intraday movement summary

**Non-Functional Constraints**:
- Reconciliation must complete within 2 hours of bank file receipt
- All adjustments require dual approval
- Audit trail for all reconciliation actions
- Support for multiple bank formats (BAI2, MT940, CSV)

---

### 22.2 US-LMS-012: Financial Reporting & GL Integration

**Business Goal**: Automate generation of financial reports and General Ledger entries to support accurate financial statements and regulatory reporting.

**Actors**: Finance Manager, Controller, System (Reporting Engine), External GL System

**Scope (In)**:
- Automated GL journal entry generation
- Interest accrual calculations
- Loan loss provisioning reports
- Regulatory financial reports (Call Report data)
- Month-end close support
- Portfolio aging and delinquency reports

**Acceptance Scenarios**:
- **Scenario A — Daily GL Entries**: Given end of day processing completes, When GL batch runs, Then system generates journal entries for: new disbursements, payments received, interest accrual, fee income, charge-offs, and entries are posted to GL with unique batch ID
- **Scenario B — Interest Accrual**: Given active loan portfolio, When daily accrual job runs, Then system calculates accrued interest for each loan using actual/360 or 30/360 method (per product config), updates accrued interest balance, and generates accrual GL entries
- **Scenario C — Loan Loss Provisioning**: Given portfolio aging data, When provisioning report is requested, Then system calculates CECL/ALLL reserves based on aging buckets, historical loss rates, and economic factors, with drill-down to loan level detail
- **Scenario D — Month-End Close**: Given last business day of month, When month-end close is initiated, Then system runs all accruals, generates trial balance, produces portfolio summary, and locks period for further transactions

**Non-Functional Constraints**:
- GL entries must balance (debits = credits)
- Support for multiple chart of accounts configurations
- Reports exportable to Excel and PDF
- Historical data retention for 7 years

---

### 22.3 US-LMS-013: Investor Accounting & Distributions

**Business Goal**: Manage investor capital accounts, calculate returns, and automate distribution of principal and interest to investors in marketplace lending model.

**Actors**: Finance Manager, Investor Accounting Specialist, Investor, System (Distribution Engine)

**Scope (In)**:
- Investor capital account management
- Pro-rata distribution calculations
- Return distribution processing (principal + interest)
- Investor statements and 1099 generation
- Loss allocation for defaulted loans
- Investor fee calculations

**Acceptance Scenarios**:
- **Scenario A — Payment Distribution**: Given borrower payment is received on a loan with multiple investors, When distribution job runs, Then system calculates pro-rata share for each investor, splits principal and interest correctly, and queues ACH credits to investor accounts
- **Scenario B — Monthly Investor Statement**: Given end of month, When statement generation runs, Then each investor receives statement showing: beginning balance, investments made, returns received, losses allocated, fees charged, ending balance, and YTD totals
- **Scenario C — Default Loss Allocation**: Given a loan is charged off, When loss allocation runs, Then system calculates each investor's pro-rata share of loss, adjusts investor capital accounts, and generates loss allocation notice
- **Scenario D — Annual 1099 Generation**: Given tax year end, When 1099 process runs, Then system generates 1099-INT for each investor with interest income >$10, supports electronic filing, and provides investor portal access to tax documents

**Non-Functional Constraints**:
- Distribution accuracy to 2 decimal places
- Investor capital accounts must reconcile to total portfolio
- Tax document generation by January 31
- Support for both individual and institutional investors

---

## 23. Operations Team User Stories

### 23.1 US-LMS-014: Operational Dashboard & Queue Management

**Business Goal**: Provide operations team with real-time visibility into work queues, SLA status, and team performance to ensure efficient loan processing.

**Actors**: Operations Manager, Loan Processor, Team Lead, System (Queue Manager)

**Scope (In)**:
- Real-time operational dashboard
- Work queue management and assignment
- SLA monitoring and alerting
- Team performance metrics
- Workload balancing
- Escalation management

**Acceptance Scenarios**:
- **Scenario A — Operations Dashboard**: Given operations manager accesses dashboard, When dashboard loads, Then system displays: total items in queue by type, SLA status (green/yellow/red), aging distribution, team utilization, and items requiring escalation
- **Scenario B — Queue Assignment**: Given new applications enter the system, When auto-assignment runs, Then system assigns items to processors based on: skill match, current workload, round-robin within skill group, and priority (VIP customers first)
- **Scenario C — SLA Breach Alert**: Given an item approaches SLA threshold (80% of time elapsed), When SLA monitor runs, Then system sends alert to assigned processor and team lead, escalates to supervisor if 100% elapsed, and logs SLA event for reporting
- **Scenario D — Workload Rebalancing**: Given one processor is overloaded (>30 items) while another is underutilized (<10 items), When operations manager initiates rebalance, Then system suggests items to transfer based on aging and complexity, and allows bulk reassignment

**Non-Functional Constraints**:
- Dashboard refresh every 30 seconds
- SLA checks every 5 minutes
- Support for 100+ concurrent processors
- Historical metrics retention for 2 years

---

### 23.2 US-LMS-015: Document Management & Verification

**Business Goal**: Enable operations team to manage loan documentation, verify submitted documents, and track document exceptions throughout the loan lifecycle.

**Actors**: Document Specialist, Loan Processor, Operations Manager, Borrower, System (Document Manager)

**Scope (In)**:
- Document checklist management by product/loan type
- Document upload and classification
- Automated document verification (OCR/AI)
- Exception tracking and follow-up
- Document request generation
- Secure document storage and retrieval

**Acceptance Scenarios**:
- **Scenario A — Document Checklist**: Given a loan application is submitted, When document review begins, Then system displays required documents for loan type (e.g., Income: W2, Pay Stubs; Identity: Driver's License, SSN Card; Assets: Bank Statements), with status for each
- **Scenario B — Automated Document Classification**: Given borrower uploads a document, When upload completes, Then system uses OCR/AI to classify document type with 90%+ accuracy, extracts key fields (name, date, amounts), and flags for manual review if confidence <85%
- **Scenario C — Document Exception**: Given a required document is missing or invalid, When document specialist creates exception, Then system generates borrower notification with specific requirements, tracks exception aging, and escalates if not resolved within 5 days
- **Scenario D — Stips Tracking**: Given underwriter requests additional stipulations, When stips are created, Then system tracks each stip with status (pending, received, approved, waived), due date, and responsible party, with automated borrower reminders

**Non-Functional Constraints**:
- Document storage encrypted at rest (AES-256)
- Support for PDF, JPG, PNG formats up to 10MB
- Document retention per regulatory requirements (7 years)
- HIPAA compliance for medical documents

---

### 23.3 US-LMS-016: Customer Service & Case Management

**Business Goal**: Enable operations team to handle customer inquiries, complaints, and service requests efficiently with full context and resolution tracking.

**Actors**: Customer Service Representative (CSR), Operations Manager, Borrower, Guarantor, Investor, System (Case Manager)

**Scope (In)**:
- Omnichannel case creation (phone, email, portal, chat)
- 360-degree customer view
- Case routing and assignment
- SLA-based escalation
- Resolution tracking and follow-up
- Customer satisfaction survey

**Acceptance Scenarios**:
- **Scenario A — Case Creation from Call**: Given borrower calls customer service, When CSR searches for borrower, Then system displays 360-view including: active loans, recent payments, open cases, communication history, and allows one-click case creation
- **Scenario B — Case Routing**: Given a new case is created, When case type is identified (payment issue, dispute, information request, complaint), Then system routes to appropriate queue based on case type, customer segment, and complexity
- **Scenario C — Complaint Handling**: Given a formal complaint is received, When complaint case is created, Then system triggers regulatory compliance workflow, assigns to senior handler, tracks 15-day resolution requirement, and escalates to compliance if unresolved
- **Scenario D — Case Resolution**: Given CSR resolves a case, When case is closed, Then system records resolution category, time to resolve, sends confirmation to customer, and triggers CSAT survey after 24 hours

**Non-Functional Constraints**:
- Case creation <30 seconds
- Full customer context load <3 seconds
- Complaint response within 15 business days (CFPB)
- All calls recorded and linked to cases

---

## 24. Additional Borrower User Stories

### 24.1 US-LMS-017: Borrower Communication Preferences & Notifications

**Business Goal**: Enable borrowers to manage their communication preferences and receive timely, relevant notifications through their preferred channels.

**Actors**: Borrower, System (Notification Engine), Communication Provider (SMS/Email)

**Scope (In)**:
- Communication preference management (email, SMS, push, mail)
- Notification subscription by category
- Payment reminders and due date alerts
- Account status notifications
- Promotional communication opt-in/out
- Quiet hours configuration

**Acceptance Scenarios**:
- **Scenario A — Set Preferences**: Given borrower accesses account settings, When updating communication preferences, Then borrower can select preferred channels for: payment reminders (SMS/Email/Both), account alerts (Email), marketing (opt-out default), and set quiet hours for non-urgent messages
- **Scenario B — Payment Reminder**: Given borrower's payment due date is 3 days away, When reminder job runs, Then system sends reminder via borrower's preferred channel with: amount due, due date, payment link, and payoff amount
- **Scenario C — Payment Confirmation**: Given borrower makes a payment, When payment is processed, Then system immediately sends confirmation via preferred channel with: confirmation number, amount, new balance, and next due date
- **Scenario D — Delinquency Alert**: Given borrower's payment is 1 day past due, When delinquency check runs, Then system sends urgent notification via all available channels with: amount past due, late fee warning, and payment options

**Non-Functional Constraints**:
- SMS delivery within 60 seconds
- Email delivery within 5 minutes
- TCPA compliance for SMS (consent required)
- Unsubscribe processing within 10 business days

---

### 24.2 US-LMS-018: Loan Modification & Hardship Programs

**Business Goal**: Enable borrowers experiencing financial hardship to request loan modifications and access hardship programs through self-service portal.

**Actors**: Borrower, Loan Modification Specialist, Collections Agent, System (Workout Engine)

**Scope (In)**:
- Hardship application submission
- Financial situation assessment
- Modification options calculation
- Forbearance and deferment programs
- Payment plan enrollment
- Modification agreement execution

**Acceptance Scenarios**:
- **Scenario A — Hardship Application**: Given borrower is experiencing financial hardship, When borrower accesses modification portal, Then system presents hardship application with: reason selection (job loss, medical, disaster), income/expense form, and document upload for verification
- **Scenario B — Modification Options**: Given hardship application is approved, When workout engine evaluates, Then system calculates available options: rate reduction, term extension, forbearance, or payment plan, with projected monthly payment and total cost for each
- **Scenario C — Forbearance Enrollment**: Given borrower selects forbearance option, When terms are accepted, Then system enrolls borrower in forbearance (up to 6 months), pauses collection activity, and schedules end-of-forbearance notification
- **Scenario D — Payment Plan Setup**: Given borrower cannot make full payment but can pay partial, When payment plan is configured, Then system creates repayment schedule to cure delinquency over 3-12 months, auto-schedules payments, and updates loan status

**Non-Functional Constraints**:
- Hardship decision within 30 days
- Modified loans tracked separately for reporting
- Modification history retained indefinitely
- Compliance with CARES Act provisions

---

## 25. Additional Investor User Stories

### 25.1 US-LMS-019: Investor Risk Analytics & Portfolio Monitoring

**Business Goal**: Provide investors with advanced analytics and risk monitoring tools to make informed investment decisions and track portfolio health.

**Actors**: Investor, System (Analytics Engine), Risk Manager

**Scope (In)**:
- Portfolio risk metrics dashboard
- Loan-level performance tracking
- Delinquency and default prediction
- Diversification analysis
- Benchmark comparison
- Custom alert configuration

**Acceptance Scenarios**:
- **Scenario A — Risk Dashboard**: Given investor accesses analytics portal, When dashboard loads, Then system displays: portfolio weighted average credit score, geographic concentration, vintage analysis, current delinquency rate, projected loss rate, and comparison to platform average
- **Scenario B — Early Warning Alerts**: Given investor configures risk alerts, When a loan in portfolio shows early warning signs (payment pattern change, credit score drop), Then system sends alert with loan details and recommended action
- **Scenario C — Vintage Analysis**: Given investor wants to analyze performance by origination period, When vintage report is requested, Then system shows cumulative default curves by vintage with 12/24/36 month loss rates and comparison to benchmark
- **Scenario D — Diversification Score**: Given investor's portfolio is concentrated in certain risk buckets, When diversification analysis runs, Then system calculates diversification score (0-100), identifies concentration risks, and suggests rebalancing opportunities

**Non-Functional Constraints**:
- Analytics refresh daily (overnight batch)
- Historical data available for 5 years
- Export to CSV/Excel for further analysis
- Mobile-responsive analytics dashboard

---

### 25.2 US-LMS-020: Secondary Market & Loan Trading

**Business Goal**: Enable investors to sell loan participations on secondary market and facilitate price discovery and settlement for loan trades.

**Actors**: Investor (Seller), Investor (Buyer), System (Trading Engine), Settlement System

**Scope (In)**:
- Loan listing for sale
- Bid/Ask pricing mechanism
- Trade matching and execution
- Settlement processing
- Transfer of ownership records
- Trading history and P&L tracking

**Acceptance Scenarios**:
- **Scenario A — List Loan for Sale**: Given investor wants to liquidate a loan position, When creating sell order, Then system displays current market price (if available), allows setting ask price (premium/discount to par), and lists position on marketplace
- **Scenario B — Purchase Loan**: Given buyer searches available loans, When buyer places bid on listed loan, Then system validates buyer has sufficient funds, records bid, and notifies seller of offer
- **Scenario C — Trade Execution**: Given bid meets ask price, When trade is matched, Then system locks positions, initiates settlement (T+1), transfers ownership in loan records, and moves funds between investor accounts
- **Scenario D — P&L Tracking**: Given investor has completed trades, When accessing trading history, Then system shows: purchase price, sale price, realized gain/loss, holding period, and tax lot tracking for each position

**Non-Functional Constraints**:
- Trade execution <5 seconds
- Settlement T+1 (next business day)
- Price updates every 15 minutes during market hours
- Minimum trade size $1,000

---

## 26. Additional Guarantor User Stories

### 26.1 US-LMS-021: Guarantor Release & Substitution

**Business Goal**: Enable guarantors to request release from guarantee obligation when conditions are met, or facilitate substitution with a new guarantor.

**Actors**: Guarantor (Original), Guarantor (Substitute), Borrower, Credit Officer, System (Guarantee Manager)

**Scope (In)**:
- Guarantor release eligibility check
- Release request submission
- Substitute guarantor nomination
- Credit evaluation of substitute
- Release agreement execution
- Guarantee transfer processing

**Acceptance Scenarios**:
- **Scenario A — Release Eligibility Check**: Given guarantor wants to be released, When accessing guarantee portal, Then system evaluates eligibility based on: loan payment history (12+ on-time payments), current LTV ratio (<80%), borrower credit score improvement (>50 points), and displays eligibility status
- **Scenario B — Release Request**: Given guarantor meets release criteria, When release request is submitted, Then system creates release case, routes to credit officer for review, and notifies borrower of pending change
- **Scenario C — Substitute Guarantor**: Given original guarantor nominates substitute, When substitute completes registration and verification, Then system evaluates substitute's guarantee capacity, compares to original, and presents recommendation to credit officer
- **Scenario D — Guarantee Transfer**: Given credit officer approves substitution, When transfer is initiated, Then system generates release agreement for original guarantor, guarantee agreement for substitute, collects e-signatures from all parties, and updates loan guarantee records

**Non-Functional Constraints**:
- Release decision within 15 business days
- Substitute must meet original guarantee capacity requirements
- All guarantee changes logged in audit trail
- Notifications to all parties at each step

---

## 27. End-to-End User Flows

### 27.1 Complete Loan Application Flow

```
1. Borrower Registration (US-LMS-001)
   ↓
2. KYC/AML Verification
   ├── Pass → Continue
   └── Fail → Manual Review → Resolve or Reject
   ↓
3. Loan Application Submission (US-LMS-002)
   ↓
4. Credit Bureau Pull
   ↓
5. Automated Credit Decision (US-LMS-003)
   ├── Auto-Approve → Generate Offers
   ├── Auto-Decline → Adverse Action Notice → END
   └── Refer → Manual Review
       ├── Approve → Generate Offers
       ├── Request Docs → Pause
       └── Decline → Adverse Action Notice → END
   ↓
6. Loan Offers & Signing (US-LMS-004)
   ↓
7. Disbursement
   ↓
8. Loan Active → Servicing (US-LMS-005)
```

### 27.2 Guarantor Flow

```
1. Loan Application Requires Guarantor
   ↓
2. Guarantor Registration (US-LMS-007)
   ↓
3. Guarantor KYC/AML & Financial Assessment
   ↓
4. Guarantee Agreement Execution
   ↓
5. Loan Proceeds (if borrower approved)
   ↓
6. Guarantor Portal Access (US-LMS-008)
   ↓
7. Monitor Loan Status
   ├── Loan Performing → No Action
   ├── Loan Defaults (DPD ≥ 90) → Guarantee Activation
   │   ↓
   │   Guarantor Payment → Loan Satisfied
   └── Guarantor Release Request (US-LMS-021)
       ├── Eligible → Release Processed
       └── Substitute → New Guarantor Onboarded
```

### 27.3 Investor Flow

```
1. Investor Registration (US-LMS-009)
   ↓
2. Accreditation Verification
   ↓
3. Investment Preference Configuration
   ↓
4. Loan Funding (US-LMS-010)
   ├── Auto-Allocation (if enabled)
   └── Manual Selection
   ↓
5. Loan Active → Monitor Portfolio (US-LMS-019)
   ├── Risk Analytics Dashboard
   └── Early Warning Alerts
   ↓
6. Borrower Makes Payments → Returns Distributed
   ↓
7. Options:
   ├── Hold to Maturity → Loan Paid Off → Final Returns
   └── Secondary Market (US-LMS-020) → Sell Position
```

### 27.4 Finance Team Flow

```
1. Daily Operations Start
   ↓
2. Bank File Import
   ↓
3. Automated Payment Matching (US-LMS-011)
   ├── Matched → Post to Loans
   └── Unmatched → Exception Queue → Manual Resolution
   ↓
4. Daily GL Entries (US-LMS-012)
   ├── Disbursements
   ├── Payments
   ├── Interest Accrual
   └── Fee Income
   ↓
5. Cash Position Report
   ↓
6. Investor Distributions (US-LMS-013)
   ├── Calculate Pro-Rata Shares
   ├── Queue ACH Credits
   └── Update Investor Accounts
   ↓
7. Month-End Close (if applicable)
   ├── Run Accruals
   ├── Generate Trial Balance
   └── Lock Period
```

### 27.5 Operations Team Flow

```
1. Work Queue Population (US-LMS-014)
   ├── New Applications
   ├── Document Exceptions
   ├── Customer Cases
   └── Escalations
   ↓
2. Auto-Assignment by Skill/Workload
   ↓
3. Document Processing (US-LMS-015)
   ├── Upload/Classification
   ├── OCR Verification
   ├── Stips Tracking
   └── Exception Resolution
   ↓
4. Customer Service (US-LMS-016)
   ├── Case Creation
   ├── 360° Customer View
   ├── Resolution
   └── CSAT Survey
   ↓
5. SLA Monitoring
   ├── Green → Continue Processing
   ├── Yellow → Alert Processor
   └── Red → Escalate to Supervisor
   ↓
6. End of Day Metrics
   ├── Items Processed
   ├── SLA Compliance
   └── Team Performance
```

### 27.6 Borrower Hardship Flow

```
1. Borrower Experiences Financial Hardship
   ↓
2. Access Hardship Portal (US-LMS-018)
   ↓
3. Submit Hardship Application
   ├── Reason Selection
   ├── Financial Documentation
   └── Income/Expense Form
   ↓
4. Workout Engine Evaluation
   ↓
5. Modification Options Presented
   ├── Rate Reduction
   ├── Term Extension
   ├── Forbearance
   └── Payment Plan
   ↓
6. Borrower Selects Option
   ↓
7. Agreement Execution
   ↓
8. Loan Modified → Resume Servicing
```

---

## 28. User Stories Summary by Role

| Role | User Stories | Count |
|------|-------------|-------|
| **Borrower** | US-LMS-001, 002, 003, 004, 005, 017, 018 | 7 |
| **Guarantor** | US-LMS-007, 008, 021 | 3 |
| **Investor** | US-LMS-009, 010, 019, 020 | 4 |
| **Finance Team** | US-LMS-011, 012, 013 | 3 |
| **Operations Team** | US-LMS-014, 015, 016 | 3 |
| **Compliance** | US-LMS-006 | 1 |
| **Total** | | **21** |

**Page 75 of [TOTAL] | CONFIDENTIAL**

