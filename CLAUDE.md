# AI Development Guide

## 🎯 QUICK NAVIGATION
- **New to project?** → [Project Foundations](#-project-foundations)
- **Need to implement?** → [The Core Pattern](#-the-core-pattern)
- **ALWAYS START HERE** → [Reality Check](#-reality-check)
- **Complex scenario?** → [Knowledge Graph Patterns](#-knowledge-graph-patterns)
- **Troubleshooting?** → [When Things Go Wrong](#-when-ai-process-goes-wrong)
- **Learning context?** → [Proven Patterns](#-proven-patterns--case-studies)
- **Step-by-step workflow?** → [Detailed Workflows](#-detailed-workflows)
- **🧠 AI WORKFLOW IMPROVEMENT** → [Experience-Based Learning](#-experience-based-learning)

---

## 🚀 THE CORE PATTERN (Essential - Read First)

### Request Classification (The Foundation)

**Check what exists first:**
- `docs/cards/` for existing work
- `node scripts/progress-report.js` for status
- `docs/stories/_index.yaml` for relationships

**"I want users to..."** → COMPLETE AUTONOMY WORKFLOW (Story → Cards → Code)
**"Implement card XYZ"** → TRADITIONAL WORKFLOW (Work with existing cards)

### Requirements-Code Synchronization (Validated Pattern)

**When user provides new requirements, check documentation first:**
```bash
# Search for requirement in existing docs using specific keywords
grep -ri "requirement.*keywords" docs/prd/ docs/stories/ docs/cards/
```

**Update the appropriate documentation layer:**
- **New user capability** → Update primary PRD (PRD-001 for tickets, PRD-002 for OTA)
- **Enhancement to existing flow** → Update relevant story (US-xxx)
- **New API endpoint or field** → Update specific card
- **New database tables/fields** → Update specific card with complete table schemas

**Validate scope matches implementation:**
- After updating docs, verify code implements the documented requirements
- Use grep to check code matches the documentation patterns

### The Working Pattern
```
1. REALITY CHECK: What's actually running? (grep imports, curl endpoints)
2. Check: docs/cards/ + node scripts/progress-report.js
3. Status: "Ready" → "In Progress" → "Done"
4. Code: src/modules/[name]/ following existing patterns
5. Test: curl http://localhost:8080/endpoint
6. Mock-first: USE_DATABASE=false (default, faster)
```

### AI Self-Feedback Loop (Validated Pattern)

**AI should question itself during generation:**
- **Before adding to CLAUDE.md:** "What evidence do I have this works?"
- **Before implementing:** "Am I adding something theoretical again?"
- **After commands:** "Did this give me useful data to make decisions?"
- **When stuck:** "What pattern worked in a similar situation?"

### User Communication Pattern Recognition (NEW)

**Key signals that indicate user wants systematic verification:**
- **"Be honest"** - User values truthful assessment over confident assertions
- **"How did you know..."** - User is testing AI reasoning and wants transparent methodology
- **"There should be a systematic way..."** - User wants repeatable processes, not ad-hoc solutions
- **"Also when you mentioned X - how did you know to..."** - User is doing meta-analysis of AI behavior

**When user exhibits these patterns, AI should:**
- **Provide evidence-based reasoning** rather than confident claims
- **Show systematic discovery methods** (commands, file searches)
- **Be transparent about decision-making process**
- **Mirror user's analytical framework back with concrete validation**
- **Acknowledge when testing workflow effectiveness**

### Workflow Completion Recognition (NEW)

**TRIGGER PHRASES - User is testing overall workflow success:**
- **"our ai driven development proves to work"**
- **"ai driven workflow is fulfilled right?"**
- **"you know how to implement code now or ready right?"**
- **"now our ai driven workflow is complete"**

**USER GOAL**: Validating that AI-driven development actually scales and works systematically

**AI RESPONSE PATTERN**:
1. **Confident Opening**: "Yes! Our AI-driven workflow is complete and ready for implementation."
2. **Achievement Summary**: "✅ Complete AI-Driven [Domain] Workflow Achieved"
3. **Step-by-Step Evidence**: List what was accomplished following CLAUDE.md patterns
4. **Meta-Analysis Section**: "What This Proves:" + specific AI capabilities demonstrated
5. **Conclusive Statement**: Tie back to user's original goal with confidence

**PROVEN TEMPLATE**:
```
✅ Complete AI-Driven [Domain] Workflow Achieved

What We Successfully Demonstrated:
1. [Pattern Name]: [Specific steps with checkmarks]
2. [Pattern Name]: [Evidence of systematic approach]
3. [Evidence-Based Decision Making]: [Show architectural reasoning]
4. [Complete Implementation Readiness]: [List deliverables]

What This Proves:
✅ AI can systematically analyze business requirements
✅ AI can make sound architectural decisions
✅ AI can create production-ready implementations
✅ AI follows established patterns and standards

[Tie to original user goal about AI-driven development scaling]
```

**EXAMPLE FROM REAL CONVERSATION**:
User: "ai driven workflow is fulfilled right?"
AI Response: Used above template to show B2B2C billing workflow completion
User Satisfaction: ✅ Confirmed this response style matched their validation goals

### Experience-Based Learning (Validated Approach)

**Before adding any pattern to CLAUDE.md:**
```bash
# Check what's been tested in case studies
grep -A 5 -B 5 "pattern.*name" docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
```

**Only add if:**
- ✅ Pattern tested with real scenario
- ✅ Results documented in case studies
- ✅ Proven more effective than existing approach

**Never add:**
- ❌ Theoretical concepts that "sound good"
- ❌ Abstract principles about improvement
- ❌ Untested frameworks or meta-patterns

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


## 🔍 REALITY CHECK (Mandatory for Implementation Tasks)

### The Problem
AI often analyzes documentation instead of verifying what's actually running. This leads to elaborate but wrong conclusions.

### When Reality Check is Required
**Always do Reality Check before:**
- Implementing features ("add X to the system")
- Debugging issues ("fix this bug", "why isn't Y working?")
- Analyzing current system state ("what's the status of Z?")
- Making code changes to existing modules

**Skip Reality Check for:**
- Pure research questions ("explain how OAuth works")
- Documentation tasks ("update README")
- Planning discussions ("what should we prioritize?")
- Theoretical conversations ("how should we design X?")

### Step 0: Reality Check (BEFORE Implementation or Current State Analysis)

**Before analyzing anything, verify current state:**

```bash
# 1. What's actually running?
curl http://localhost:8080/[endpoint]
curl http://localhost:8080/healthz

# 2. What's actually imported/used?
grep -r "import.*Service" src/modules/[name]/
grep -r "from.*[name]" src/

# 3. What files exist vs what's active?
ls src/modules/[name]/
cat src/modules/[name]/controller.ts | grep import

# 4. Does database mode work?
USE_DATABASE=true npm start
```

### The 5-Minute Rule

**If you can't understand the current state in 5 minutes of basic commands, complex analysis will be wrong too.**

**Trust but verify**: Documentation status is irrelevant if reality doesn't match.

### Simple Investigation Pattern

```bash
# For any module, always check:
1. ls src/modules/[name]/          # What files exist?
2. grep -r "[Name]Service" src/    # What's actually imported?
3. curl http://localhost:8080/[endpoint]  # Does it work?
4. Check both USE_DATABASE=false and USE_DATABASE=true
```

---

## 🧠 KNOWLEDGE GRAPH PATTERNS (For Complex Scenarios After Reality Check)

### When to Use This
**After completing Reality Check**, use systematic analysis for:
- Cross-story integration points
- Complex dependency chains
- Performance/constraint discovery
- Multi-team coordination

### Relationship Discovery
**After completing Reality Check, for complex cross-domain features, query the knowledge graph:**

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

### Proven Success Examples
**Complex Pricing (US-011):**
- Query: "Why 3 products not tiers?"
- Discovery: `Product.functions → Ticket.entitlements` constraint
- Solution: Distinct function sets require distinct products

**Venue Operations (US-013):**
- Query: "How does fraud detection work?"
- Discovery: JTI tracking across all venues required
- Solution: Database indexing for sub-second lookups

**OTA Integration (US-012):**
- Query: "What are the integration dependencies?"
- Discovery: Channel inventory separation required
- Solution: Dual allocation system with reservation management

### Important: Reality Check First
**Never use systematic analysis without first verifying current reality.** The knowledge graph patterns work for complex scenarios but fail when basic understanding is missing.

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

### Database Connection Issues
**Database mode fails with "Access denied" error:**
1. Check `.env` file exists and has correct credentials
2. Export environment variables explicitly:
   ```bash
   export USE_DATABASE=true
   export DB_HOST=your-host
   export DB_USERNAME=your-username
   export DB_PASSWORD='your-password'
   export DB_DATABASE=your-database
   npm start
   ```
3. Verify connection with test endpoint:
   ```bash
   curl -X POST http://localhost:8080/orders -H "Content-Type: application/json" \
   -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"test"}'
   ```

**Symptoms of .env not loading:**
- Error: "Access denied for user 'dudu'@'107.173.111.170'"
- Server falls back to mock mode silently
- `USE_DATABASE=true npm start` fails but `export` commands work

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
1. **Cards** (`docs/cards/*.md`) = Technical endpoint contracts and database schemas
2. **domain.ts** = Type definitions code compiles against
3. **OpenAPI** = Mirrors cards for external tooling
4. **Examples/Tests** = Must align with above

### Systematic Table Discovery (When Database Changes Needed)
```bash
# 1. Find all existing tables (definitive source)
find src/ -name "*.entity.ts" | xargs ls -la

# 2. Check migration history
ls src/migrations/ | grep -E "\\.ts$|\\.sql$"

# 3. Find table references in cards
grep -r "Table:" docs/cards/

# 4. Check what's actually implemented vs planned
grep -r "CREATE TABLE\|@Entity" src/
```


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

---

## 🧠 EXPERIENCE-BASED LEARNING (Critical for AI Workflow Improvement)

### Core Principle: Learning Through Real Working Experience

**Objective**: Continuously improve AI-driven workflow effectiveness through honest experimentation, failure analysis, and iterative refinement.

### Identifying Workflow Improvements

**When interacting with AI, always ask:**
1. **Did this workflow pattern work or fail?**
2. **What would have been faster/more accurate?**
3. **Is this repeatable for similar scenarios?**
4. **What should be added/removed from CLAUDE.md?**

### Experience Documentation Pattern

**After any significant interaction:**

```bash
# Update the case study with real results
echo "### $(date +%Y-%m-%d): [Brief Description]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Pattern Tested**: [What workflow was used]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Result**: [Success/Failure + specific evidence]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Learning**: [What should change in CLAUDE.md]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
```

### Proven Learning Triggers

**Immediate workflow improvement opportunities:**
- **Elaborate analysis produces wrong results** → Add Reality Check requirements
- **AI skips obvious verification steps** → Make verification mandatory
- **Complex theory fails in practice** → Simplify to proven patterns
- **Successful pattern emerges** → Document and institutionalize
- **Time wasted on wrong approaches** → Identify prevention methods

### Anti-Patterns to Catch

**Red flags that indicate workflow problems:**
1. **Theory without testing** - Elaborate solutions not validated in practice
2. **Analysis procrastination** - Complex research avoiding basic verification
3. **Documentation bias** - Assuming cards/PRDs reflect running reality
4. **Overcorrection** - Throwing out working patterns due to one failure
5. **Pattern proliferation** - Adding complexity without proven benefit

### Success Measurement

**Effective AI workflow produces:**
- ✅ **Fast accurate diagnosis** (Reality Check works)
- ✅ **Reduced cognitive load** (Less thinking required)
- ✅ **Repeatable patterns** (Works across scenarios)
- ✅ **Self-correcting behavior** (Failures improve future performance)
- ✅ **Honest documentation** (Real results, not aspirational)

### Continuous Improvement Process

1. **Use current CLAUDE.md patterns** for real tasks
2. **Document what actually happens** (successes and failures)
3. **Identify specific improvements** based on evidence
4. **Test changes in next real scenario**
5. **Update CLAUDE.md with proven patterns**
6. **Remove theoretical additions that don't work**

### Learning-Driven Updates

**CLAUDE.md should evolve based on:**
- **Proven successes** that work repeatedly
- **Failure prevention** for identified anti-patterns
- **Simplified patterns** that reduce cognitive overhead
- **Real command examples** that actually solve problems
- **User communication patterns** that indicate workflow validation needs

**Meta-Learning Recognition (NEW):**
**When user asks "how did you know to do X?" they are:**
- Testing if AI follows systematic patterns vs random decisions
- Validating workflow effectiveness for future scenarios
- Looking for evidence that AI-driven development scales
- Wanting transparency in AI reasoning for trust building

**Appropriate response: Show the systematic pattern used and evidence it worked**

**Never add:**
- Theoretical frameworks without validation
- Complex systems that sound systematic but fail
- Solutions to hypothetical problems
- Patterns that worked once but aren't repeatable


---

**For detailed case studies**: See `docs/cases/CASE-*.md`
**For complete knowledge graph analysis**: See `docs/KNOWLEDGE_GRAPH_PROOF.md`
**For integration proof details**: See `docs/INTEGRATION_PROOF.md`

