# Research Context: From Scattered Insights to Business Value

**Owner:** Jimmy (CEO/CTO)
**Status:** Active
**Created:** 2025-12-20

---

## The Problem

Strategic thinking happens everywhere:
- ChatGPT conversations exploring market opportunities
- Claude sessions analyzing pricing strategies
- WeChat discussions with partners
- WhatsApp threads with advisors
- Notion pages with half-formed ideas
- Investor pitch iterations

**Current state:** "I just remember myself" → knowledge trapped in Jimmy's head

**Consequences:**
- Team can't access synthesized thinking
- Same analysis gets repeated
- Hard to show investors our strategic depth
- No systematic way to evolve ideas into products

---

## The Goal

**Transform scattered research into systematic business value drivers.**

```
Scattered Sources          Synthesized Memos         Business Outcomes
─────────────────          ─────────────────         ─────────────────
ChatGPT analysis    ──┐
Claude strategy     ──┼──▶  MEMO-001              ──▶  Investor deck
WeChat insights     ──┤     MEMO-002              ──▶  Team alignment
Partner feedback    ──┤     MEMO-003              ──▶  PRD → Product
Market signals      ──┘         ↓
                           leads_to: PRD-XXX       ──▶  Revenue
```

---

## What We're Building

### Memo System (Implemented)

A lightweight way to capture **synthesized thinking** - not raw notes, but presentation-ready strategic content that has already evolved through multiple conversations.

| What | Where | Purpose |
|------|-------|---------|
| Memos | `docs/memos/` | Strategic thinking, value propositions, pricing strategies |
| Web UI | `/memos` | Browse, filter by tag, share with team |
| CLAUDE.md | Context for AI | New chats understand the system |

### Key Design Decisions

1. **Single document type (Memo)**, not a complex hierarchy
   - We tried Signal → Insight → Thesis, but it didn't match the actual workflow
   - Real strategic thinking is already synthesized when it's worth keeping

2. **Tags over categories**
   - Flexible: `#pricing`, `#medical-pr`, `#b2b`, `#bank-partnership`
   - Cross-cutting: same memo can serve investors AND sales team

3. **Audience-aware**
   - Mark who the memo is for: `investors`, `partners`, `team`, `sales`
   - Enables filtering by context

4. **Connected to product pipeline**
   - `leads_to: [PRD-XXX]` when ready to build
   - Full traceability from idea → product → revenue

---

## Pathways to Synthesized Ideas

Different entry points, same destination:

| Pathway | Example | Capture Trigger |
|---------|---------|-----------------|
| **Market exploration** | "What should we charge for medical PR?" | Deep analysis emerges |
| **Client conversation** | Client asks about services → pricing strategy | Strategic response worth keeping |
| **Investor prep** | Articulating value proposition | Pitch content crystallizes |
| **Partner negotiation** | Bank partnership terms | Deal structure documented |
| **Competitive analysis** | How competitors position | Insights worth preserving |
| **Product ideation** | New feature concept | Ready for PRD |

**Common pattern:** Thinking evolves across multiple conversations until it becomes **presentation-ready**.

---

## Workflow

### Capture
When strategic thinking is worth keeping:
- "Save this as a memo"
- "This analysis is worth storing"
- Claude recognizes strategic content and suggests saving

### Organize
- Tags for discoverability
- Audience for context-aware sharing
- `evolves_from` to track how thinking developed

### Use
- Team browses `/memos` for sales materials
- Investors see our strategic depth
- PRDs reference source memos for context

### Evolve
- Update memo when strategy changes
- Create new version via `evolves_from`
- Connect to PRD when ready to build

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Memos created per month | 5-10 | Capturing institutional knowledge |
| Team memo access | Weekly | Knowledge is being used |
| Memos → PRD conversion | 20% | Ideas becoming products |
| Investor references | Per pitch | Demonstrating strategic depth |

---

## What This Enables

### For Jimmy
- Stop being the sole repository of strategic thinking
- Reference past analysis instead of recreating
- Show investors systematic approach to opportunity evaluation

### For Team
- Access to CEO's strategic reasoning
- Sales scripts and pricing strategies ready to use
- Understand the "why" behind product decisions

### For Investors
- See structured thinking, not just products
- Confidence in strategic process
- Evidence of market awareness

### For Product Development
- PRDs have traceable origins
- Strategic context preserved
- Faster alignment on priorities

---

## The Pattern: Structure Enables Value

This follows the same philosophy we applied to product development:

| Layer | Before Structure | After Structure | Value Unlocked |
|-------|------------------|-----------------|----------------|
| **Code** | Scattered implementations | Card (API contract) | Testable, reviewable |
| **Features** | Vague requirements | Story (user capability) | Acceptance criteria |
| **Product** | Ideas in meetings | PRD (product spec) | Prioritizable, measurable |
| **Strategy** | In Jimmy's head | **Memo** (synthesized thinking) | Shareable, traceable |

**The key insight:** Structure doesn't constrain creativity—it **preserves and amplifies** it.

Without structure:
- Good ideas get lost
- Same analysis repeated
- No accountability trail
- Knowledge trapped in individuals

With structure:
- Ideas are findable
- Analysis is reusable
- Clear path: Idea → Decision → Product → Revenue
- Team has access to strategic context

---

## Capture Friction: The Hard Problem

### Why This Is Difficult

Strategic thinking emerges from **scattered, informal sources**:

| Source | Friction | Current Reality |
|--------|----------|-----------------|
| **WhatsApp** | Chat format, mixed with noise | Screenshots get lost |
| **WeChat** | Same as WhatsApp | "I remember I discussed this..." |
| **ChatGPT** | Conversations don't export easily | Copy-paste, lose context |
| **Notion** | Half-formed, not synthesized | Graveyard of drafts |
| **Verbal** | Partner calls, investor meetings | Ephemeral unless noted |

### Design Choice: Synthesize First, Capture Second

We intentionally **don't** try to capture raw signals from every source. Instead:

```
Raw Sources (high friction)    →    Jimmy's Head (synthesis)    →    Memo (low friction)
──────────────────────────────      ─────────────────────────        ───────────────────
WhatsApp threads                    "This is worth keeping"          Claude creates memo
WeChat discussions           →      Strategic insight forms    →     Structured, tagged
ChatGPT explorations                Presentation-ready                Connected to PRDs
```

**Why this works:**
1. Jimmy already does the synthesis naturally through conversations
2. The "worth keeping" moment is clear—that's when we capture
3. No need to build WhatsApp integrations or parse chat logs
4. Claude (in conversation) is the capture interface

### Practical Workflow

1. **Strategic thinking happens** (any source)
2. **Synthesis occurs** (often in Claude conversation, refining the idea)
3. **Recognition moment:** "This is valuable, save it"
4. **Capture:** Claude creates memo with proper metadata
5. **Use:** Team accesses via `/memos`, connects to PRDs when building

### Future Consideration: Lower Friction Capture

If we want to capture earlier in the process:

| Option | Effort | Value |
|--------|--------|-------|
| **Voice memo → transcribe → summarize** | Medium | Capture verbal insights |
| **Screenshot → OCR → extract** | Medium | WhatsApp/WeChat capture |
| **Browser extension** | High | Capture web research |
| **Notion sync** | Medium | Import existing drafts |

For now, the **Claude conversation as capture interface** is the pragmatic choice.

---

## The Upstream Gap: Before Memos

### Current Stack

```
??? (raw exploration)           ← THE GAP
  ↓
Memo (synthesized, presentation-ready)
  ↓
PRD → Story → Card → Code
```

### The Problem

Memos capture **synthesized thinking**, but what about the exploration phase?

| Stage | State of Thinking | Current Reality |
|-------|-------------------|-----------------|
| **Exploration** | Fragmented, questioning, uncertain | Lost in scattered chat apps |
| **Synthesis** | Connecting dots, forming thesis | Happens in Jimmy's head |
| **Memo** | Crystallized, shareable | ✅ We capture this |

The exploration phase has value:
- Shows how conclusions were reached (investor credibility)
- Prevents losing early signals that become relevant later
- Enables team to understand the research process

### Proposed Solution: Research Hub (Reference Aggregator)

**Key insight:** Don't store raw content in codebase. Instead, create a **hub UI** that links to external documents where the actual research lives.

**Architecture:**

```
External Sources (where content lives)     Research Hub (organizer)      Output
──────────────────────────────────────     ────────────────────────      ──────
Notion doc (ChatGPT export)          ──┐
Notion doc (Claude session)          ──┼──▶  /research/RES-001      ──▶  Memo
Google Doc (meeting notes)           ──┤     - Links to all sources
Screenshot folder (WhatsApp)         ──┘     - Tags, status
                                             - Notes & synthesis
```

**Research Topic format:**

```yaml
# docs/research/RES-2025-12-20-001-medical-pr-pricing.yaml
---
research_id: "RES-2025-12-20-001"
topic: "Medical PR Pricing Strategy"
status: "Active"  # Active | Synthesizing | Done
started: "2025-12-20"
updated: "2025-12-20"
leads_to_memo: []

# External references - the actual content
references:
  - type: "notion"
    title: "ChatGPT: HK Medical PR Market Analysis"
    url: "https://notion.so/xxx"
    date: "2025-12-20"
    notes: "Initial market exploration, pricing ranges"

  - type: "notion"
    title: "Claude: Compliance Requirements Deep Dive"
    url: "https://notion.so/yyy"
    date: "2025-12-20"
    notes: "Medical Council regulations, risk factors"

  - type: "google-doc"
    title: "Call notes with PR agency advisor"
    url: "https://docs.google.com/xxx"
    date: "2025-12-19"
    notes: "Industry insider pricing, competitor analysis"

  - type: "folder"
    title: "WhatsApp screenshots - client conversation"
    url: "file:///Users/mac/Desktop/research/medical-pr/"
    date: "2025-12-18"
    notes: "Original client inquiry"

# Synthesis notes (evolves as you research)
synthesis_notes: |
  Key findings so far:
  - HK$15K-50K range depending on service level
  - Compliance is the key differentiator
  - Need to position as "reputation management" not "PR"

questions_remaining:
  - What's the actual cost structure for media placement?
  - How do competitors handle compliance review?
---
```

### The Workflow

```
1. START RESEARCH
   └── Create research topic in UI: "Medical PR Pricing"

2. EXPLORE (in various tools)
   ├── ChatGPT session → Export to Notion → Add link to research hub
   ├── Claude session → Export to Notion → Add link to research hub
   ├── WhatsApp chat → Screenshot to folder → Add link to research hub
   └── Meeting notes → Google Doc → Add link to research hub

3. ORGANIZE (in research hub UI)
   ├── Add notes to each reference
   ├── Update synthesis_notes as patterns emerge
   └── Track questions_remaining

4. SYNTHESIZE
   └── When ready: "Create memo from this research"
   └── Memo links back: source_research: "RES-2025-12-20-001"

5. ARCHIVE
   └── Mark research topic as "Done"
```

### Web UI: `/research`

**List view:**
| Topic | Status | References | Last Updated |
|-------|--------|------------|--------------|
| Medical PR Pricing | Active | 4 sources | 2025-12-20 |
| Bank Partnership | Done → MEMO-001 | 6 sources | 2025-12-19 |

**Detail view (`/research/RES-001`):**
```
┌─────────────────────────────────────────────────────────────┐
│ Research: Medical PR Pricing Strategy                       │
│ Status: Active                    Started: 2025-12-20       │
├─────────────────────────────────────────────────────────────┤
│ REFERENCES                                      [+ Add Link]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 ChatGPT: HK Medical PR Market Analysis    2025-12-20 │ │
│ │    notion.so/xxx                                        │ │
│ │    Notes: Initial market exploration, pricing ranges    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📄 Claude: Compliance Requirements           2025-12-20 │ │
│ │    notion.so/yyy                                        │ │
│ │    Notes: Medical Council regulations                   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ SYNTHESIS NOTES                                    [Edit]   │
│ Key findings so far:                                        │
│ - HK$15K-50K range depending on service level              │
│ - Compliance is the key differentiator                     │
├─────────────────────────────────────────────────────────────┤
│ QUESTIONS REMAINING                                         │
│ ☐ What's the actual cost structure for media placement?    │
│ ☐ How do competitors handle compliance review?             │
├─────────────────────────────────────────────────────────────┤
│                              [Create Memo from This Research]│
└─────────────────────────────────────────────────────────────┘
```

### Assistant Workflow (ChatGPT/Claude)

When research session ends:

> **Assistant:** "Would you like me to export this to Notion for your research hub?"
>
> **Jimmy:** "Yes"
>
> **Assistant:** Creates Notion doc, provides link
>
> **Jimmy:** Adds link to research topic in `/research` UI

### Benefits

| Benefit | Why It Works |
|---------|--------------|
| **Content stays in native tools** | Notion for AI exports, Google Docs for notes |
| **Hub is lightweight** | Just links + metadata, not content |
| **Easy to add references** | Paste a link, add notes |
| **Synthesis happens in UI** | Notes field evolves as you research |
| **Clear path to memo** | "Create memo" pulls from synthesis notes |
| **Team can see research process** | All references visible |

### Implementation Status

**Not yet implemented.** This is a design proposal.

To implement:
1. Create `docs/research/` directory for YAML files
2. Create research parser (like memoParser)
3. Build `/research` list and detail UI
4. Add "Create Memo" flow that pre-populates from synthesis notes
5. Add `source_research` field to memo metadata

---

## Relationship to Other Documentation

```
RESEARCH-CONTEXT.md (this file)
    ├── Explains the "why"
    └── Strategic framework

UPSTREAM-DOCUMENTATION-SYSTEM.md
    ├── Explains the "how"
    └── Implementation details

docs/memos/
    └── The actual content

CLAUDE.md (Research Context section)
    └── AI awareness for new conversations
```

---

## Future Evolution

As the system matures:

1. **Templates by type**
   - Pricing Strategy template
   - Value Proposition template
   - Market Analysis template

2. **Export capabilities**
   - Generate slides from memos
   - Investor deck compilation

3. **Lineage visualization**
   - See Memo → PRD → Story → Card flow
   - Track which ideas became products

4. **Search & discovery**
   - Full-text search across memos
   - Related memo suggestions

---

**Last Updated:** 2025-12-20
