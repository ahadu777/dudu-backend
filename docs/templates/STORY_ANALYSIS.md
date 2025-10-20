# Story Analysis Template

This template guides fresh AI through analyzing user stories and breaking them down into implementable technical cards.

## Story Analysis Process

### 1. Story Understanding
**Input:** Raw user story (e.g., "I want users to be able to cancel their tickets and get a refund")

**Questions to Answer:**
- Who are the actors? (buyers, operators, admins)
- What is the core business goal?
- What are the expected outcomes?
- What are the constraints or limitations?

**Template:**
```
## Story: [TITLE]
**As a** [ACTOR]
**I want** [CAPABILITY]
**So that** [BUSINESS VALUE]

**Acceptance Criteria:**
- [ ] [Specific testable outcome 1]
- [ ] [Specific testable outcome 2]
- [ ] [Specific testable outcome 3]
```

### 2. Business Rules Extraction

**Questions to Answer:**
- What are the business constraints? (timing, permissions, limits)
- What are the validation rules?
- What are the error scenarios?
- What are the audit/compliance requirements?

**Template:**
```
## Business Rules
1. **Timing Rules:** When can this action be performed?
2. **Permission Rules:** Who can perform this action?
3. **Validation Rules:** What makes a request valid/invalid?
4. **State Rules:** What state changes occur?
5. **Audit Rules:** What needs to be logged/tracked?
```

### 3. API Design Planning

**Questions to Answer:**
- What HTTP endpoints are needed?
- What are the request/response formats?
- What status codes should be returned?
- What authentication is required?

**Template:**
```
## API Endpoints Needed
- **POST** /[resource]/[action] - [Purpose]
  - Request: { field1, field2 }
  - Response: { result, data }
  - Errors: 400, 401, 404, 409, 422

- **GET** /[resource] - [Purpose]
  - Query params: filter, pagination
  - Response: { items[], total, pagination }
```

### 4. Data Impact Analysis

**Questions to Answer:**
- What database tables are affected?
- What new fields or tables are needed?
- What are the data relationships?
- What are the performance considerations?

**Template:**
```
## Data Changes
### Existing Tables Modified:
- **[table_name]**: Add fields [field1, field2]
- **[table_name]**: Modify constraints on [field]

### New Tables Required:
- **[new_table]**: Purpose and relationships

### Migration Requirements:
- Backfill existing data? Y/N
- Breaking changes? Y/N
- Performance impact? High/Medium/Low
```

### 5. Integration Touchpoints

**Questions to Answer:**
- What existing APIs/services are affected?
- What notifications or events should be triggered?
- What external integrations are needed?
- What frontend changes are required?

**Template:**
```
## Integration Impact
### Existing Cards Affected:
- [card-slug]: Modifications needed
- [card-slug]: New dependency

### New Integration Points:
- Payment gateway (for refunds)
- Email notifications
- Audit logging
- Frontend state management
```

### 6. Story Breakdown into Cards

**Process:**
1. Group related functionality into logical units
2. Each card should be independently implementable
3. Cards should follow existing naming patterns
4. Consider dependencies between cards

**Template:**
```
## Proposed Cards
1. **[card-slug-1]**: [Purpose]
   - **Team**: [A/B/C]
   - **Endpoints**: [list]
   - **Dependencies**: [existing cards]

2. **[card-slug-2]**: [Purpose]
   - **Team**: [A/B/C]
   - **Endpoints**: [list]
   - **Dependencies**: [cards from this story]
```

## Example: Ticket Cancellation Story

### Input Story
"I want users to be able to cancel their tickets and get a refund"

### Analysis Output

#### 1. Story Understanding
```
## Story: Ticket Cancellation and Refund
**As a** ticket buyer
**I want** to cancel my unused tickets and receive a refund
**So that** I don't lose money when I can't use purchased tickets

**Acceptance Criteria:**
- [ ] Users can cancel tickets before any redemptions
- [ ] Refund amount is calculated based on cancellation policy
- [ ] Order status is updated to reflect cancellation
- [ ] Payment is reversed through original payment method
- [ ] Users receive confirmation of cancellation and refund
```

#### 2. Business Rules
```
## Business Rules
1. **Timing Rules:** Tickets can only be cancelled before any redemptions occur
2. **Permission Rules:** Only the original purchaser can cancel their tickets
3. **Validation Rules:** Full refund if >24h before validity, 50% if <24h, 0% if expired
4. **State Rules:** Ticket status: active → cancelled, Order status: paid → partially_refunded/refunded
5. **Audit Rules:** Log all cancellation attempts with timestamp, reason, and refund amount
```

#### 3. API Design
```
## API Endpoints Needed
- **POST** /tickets/{ticket_code}/cancel - Cancel specific ticket
  - Request: { reason?, notify_user? }
  - Response: { ticket_status, refund_amount, refund_id }
  - Errors: 400, 401, 404, 409, 422

- **GET** /my/cancellations - List user's cancellations
  - Response: { cancellations[], total_refunds }
```

#### 4. Data Impact
```
## Data Changes
### Existing Tables Modified:
- **tickets**: Add cancelled_at, cancellation_reason fields
- **orders**: Add refund_amount, refund_status fields

### New Tables Required:
- **cancellations**: Track cancellation events and refund details

### Migration Requirements:
- Backfill existing data? No
- Breaking changes? No
- Performance impact? Low
```

#### 5. Integration Impact
```
## Integration Impact
### Existing Cards Affected:
- my-tickets: Show cancellation option and status
- payment-webhook: Handle refund confirmations

### New Integration Points:
- Payment gateway refund API
- Email notification service
- Audit logging system
```

#### 6. Proposed Cards
```
## Proposed Cards
1. **ticket-cancellation**: Core cancellation logic
   - **Team**: B - Fulfillment
   - **Endpoints**: POST /tickets/{code}/cancel
   - **Dependencies**: my-tickets

2. **refund-processing**: Payment refund handling
   - **Team**: A - Commerce
   - **Endpoints**: Internal refund service calls
   - **Dependencies**: payment-webhook, ticket-cancellation

3. **cancellation-policies**: Business rules and validation
   - **Team**: B - Fulfillment
   - **Endpoints**: GET /cancellation-policies (for frontend)
   - **Dependencies**: None
```

## Usage for Fresh AI

1. **Read the user story** and apply this template systematically
2. **Fill out each section** based on context and existing patterns
3. **Review existing cards** to understand naming and responsibility patterns
4. **Create cards** using the Card Generation Template
5. **Implement cards** using existing proven workflow
6. **Create integration proof** following established patterns

This systematic approach ensures fresh AI can handle any user story → implementation flow autonomously.