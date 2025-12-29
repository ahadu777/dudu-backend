---
card: "Catalog endpoint (real)"
slug: catalog-endpoint
team: "A - Commerce"
oas_paths: ["/catalog"]
migrations: ["db/migrations/0001_baseline.sql"]
status: "Done"
branch: "feat/a-catalog-real"
pr: ""
newman_report: "reports/newman/catalog.json"
last_update: "2025-10-19T22:21:00+0800"
related_stories: ["US-001"]
---

# Catalog endpoint (real) — Dev Notes

## Purpose
Expose active ticket offerings (bus/ferry/package passes) and their functions so buyers can select a package pass.
Note: the response uses `products[]` for backward compatibility; semantically these are ticket offerings.

## Contract
- `GET /catalog` — see `/openapi/openapi.json` (3.0.3).

## Rules & Reads
1) Query active products with functions:
   ```sql
   SELECT p.id, p.sku, p.name, p.status, p.sale_start_at, p.sale_end_at,
          pf.function_code, pf.label, pf.quantity
   FROM products p
   LEFT JOIN product_functions pf ON pf.product_id = p.id
   WHERE p.status='active'
   ORDER BY p.id;
   ```
2) Group rows by product and build `functions[]`.
3) Return `200` with `{ products }`.

## Invariants
- Only `status='active'` products are returned.
- Stable sort by `id ASC`.

## Tests (Postman)
- Status is **200**.
- Response has at least one product and functions array ≥ 1.
- Save the first `product_id` to `{productId}` for the **Order create** card.

```js
pm.test('200', ()=> pm.response.to.have.status(200));
const j = pm.response.json();
pm.expect(j.products.length).to.be.at.least(1);
pm.expect(j.products[0].functions.length).to.be.at.least(1);
pm.collectionVariables.set('productId', String(j.products[0].id));
```

## Observability
- Log `catalog.list` with `{count}`.
- Metric `catalog.list.count`, optional latency metric `catalog.list.latency_ms`.

## Evidence
- Newman report saved to `reports/newman/catalog.json`.
- Example response captured in `/docs/examples/catalog-200.json` (optional).

## Acceptance — Given / When / Then

### 正常流程

#### AC-1: 获取活跃商品列表
- **Given** 服务运行中，数据库中有 status='active' 的产品
- **When** `GET /catalog`
- **Then** 返回 200，`products[]` 至少包含 1 个产品
- **And** 每个产品包含 `id`, `sku`, `name`, `status`, `functions[]`
- **And** 每个产品的 `functions.length >= 1`
- **And** 产品按 `id ASC` 排序

#### AC-2: 产品包含完整功能信息
- **Given** 产品 101 有 3 个功能 (bus, ferry, mrt)
- **When** `GET /catalog`
- **Then** 产品 101 的 `functions[]` 包含 3 项
- **And** 每项包含 `function_code`, `label`, `quantity`

### 异常流程

#### AC-3: 无活跃产品
- **Given** 数据库中所有产品 status='inactive'
- **When** `GET /catalog`
- **Then** 返回 200，`products: []` 空数组

#### AC-4: 数据库连接失败
- **Given** 数据库不可用
- **When** `GET /catalog`
- **Then** 返回 500，`{ error: "INTERNAL_ERROR" }`

### 边界情况

#### AC-5: 产品无功能定义
- **Given** 产品存在但 product_functions 表无对应记录
- **When** `GET /catalog`
- **Then** 该产品的 `functions: []` 为空数组（不报错）

#### AC-6: 高并发读取
- **Given** 100 个并发请求 GET /catalog
- **When** 同时发起请求
- **Then** 所有请求返回 200，响应一致
