# Claude Code Development Guidelines

## 🎯 INTEGRATION PROOF COMPLETE

**We solved the "last mile" gap between working APIs and consumer integration.**

- **📖 Story Runbooks** (`docs/integration/`) - Copy-paste commands for each story
- **🧪 Newman E2E Tests** (`npm run test:e2e`) - Automated story validation
- **💻 TypeScript SDK + Examples** (`examples/`) - Frontend integration proof
- **📊 Accurate Dashboard** (50% completion, not 47%)

**For complete context:** Read [`docs/INTEGRATION_PROOF.md`](docs/INTEGRATION_PROOF.md)

**For product context:** Read [`docs/PRODUCT_EXAMPLES.md`](docs/PRODUCT_EXAMPLES.md) to understand real vs mock business data

**For business requirements:** Read PRDs in [`docs/prd/`](docs/prd/) for complete business context and product strategy

---

## 🚨 FRESH AI: READ THIS FIRST

### The #1 Rule: NEVER Skip DoR Verification

**⚠️ CRITICAL WARNING**: Do NOT jump to implementation! Always verify Definition of Ready first.
**📖 Read the process violations section** in AI Development Workflow below for common mistakes and how to avoid them.

### The #2 Rule: Check What Exists FIRST, Then Choose Workflow

**STEP 0: Always check existing implementations first**
- Check `docs/stories/_index.yaml` for existing stories AND relationship metadata
- Look for working examples in `examples/`
- Review "What's Actually Done" section below
- Search for existing cards in `docs/cards/`

**STEP 0.5: Query Relationship Metadata (CRITICAL)**
- Read `_index.yaml` for sequence dependencies, enhances/enhanced_by relationships
- Check card frontmatter for relationships metadata (depends_on, triggers, integration_points)
- Validate sequence constraints before implementing
- Identify implicit dependencies and cross-story impacts

**If functionality already exists** → **EXISTING WORK WORKFLOW**
- Point user to existing implementation
- Test/demonstrate current functionality
- Update documentation if needed

**If user describes NEW functionality** → **COMPLETE AUTONOMY WORKFLOW**
- Start with story analysis (NEVER jump to code)
- Create cards before implementing
- Document everything first

**If user references specific existing work** → **TRADITIONAL WORKFLOW**
- Work with existing stories/cards
- Update documentation as needed

---

## 🚨 CRITICAL: How to Recognize What Type of Request This Is

### Request Classification (MUST READ FIRST)

**When user says things like:**
- "I want users to be able to..."
- "Add a feature where..."
- "Users should be able to..."
- "I need functionality for..."
- "Create a way for users to..."

➜ **THIS IS A RAW USER STORY** → Use **COMPLETE AUTONOMY WORKFLOW**

**When user says things like:**
- "Implement card XYZ"
- "Work on the existing story ABC"
- "Fix the bug in endpoint DEF"
- "Update the existing card..."

➜ **THIS IS TECHNICAL WORK** → Use **TRADITIONAL WORKFLOW**

---

## Quick Reference - What Actually Works

### The NEW Magic Formula (with Stories)
```
Story (Business) → Cards (Technical) → Code → Build → Test → Done
```

### 🔥 COMPLETE AUTONOMY WORKFLOW (For Raw User Stories)
**TRIGGER:** User describes a feature/functionality they want
**NEVER SKIP TO IMPLEMENTATION - ALWAYS START WITH STORY ANALYSIS**

**STEP-BY-STEP PROCESS:**

**Step 1: Story Analysis**
```bash
# Read the template first
cat docs/templates/STORY_ANALYSIS.md
# Create story file: docs/stories/US-XXX-[story-name].md
# Apply template to break down user story into business requirements
```

**Step 2: Create Cards**
```bash
# Read the template first
cat docs/templates/CARD_TEMPLATE.md
# Create card files: docs/cards/[card-slug].md
# Generate technical specs following existing patterns
```

**Step 3: Document Everything**
```bash
# Update story index: docs/stories/_index.yaml
# Add story → card mappings
# Ensure all documentation is complete BEFORE coding
```

**Step 4: Implement Code**
```bash
# Update card status to "In Progress"
# Follow proven card-based development in /src/modules/
# Build and test: npm run build && npm start
```

**Step 5: Integration Proof**
```bash
# Create runbooks: docs/integration/US-XXX-runbook.md
# Add Newman tests: docs/postman_e2e.json
# Generate TypeScript examples: examples/
```

**Step 6: Validation**
```bash
npm run validate:integration
npm run test:e2e
node scripts/story-coverage.mjs
```

### TRADITIONAL WORKFLOW (When cards already exist)
**TRIGGER:** User references existing stories/cards or asks for specific technical work
**PROCESS:**
1. **You paste story content** (or point to file)
2. **I update codebase** (stories + cards)
3. **I implement cards** (our proven workflow)
4. **We track coverage** (validation scripts)

### Essential Commands (Use These Exact Sequences)
```bash
# 1. Check progress (MULTIPLE dimensions)
node scripts/progress-report.js         # Card status
node scripts/story-coverage.mjs         # Story → Card coverage
node scripts/success-dashboard.js       # Foundation + story validation (ACCURATE 50%)
node scripts/implementation-validator.js # Comprehensive validation
npm run validate:integration            # Integration proof completeness

# 2. Build and restart
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
sleep 3

# 3. Test and validate
curl http://localhost:8080/healthz      # Basic health
npm run test:e2e                        # Complete E2E story validation
npm run example:us001                   # TypeScript SDK integration

# 4. Integration proof (for consumers)
cat docs/integration/US-001-runbook.md  # Copy-paste complete flow
npm run example:all                     # All stories demo
```

## Project Overview
Ticketing system with multi-team ownership using card-based development. Mock data first, database later.

## Role Responsibilities (RACI)

### My Role as Coder AI
**FULL AUTONOMY (NEW):**
- ✅ **Story Analysis**: Break down user stories using systematic templates
- ✅ **Card Generation**: Create technical specs from business requirements
- ✅ **End-to-End Implementation**: Story → Cards → Code → Integration Proof
- ✅ **Self-Validation**: Use validation scripts to ensure quality

**Core Implementation:**
- ✅ Implement from cards
- ✅ Update status/frontmatter
- ✅ Test implementation
- ✅ Propose minor fixes

**Integration Proof:**
- ✅ Create story runbooks with copy-paste commands
- ✅ Maintain Newman E2E test collection
- ✅ Generate TypeScript SDK and examples
- ✅ Provide accurate progress tracking (50% not 47%)

**Quality Assurance:**
- ✅ Follow SSoT hierarchy for conflict resolution
- ✅ Use validation-driven development to catch drift
- ✅ Maintain self-healing integration proof system

### Spec AI
- Creates card content from stories
- Owns API contracts and invariants

### You (PM/Product)
- Define stories
- Set priorities
- Decide readiness lane

## Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express 5.1
- **Database**: MySQL (TypeORM)
- **Documentation**: OpenAPI 3.0.3 + Swagger UI
- **Deployment**: DigitalOcean (Docker/App Platform)

## Key Endpoints
- `GET /healthz` - Health check (always returns 200)
- `GET /version` - Service version info
- `GET /docs` - Swagger UI documentation
- `GET /openapi.json` - OpenAPI specification

## Development Commands (What We Actually Use)
```bash
npm run build    # ALWAYS run before restart
npm start        # Run server (PORT=8080)
node scripts/progress-report.js  # Check status
```

## Testing Endpoints
```bash
# Health check
curl http://localhost:8080/healthz

# Version info
curl http://localhost:8080/version

# API documentation
open http://localhost:8080/docs
```

## Project Structure
```
/src
  /app.ts           # Main application class
  /index.ts         # Entry point with graceful shutdown
  /config/          # Environment and database config
  /controllers/     # Route handlers
  /middlewares/     # Express middlewares (reqId, logging, error)
  /models/          # TypeORM entities
  /routes/          # API route definitions
  /services/        # Business logic
  /utils/           # Utilities (logger, etc)
/openapi/
  /openapi.json     # OpenAPI specification
/dist/              # Compiled JavaScript (generated)
```

## Environment Variables
Port defaults to 8080. Database connection is optional for development.

Key variables:
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `DB_*` - Database configuration
- `JWT_SECRET` - JWT signing key

## Deployment
The project is configured for DigitalOcean deployment:

1. **Docker**: Multi-stage build with health checks
2. **GitHub Actions**: CI/CD pipeline to DigitalOcean
3. **App Platform**: Using app.yaml configuration
4. **Container Registry**: Push images to DO registry

## AI Development Workflow

## 🚨 CRITICAL: DoR Verification FIRST

**NEVER SKIP THIS STEP!** Before writing ANY code, you MUST verify Definition of Ready.

❌ **WRONG:** See card → Start coding immediately
✅ **RIGHT:** See card → Verify DoR → Update status → Code → DoD

### Definition of Ready (DoR) - MANDATORY Checklist
**Card Must Have:**
- [ ] Complete API contract (OAS fragment)
- [ ] Clear acceptance criteria
- [ ] Dependencies identified and available
- [ ] Domain types defined in `domain.ts`
- [ ] Mock data structure agreed

**System Must Have:**
- [ ] All dependent cards implemented
- [ ] Mock store supports required operations
- [ ] Error codes in catalog (check `/docs/error-catalog.md`)
- [ ] State transitions defined

**⚠️ If ANY DoR item is missing, DO NOT proceed with implementation!**

### Definition of Done (DoD) - Completion Criteria
**Implementation:**
- [ ] Matches card spec exactly
- [ ] Uses domain.ts types (no ad-hoc types)
- [ ] Error responses follow catalog format
- [ ] State transitions validated
- [ ] Logging with proper event names

**Quality:**
- [ ] TypeScript compiles without errors
- [ ] Endpoints respond correctly (curl test)
- [ ] Idempotency works where specified
- [ ] Mock data persists correctly

**Documentation:**
- [ ] Card status updated to "Done"
- [ ] Branch/PR info in frontmatter
- [ ] Newman report path updated

### Card-Based Development Process (Testing-First)

1. **Verify DoR** - Check ALL prerequisites (MANDATORY)
2. **Update card status** to "In Progress" in frontmatter
3. **Create Newman test file** - `reports/newman/[card-slug].json`
4. **Implement with mock data** using unified store
5. **Run Newman tests** - Verify functionality works
6. **Verify DoD** - Check all criteria met
7. **Update card status** to "Done" with test report path

**🔄 Real-time Status Updates Required:**
- Start: "Ready" → "In Progress"
- Finish: "In Progress" → "Done"
- **Never leave cards in wrong status!**

## 🚨 When AI Process Goes Wrong

### Common Process Violations & Recovery

**Violation: Jumped to Implementation Without DoR**
- **Symptom**: Started coding immediately upon seeing a card
- **Recovery**: STOP → Go back and verify ALL DoR items → Update status → Continue
- **Prevention**: Always read this section first!

**Violation: Missing Tests**
- **Symptom**: Code implemented but no Newman tests created
- **Recovery**: Create Newman test file immediately → Run tests → Fix any issues
- **Prevention**: Create tests as step 3 of development process

**Violation: Card Status Stale**
- **Symptom**: Cards showing "Ready" but code is implemented
- **Recovery**: Update card status RIGHT NOW to reflect actual state
- **Prevention**: Update status immediately when starting/finishing work

**Violation: Incomplete DoD**
- **Symptom**: Think you're "done" but DoD checklist incomplete
- **Recovery**: Complete ALL missing DoD items before proceeding
- **Prevention**: Check DoD criteria before marking "Done"

### Recovery Pattern (When Things Go Wrong):
1. **Acknowledge the violation** - Admit what went wrong
2. **Complete missing steps** - Fill in gaps in DoR/DoD process
3. **Update documentation** - Fix card status, test reports, etc.
4. **Verify DoD compliance** - Ensure all criteria actually met
5. **Continue** - Process back on track

## 📚 Case Study: QR Scanning Implementation (Lessons Learned)

### What Happened:
**User Request**: "when a user presents a QR code, the operator would scan the QR code and know if the ticket is valid or not"

### ❌ Initial AI Mistakes:
1. **DoR Violation**: Jumped straight to implementation without checking DoR
2. **Status Neglect**: Left cards as "Ready" while implementing code
3. **Testing Afterthought**: Created manual curl tests instead of Newman tests
4. **Incomplete DoD**: Said "done" but missing test automation

### ✅ How It Was Corrected:
1. **DoR Verification**: Went back and checked all prerequisites
   - ✅ Cards had complete OAS fragments
   - ✅ Error codes existed in catalog (TOKEN_EXPIRED, WRONG_FUNCTION, etc.)
   - ✅ Domain types defined (ValidatorSession, RedemptionEvent)
   - ✅ Dependencies available (QR token generation already working)

2. **Proper Status Management**: Updated cards "Ready" → "In Progress" → "Done"

3. **Newman Test Creation**: Created individual test files:
   - `operators-login.json` (6/6 assertions pass)
   - `validators-sessions.json` (7/8 assertions pass)
   - `tickets-scan.json` (12/12 assertions pass)

4. **Full DoD Compliance**: All criteria met before marking "Done"

### ⏱️ Time Impact:
- **Actual process**: ~45 minutes with corrections
- **Ideal process**: ~25 minutes if DoR → DoD followed correctly

### 🎯 Key Takeaway:
**The established DoR → DoD process actually works!** Following it prevents rework and ensures quality. Violations require correction loops that waste time.

### When Adding New Features
1. Check existing patterns in similar files
2. Follow TypeScript strict mode conventions
3. Add OpenAPI documentation for new endpoints
4. Create appropriate DTOs for validation
5. Implement proper error handling
6. Add logging with request IDs

### Code Style Guidelines
- Use async/await for asynchronous code
- Implement proper TypeScript types (no `any`)
- Follow REST conventions for endpoints
- Return consistent JSON response formats
- Use middleware for cross-cutting concerns

### Testing Strategy
- Unit tests for services
- Integration tests for API endpoints
- Use Postman collections for API testing
- Health checks for monitoring

### Security Best Practices
- Never commit secrets (use .env files)
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Add authentication where needed
- Use helmet for security headers

### Performance Considerations
- Use compression middleware
- Implement caching where appropriate
- Use database indexes
- Monitor with health endpoints
- Implement graceful shutdown

## Common Tasks

### Working with Cards (Primary Workflow)
1. **Check progress**: `node scripts/progress-report.js`
2. **Read card**: Check `/docs/cards/<slug>.md` for requirements
3. **Update status**: Change frontmatter status field
4. **Implement**: Follow card specifications exactly
5. **Test**: Verify with curl commands
6. **Complete**: Mark status as "Done"

### Adding a New Endpoint
1. Define in OpenAPI specification (if needed)
2. Create module in `/src/modules/<name>/`
3. Implement router with handlers
4. Add service logic if complex
5. Use mockDataStore for data operations
6. Test with curl commands

### Database Migrations
1. Create entity in `/src/models`
2. Generate migration: `npm run typeorm migration:generate`
3. Run migration: `npm run typeorm migration:run`

### Debugging
- Check logs with proper request IDs
- Use health endpoint for liveness
- Monitor Docker logs in production
- Use Swagger UI for API testing

## Notes for Claude - READ THIS FIRST

### What's Actually Done (Tested & Working)
1. **GET /catalog** - Returns active products (includes real business examples: cruise packages 106-108)
2. **GET /catalog/promotions/{id}** - Returns detailed promotion information (US-008)
3. **POST /orders** - Idempotent order creation with complex pricing support
4. **POST /payments/notify** - Payment processing with sync ticket issuance
5. **Ticket Service** - Internal module for ticket generation

### Real vs Mock Product Data
- **Products 106-108**: Real cruise business examples (Premium Plan, Pet Plan, Deluxe Tea Set)
- **Products 101-105**: Mock data for development/testing
- **Reference**: See `docs/PRODUCT_EXAMPLES.md` for business context and function meanings

### Integration Proof Complete (NEW)
1. **Story Runbooks** - Copy-paste commands for all 9 user stories (`docs/integration/`)
2. **Newman E2E Tests** - Automated validation of complete flows (`npm run test:e2e`)
3. **TypeScript SDK** - Generated client + working examples (`examples/`)
4. **Accurate Dashboard** - True 50% completion using canonical cards
5. **Consumer Ready** - Frontend teams can integrate immediately

### The Proven Workflow
1. **Stories in** `/docs/stories/` (business requirements)
2. **Index in** `/docs/stories/_index.yaml` (maps stories → cards)
3. **Cards in** `/docs/cards/<slug>.md` (technical specs)
4. **Implementation:**
   - Update card status to "In Progress"
   - Code in `/src/modules/<name>/`
   - Use `mockDataStore` for all data
   - Build, restart, test with curl
   - Update card to "Done"

### Critical Success Patterns
- **Idempotency**: Check existing before creating
- **Synchronous calls**: Direct service calls, not events
- **Error handling**: Use `ERR` constants from `/src/core/errors/codes`
- **Logging**: JSON structured with `logger.info(event, data)`
- **Mock data**: Products 101-104 active, 105 inactive

### Common Issues & Fixes
- **Port in use**: `pkill -f "node dist/index.js"`
- **Not seeing changes**: Did you `npm run build`?
- **Server not starting**: Check port 8080, kill old processes

### Single Source of Truth Structure
```
docs/
  stories/                 # Business requirements (SSoT)
    _index.yaml           # Master mapping
    US-001-*.md          # User stories
  cards/                  # Technical specs (SSoT for API contracts)
    *.md                 # Implementation cards
  integration/            # Consumer proof artifacts
    US-*-runbook.md      # Story-level integration guides
src/
  types/domain.ts         # Type definitions (SSoT for code)
openapi/
  openapi.json           # API specification (mirrors cards)
examples/                 # Integration examples (validated against SSoT)
docs/postman_e2e.json    # E2E tests (validated against SSoT)
scripts/
  progress-report.js      # Card status
  story-coverage.mjs     # Story coverage
  integration-proof-validator.js  # Drift detection
```

### SSoT Hierarchy (Lessons Learned)
When conflicts arise, resolve using this precedence:
1. **Cards** (`docs/cards/*.md`) = Technical endpoint contracts
2. **domain.ts** = Type definitions code compiles against
3. **OpenAPI 3.0.3** = Mirrors cards for tooling
4. **Examples/Tests** = Must align with above (auto-validated)

**Key Insight:** Integration examples can drift from specifications. Use validation scripts to detect and fix misalignments systematically.

## Complete Workflow: PRD → Story → Implementation

### Phase 0: Product Requirements (NEW)
**When:** New product initiative or major feature
**Process:**
1. Create PRD using `docs/templates/PRD_TEMPLATE.md`
2. Define business context, success metrics, and requirements
3. Document business rules and pricing strategies
4. Validate business case and technical feasibility

### Phase 1: Story Analysis
**When:** Fresh user story (from PRD or direct requirement)
**Process:**
1. **Check PRD first** - Reference existing product context
2. Apply `docs/templates/STORY_ANALYSIS.md` template
3. Extract business rules and acceptance criteria
4. Identify API endpoints and data changes needed
5. Break down into implementable cards

**Example Input:** "I want users to cancel tickets and get refunds"
**Example Output:** 3 cards (ticket-cancellation, refund-processing, cancellation-policies)

### Phase 2: Card Generation
**Process:**
1. Use `docs/templates/CARD_TEMPLATE.md` structure
2. Assign to appropriate team (A/B/C) based on functionality
3. Write OpenAPI contracts following existing patterns
4. Define business rules as testable invariants
5. Plan database migrations and observability

**Quality Checks:**
- Follow existing naming conventions
- Ensure SSoT hierarchy compliance
- Add to story index mapping

### Phase 3: Implementation
**Process:**
1. **Update status** to "In Progress" in card frontmatter
2. **Implement code** following existing patterns in `/src/modules/`
3. **Use mock data** for development and testing
4. **Build and test** with curl commands
5. **Update status** to "Done" when complete

### Phase 4: Integration Proof Creation
**Process:**
1. **Create story runbook** in `docs/integration/US-XXX-runbook.md`
2. **Add Newman tests** to `docs/postman_e2e.json`
3. **Generate TypeScript example** in `examples/usXXX.ts`
4. **Update story index** to include new cards

### Phase 5: Validation
**Commands:**
```bash
npm run validate:integration    # Check integration proof completeness
npm run test:e2e               # Validate E2E story flows
npm run example:usXXX          # Test TypeScript integration
node scripts/success-dashboard.js  # Check overall progress
```

## Decision Trees for Fresh AI

### When to Create New vs Extend Existing Cards?
**Create New Card if:**
- New API endpoint with distinct business logic
- Different team responsibility area
- Independent functionality that stands alone

**Extend Existing Card if:**
- Adding field to existing endpoint
- Minor business rule change
- Same team/domain area

### How to Handle Card Dependencies?
**In Prerequisites Section:**
- List dependent cards that must be implemented first
- Specify external service requirements
- Document shared data structures

**In Implementation:**
- Check dependent card status before starting
- Use existing service patterns for integration
- Follow established error handling patterns

### API Design Decision Guidelines?
**Endpoint Structure:**
- Follow REST: `/resource/{id}/action`
- Use HTTP verbs correctly (POST for state changes)
- Group related operations under same resource

**Request/Response Format:**
- Follow existing domain.ts types
- Use consistent error response structure
- Include pagination for list endpoints

**Status Codes:**
- 200: Success with data
- 201: Created (for POST that creates)
- 400: Bad request format
- 401: Authentication required
- 404: Resource not found
- 409: Business rule conflict
- 422: Validation failed

## Example Prompts for Fresh AI

### Complete Feature Development (Full Autonomy)
```
"I want users to be able to [specific feature request]. Please analyze this as a user story, generate technical cards, implement the code, and create complete integration proof artifacts."

Examples:
- "I want users to be able to cancel their tickets and get a refund"
- "I want operators to scan QR codes and redeem tickets at events"
- "I want users to transfer tickets to other users"
- "I want to add discount codes and promotional pricing"
```

### Story Analysis (Starting Point)
```
"Analyze this user story using our systematic approach: [paste story content]"
"Break down this requirement into technical cards following our templates"
"What cards would you create for this user story: [description]"
```

### Card Implementation (Traditional Workflow)
```
"Implement the card: [card name or file path]"
"Please work on all pending cards and update their status"
"Show me the progress on cards and implement the next ready one"
"Implement the card: ticket-cancellation"
```

### Integration Proof Generation
```
"Create the frontend integration guide for our implemented features"
"Generate copy-paste runbook for story [US-XXX]"
"Update the Newman test collection with new story scenarios"
"Create TypeScript SDK examples for all working endpoints"
```

### Quality Validation & Progress
```
"Run our validation scripts and fix any issues found"
"Check integration proof completeness and update if needed"
"Validate that all stories have proper integration artifacts"
"What's our current progress across all stories and cards?"
"Show me which stories are ready for frontend integration"
"Generate the success dashboard report"
```

### Troubleshooting & Maintenance
```
"Fix any TypeScript compilation errors and restart the server"
"Update the Newman tests to match current API contracts"
"Check for integration proof drift and fix misalignments"
"Rebuild and test all examples to ensure they work"
```

### Best Practices for Fresh AI
1. **Always start with story analysis** when given raw requirements
2. **Query relationship metadata FIRST** - check `_index.yaml` and card frontmatter for dependencies, sequences, and integration points
3. **Use the validation scripts** (`npm run validate:integration`) after implementation
4. **Follow the SSoT hierarchy** (Cards → domain.ts → OpenAPI → Examples)
5. **Create integration proof** alongside code implementation
6. **Test with curl commands** before marking cards as "Done"
7. **Use existing patterns** from completed user stories (check `/docs/stories/_index.yaml` for current examples)
8. **Follow established card quality** seen in completed cards like `tickets-issuance`, `user-profile-endpoint`
9. **Check dependencies** - new stories may reference existing cards or create new dependencies

### Knowledge Graph Query Patterns (NEW)

**Before implementing any card, systematically check:**

1. **Story-Level Relationships** (`docs/stories/_index.yaml`):
   ```yaml
   # Check for sequence dependencies
   sequence: [catalog-endpoint → order-create → payment-webhook]
   # Check enhancement relationships
   enhances: [US-001]
   enhanced_by: [US-011]
   # Check implicit dependencies
   implicit_dependencies: [catalog-endpoint, promotion-detail-endpoint]
   ```

2. **Card-Level Relationships** (card frontmatter):
   ```yaml
   relationships:
     enhanced_by: ["complex-pricing-engine"]
     depends_on: ["catalog-endpoint"]
     triggers: ["payment-webhook"]
     data_dependencies: ["Product", "Order", "PricingContext"]
     integration_points:
       data_stores: ["data.ts", "store.ts"] # Critical for implementation
   ```

3. **Cross-Domain Impact Analysis**:
   - "What stories use this card?" → Search _index.yaml for card name
   - "What must happen before this?" → Check sequence and depends_on
   - "What does this trigger?" → Check triggers and enhanced_by
   - "What integration points exist?" → Check integration_points metadata

**Example Knowledge Graph Queries:**
```bash
# Before implementing order-create enhancement:
grep -A 10 "order-create" docs/stories/_index.yaml  # Find all stories using this card
grep -A 5 "relationships:" docs/cards/order-create.md  # Check relationship metadata
grep "integration_points" docs/cards/order-create.md  # Critical implementation details
```

### Other Docs (Reference Only)
- `WORKFLOW.md` - Detailed workflow steps
- `DEFINITION_OF_DONE.md` - What "done" means
- `AI_HANDOFF.md` - Implementation examples
- `CONTRIBUTING.md` - RACI matrix (should have been here!)