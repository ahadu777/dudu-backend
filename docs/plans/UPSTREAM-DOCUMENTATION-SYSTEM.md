# Upstream Documentation System: Memos → PRD

**Status:** Implemented (Phase 1)
**Created:** 2025-12-20
**Purpose:** Capture synthesized strategic thinking that evolves over time

---

## Summary

After exploring a 3-layer system (Signal → Insight → Thesis), we simplified to a single **Memo** document type that matches how strategic thinking actually works:

- Evolved through multiple conversations
- Already synthesized and presentation-ready
- Reusable across investor/partner/team contexts
- Eventually leads to PRDs when ready to build

---

## What Was Built

### 1. Memo Document Type

**Location:** `docs/memos/`

**Structure:**
```yaml
---
memo_id: "MEMO-001"
title: "Title"
tags: ["tag1", "tag2"]
audience: ["investors", "partners", "team"]
status: "Active"  # Active | Superseded | Archived
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
evolves_from: []  # Previous memo versions
leads_to: []      # PRDs created from this thinking
---

[Your synthesized content in your voice]
```

### 2. Web UI

| Route | Purpose |
|-------|---------|
| `/memos` | Browse all memos, filter by tag |
| `/memos/:id` | View individual memo |

Accessible from `/project-docs` landing page.

### 3. CLAUDE.md Integration

Added **Research Context** section so any new Claude conversation understands:
- What memos are
- When to create them
- How they connect to PRDs

### 4. First Memo

Created `MEMO-001-bank-partnership-rent-payments.md` with your bank partnership value proposition content.

---

## File Structure

```
docs/
├── memos/
│   ├── _index.yaml                              # Memo registry
│   └── MEMO-001-bank-partnership-rent-payments.md
├── prd/                                          # (existing)
├── stories/                                      # (existing)
└── cards/                                        # (existing)

src/
├── utils/
│   └── memoParser.ts                            # Load/parse memos
└── modules/docs/
    └── handlers/
        └── memos.ts                             # Route handlers
```

---

## How to Use

### Capture a Memo (in Claude conversation)

When you have synthesized thinking worth keeping:

> "Save this as a memo about [topic]"

Claude will:
1. Format the content with proper metadata
2. Create the file in `docs/memos/`
3. Update `_index.yaml`

### Browse Memos

```bash
open http://localhost:8080/memos
```

Or visit `/project-docs` and click "Strategic Memos".

### Filter by Tag

Click any tag to filter, or:
```
http://localhost:8080/memos?tag=bank-partnership
```

### Connect to PRD

When a memo leads to building something:

1. Create the PRD with `source_memo: "MEMO-001"`
2. Update the memo with `leads_to: ["PRD-010"]`

---

## Relationship Model

```
Memo (strategic thinking)
  ↓ leads_to (when ready to build)
PRD (product requirements)
  ↓
Story → Card → Code
```

---

## Future Enhancements

If needed later:

1. **Search** - Full-text search across memo content
2. **Lineage graph** - Visualize Memo → PRD connections
3. **Export** - Generate presentation slides from memos
4. **Versioning** - Track how memos evolve via `evolves_from`

---

## Implementation Details

### Parser: `src/utils/memoParser.ts`

Functions:
- `loadMemoDocuments()` - Load all memos
- `getMemoById(id)` - Get specific memo
- `getMemosByTag(tag)` - Filter by tag
- `getMemosByAudience(audience)` - Filter by audience
- `getMemoStats()` - Get statistics
- `searchMemos(query)` - Search content

### Handler: `src/modules/docs/handlers/memos.ts`

- `handleMemosList` - `/memos` route
- `handleMemoDetail` - `/memos/:id` route

---

**Last Updated:** 2025-12-20
