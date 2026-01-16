---
id: US-LMS-016
title: "Customer Service & Case Management"
owner: Product
status: "Draft"
priority: High
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-005"]
enhances: ["US-LMS-005", "US-LMS-008", "US-LMS-010"]
cards: []
---

# US-LMS-016: Customer Service & Case Management

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Customer Service Representative (CSR)
**I want to** handle customer inquiries and service requests efficiently with full context
**So that** I can resolve issues quickly, maintain customer satisfaction, and ensure proper tracking of all interactions

---

## Scope

### In Scope
- Omnichannel case creation (phone, email, portal, chat)
- 360-degree customer view
- Case routing and assignment
- SLA-based escalation
- Resolution tracking and follow-up
- Customer satisfaction (CSAT) survey
- Case notes and history
- Knowledge base integration

### Out of Scope
- AI chatbot for self-service (Phase 2)
- Social media channel integration (Phase 2)
- Predictive case routing (Phase 2)
- Automated resolution suggestions (Phase 2)

---

## Acceptance Criteria

### A. Case Creation from Call
- **Given** borrower/guarantor/investor calls customer service
- **When** CSR searches for customer
- **Then** system displays 360-degree view including:
  - Active loans/guarantees/investments
  - Recent payments/transactions
  - Open cases
  - Communication history (last 10 interactions)
- **And** allows one-click case creation with pre-populated customer info

### B. Case Routing
- **Given** a new case is created
- **When** case type is identified
- **Then** system routes to appropriate queue based on:
  - Case type (payment issue, dispute, information request, complaint)
  - Customer segment (standard, VIP, institutional)
  - Complexity (simple, moderate, complex)
- **And** assigns SLA based on case type and priority

### C. Complaint Handling
- **Given** a formal complaint is received
- **When** complaint case is created
- **Then** system triggers regulatory compliance workflow
- **And** assigns to senior handler
- **And** tracks 15-day resolution requirement (CFPB)
- **And** escalates to compliance if unresolved by day 10
- **And** generates required response letter

### D. Case Resolution
- **Given** CSR resolves a case
- **When** case is closed
- **Then** system requires:
  - Resolution category selection
  - Resolution notes
- **And** records time to resolve
- **And** sends confirmation to customer
- **And** triggers CSAT survey after 24 hours

### E. 360-Degree Customer View
- **Given** CSR opens customer record
- **When** view loads
- **Then** system shows single page with:
  - Customer profile (name, contact, preferences)
  - All accounts (loans, guarantees, investments)
  - Recent activity timeline
  - Open cases
  - Communication preferences
  - Risk flags (delinquent, fraud alert, etc.)

### F. Case Notes
- **Given** CSR is working on a case
- **When** adding notes to case
- **Then** notes are timestamped with CSR ID
- **And** can be marked as internal-only or customer-visible
- **And** previous notes are visible in chronological order
- **And** notes searchable for future reference

### G. Case Transfer/Escalation
- **Given** CSR cannot resolve case
- **When** CSR transfers or escalates
- **Then** can select target queue or specific handler
- **And** must provide reason for transfer
- **And** all case history transfers with case
- **And** new handler is notified

### H. CSAT Survey
- **Given** case is resolved
- **When** 24 hours have elapsed
- **Then** system sends survey to customer via email
- **And** survey asks: overall satisfaction (1-5), was issue resolved (Y/N), comments
- **And** responses linked to case record
- **And** low scores trigger supervisor review

---

## Business Rules

1. **Case SLAs by Type**
   - Information Request: 24 hours
   - Payment Issue: 4 hours
   - Dispute: 48 hours
   - Complaint (formal): 15 business days
   - Urgent (marked by customer): 2 hours

2. **Case Priority**
   - P1 (Critical): System outage, fraud, imminent default
   - P2 (High): Complaints, payment failures
   - P3 (Medium): Standard inquiries
   - P4 (Low): General questions

3. **Complaint Classification**
   - Formal Complaint: Written statement of dissatisfaction requiring response
   - Inquiry: Question or request for information
   - Feedback: Suggestion or comment (no response required)

4. **Resolution Categories**
   - Resolved - Customer Satisfied
   - Resolved - Policy Explained
   - Resolved - Adjustment Made
   - Resolved - Escalated to Management
   - Not Resolved - Pending Customer Action
   - Not Resolved - Referred to Other Department

5. **Communication Preferences**
   - Respect customer channel preference when responding
   - Complaints require written response regardless of preference
   - Do not call during quiet hours (9PM - 9AM)

6. **Data Access**
   - CSR can view but not modify loan terms
   - Payment adjustments require supervisor approval
   - PII masking on screen (show last 4 only)

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Case management service |
| TBD | Draft | Customer 360 view UI |
| TBD | Draft | CSAT survey integration |
| TBD | Draft | Complaint workflow |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-005 | Borrower cases tracked and resolved |
| US-LMS-008 | Guarantor inquiries handled |
| US-LMS-010 | Investor support provided |

---

## Non-Functional Requirements

- Case creation <30 seconds
- Full customer context load <3 seconds
- Complaint response within 15 business days (CFPB)
- All calls recorded and linked to cases
- Case history retention for 7 years
- Support for 200+ concurrent CSRs
