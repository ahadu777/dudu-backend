---
card: "DB Baseline and Seed"
slug: db-baseline-seed
team: "Infra"
oas_paths: []
migrations: ["migrations/0001_baseline.sql"]
status: "Done"
branch: "feat/infra-baseline"
pr: ""
newman_report: ""
last_update: "2025-10-19T18:00:00+08:00"
---

# Purpose
Create baseline database schema and seed test data for products.

# Contract
N/A - Infrastructure task.

# Rules & Writes
1) Create products, product_functions, product_inventory tables.
2) Seed with test products (DAYPASS-001, VIP-001, etc.).
3) Set initial inventory levels.
4) Use ON DUPLICATE KEY UPDATE for idempotent seeding.

# Evidence
- Migration applied: `migrations/0001_baseline.sql`
- Mock data store initialized with seed products