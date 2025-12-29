---
card: "Tickets issuance (sync)"
slug: tickets-issuance
team: "B - Fulfillment"
oas_paths: []
migrations: ["db/migrations/0005_tickets_table.sql"]
status: "Deprecated"
deprecated: true
deprecated_date: "2025-12-22"
merged_into: "payment-webhook"
reason: "内部服务逻辑合并到 API Card (payment-webhook)"
readiness: "mvp"
branch: ""
pr: ""
newman_report: "reports/newman/tickets-issuance.json"
last_update: "2025-12-22T10:00:00+08:00"
related_stories: ["US-001", "US-004"]
---

# Tickets issuance (sync) — DEPRECATED

> **⚠️ 此 Card 已废弃**
> - 废弃日期: 2025-12-22
> - 合并到: [payment-webhook](../payment-webhook.md)
> - 原因: Card 应定义 API 契约，内部服务逻辑应合并到调用它的 API Card

## 原内容保留供参考

出票逻辑已合并到 `payment-webhook` Card 的"出票逻辑"章节。

### Service Interface
```typescript
interface TicketService {
  issueTicketsForPaidOrder(orderId: number): Promise<Ticket[]>
}
```

### Migration
- `db/migrations/0005_tickets_table.sql`

### 相关文档
- 新位置: [payment-webhook.md - 出票逻辑章节](../payment-webhook.md#出票逻辑-原-tickets-issuance)
