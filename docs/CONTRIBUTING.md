# Contributing Guidelines

## Card Ownership (RACI)

### Author/Editor (Spec AI)
**Creates and evolves card specifications**
- **Owns**: Problem, API Sequence, Contract (OAS), Invariants, Validations, Rules & Writes, Data Impact, Acceptance, Postman Coverage
- **Creates**: New cards from user stories
- **Approves**: Scope changes

### Implementer (Coder AI - Me)
**Implements code and tracks progress**
- **Updates frontmatter only**:
  - `status` (Ready → In Progress → Done)
  - `branch`, `pr`, `newman_report`
  - `last_update`, `readiness`
- **May propose**: Spec changes via PR
- **Cannot**: Change scope unilaterally

### QA/Tester
**Validates implementation**
- **Adds/extends**: Acceptance criteria and Postman checks
- **Proposes**: Error cases and edge scenarios

### PM/Product Owner (You)
**Defines business requirements**
- **Adds/edits**: Stories in `/docs/stories/`
- **Decides**: Lane (`readiness: prototype|production`)
- **Sets**: Priorities

## Card Change Protocol

### Minor Fixes
**Typos, examples, clearer wording**
- Implementer may PR the card
- Author reviews/merges

### Material Changes
**API shape, invariants, DB writes, error codes**
1. Update the story (`/docs/stories/US-xxx.md`)
2. Author revises the card
3. Implementer proceeds with new spec

### Always
- Keep story ↔ card mapping current in `docs/stories/_index.yaml`

## Workflow Summary

```
PM writes Story → Spec AI creates Cards → Coder AI implements → QA validates
     ↓                    ↓                      ↓                    ↓
US-XXX.md         /docs/cards/*.md        /src/modules/*        newman reports
```

## File Structure

```
/docs/
  stories/              # Business requirements (PM owns)
    _index.yaml        # Story→Card mapping (keep current!)
    US-XXX-*.md       # User stories
  cards/               # Technical specs (Spec AI owns content)
    *.md              # Cards (Coder AI updates status only)
  CONTRIBUTING.md      # This file

/src/modules/          # Implementation (Coder AI owns)
/scripts/
  progress-report.js   # Card status tracking
  story-coverage.mjs   # Story→Card coverage
```

## Status Flow

```yaml
# Card frontmatter progression (Coder AI updates):
status: Ready          # Can start work
status: In Progress    # Being implemented
status: PR            # Code complete, in review
status: Done          # Merged and working

# Readiness lanes (PM decides):
readiness: prototype   # Fast MVP approach
readiness: production  # Full DoD compliance
```

## Key Rules

1. **Stories are truth** - Cards derive from stories
2. **Spec AI owns card content** - Coder AI owns status
3. **No unilateral scope changes** - Go through story update
4. **Track everything** - Update frontmatter as you work
5. **Coverage matters** - Run `story-coverage.mjs` regularly