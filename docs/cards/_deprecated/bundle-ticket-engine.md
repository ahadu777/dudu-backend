---
card: "Bundle ticket engine"
slug: bundle-ticket-engine
team: "B - Fulfillment"
oas_paths: []
migrations: ["db/migrations/0012_ticket_entitlements.sql"]
status: "Deprecated"
deprecated: true
deprecated_date: "2025-12-22"
merged_into: "payment-webhook"
reason: "内部服务逻辑合并到 API Card (payment-webhook)"
readiness: "mvp"
branch: ""
pr: ""
newman_report: "reports/newman/bundle-ticket-engine.json"
last_update: "2025-12-22T10:00:00+08:00"
related_stories: ["US-010", "US-010A"]
---

# Bundle ticket engine — DEPRECATED

> **⚠️ 此 Card 已废弃**
> - 废弃日期: 2025-12-22
> - 合并到: [payment-webhook](../payment-webhook.md)
> - 原因: Card 应定义 API 契约，内部服务逻辑应合并到调用它的 API Card

## 原内容保留供参考

套票发券引擎逻辑已合并到 `payment-webhook` Card 的"套票发券引擎"章节。

### Service Interface
```typescript
interface BundleEngine {
  issueBundleTickets(orderId: string): Promise<TicketPayload[]>
}
```

### Migration
- `db/migrations/0012_ticket_entitlements.sql`

### 相关文档
- 新位置: [payment-webhook.md - 套票发券引擎章节](../payment-webhook.md#套票发券引擎-原-bundle-ticket-engine)
