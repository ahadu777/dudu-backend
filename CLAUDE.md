# Claude Code Development Guidelines

## 🎯 INTEGRATION PROOF COMPLETE

**We solved the "last mile" gap between working APIs and consumer integration.**

- **📖 Story Runbooks** (`docs/integration/`) - Copy-paste commands for each story
- **🧪 Newman E2E Tests** (`npm run test:e2e`) - Automated story validation
- **💻 TypeScript SDK + Examples** (`examples/`) - Frontend integration proof
- **📊 Accurate Dashboard** (50% completion, not 47%)

**For complete context:** Read [`docs/INTEGRATION_PROOF.md`](docs/INTEGRATION_PROOF.md)

---

## Quick Reference - What Actually Works

### The NEW Magic Formula (with Stories)
```
Story (Business) → Cards (Technical) → Code → Build → Test → Done
```

### How We Work Now
**COMPLETE AUTONOMY WORKFLOW:**
1. **Raw User Story** → I analyze using `docs/templates/STORY_ANALYSIS.md`
2. **Create Cards** → I generate technical specs using `docs/templates/CARD_TEMPLATE.md`
3. **Implement Code** → I follow proven card-based development
4. **Integration Proof** → I create runbooks, Newman tests, TypeScript examples
5. **Validation** → I verify with `npm run validate:integration`

**TRADITIONAL WORKFLOW** (when cards exist):
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

### Definition of Ready (DoR) - Before We Code
**Card Must Have:**
- [ ] Complete API contract (OAS fragment)
- [ ] Clear acceptance criteria
- [ ] Dependencies identified and available
- [ ] Domain types defined in `domain.ts`
- [ ] Mock data structure agreed

**System Must Have:**
- [ ] All dependent cards implemented
- [ ] Mock store supports required operations
- [ ] Error codes in catalog
- [ ] State transitions defined

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

### Card-Based Development Process
1. **Verify DoR** - Check all prerequisites
2. **Update status** to "In Progress" in frontmatter
3. **Implement with mock data** using unified store
4. **Test the implementation** thoroughly
5. **Verify DoD** - Check all criteria met
6. **Update status** to "Done" when complete

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
1. **GET /catalog** - Returns active products
2. **POST /orders** - Idempotent order creation
3. **POST /payments/notify** - Payment processing with sync ticket issuance
4. **Ticket Service** - Internal module for ticket generation

### Integration Proof Complete (NEW)
1. **Story Runbooks** - Copy-paste commands for all 6 user stories (`docs/integration/`)
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

## Complete Workflow: User Story → Implementation

### Phase 1: Story Analysis
**When:** Fresh user story without existing cards
**Process:**
1. Apply `docs/templates/STORY_ANALYSIS.md` template
2. Extract business rules and acceptance criteria
3. Identify API endpoints and data changes needed
4. Break down into implementable cards

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

### Other Docs (Reference Only)
- `WORKFLOW.md` - Detailed workflow steps
- `DEFINITION_OF_DONE.md` - What "done" means
- `AI_HANDOFF.md` - Implementation examples
- `CONTRIBUTING.md` - RACI matrix (should have been here!)