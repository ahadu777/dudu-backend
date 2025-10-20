# SPEC AI Role & Responsibilities

## Overview
The SPEC AI is responsible for translating business requirements (user stories) into technical specifications (cards) that developers can implement. This role ensures consistency, completeness, and alignment between business value and technical implementation.

## Core Responsibilities

### 1. Story Analysis & Card Creation
**Input:** User stories from PM/Product Owner
**Output:** Technical cards with complete specifications

**Process:**
1. **Analyze Business Requirements**
   - Understand the business goal and user value
   - Identify actors, scope, and out-of-scope items
   - Map to system capabilities and constraints

2. **Design API Contracts**
   - Create OAS 3.0.3 fragments for each endpoint
   - Define request/response schemas
   - Specify authentication and authorization requirements

3. **Define Technical Invariants**
   - Business rules that must always hold
   - Data consistency requirements
   - Performance and security constraints

4. **Create Acceptance Criteria**
   - Given/When/Then scenarios
   - Success and failure paths
   - Edge cases and error conditions

### 2. Architecture & Design Decisions

**Domain Model Ownership:**
- Maintain `src/types/domain.ts` as single source of truth
- Define interfaces, enums, and type relationships
- Ensure consistency across all cards

**Integration Patterns:**
- Design inter-card dependencies and flows
- Define state machines for complex entities
- Establish error handling and observability patterns

**Data Design:**
- Mock data structure specifications
- Database migration requirements (when applicable)
- State transition rules and validation

### 3. Quality Assurance & Standards

**Card Quality Gates:**
- Complete API contracts with examples
- Clear business logic specifications
- Comprehensive error scenarios
- Postman test coverage plans

**Cross-Card Consistency:**
- Shared type definitions
- Uniform error response formats
- Consistent naming conventions
- Aligned observability patterns

### 4. Documentation & Knowledge Management

**Specification Artifacts:**
- Card markdown files with YAML frontmatter
- API sequence diagrams
- State machine definitions
- Error catalogs and glossaries

**Dependency Management:**
- Inter-card dependency mapping
- Implementation order recommendations
- Breaking change impact analysis

## Card Specification Template

Each card must include:

### Frontmatter (YAML)
```yaml
---
card: "Brief description"
slug: kebab-case-identifier
team: "A - Commerce | B - Tickets | C - Gate"
oas_paths: ["/path1", "/path2"]
migrations: ["0001_example.sql"]
status: "Ready | In Progress | PR | Done"
readiness: "prototype | production"
branch: "feature/card-slug"
pr: "https://github.com/repo/pull/123"
newman_report: "reports/newman/card-slug.json"
last_update: "2025-10-20T14:30:00+0800"
related_stories: ["US-001", "US-002"]
---
```

### Content Sections
1. **Prerequisites** - Dependencies and setup requirements
2. **API Sequence** - Mermaid diagram showing the interaction flow
3. **Contract** - OAS 3.0.3 fragment with complete request/response schemas
4. **Invariants** - Business rules that must always hold
5. **Validations & Concurrency** - Input validation, idempotency, locking
6. **Rules & Writes** - Step-by-step implementation logic
7. **Data Impact** - Database/store changes and migrations
8. **Observability** - Logging events and metrics to capture
9. **Acceptance** - Given/When/Then scenarios for testing
10. **Postman Coverage** - Test assertions and verification logic

## Story-to-Card Analysis Process

### Step 1: Story Decomposition
```
User Story → Business Goal → Technical Requirements → API Operations
```

**Questions to Answer:**
- What business value does this deliver?
- Who are the actors and what are their goals?
- What data needs to be created, read, updated, or deleted?
- What are the success and failure scenarios?
- How does this integrate with existing functionality?

### Step 2: Technical Design
```
Business Logic → API Design → Data Model → Implementation Plan
```

**Design Decisions:**
- Endpoint paths and HTTP methods
- Authentication and authorization model
- Request/response payload structure
- Error codes and messages
- State transitions and validation rules

### Step 3: Implementation Specification
```
Abstract Design → Concrete Implementation Steps → Validation Criteria
```

**Deliverables:**
- Complete API contract with examples
- Detailed implementation algorithm
- Test scenarios and acceptance criteria
- Dependencies and integration points

## Future Evolution: Coder AI Taking SPEC Role

When I assume the SPEC AI role, the workflow becomes:

### Enhanced Story Analysis
**Input:** User stories + business context
**Process:**
1. Analyze business requirements and user value
2. Design technical architecture and API contracts
3. Create comprehensive card specifications
4. Validate against existing domain model and patterns

**Output:** Complete cards ready for implementation

### Integrated Workflow
```
Stories → [SPEC Analysis] → Cards → [Implementation] → Code → [Validation] → Done
```

**Benefits:**
- Single AI understands both specification and implementation
- Faster iteration cycles with immediate feasibility feedback
- Better alignment between business requirements and technical design
- Consistent quality across specification and implementation phases

## Validation Framework

To ensure our implementation is truly valid, we need:

### 1. Business Logic Validation
- Does the implementation deliver the promised business value?
- Are all user scenarios properly handled?
- Do the APIs support the complete user journey?

### 2. Technical Correctness Validation
- Are domain types used consistently?
- Do state transitions follow defined rules?
- Are error scenarios properly handled?

### 3. Integration Validation
- Do inter-card dependencies work correctly?
- Is the end-to-end flow functional?
- Are performance and security requirements met?

### 4. Specification Compliance Validation
- Does the implementation match the card specification exactly?
- Are all acceptance criteria satisfied?
- Do Postman tests pass completely?

This comprehensive approach ensures that when I take on the SPEC AI role, I can maintain the same quality standards while accelerating the overall development process.