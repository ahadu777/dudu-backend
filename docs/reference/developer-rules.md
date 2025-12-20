# Developer Maintenance Rules

> **Critical:** These rules are REQUIRED for the documentation site to work correctly. Breaking these rules causes broken relationships, missing content, and navigation errors.

## 1. Always Include YAML Frontmatter

**PRD Files (docs/prd/*.md):**

```yaml
---
prd_id: "PRD-009"
status: "Draft"
related_stories: []
---
```

**Story Entries (docs/stories/_index.yaml):**

```yaml
- id: US-020
  title: "Story title"
  status: "Draft"
  business_requirement: "PRD-009"
  cards: []
```

**Card Files (docs/cards/*.md):**

```yaml
---
slug: new-endpoint
status: "Ready"
team: "A - Commerce"
related_stories: ["US-020"]
---
```

## 2. Use Consistent ID Formats

| Type | Format | Example | Invalid |
|------|--------|---------|---------|
| PRD | `PRD-###` | PRD-001, PRD-009 | prd-1, PRD1 |
| Story | `US-###` | US-001, US-020 | us-1, US1 |
| Card slug | `kebab-case` | catalog-endpoint | catalog_endpoint |

## 3. Maintain Bidirectional Relationships

**When you link A -> B, you MUST also link B -> A**

- Card links to story (`related_stories: ["US-020"]`)
- Story links back to card (`cards: ["card-slug"]`)
- Story links to PRD (`business_requirement: "PRD-009"`)
- PRD links back to story (`related_stories: ["US-020"]`)

## 4. File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| PRD | `PRD-###-description.md` | PRD-009-user-auth.md |
| Card | `slug-name.md` | catalog-endpoint.md |
| Story | `_index.yaml` | All stories in one file |

## 5. Valid Status Values

| Type | Valid Values |
|------|--------------|
| PRD | Draft, In Progress, Done |
| Story | Draft, In Progress, Done |
| Card | Ready, In Progress, Done |

---

## Common Mistakes That Break the Site

1. **Missing `business_requirement`** in story -> Story appears orphaned
2. **Inconsistent ID casing** (prd-009 vs PRD-009) -> Links break
3. **One-way relationships** -> Content missing from hierarchy
4. **Missing `slug`** in card frontmatter -> Card invisible on site

---

## Pre-Commit Checklist

### For new PRDs:
- Filename follows `PRD-###-description.md`
- `prd_id` matches filename
- `status` and `related_stories` fields present
- PRD added to at least one story's `business_requirement`

### For new Stories:
- Entry added to `docs/stories/_index.yaml`
- `id` follows `US-###` format
- `business_requirement` links to existing PRD
- PRD's `related_stories` includes this story ID

### For new Cards:
- Filename matches slug
- All required fields present: `slug`, `status`, `team`, `related_stories`
- At least one story's `cards` array includes this slug
- Slug uses kebab-case

---

**Remember:** The documentation site is zero-maintenance ONLY if developers follow these rules.
Always verify your changes at [http://localhost:8080/sitemap](http://localhost:8080/sitemap) before committing.
