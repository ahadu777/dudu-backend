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
| PM | Can I see all features at a glance? | `/sitemap` |
| PM | What's the implementation progress? | `/project-docs` |
| Dev | Is the API contract clear? | `/cards/:slug` |
| Dev | Are my changes breaking anything? | `npm run test:prd` |
| QA | Are all acceptance criteria tested? | `/coverage` |
| Lead | Are PRD->Story->Card relationships intact? | `/compliance` |

## Foundation Score

Your executive dashboard metric:
- **Compliance (40%)** - Are docs well-structured?
- **Test Pass Rate (40%)** - Is the system working?
- **Docs Complete (20%)** - Are cards done?

Access at: `/evaluation`

## Data Sources (All Data-Driven)

| What | Source |
|------|--------|
| PRD count | `docs/prd/*.md` |
| Story count | `docs/stories/_index.yaml` |
| Card count | `docs/cards/*.md` |
| Evaluation questions | `docs/reference/evaluation-questions.yaml` |
| Test coverage | `docs/test-coverage/_index.yaml` |
| Compliance rules | `src/utils/complianceAuditor.ts` |

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

---

*Last updated: 2025-12-20*
