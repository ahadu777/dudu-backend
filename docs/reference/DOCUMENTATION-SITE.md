# Documentation Visualization Site

**Status:** ✅ Production Ready
**Created:** 2025-11-29
**Purpose:** Web-based visualization of PRDs, Stories, and Cards for Product Management

---

## Overview

The documentation visualization site provides a PM-friendly web interface to browse and understand the complete project structure without accessing source code. It dynamically loads all markdown files and exposes their relationships through an intuitive navigation system.

### Key Principle: Zero Hardcoding

Everything is **dynamically discovered at runtime**:
- PRD files scanned from `docs/prd/*.md`
- Stories loaded from `docs/stories/_index.yaml` and `docs/stories/*.md`
- Cards discovered from `docs/cards/*.md`
- Relationships extracted from YAML frontmatter metadata

**No manual updates required** - just add/edit markdown files and the site reflects changes immediately.

---

## Available Routes

### 1. Documentation Hub - `/project-docs`

**Landing page** with navigation cards and overview statistics.

**What it shows:**
- Quick access to all documentation sections
- Real-time counts: Total PRDs, Stories, Cards
- Test coverage percentage
- Status distribution

**Use case:** Starting point for PM to explore project documentation

---

### 2. PRD Browser - `/prd`

**Lists all Product Requirements Documents** with metadata and related stories.

**What it shows:**
- PRD ID, title, status (Draft/Implemented/Production Ready)
- Product area, creation date, owner
- Related user stories (clickable links)
- Click any PRD to view full details

**Data source:**
- Files: `docs/prd/*.md`
- Metadata: YAML frontmatter (`prd_id`, `status`, `related_stories`)

**Use case:** Browse high-level product requirements

**Example:**
```
📋 PRD-001: Cruise Ticketing Platform [Production Ready]
  Area: Commerce | Created: 2025-10-15
  Related Stories: US-001, US-003, US-007, US-011
```

---

### 3. Individual PRD View - `/prd/:prdId`

**Full details of a specific PRD** with markdown content rendered as HTML.

**What it shows:**
- Complete PRD content (objectives, features, acceptance criteria)
- All metadata (status, owner, deadlines)
- Related stories with direct links
- Link back to PRD browser

**URL patterns:**
- `/prd/PRD-001` or `/prd/001` (both work)

**Use case:** Deep dive into specific product requirements

---

### 4. Stories Browser - `/stories`

**Lists all User Stories** with their status and parent PRD.

**What it shows:**
- Story ID, title, status (Approved/Draft/Done)
- Parent PRD (business requirement)
- Click any story to view full details

**Data source:**
- Primary: `docs/stories/_index.yaml`
- Fallback: `docs/stories/US-*.md` (individual files)
- Relationships: `business_requirement` field links to PRD

**Use case:** Browse all user stories across all PRDs

**Example:**
```
📖 US-001: Buy package and redeem via QR [Approved]
  PRD: PRD-001

📖 US-012: OTA platform integration [Done]
  PRD: PRD-002
```

---

### 5. Individual Story View - `/stories/:storyId`

**Full details of a specific user story** (redirects to `/prd/story/:storyId`).

**What it shows:**
- Complete story content (user journey, acceptance criteria)
- Metadata (status, creation date, deadline)
- Parent PRD (business requirement) with link
- Related cards (if referenced in metadata)

**URL patterns:**
- `/stories/US-001` or `/stories/001` (both work)

**Use case:** Understand specific user story requirements

---

### 6. Cards Browser - `/cards`

**Lists all Implementation Cards** with status, team, and related stories.

**What it shows:**
- Card title, slug, status (Done/Ready/In Progress/Deprecated)
- Team assignment (A - Commerce, B - Tickets, C - Operations)
- API endpoints (from `oas_paths`)
- Related stories (clickable links)
- Status statistics (X Done, Y In Progress, etc.)

**Data source:**
- Files: `docs/cards/*.md`
- Metadata: YAML frontmatter (`slug`, `status`, `team`, `related_stories`)

**Use case:** Browse all technical implementation cards

**Example:**
```
🎯 Catalog endpoint (real) [Done]
  Team: A - Commerce
  Slug: catalog-endpoint
  API: /catalog
  Related Stories: US-001
```

---

### 7. Individual Card View - `/cards/:cardSlug`

**Full details of a specific implementation card** with markdown content.

**What it shows:**
- Complete card content (purpose, contract, rules, tests)
- Metadata (status, team, API paths, last update)
- Related stories with links (bidirectional navigation)
- Link back to cards browser

**URL example:**
- `/cards/catalog-endpoint`

**Use case:** Deep dive into technical implementation details

---

### 8. Sitemap - `/sitemap`

**Hierarchical tree view** showing PRD → Story → Card relationships.

**What it shows:**
- Collapsible tree structure
- All three layers in one view
- Status badges at each level
- Click any item to navigate to details

**Data source:**
- Built dynamically using `sitemapBuilder.ts`
- Relationships from YAML frontmatter across all files

**Use case:** Understand complete project hierarchy at a glance

**Example structure:**
```
📋 PRD-001: Cruise Ticketing Platform [Implemented]
  ├─ 📖 US-001: Buy package & redeem [Approved]
  │   ├─ 🎯 catalog-endpoint [Done]
  │   ├─ 🎯 order-create [Done]
  │   └─ 🎯 payment-webhook [Done]
  ├─ 📖 US-011: Complex pricing [Approved]
  │   └─ 🎯 complex-pricing-engine [Done]
```

---

### 9. Test Coverage - `/coverage`

**Test coverage metrics** from Newman test reports.

**What it shows:**
- Coverage statistics per PRD
- Total requests, assertions, pass rate
- Test collection filenames
- Visual status indicators (Complete/Partial/Draft)

**Data source:**
- File: `docs/test-coverage/_index.yaml`
- Fields: `test_statistics`, `coverage_analysis`

**Use case:** Track testing progress and quality metrics

**Example:**
```
PRD-006 | Ticket Activation System | ✅ Complete (100%)
  Requests: 23 | Assertions: 46 | Pass Rate: 100%
  Collection: prd-006-ticket-activation.json
```

---

## Architecture

### Parser Utilities (Zero Hardcoding)

#### 1. `src/utils/prdParser.ts` (Existing)

**Responsibilities:**
- Scan `docs/prd/` directory for `.md` files
- Parse YAML frontmatter (supports 3 formats: code block, standard, simple)
- Load stories index from `docs/stories/_index.yaml`
- Build PRD → Story relationships

**Key functions:**
```typescript
loadPRDDocuments(): PRDDocument[]        // Scans prd/*.md
loadStoriesIndex(): StoryInfo[]          // Loads _index.yaml
getRelatedStories(prdId, stories)        // Find stories for PRD
getStoryById(storyId)                    // Load individual story
```

**Relationship logic:**
- **Primary:** Match stories where `business_requirement === prdId`
- **Fallback:** Match stories in PRD's `related_stories[]` array

---

#### 2. `src/utils/cardParser.ts` (New)

**Responsibilities:**
- Scan `docs/cards/` directory for `.md` files
- Parse YAML frontmatter (standard `---` format)
- Extract card metadata (slug, status, team, related_stories)
- Provide card lookup and filtering functions

**Key functions:**
```typescript
loadCardDocuments(): CardDocument[]      // Scans cards/*.md
getCardBySlug(slug): CardDocument        // Find specific card
getCardsForStory(storyId)                // Find cards for story
getCardStats()                           // Count by status/team
```

**Metadata fields:**
```yaml
slug: "catalog-endpoint"
status: "Done"
team: "A - Commerce"
oas_paths: ["/catalog"]
related_stories: ["US-001"]
last_update: "2025-10-19T22:21:00+0800"
```

---

#### 3. `src/utils/coverageParser.ts` (New)

**Responsibilities:**
- Load test coverage data from `docs/test-coverage/_index.yaml`
- Parse coverage registry and statistics
- Calculate coverage metrics

**Key functions:**
```typescript
loadTestCoverageData(): TestCoverageData  // Load YAML file
getCoverageForPRD(prdId)                  // Get PRD coverage
getCoverageStats()                        // Calculate metrics
```

**Data structure:**
```yaml
coverage_registry:
  - prd_id: PRD-006
    test_statistics:
      total_requests: 23
      total_assertions: 46
      passed_assertions: 46
```

---

#### 4. `src/utils/sitemapBuilder.ts` (New)

**Responsibilities:**
- Build hierarchical PRD → Story → Card tree
- Use existing parsers to load all data
- Resolve relationships bidirectionally
- Provide reverse lookup utilities

**Key functions:**
```typescript
buildSitemap(): SitemapPRD[]              // Build full tree
findStoriesUsingCard(cardSlug)            // Reverse: Card → Stories
findPRDForStory(storyId)                  // Reverse: Story → PRD
getSitemapStats()                         // Count totals
```

**Relationship resolution:**
1. Load all PRDs, Stories, Cards
2. For each PRD:
   - Find stories via `business_requirement` or `related_stories`
3. For each Story:
   - Find cards via `cards[]` array or `related_stories` field
4. Build nested structure dynamically

---

### Route Handlers (in `src/app.ts`)

All routes use **HTML generation** with:
- Consistent styling and navigation
- Markdown-to-HTML conversion
- Dynamic data loading (no caching)
- Error handling with user-friendly messages

**Common pattern:**
```typescript
this.app.get('/route', (req, res) => {
  try {
    // 1. Load data dynamically
    const data = loadSomeDocuments();

    // 2. Build HTML with styling
    let html = `<!DOCTYPE html>...`;

    // 3. Iterate and render
    data.forEach(item => {
      html += `<div>${item.title}</div>`;
    });

    // 4. Send response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error:', error);
    res.status(500).json({ error: 'Message' });
  }
});
```

---

## Relationship Mapping

### How Relationships Are Discovered

#### PRD → Stories

**Method 1 (Primary):** Stories declare their parent PRD
```yaml
# In docs/stories/_index.yaml or US-*.md
- id: US-001
  business_requirement: "PRD-001"  # ← Links to PRD
```

**Method 2 (Fallback):** PRDs declare their stories
```yaml
# In docs/prd/PRD-001-*.md
prd_id: "PRD-001"
related_stories: ["US-001", "US-003"]  # ← Links to Stories
```

**Implementation:** `getRelatedStories()` tries both methods

---

#### Stories → Cards

**Method 1:** Stories declare their cards
```yaml
# In docs/stories/_index.yaml
- id: US-001
  cards: ["catalog-endpoint", "order-create"]  # ← Card slugs
```

**Method 2:** Cards declare their stories
```yaml
# In docs/cards/catalog-endpoint.md
slug: "catalog-endpoint"
related_stories: ["US-001"]  # ← Story IDs
```

**Implementation:** `buildSitemap()` merges both sources

---

#### Reverse Lookups

**Card → Stories:**
```typescript
findStoriesUsingCard("catalog-endpoint")
// Returns: [US-001, US-003]
```

**Story → PRD:**
```typescript
findPRDForStory("US-001")
// Returns: PRD-001 document
```

---

## Navigation Flow

### Typical PM Journey

1. **Start:** Visit `/project-docs`
   - See overview: 8 PRDs, 18 Stories, 45 Cards
   - Click "PRDs" to explore

2. **Browse PRDs:** Visit `/prd`
   - See PRD-001: Cruise Ticketing Platform
   - Click to view details

3. **View PRD Details:** Visit `/prd/PRD-001`
   - Read full requirements
   - See related stories: US-001, US-003, US-011
   - Click US-001

4. **View Story Details:** Visit `/stories/US-001`
   - Read user story
   - See parent: PRD-001
   - See cards: catalog-endpoint, order-create
   - Click catalog-endpoint

5. **View Card Details:** Visit `/cards/catalog-endpoint`
   - Read technical spec
   - See API: GET /catalog
   - See status: Done
   - Navigate back or to related stories

6. **Check Progress:** Visit `/sitemap`
   - See complete hierarchy
   - Understand how everything connects

7. **Verify Quality:** Visit `/coverage`
   - Check test coverage: 100% for PRD-001
   - Verify all assertions passing

---

## Styling & UX

### Design Principles

1. **Clean & Professional:** Minimal, Apple-inspired design
2. **Responsive:** Works on desktop and mobile
3. **Consistent:** Same navigation on all pages
4. **Accessible:** Clear hierarchy, readable fonts, color-coded status

### Visual Elements

**Status Badges:**
- ✅ Done (green)
- 🔵 Ready (blue)
- ⚠️ In Progress (yellow)
- ❌ Deprecated (red)
- ⚪ Draft (gray)

**Navigation Bar:** (On all pages)
```
[← Project Docs] [PRDs] [Stories] [Cards] [Sitemap] [Coverage]
```

**Icons:**
- 📋 PRD
- 📖 Story
- 🎯 Card
- 🗺️ Sitemap
- 📊 Coverage
- 🔧 API Docs

---

## Data Freshness

### Real-Time Updates

**All data loaded on every request** - no caching:
- Add new PRD → Appears in `/prd` immediately
- Update story status → Reflects in `/stories` immediately
- Add card → Shows in `/cards` immediately
- Change relationships → Sitemap updates immediately

**No restart required** - just refresh the browser.

---

## File Structure

```
docs/
├── prd/                           # PRD markdown files
│   ├── PRD-001-*.md
│   ├── PRD-002-*.md
│   └── ...
├── stories/
│   ├── _index.yaml               # Stories registry
│   ├── US-001-*.md
│   ├── US-012-*.md
│   └── ...
├── cards/
│   ├── catalog-endpoint.md
│   ├── order-create.md
│   └── ...
├── test-coverage/
│   └── _index.yaml               # Coverage data
└── reference/
    └── DOCUMENTATION-SITE.md     # This file

src/
├── utils/
│   ├── prdParser.ts              # PRD & Story loader
│   ├── cardParser.ts             # Card loader
│   ├── coverageParser.ts         # Coverage loader
│   └── sitemapBuilder.ts         # Hierarchy builder
└── app.ts                         # Route handlers
```

---

## Usage Examples

### For Product Managers

**Scenario 1: Check project status**
```
1. Visit /project-docs
2. See: 7/8 PRDs implemented (88%)
3. Click "Test Coverage"
4. Verify: 95% overall coverage
```

**Scenario 2: Understand a feature**
```
1. Visit /prd
2. Click "PRD-002: OTA Platform Integration"
3. Read full requirements
4. Click "US-012: OTA integration"
5. See implementation cards
6. Click card to view technical details
```

**Scenario 3: Plan next sprint**
```
1. Visit /sitemap
2. Expand PRD-005 (Reseller Billing)
3. See status: Draft
4. Check which stories are Ready
5. Click story to understand scope
```

---

### For Developers

**Scenario 1: Find card to implement**
```
1. Visit /cards
2. Filter by status: "Ready"
3. Click card to read spec
4. See related stories for context
5. Click story to understand business requirement
```

**Scenario 2: Add new card**
```
1. Create docs/cards/new-feature.md
2. Add YAML frontmatter:
   slug: new-feature
   status: Ready
   related_stories: [US-015]
3. Refresh /cards
4. New card appears automatically
```

**Scenario 3: Verify test coverage**
```
1. Visit /coverage
2. Find your PRD
3. Check assertions count
4. Verify 100% pass rate
```

---

## Troubleshooting

### Common Issues

**Issue:** Card not appearing in `/cards`

**Solutions:**
- Check filename ends with `.md`
- Verify YAML frontmatter is valid
- Ensure `slug` field is present
- Refresh browser (no caching)

---

**Issue:** Story not linked to PRD

**Solutions:**
- Check `business_requirement: "PRD-XXX"` in story metadata
- OR add story ID to PRD's `related_stories: []` array
- Verify PRD ID format (PRD-001 vs 001)

---

**Issue:** Empty sitemap

**Solutions:**
- Check `docs/prd/` has .md files
- Verify `docs/stories/_index.yaml` exists
- Check YAML syntax is valid
- Review server logs for parsing errors

---

## Best Practices

### For Documentation Maintainers

1. **Always use YAML frontmatter** in markdown files
2. **Keep relationships bidirectional** (story links to PRD, PRD links to stories)
3. **Use consistent IDs** (PRD-001, US-001, not mixed formats)
4. **Update status regularly** (Draft → In Progress → Done)
5. **Link cards to stories** via `related_stories` field

### For Adding New Content

**New PRD:**
```yaml
# docs/prd/PRD-009-new-feature.md
---
prd_id: "PRD-009"
status: "Draft"
related_stories: []
---

# PRD-009: New Feature
...
```

**New Story:**
```yaml
# docs/stories/_index.yaml
- id: US-020
  title: "New user story"
  status: "Draft"
  business_requirement: "PRD-009"
  cards: []
```

**New Card:**
```yaml
# docs/cards/new-endpoint.md
---
slug: new-endpoint
status: "Ready"
team: "A - Commerce"
related_stories: ["US-020"]
---

# New Endpoint
...
```

---

## Performance

### Load Times

- **`/project-docs`:** ~50ms (loads stats from all parsers)
- **`/prd`:** ~30ms (scans prd directory)
- **`/cards`:** ~40ms (scans cards directory)
- **`/sitemap`:** ~80ms (builds full hierarchy)
- **Individual views:** ~10-20ms (single file read)

All times for ~50 total documents. Scales linearly with document count.

### Optimization

**Current approach:** Load on every request (no caching)

**Why:**
- Documentation changes frequently during development
- Real-time updates more important than speed
- Load times acceptable for current scale

**Future optimization (if needed):**
- Add in-memory cache with file watching
- Invalidate cache on file changes
- Keep real-time updates with better performance

---

## Maintenance

### What to Update When

**Adding new metadata field:**
1. Update parser interface (e.g., `CardMetadata`)
2. Update route handler to display field
3. Update this documentation

**Changing relationship logic:**
1. Update parser utility (e.g., `sitemapBuilder.ts`)
2. Test all relationship views (sitemap, cards, stories)
3. Document new behavior

**Adding new route:**
1. Add route handler in `src/app.ts`
2. Add navigation link to `/project-docs`
3. Add navigation bar to new page
4. Update this documentation

---

## Future Enhancements

### Potential Features

**Search functionality:**
- Search across all PRDs, Stories, Cards
- Filter by status, team, dates
- Full-text search in markdown content

**Filtering:**
- Filter cards by team, status
- Filter stories by PRD
- Filter by date range

**Export:**
- Export sitemap as JSON
- Generate PDF reports
- Export test coverage as CSV

**Analytics:**
- Velocity metrics (stories completed over time)
- Coverage trends
- Status distribution charts

**Integration:**
- Link to GitHub PRs from cards
- Link to Jira tickets from stories
- Embed test reports

---

## Summary

The documentation visualization site provides a **zero-maintenance, PM-friendly interface** to explore project structure:

✅ **Dynamic** - No hardcoding, auto-discovers all files
✅ **Complete** - PRDs, Stories, Cards, Test Coverage
✅ **Connected** - Bidirectional relationship navigation
✅ **Real-time** - No caching, always current
✅ **Intuitive** - Clean UI, consistent navigation
✅ **Accessible** - No source code access needed

**Start here:** [http://localhost:8080/project-docs](http://localhost:8080/project-docs)

---

**Last Updated:** 2025-11-29
**Maintainer:** Development Team
**Related:** [CLAUDE.md](../CLAUDE.md), [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)
