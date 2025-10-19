# Documentation Index

## Core Files (AI Reads These)

### 📌 `CLAUDE.md` (AUTO-LOADED)
**Purpose**: Primary reference for Claude AI - loaded automatically every session
**Contains**:
- The proven workflow
- What's actually done
- Essential commands
- Common fixes

## Workflow Documentation

### `WORKFLOW.md`
**Purpose**: Step-by-step implementation guide
**When to read**: When implementing a new feature from scratch

### `DEFINITION_OF_DONE.md`
**Purpose**: Our MVP definition of "done"
**When to read**: To understand what completion means

### `DOD_ALIGNMENT.md`
**Purpose**: Gap analysis between MVP and production
**When to read**: When moving features to production

### `AI_HANDOFF.md`
**Purpose**: Detailed examples and current state
**When to read**: For implementation examples and mock data reference

## Implementation Artifacts

### `/docs/cards/*.md`
**Purpose**: Feature requirements (source of truth)
**Format**: YAML frontmatter + markdown requirements
**Status tracking**: Via frontmatter `status` field

### `/src/modules/`
**Purpose**: Actual implementation code
**Structure**: One folder per feature module

### `/scripts/progress-report.js`
**Purpose**: Shows project status at a glance
**Usage**: `node scripts/progress-report.js`

## Quick Decision Tree

```
Need to implement something new?
  → Start with CLAUDE.md (auto-loaded)
  → Read the card in /docs/cards/
  → Follow WORKFLOW.md steps

Need to check what's done?
  → Run: node scripts/progress-report.js
  → Check DEFINITION_OF_DONE.md for criteria

Need production readiness?
  → Read DOD_ALIGNMENT.md
  → Follow DoD v0.3 from other AI

Stuck or confused?
  → Check AI_HANDOFF.md for examples
  → Look at existing modules in /src/modules/
```

## File Purposes Summary

| File | Auto-Read | Purpose |
|------|-----------|---------|
| CLAUDE.md | ✅ Yes | Primary AI reference |
| WORKFLOW.md | No | Implementation steps |
| DEFINITION_OF_DONE.md | No | Completion criteria |
| AI_HANDOFF.md | No | Examples & details |
| DOD_ALIGNMENT.md | No | Production gap analysis |
| /docs/cards/*.md | No | Feature requirements |

## The One Rule

**If you remember nothing else**:
```bash
node scripts/progress-report.js  # Shows everything
```

This tells you what's done, what's ready, and what's blocked.