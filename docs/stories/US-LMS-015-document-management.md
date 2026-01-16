---
id: US-LMS-015
title: "Document Management & Verification"
owner: Product
status: "Draft"
priority: High
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-002"]
enhances: ["US-LMS-002", "US-LMS-003"]
cards: []
---

# US-LMS-015: Document Management & Verification

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Document Specialist / Loan Processor
**I want to** manage loan documentation and verify submitted documents efficiently
**So that** I can ensure all required documents are collected, valid, and compliant before loan decisions are made

---

## Scope

### In Scope
- Document checklist management by product/loan type
- Document upload and storage
- Automated document classification (OCR/AI)
- Document verification workflow
- Exception tracking and follow-up
- Document request generation
- Stipulation (stips) tracking
- Secure document storage and retrieval

### Out of Scope
- Automated income/employment verification via third party (Phase 2)
- Document fraud detection AI (Phase 2)
- Bulk document processing (Phase 2)
- E-signature collection (covered in US-LMS-004)

---

## Acceptance Criteria

### A. Document Checklist
- **Given** a loan application is submitted
- **When** document review begins
- **Then** system displays required documents for loan type:
  - Identity: Driver's License, SSN Card, Passport
  - Income: W2 (2 years), Pay Stubs (2 months), Tax Returns
  - Assets: Bank Statements (2 months)
  - Other: Based on product requirements
- **And** shows status for each (pending, received, approved, rejected)

### B. Document Upload
- **Given** borrower or processor needs to upload document
- **When** document is uploaded
- **Then** system accepts PDF, JPG, PNG formats up to 10MB
- **And** stores document securely (encrypted at rest)
- **And** associates document with loan application
- **And** triggers classification workflow

### C. Automated Document Classification
- **Given** borrower uploads a document
- **When** upload completes
- **Then** system uses OCR/AI to classify document type
- **And** achieves 90%+ accuracy on standard documents
- **And** extracts key fields (name, date, amounts)
- **And** flags for manual review if confidence <85%

### D. Document Verification
- **Given** document is classified and ready for review
- **When** document specialist reviews document
- **Then** can verify document against checklist requirements
- **And** can mark as: Approved, Rejected (with reason), Needs Clarification
- **And** rejected documents trigger borrower notification

### E. Document Exception
- **Given** a required document is missing or invalid
- **When** document specialist creates exception
- **Then** system generates borrower notification with specific requirements
- **And** tracks exception aging
- **And** sends automated reminders at 3 and 5 days
- **And** escalates to processor if not resolved within 5 days

### F. Stipulation Tracking
- **Given** underwriter requests additional stipulations
- **When** stips are created
- **Then** system tracks each stip with:
  - Status (pending, received, approved, waived)
  - Due date
  - Responsible party
  - Notes/comments
- **And** sends automated borrower reminders
- **And** blocks loan progression until stips cleared or waived

### G. Document Request Generation
- **Given** documents are missing or need replacement
- **When** processor generates document request
- **Then** system creates request letter/email
- **And** specifies exact documents needed
- **And** provides upload instructions
- **And** sets due date for response

### H. Document Retrieval
- **Given** authorized user needs to view document
- **When** user requests document
- **Then** system verifies user has appropriate permissions
- **And** displays document in secure viewer
- **And** logs access for audit

---

## Business Rules

1. **Document Requirements by Product**
   - Personal Loan: ID, Income (2 docs), Bank Statement
   - Mortgage: ID, Income (4 docs), Assets, Property Docs
   - Business: ID, Business Docs, Financials, Tax Returns

2. **Document Expiration**
   - Pay Stubs: Valid for 30 days from date
   - Bank Statements: Valid for 60 days
   - Tax Returns: Current or prior year only
   - ID: Must not be expired

3. **Classification Confidence Thresholds**
   - >90%: Auto-classify and route
   - 85-90%: Auto-classify, flag for review
   - <85%: Manual classification required

4. **Stip Priorities**
   - Critical: Must have before decision
   - Standard: Must have before closing
   - Post-Close: Can fund, collect after

5. **Document Retention**
   - Active loans: Documents retained throughout life
   - Closed loans: 7 years after payoff
   - Declined applications: 2 years
   - HIPAA documents: Per medical record retention rules

6. **Access Controls**
   - Processor: View/upload/verify documents
   - Underwriter: View/approve/reject documents
   - Borrower: View own documents, upload new
   - Compliance: View all, cannot modify

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Document upload service |
| TBD | Draft | OCR classification engine |
| TBD | Draft | Document verification workflow |
| TBD | Draft | Stips management |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-002 | Documents collected during application |
| US-LMS-003 | Documents reviewed during decision |

---

## Non-Functional Requirements

- Document storage encrypted at rest (AES-256)
- Support for PDF, JPG, PNG formats up to 10MB
- Document retention per regulatory requirements (7 years)
- HIPAA compliance for medical documents
- OCR classification <10 seconds per document
- Document viewer load time <2 seconds
