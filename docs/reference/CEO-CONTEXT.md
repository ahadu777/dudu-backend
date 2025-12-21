# CEO Context: Jimmy @ Synque

## Who You Are

**Jimmy** - CEO/CTO of Synque

## Your Goal

Build a **data-driven documentation system** that allows you to constantly ask questions from different angles to evaluate the foundation and progress of the team.

The system serves two purposes:

### 1. Context for Implementation
The documentation (PRD → Story → Card) provides **context** for the project:
- What we're building (PRDs)
- Why we're building it (Stories)
- How to build it (Cards with API specs)

### 2. Evaluation of Progress & Production Readiness
The questions you ask help **evaluate**:
- **Progress**: Are we moving forward? (Cards Done, Stories complete)
- **Production Readiness**: Can we ship? (Tests pass, Compliance score, Coverage)

```
Documentation System
├── PRD/Story/Card = Context (what to build)
└── Evaluation Questions = Assessment (are we ready?)
    ├── Progress: How far along are we?
    └── Production Ready: Can we ship?
```

## Your Philosophy

### Zero Hardcoding Principle
- Markdown/YAML files are the "database"
- UI reads and displays data dynamically
- If changing data requires changing code, it's hardcoded (bad)
- If data changes flow through automatically, it's data-driven (good)

### Evaluation-Driven Leadership
- Ask questions from different perspectives (PM, Dev, QA, Tech Lead)
- The system should make answers visible and accountable
- No one can hide behind "I didn't know" - the data is exposed
- Foundation Score gives you a single number to track health

## Key Questions You Ask

| Role | Question | Where to Check |
|------|----------|----------------|
| CEO | What's the complete project state? | `/ai-sitemap` (JSON) |
| PM | Can I see all features at a glance? | `/sitemap` |
| PM | What's the implementation progress? | `/project-docs` |
| Dev | Is the API contract clear? | `/cards/:slug` |
| Dev | Are my changes breaking anything? | `npm run test:prd` |
| QA | Are all acceptance criteria tested? | `/coverage` |
| Lead | Are PRD->Story->Card relationships intact? | `/compliance` |

## Foundation Score

Your executive dashboard metric (4 dimensions):
- **Compliance (30%)** - Are docs well-structured?
- **Test Pass Rate (30%)** - Is the system working?
- **Docs Complete (20%)** - Are cards done?
- **Production Ready (20%)** - Can we ship?

Access at: `/evaluation`

### Production Readiness Checks

Beyond tests and docs, production readiness includes:
- Node version parity (local vs production)
- Package manager consistency (npm/yarn)
- Dependencies resolve cleanly
- Build succeeds without errors

**Lesson learned (2025-12-21):** DigitalOcean App Platform uses buildpacks (not Dockerfile), resolving `>=18.0.0` to latest Node (24.x). Local should match.

## Data Sources (All Data-Driven)

| What | Source |
|------|--------|
| PRD count | `docs/prd/*.md` |
| Story count | `docs/stories/_index.yaml` |
| Card count | `docs/cards/*.md` |
| Evaluation questions | `docs/reference/evaluation-questions.yaml` |
| Test coverage | `docs/test-coverage/_index.yaml` |
| Compliance rules | `src/utils/complianceAuditor.ts` |

## AI Project Knowledge Base

The `/ai-sitemap` endpoint is the **machine-readable institutional knowledge** of this project.

```
Problem: AI context is ephemeral. Conversations reset. Knowledge is lost.
Solution: The project itself exposes its complete state as structured JSON.
```

### What It Enables
- **AI Onboarding**: Any AI agent can understand the entire project in one request
- **Knowledge Continuity**: When context is lost, fetch `/ai-sitemap` to reconstruct
- **Verification**: AI can answer "Is X ready?" by checking actual sources, not summaries
- **External Integration**: Other systems can programmatically navigate the project

### What It Contains (v3.0)
| Section | Purpose |
|---------|---------|
| `project` | Tech stack, description |
| `knowledge_sources.documentation` | PRD → Story → Card → Memo hierarchy |
| `knowledge_sources.reference_guides` | How to work here |
| `knowledge_sources.testing` | Postman collections = source of truth |
| `knowledge_sources.codebase` | Module structure, key files |
| `verification_guide` | Steps to verify "Is feature X ready?" |
| `summary` | Quick counts across all documentation |

### Quick Access
```bash
# Get complete project state as JSON
curl http://localhost:8080/ai-sitemap | python -m json.tool

# Or view in browser
open http://localhost:8080/ai-sitemap
```

## Quick Commands

```bash
# See foundation health
open http://localhost:8080/evaluation

# Run tests
npm run test:prd

# Check compliance
open http://localhost:8080/compliance
```

## Context for AI

When Jimmy starts a conversation:
1. He's evaluating the foundation, not implementing features
2. He wants data-driven answers, not hardcoded solutions
3. He asks questions that hold the team accountable
4. He cares about the "single number" that represents health
5. He wants to see patterns work across the whole system

## AI Verification Guide

When answering "Is feature X ready?" or "Can user do Y?":

### 1. Don't Trust Summaries Alone
| Source | Type | Trust Level |
|--------|------|-------------|
| `docs/test-coverage/_index.yaml` | Summary | ⚠️ May be outdated |
| `postman/auto-generated/*.json` | Actual tests | ✅ Source of truth |
| `src/modules/**/*.ts` | Implementation | ✅ Source of truth |

### 2. Verification Steps
```
1. TRACE CODE: grep/read actual implementation
   → Find the endpoints that handle the flow

2. FIND TESTS: parse postman/auto-generated/*.json
   → Extract test names with: grep '"name"' <collection>.json

3. CHECK COVERAGE:
   → Individual steps tested? ✅/❌
   → Full E2E chain tested? ✅/❌

4. RUN TEST: npm run test:prd {N}
   → Get actual pass/fail results
```

### 3. Example: "Can operator scan QR from miniprogram?"
| Step | Check | Result |
|------|-------|--------|
| Code exists? | grep scan/qr in src/ | ✅ Found in qr-generation/, operatorValidation/ |
| Tests exist? | PRD-006 has AC-3.2, PRD-008 has A7.1 | ✅ Individual steps |
| E2E chain? | No single test chains miniprogram→operator | ⚠️ Gap |

**Lesson (2025-12-22):** Test coverage YAML summarizes what *should* be tested. Actual test JSON files show what *is* tested. Always verify against the actual test collection when answering flow questions.

**Lesson (2025-12-22):** The `/ai-sitemap` endpoint is machine-readable institutional knowledge. It solves the problem of ephemeral AI context by exposing the complete project state as structured JSON.

---

*Last updated: 2025-12-22*
