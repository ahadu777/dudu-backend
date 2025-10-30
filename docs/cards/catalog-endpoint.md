---
card: "Catalog endpoint (real)"
slug: catalog-endpoint
team: "A - Commerce"
oas_paths: ["/catalog"]
migrations: ["db/migrations/0001_baseline.sql"]
status: "Done"   # Ready | In Progress | PR | Done
branch: "feat/a-catalog-real"
pr: ""
newman_report: "reports/newman/catalog.json"
last_update: "2025-10-19T22:21:00+0800"
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
