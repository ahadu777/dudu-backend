# AI Development Guide

## Quick Navigation

| Task | Action |
|------|--------|
| **Start here** | [Reality Check](#reality-check) |
| **Natural language request** | [NL Optimization](#natural-language-optimization) → [📖 Details](docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md) |
| **New story?** | [Duplicate Prevention](#duplicate-prevention) → [📖 Details](docs/reference/DUPLICATE-PREVENTION.md) |
| **PRD vs Story vs Card?** | [Document Layers](#document-layer-decision) → [📖 Details](docs/reference/DOCUMENT-LAYER-DECISION.md) |
| **API changing?** | [API Changes](#api-change-management) → [📖 Details](docs/reference/API-CHANGE-MANAGEMENT.md) |
| **New API?** | [RESTful Design](#restful-api-design) → [📖 Details](docs/reference/RESTFUL-API-DESIGN.md) |
| **Generate tests?** | [Test Generation](#testing) → [📖 Details](docs/reference/AI-TEST-GENERATION.md) |
| **Newman reports?** | [Newman Reports](#newman-reports) → [📖 Details](docs/reference/NEWMAN-REPORT-STANDARD.md) |
| **Troubleshooting?** | [📖 Troubleshooting Guide](docs/reference/TROUBLESHOOTING.md) |
| **Complex scenario?** | [📖 Knowledge Graph](docs/reference/KNOWLEDGE-GRAPH.md) |
| **Case studies** | [📖 docs/cases/](docs/cases/) |

---

## AI Instructions: Reference Loading

**IMPORTANT: Before working on these tasks, READ the reference document first using the Read tool.**

| Task Type | Must Read First |
|-----------|-----------------|
| Natural language requirements | `docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md` |
| Creating new story | `docs/reference/DUPLICATE-PREVENTION.md` |
| Deciding PRD/Story/Card | `docs/reference/DOCUMENT-LAYER-DECISION.md` |
| Modifying existing API | `docs/reference/API-CHANGE-MANAGEMENT.md` |
| Implementing new API | `docs/reference/RESTFUL-API-DESIGN.md` |
| Generating/analyzing tests | `docs/reference/AI-TEST-GENERATION.md` |
| Running Newman tests | `docs/reference/NEWMAN-REPORT-STANDARD.md` |
| Debugging issues | `docs/reference/TROUBLESHOOTING.md` |
| Cross-story dependencies | `docs/reference/KNOWLEDGE-GRAPH.md` |
| Refactoring code | `docs/reference/REFACTORING-IMPACT.md` |

**Why:** Reference docs contain detailed workflows, examples, and lessons learned that are not included in this summary file.

---

## Core Pattern (Read First)

### Request Classification
```
"I want users to..." → Story → Cards → Code (check duplicates first)
"Implement card XYZ" → Work with existing card
```

### The Working Pattern
```
0. LAYER DECISION: PRD? Story? Card?
1. DUPLICATE CHECK: grep -ri "keywords" docs/prd/ docs/stories/ docs/cards/
2. REALITY CHECK: curl endpoints, grep imports
3. STATUS: "Ready" → "In Progress" → "Done"
4. CODE: src/modules/[name]/ following existing patterns
5. TEST: curl http://localhost:8080/endpoint
6. MODE: USE_DATABASE=false (default, faster)
```

---

## Reality Check

**Always verify before implementing:**
```bash
# What's running?
curl http://localhost:8080/healthz
curl http://localhost:8080/[endpoint]

# What's imported?
grep -r "import.*Service" src/modules/[name]/

# What exists?
ls src/modules/[name]/
```

**5-Minute Rule**: If basic commands don't clarify state, complex analysis won't help.

---

## Natural Language Optimization

**When user provides requirements in natural language:**
1. Parse & extract core intent
2. Convert to structured specification
3. Present for user confirmation
4. Wait for approval before implementing

**📖 Full examples**: [docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md](docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md)

---

## Duplicate Prevention

**Before creating any new story:**
```bash
grep -ri "keywords" docs/prd/ docs/stories/ docs/cards/
find docs/ -name "*domain*"
```

**Decision**: If similarity >70%, ask user: "Merge? Extend? Separate?"

**📖 Full workflow**: [docs/reference/DUPLICATE-PREVENTION.md](docs/reference/DUPLICATE-PREVENTION.md)

---

## Document Layer Decision

| User Request | Layer | Action |
|-------------|-------|--------|
| "我想做会员积分系统" | **PRD** | Create PRD |
| "用户能查看订单历史" | **Story** | Create Story |
| "订单列表需要分页" | **Card** | Update Card |
| "修复分页的bug" | **Code** | Fix code only |

**📖 Full guide**: [docs/reference/DOCUMENT-LAYER-DECISION.md](docs/reference/DOCUMENT-LAYER-DECISION.md)

---

## API Change Management

| Change Type | Breaking? | Updates |
|------------|-----------|---------|
| Add optional field | ✅ Safe | Card only |
| Add required field | ❌ Breaking | Card + Version |
| Remove/rename field | ❌ Breaking | Card + Version |
| New endpoint | ✅ Safe | Card |

**📖 Full workflow**: [docs/reference/API-CHANGE-MANAGEMENT.md](docs/reference/API-CHANGE-MANAGEMENT.md)

---

## RESTful API Design

**Quick check before implementing:**
- [ ] Plural nouns: `/venues` not `/venue`
- [ ] No redundancy: not `/venue/venues`
- [ ] Actions: `/:id/action` not `/action/:id`

**📖 Full standards**: [docs/reference/RESTFUL-API-DESIGN.md](docs/reference/RESTFUL-API-DESIGN.md)

---

## Project Foundations

### Technical Stack
- **Runtime**: Node.js 18+ / TypeScript
- **Framework**: Express 5.1
- **Database**: MySQL (TypeORM)
- **Docs**: OpenAPI 3.0.3 + Swagger UI

### Project Structure
```
docs/
  stories/        # Business requirements
  cards/          # Technical specs
  integration/    # Consumer runbooks
  reference/      # Detailed guides
  cases/          # Case studies
src/
  modules/        # Implementation
  types/domain.ts # Type definitions
  core/mock/      # Mock data
```

### Mock-First Philosophy
```bash
npm start                     # Mock mode (default, 1-3ms)
USE_DATABASE=true npm start   # Database mode
```

---

## Key Commands

```bash
# Development
npm run build && npm start
curl http://localhost:8080/healthz

# Status
grep "status:" docs/cards/*.md
grep "status: In Progress" docs/cards/*.md

# Testing (AI should run automatically after code changes)
npm test                      # Runs PRD-006 + PRD-007 tests
npm run test:prd006           # PRD-006 only
npm run test:prd007           # PRD-007 only

# Search
grep -ri "keywords" docs/
```

---

## Testing

**Test Pyramid**:
```
PRD Tests (业务规则) → Newman + PRD Acceptance Criteria
    ↓
Story Tests (E2E流程) → Runbook + Newman Collection
    ↓
Card Tests (端点级) → curl + Newman
```

**Testing Workflow**:
| Step | Tool | Command |
|------|------|---------|
| 1. 快速验证 | curl | `curl http://localhost:8080/[endpoint]` |
| 2. E2E 流程 | Runbook | Execute `docs/integration/US-XXX-runbook.md` |
| 3. 自动化 | Newman | `npx newman run postman/xxx.json` |
| 4. 覆盖率 | Registry | Update `docs/test-coverage/_index.yaml` |

**Key Commands**:
```bash
# Quick smoke test
npx newman run postman/QUICK-SMOKE-TESTS.postman_collection.json

# Full platform test
npx newman run postman/COMPLETE-PLATFORM-TESTS.postman_collection.json

# Story-specific test
npx newman run postman/auto-generated/us-012-complete-coverage.postman_collection.json
```

**Test Assets**:
```
docs/integration/US-XXX-runbook.md     # E2E 可执行流程
postman/auto-generated/                 # AI 生成的测试
postman/COMPLETE-PLATFORM-TESTS.json   # 全平台测试
docs/test-coverage/_index.yaml         # 覆盖率追踪
reports/newman/                         # Newman 测试报告输出
```

**📖 AI test generation**: [docs/reference/AI-TEST-GENERATION.md](docs/reference/AI-TEST-GENERATION.md)

---

## Newman Reports

**Standard format** (AI MUST follow):
```bash
npx newman run {collection}.json --reporters cli,junit --reporter-junit-export reports/newman/{id}-e2e.xml
```

| 报告类型 | 命名格式 | 示例 |
|---------|---------|------|
| PRD 测试 | `prd-{id}-e2e.xml` | `prd-006-e2e.xml` |
| Story 测试 | `us-{id}-e2e.xml` | `us-012-e2e.xml` |

**📖 Full standard**: [docs/reference/NEWMAN-REPORT-STANDARD.md](docs/reference/NEWMAN-REPORT-STANDARD.md)

---

## Standards (DoR/DoD)

**Definition of Ready:**
- [ ] Complete API contract in card
- [ ] Dependencies identified
- [ ] Mock data structure agreed

**Definition of Done:**
- [ ] Matches card spec
- [ ] TypeScript compiles
- [ ] Endpoints respond (curl test)
- [ ] Card status = "Done"
- [ ] **Testing Complete** (AI MUST run automatically, no user confirmation needed):
  - [ ] Run `npm test` (executes PRD-006/007 Newman tests)
  - [ ] Runbook created/updated (`docs/integration/US-XXX-runbook.md`)
  - [ ] Newman collection updated (`postman/auto-generated/`)
  - [ ] Coverage updated (`docs/test-coverage/_index.yaml`)

---

## Anti-Script Principle

**Use simple commands, not scripts:**
```bash
# ✅ Use
curl http://localhost:8080/endpoint
grep "status:" docs/cards/*.md
npx newman run postman/xxx.json

# ❌ Don't create scripts for
# - One-time checks
# - Testing endpoints
# - Progress queries
```

**Exception**: Database migrations only.

---

## Code Style

- **Variables/functions**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- async/await for async code
- Proper TypeScript types (no `any`)
- Consistent JSON response formats

---

## Security

- Never commit secrets (use .env)
- Validate all inputs
- Use parameterized queries
- Add authentication where needed

---

## When Stuck

1. Copy patterns from working modules
2. Use mock data (faster)
3. Simple logging: `logger.info('event', data)`
4. **📖 [Troubleshooting Guide](docs/reference/TROUBLESHOOTING.md)**

---

## Reference Links

| Resource | Location |
|----------|----------|
| Detailed workflows | [docs/reference/](docs/reference/) |
| Case studies | [docs/cases/](docs/cases/) |
| Integration proof | [docs/INTEGRATION_PROOF.md](docs/INTEGRATION_PROOF.md) |
| PRDs | [docs/prd/](docs/prd/) |
| Test coverage | [docs/test-coverage/_index.yaml](docs/test-coverage/_index.yaml) |
| OpenAPI spec | [openapi/openapi.json](openapi/openapi.json) |

---

## What's Working (Validated)

- **US-001**: Ticket purchase → QR redemption
- **US-011**: Complex cruise pricing
- **US-012**: OTA platform integration
- **US-013**: Venue operations + fraud detection
- **Mock store**: Products 101-108

---

## Single Source of Truth

1. **Cards** (`docs/cards/`) = API contracts
2. **domain.ts** = Type definitions
3. **OpenAPI** = External tooling
4. **Tests** = Must align with above
