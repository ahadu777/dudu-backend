# AI Development Guide

## 🎯 QUICK NAVIGATION
- **New to project?** → [Project Foundations](#-project-foundations)
- **Need to implement?** → [The Core Pattern](#-the-core-pattern)
- **Complex scenario?** → [Knowledge Graph Patterns](#-knowledge-graph-patterns)
- **Troubleshooting?** → [When Things Go Wrong](#-when-ai-process-goes-wrong)
- **Learning context?** → [Proven Patterns](#-proven-patterns--case-studies)
- **Step-by-step workflow?** → [Detailed Workflows](#-detailed-workflows)

---

## 🚀 THE CORE PATTERN (Essential - Read First)

### Request Classification (The Foundation)

**Check what exists first:**
- `docs/cards/` for existing work
- `node scripts/progress-report.js` for status
- `docs/stories/_index.yaml` for relationships

**"I want users to..."** → COMPLETE AUTONOMY WORKFLOW (Story → Cards → Code)
**"Implement card XYZ"** → TRADITIONAL WORKFLOW (Work with existing cards)

### The Working Pattern
```
1. Check: docs/cards/ + node scripts/progress-report.js
2. Status: "Ready" → "In Progress" → "Done"
3. Code: src/modules/[name]/ following existing patterns
4. Test: curl http://localhost:8080/endpoint
5. Mock-first: USE_DATABASE=false (default, faster)
```

### Standards (DoR/DoD Checklists)
**Definition of Ready:**
- [ ] Complete API contract in card
- [ ] Dependencies identified
- [ ] Mock data structure agreed

**Definition of Done:**
- [ ] Matches card spec exactly
- [ ] TypeScript compiles
- [ ] Endpoints respond (curl test)
- [ ] Card status updated to "Done"

### Key Commands
```bash
node scripts/progress-report.js  # Check status
npm run build && npm start      # Deploy changes
curl http://localhost:8080/      # Test endpoints
```

### When Stuck
- Copy existing patterns from working modules
- Use mock data (faster than database)
- Simple logging: `logger.info('event', data)`

---

## 🏗️ PROJECT FOUNDATIONS

### Architecture Overview
Ticketing system with multi-team ownership using card-based development. Mock data first, database later.

### Integration Proof Complete
- **📖 Story Runbooks** (`docs/integration/`) - Copy-paste commands
- **🧪 Newman E2E Tests** (`npm run test:e2e`) - Automated validation
- **💻 TypeScript SDK + Examples** (`examples/`) - Frontend integration
- **📊 Accurate Dashboard** - True progress tracking

**Context docs:** [`docs/INTEGRATION_PROOF.md`](docs/INTEGRATION_PROOF.md), [`docs/PRODUCT_EXAMPLES.md`](docs/PRODUCT_EXAMPLES.md), PRDs in [`docs/prd/`](docs/prd/)

### Technical Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express 5.1
- **Database**: MySQL (TypeORM)
- **Documentation**: OpenAPI 3.0.3 + Swagger UI
- **Deployment**: DigitalOcean (Docker/App Platform)

### Project Structure
```
docs/
  stories/          # Business requirements
  cards/           # Technical specs
  integration/     # Consumer runbooks
src/
  modules/         # Implementation (follow this pattern)
  types/domain.ts  # Type definitions
  core/mock/       # Mock data (default mode)
openapi/
  openapi.json     # API specification
```

### Mock-First Philosophy
```bash
# Mock mode (default) - fast development
npm start                    # Uses mock data
USE_DATABASE=false npm start # Explicit mock mode

# Database mode - production ready
USE_DATABASE=true npm start  # Uses real database
```

**Why mock-first:** 1-3ms response times enable rapid business logic validation before database complexity.

---

## 🧠 KNOWLEDGE GRAPH PATTERNS (For Complex Scenarios)

### Relationship Discovery
**Before implementing, query the knowledge graph:**

```bash
# Check story relationships
grep -A 10 "card-name" docs/stories/_index.yaml

# Check card dependencies
grep -A 5 "relationships:" docs/cards/card-name.md

# Find integration points
grep "integration_points" docs/cards/card-name.md
```

### Constraint Discovery Patterns
**Key relationships to analyze:**
- **Entity flows**: `Product.functions → Ticket.entitlements → RedemptionEvent.function_code`
- **Shared cards**: Multiple stories using same card = integration point
- **Domain dependencies**: Commerce ↔ Fulfillment ↔ Operations coordination
- **Type constraints**: TypeScript interfaces encode business rules

### Examples from Proven Success
**Complex Pricing (US-011):**
- Query: "Why 3 products not tiers?"
- Discovery: `Product.functions → Ticket.entitlements` constraint
- Solution: Distinct function sets require distinct products

**Venue Operations (US-013):**
- Query: "How does fraud detection work?"
- Discovery: JTI tracking across all venues required
- Solution: Database indexing for sub-second lookups

---

## 📚 PROVEN PATTERNS & CASE STUDIES (Learning from Experience)

### What Actually Works (Tested & Validated)
1. **Mock-First Development**: Rapid business logic validation (1-3ms response times)
2. **Dual-Mode Architecture**: Automatic fallback, identical API contracts
3. **Knowledge Graph Queries**: Relationship discovery prevents duplicate work
4. **Card-Based Implementation**: Clear specs → predictable outcomes
5. **Integration Proof**: Runbooks + Newman tests + TypeScript examples

### Architectural Patterns Discovered
**Dual-Mode Service Pattern:**
```typescript
if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
  // Database mode: production persistence
} else {
  // Mock mode: rapid development
}
```

**Knowledge Graph Relationship Query:**
```yaml
# From docs/stories/_index.yaml
US-011: [complex-pricing-engine, order-create]
US-001: [catalog-endpoint, order-create, ...]    # Shared dependency!
```

### Case Study: Complex Pricing Success (US-011)
**Challenge**: Implement cruise package tiers with different capabilities

**Knowledge Graph Discovery:**
- Constraint: `Product.functions → Ticket.entitlements` (distinct functions required)
- Dependency: `order-create` shared with US-001 (backward compatibility needed)
- Pattern: Follow existing product structure (106-108 cruise examples)

**Outcome**: 3 separate products with correct function mappings, zero breaking changes

### Case Study: Venue Operations (US-013)
**Challenge**: Multi-terminal fraud detection with performance requirements

**Mock-First Success:**
- Business logic: 1ms response times in mock mode
- Production ready: Database mode with proper indexing
- Fraud detection: JTI tracking across venues

**Outcome**: 99.95% better performance than requirements, complete integration proof

---

## 🔧 DETAILED WORKFLOWS (When You Need Step-by-Step)

### Complete Autonomy Workflow (For "I want users to..." requests)
1. **Story Analysis**: Break down business requirements
2. **Card Generation**: Create technical specs following templates
3. **Document Everything**: Update `docs/stories/_index.yaml` with relationships
4. **Implement Code**: Follow card specs in `src/modules/[name]/`
5. **Integration Proof**: Create runbooks, Newman tests, TypeScript examples
6. **Validation**: Test end-to-end functionality

### Traditional Workflow (For "Implement card XYZ" requests)
1. **Check Dependencies**: Query relationship metadata first
2. **Update Status**: "Ready" → "In Progress" in card frontmatter
3. **Follow Patterns**: Copy existing module structure
4. **Test Implementation**: `curl` commands for validation
5. **Complete**: Mark "Done" with proper documentation

### OpenAPI Synchronization (For External Integration)
**When adding new endpoints:**
1. Implement in `src/modules/`
2. Add to `openapi/openapi.json` (path + schemas)
3. Validate: `curl http://localhost:8080/openapi.json | python3 -m json.tool`
4. Test: Access `http://localhost:8080/docs/`

### Database Mode Transition
1. Create TypeORM entities in `src/modules/[name]/domain/`
2. Generate migrations: `npm run typeorm migration:generate`
3. Update service layer with database availability check
4. Test both modes: `USE_DATABASE=false` vs `USE_DATABASE=true`
5. Validate identical API responses

---

## 🚨 WHEN THINGS GO WRONG (Troubleshooting)

### Common Issues & Quick Fixes
**Server not starting:** `pkill -f "node dist/index.js"` then `npm run build && npm start`
**Not seeing changes:** Did you run `npm run build`?
**Tests failing:** Check mock data setup and existing patterns
**Card status confusion:** Always update status when starting/finishing work

### Process Recovery Pattern
1. **Acknowledge the problem** - What went wrong?
2. **Complete missing steps** - Fill gaps in process
3. **Update documentation** - Fix status, reports, etc.
4. **Verify completion** - Check all criteria met
5. **Continue** - Process back on track

### When to Ask for Help
- Unclear business requirements
- Complex domain constraints discovered
- Integration points not working
- Performance issues in database mode


### Development Best Practices
**Code Style:**
- Use async/await for asynchronous code
- Implement proper TypeScript types (no `any`)
- Follow REST conventions for endpoints
- Return consistent JSON response formats

**Security:**
- Never commit secrets (use .env files)
- Validate all inputs
- Use parameterized queries
- Add authentication where needed

**Performance:**
- Use mock data for development speed
- Implement database indexes for production
- Monitor with health endpoints
- Add proper logging: `logger.info('event', data)`

---

## 📖 REFERENCE INFORMATION

### What's Actually Working (Validated)
- **US-001**: Complete ticket purchase → QR redemption flow
- **US-011**: Complex cruise pricing with package tiers
- **US-012**: OTA platform integration (5000 ticket allocation)
- **US-013**: Venue operations with fraud detection
- **Mock store**: Products 101-108 with realistic business examples
- **Integration proof**: Runbooks, Newman tests, TypeScript examples

### Single Source of Truth Hierarchy
1. **Cards** (`docs/cards/*.md`) = Technical endpoint contracts
2. **domain.ts** = Type definitions code compiles against
3. **OpenAPI** = Mirrors cards for external tooling
4. **Examples/Tests** = Must align with above


### Common Validation Commands
```bash
# Check implementation progress
node scripts/progress-report.js
node scripts/story-coverage.mjs

# Test endpoints
curl http://localhost:8080/healthz
curl http://localhost:8080/docs

# Run integration tests
npm run test:e2e
npm run example:all
```

---

**For detailed case studies**: See `docs/cases/CASE-*.md`
**For complete knowledge graph analysis**: See `docs/KNOWLEDGE_GRAPH_PROOF.md`
**For integration proof details**: See `docs/INTEGRATION_PROOF.md`

