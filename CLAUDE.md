# AI Development Guide

## Quick Navigation

| Task | Action |
|------|--------|
| **Start here** | [Reality Check](#reality-check) |
| **Natural language request** | @docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md |
| **New story?** | @docs/reference/DUPLICATE-PREVENTION.md |
| **PRD vs Story vs Card?** | @docs/reference/DOCUMENT-LAYER-DECISION.md |
| **API changing?** | @docs/reference/API-CHANGE-MANAGEMENT.md |
| **New API?** | @docs/reference/RESTFUL-API-DESIGN.md |
| **Generate tests?** | @docs/reference/AI-TEST-GENERATION.md |
| **Newman reports?** | @docs/reference/NEWMAN-REPORT-STANDARD.md |
| **Troubleshooting?** | @docs/reference/TROUBLESHOOTING.md |
| **Complex scenario?** | @docs/reference/KNOWLEDGE-GRAPH.md |
| **Refactoring code?** | @docs/reference/REFACTORING-IMPACT.md |

---

## Core Modules (Auto-loaded via @import)

### Tech Stack & TypeORM Rules
@docs/claude/tech-stack.md

### Testing Guidelines
@docs/claude/testing.md

### Development Standards (DoR/DoD)
@docs/claude/standards.md

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

## Document Layer Decision (Quick Reference)

| User Request | Layer | Action |
|-------------|-------|--------|
| "我想做会员积分系统" | **PRD** | Create PRD |
| "用户能查看订单历史" | **Story** | Create Story |
| "订单列表需要分页" | **Card** | Update Card |
| "修复分页的bug" | **Code** | Fix code only |

---

## Key Commands

```bash
# Development
npm run build && npm start
curl http://localhost:8080/healthz

# Status
grep "status:" docs/cards/*.md
grep "status: In Progress" docs/cards/*.md

# Testing (Auto-discovery)
npm test                      # Smoke + All PRD + US-014
npm run test:prd 006          # Specific PRD test
npm run test:story 014        # Specific Story test

# Search
grep -ri "keywords" docs/
```

---

## Reference Links

| Resource | Location |
|----------|----------|
| Detailed workflows | [docs/reference/](docs/reference/) |
| Case studies | [docs/cases/](docs/cases/) |
| PRDs | [docs/prd/](docs/prd/) |
| Test coverage | [docs/test-coverage/_index.yaml](docs/test-coverage/_index.yaml) |
| OpenAPI spec | [openapi/openapi.json](openapi/openapi.json) |

---

## What's Working (Validated)

- **US-001**: Ticket purchase → QR redemption
- **US-011**: Complex cruise pricing
- **US-012**: OTA platform integration
- **US-013**: Venue operations + fraud detection
- **US-014**: WeChat mini-program authentication
- **PRD-006**: Ticket activation system (46 assertions)
- **PRD-007**: Reservation validation (62 assertions)

---

## Single Source of Truth

1. **Cards** (`docs/cards/`) = API contracts
2. **domain.ts** = Type definitions
3. **OpenAPI** = External tooling
4. **Tests** = Must align with above
