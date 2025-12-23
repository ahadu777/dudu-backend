---
card: "DB Baseline and Seed"
slug: db-baseline
team: "Infra"
oas_paths: []
migrations: ["migrations/0001_baseline.sql"]
status: "Deprecated"
deprecated: true
deprecated_date: "2025-12-22"
merged_into: "N/A"
reason: "基础设施任务，不属于 API Card 范畴"
branch: "feat/infra-baseline"
pr: ""
newman_report: ""
last_update: "2025-12-22T10:00:00+08:00"
related_stories: []
---

# DB Baseline and Seed — DEPRECATED

> **⚠️ 此 Card 已废弃**
> - 废弃日期: 2025-12-22
> - 原因: 基础设施任务不属于 Card（API 契约）的定义范畴

## 原内容保留供参考

### Purpose
Create baseline database schema and seed test data for products.

### Contract
N/A - Infrastructure task.

### Rules & Writes
1) Create products, product_functions, product_inventory tables.
2) Seed with test products (DAYPASS-001, VIP-001, etc.).
3) Set initial inventory levels.
4) Use ON DUPLICATE KEY UPDATE for idempotent seeding.

### Evidence
- Migration applied: `migrations/0001_baseline.sql`
- Mock data store initialized with seed products
