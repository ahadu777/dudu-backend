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

## 22. End-to-End User Flows

### 22.1 Complete Loan Application Flow

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

### 22.2 Guarantor Flow

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
   └── Loan Defaults (DPD ≥ 90) → Guarantee Activation
       ↓
       Guarantor Payment → Loan Satisfied
```

### 22.3 Investor Flow

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
5. Loan Active → Monitor Portfolio
   ↓
6. Borrower Makes Payments → Returns Distributed
   ↓
7. Loan Paid Off → Final Returns → Investment Closed
```

**Page 55 of [TOTAL] | CONFIDENTIAL**

