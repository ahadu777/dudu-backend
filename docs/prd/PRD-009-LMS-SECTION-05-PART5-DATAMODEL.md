# PART 5: DATA MODEL & SYSTEM ARCHITECTURE

**Page 56 of [TOTAL] | CONFIDENTIAL**

---

## 23. Core Data Model

### 23.1 Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Borrower** | Individual or business applicant | borrower_id, ssn_hash, name, dob, address, contact, kyc_status, aml_status, status |
| **Application** | Loan application record | application_id, borrower_id, product_id, status, submitted_at, decision_at, amount_requested, term_requested |
| **Loan** | Active loan account | loan_id, application_id, principal, rate, term, status, disbursed_at, maturity_date |
| **Payment** | Payment transaction | payment_id, loan_id, amount, type, status, effective_date, principal_applied, interest_applied |
| **Document** | Uploaded/generated document | document_id, entity_type, entity_id, doc_type, storage_ref, uploaded_at, verified |
| **Decision** | Credit decision record | decision_id, application_id, outcome, reason_codes, model_version, decision_at, decision_type |
| **CreditReport** | Credit bureau data | report_id, application_id, bureau, scores, tradelines, utilization, derogatories, pull_date |
| **AuditLog** | Immutable audit entry | log_id, entity_type, entity_id, action, actor_id, timestamp, delta, ip_address |
| **Guarantor** | Guarantor record | guarantor_id, borrower_id, loan_id, relationship_type, status, kyc_status, aml_status |
| **Guarantee** | Guarantee agreement | guarantee_id, loan_id, guarantor_id, guarantee_amount, guarantee_type, status, executed_at |
| **Investor** | Investor record | investor_id, investor_type, accreditation_status, total_capital, available_capital, status |
| **Investment** | Investment in a loan | investment_id, investor_id, loan_id, investment_amount, allocation_date, status |
| **ReturnDistribution** | Payment to investor | distribution_id, investment_id, principal_amount, interest_amount, distribution_date |

### 23.2 Entity Relationships

```
Borrower (1) ─────────────< (N) Application
Application (1) ──────────< (1) Loan
Loan (1) ─────────────────< (N) Payment
Loan (1) ─────────────────< (N) Document
Application (1) ──────────< (N) Decision
Application (1) ──────────< (1) CreditReport
* (1) ────────────────────< (N) AuditLog

Borrower (1) ─────────────────< (N) Guarantor
Loan (1) ─────────────────────< (N) Guarantee
Guarantee (1) ─────────────────< (1) GuaranteeActivation

Investor (1) ─────────────────< (N) Investment
Loan (1) ─────────────────────< (N) Investment
Investment (1) ────────────────< (N) ReturnDistribution
Investor (1) ─────────────────< (1) InvestorPreference
```

### 23.3 Key Enumerations

**Borrower Status**:
- `PENDING_KYC` - Awaiting identity verification
- `KYC_FAILED` - Identity verification failed
- `PENDING_REVIEW` - Requires manual review
- `VERIFIED` - Verified and eligible to apply

**Application Status**:
- `DRAFT` - Application in progress
- `SUBMITTED` - Application submitted
- `CREDIT_PULLED` - Credit report retrieved
- `CREDIT_PULL_FAILED` - Credit pull failed
- `PENDING_REVIEW` - Referred for manual review
- `APPROVED` - Application approved
- `DECLINED` - Application declined
- `CANCELLED` - Application cancelled

**Loan Status**:
- `APPROVED` - Loan approved, awaiting signing
- `OFFER_SELECTED` - Borrower selected offer
- `DOCUMENTS_SIGNED` - Contracts signed
- `DISBURSED` - Funds disbursed
- `ACTIVE` - Loan active and performing
- `DELINQUENT` - Past due
- `DEFAULTED` - In default
- `PAID_OFF` - Loan fully repaid
- `CHARGED_OFF` - Written off

**Decision Outcome**:
- `APPROVED` - Application approved
- `DECLINED` - Application declined
- `REFERRED` - Referred for manual review

**Decision Type**:
- `AUTO` - Automated decision
- `MANUAL` - Manual decision by credit officer

**Payment Status**:
- `PENDING` - Payment initiated, pending processing
- `POSTED` - Payment successfully posted
- `FAILED` - Payment failed
- `CANCELLED` - Payment cancelled

---

## 24. Loan State Machine

```
                    ┌─────────────┐
                    │  SUBMITTED  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ APPROVED │  │ DECLINED │  │  PENDING │
       └────┬─────┘  └──────────┘  │  REVIEW  │
            │                      └────┬─────┘
            │                           │
            ▼                           ▼
     ┌────────────┐              ┌──────────────┐
     │ DOCS_SENT  │              │ DOCS_REQUIRED│
     └─────┬──────┘              └──────────────┘
           │
           ▼
     ┌────────────┐
     │   SIGNED   │
     └─────┬──────┘
           │
           ▼
     ┌────────────┐
     │ DISBURSED  │
     └─────┬──────┘
           │
           ▼
     ┌────────────┐
     │   ACTIVE   │◄────────────────────────────┐
     └─────┬──────┘                             │
           │                                    │
     ┌─────┼──────────────┐                    │
     ▼     ▼              ▼                    │
┌────────┐ ┌──────────┐ ┌────────────┐        │
│  PAID  │ │DELINQUENT│ │ DEFAULTED  │        │
│  OFF   │ └────┬─────┘ └─────┬──────┘        │
└────────┘      │             │               │
                │             ▼               │
                │      ┌────────────┐         │
                │      │CHARGED_OFF │         │
                │      └────────────┘         │
                │                             │
                └─────────────────────────────┘
                      (cured)
```

---

## 25. Virtual Account Architecture

### 25.1 Overview

To enable scale and accuracy, the LMS adopts a **Virtual Account (VA) model** for automated repayment reconciliation.

### 25.2 Architecture Components

**Master Account**:
- One physical bank account owned by the lender
- Receives all repayments from borrowers

**Borrower Virtual Accounts**:
- Each borrower is assigned a unique VA number
- All repayments flow through this identifier
- Format: [BANK_CODE][BORROWER_ID][CHECK_DIGIT]

**Automated Reconciliation**:
- Payments are matched automatically using:
  - Real-time banking APIs (e.g., ZA Bank)
  - Daily CSV imports from banking partners
  - Payment reference matching (VA number, borrower ID)

**Strategic Benefit**: Eliminates manual bank statement matching and reduces reconciliation errors to near zero.

### 25.3 Reconciliation Flow

```
1. Borrower makes payment to their Virtual Account
   ↓
2. Payment appears in Master Account (with VA reference)
   ↓
3. System matches payment to borrower using VA number
   ↓
4. Payment is automatically applied to loan
   ↓
5. Borrower receives confirmation
   ↓
6. Loan balance updated in real-time
```

---

## 26. Data Retention & Archival

### 26.1 Retention Policies

| Data Type | Retention Period | Legal Hold Support |
|-----------|------------------|-------------------|
| Loan Records | 7 years after loan closure | Yes |
| Application Records | 7 years after application | Yes |
| Payment Records | 7 years after payment | Yes |
| Credit Reports | 7 years | Yes |
| Audit Logs | 7 years minimum | Yes |
| Documents | 7 years | Yes |
| Communication Records | 3 years | Yes |

### 26.2 Archival Strategy

- **Hot Storage**: Active loans and recent data (PostgreSQL)
- **Warm Storage**: Closed loans < 2 years (PostgreSQL archive tables)
- **Cold Storage**: Closed loans > 2 years (S3/Blob with Glacier)
- **Search Index**: Maintained for 7 years (Elasticsearch)

---

## 27. Data Privacy & Protection

### 27.1 PII Handling

**Encryption**:
- SSN: AES-256 encryption at rest, tokenized in logs
- Bank Account Numbers: Encrypted at rest, masked in UI
- Credit Reports: Encrypted at rest, access logged

**Access Controls**:
- Role-based access to PII
- Audit log for all PII access
- Data masking in non-production environments

**Data Minimization**:
- Collect only required fields
- Purge unnecessary data after retention period
- Anonymize data for analytics

### 27.2 GDPR Compliance

**Rights Support**:
- Right to access: Export borrower data
- Right to rectification: Update borrower information
- Right to erasure: Delete borrower data (with restrictions)
- Right to portability: Export data in machine-readable format

**Consent Management**:
- Track consent for data processing
- Allow withdrawal of consent
- Document consent history

**Page 70 of [TOTAL] | CONFIDENTIAL**

