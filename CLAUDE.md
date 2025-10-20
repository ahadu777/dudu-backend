# Claude Code Development Guidelines

## Quick Reference - What Actually Works

### The NEW Magic Formula (with Stories)
```
Story (Business) → Cards (Technical) → Code → Build → Test → Done
```

### How We Work Now
1. **You paste story content** (or point to file)
2. **I update codebase** (stories + cards)
3. **I implement cards** (our proven workflow)
4. **We track coverage** (two scripts)

### Essential Commands (Use These Exact Sequences)
```bash
# 1. Check progress (MULTIPLE dimensions)
node scripts/progress-report.js         # Card status
node scripts/story-coverage.mjs         # Story → Card coverage
node scripts/success-dashboard.js       # Foundation + story validation
node scripts/implementation-validator.js # Comprehensive validation

# 2. Build and restart
npm run build
pkill -f "node dist/index.js" 2>/dev/null
PORT=8080 npm start &
sleep 3

# 3. Test
curl http://localhost:8080/healthz
```

## Project Overview
Ticketing system with multi-team ownership using card-based development. Mock data first, database later.

## Role Responsibilities (RACI)

### My Role as Coder AI
**Currently:**
- ✅ Implement from cards
- ✅ Update status/frontmatter
- ✅ Test implementation
- ✅ Propose minor fixes

**Future (with full SSoT):**
- ✅ Create cards from stories
- ✅ Maintain full cycle
- ✅ Evolve specs based on implementation

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
  cards/                  # Technical specs
    *.md                 # Implementation cards
scripts/
  progress-report.js      # Card status
  story-coverage.mjs     # Story coverage
```

### Other Docs (Reference Only)
- `WORKFLOW.md` - Detailed workflow steps
- `DEFINITION_OF_DONE.md` - What "done" means
- `AI_HANDOFF.md` - Implementation examples
- `CONTRIBUTING.md` - RACI matrix (should have been here!)