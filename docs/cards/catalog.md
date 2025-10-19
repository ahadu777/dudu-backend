---
card: "Catalog"
slug: catalog
team: "A - Commerce"
oas_paths: ["/catalog"]
migrations: ["migrations/0001_baseline.sql"]
status: "Done"
branch: "feat/a-catalog"
pr: ""
newman_report: "reports/newman/catalog.json"
last_update: "2025-10-19T18:00:00+08:00"
---

# Purpose
Return active products with pricing and inventory status.

# Contract
See `/openapi/openapi.json` paths: /catalog (3.0.3).

# Rules & Writes
1) Query active products only (active = true).
2) Include inventory availability (sellable - reserved - sold).
3) Return product functions and metadata.
4) No authentication required (public endpoint).

# Evidence
- Postman run: `{{baseUrl}}/catalog` … result: 200 with products array
- Newman JSON: `reports/newman/catalog.json`