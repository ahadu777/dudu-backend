---
id: US-002
title: Operator scan with session + atomic redemption
owner: Product
status: "Done"
priority: High
last_update: 2025-12-12T00:00:00+0800
business_requirement: "PRD-003"
depends_on:
  - US-001  # Tickets must exist to be scanned
cards:
  - operators-login
  - venue-enhanced-scanning
---

## Business goal
Allow an operator to validate and redeem a buyer’s ticket **safely and traceably** at a gate/device, with replay prevention and clear audit (who/where/when/what).

## Actors
- Operator (gate staff)
- Validator device/app (bound to a location)
- Buyer (indirect)
- System (redeem API)

## Scope (in)
- Operator login → Start validator session → Scan QR → Atomic validation + redemption → Store audit event → Return clear decision

## Out of scope (now)
- 手动输入票券编码（备用方案）
- Full offline queue and conflict resolution (only basic replay prevention)
- Manual overrides/force-entry
- Refunds or reversals
- Partner revenue-share

## Acceptance (Given/When/Then)

> **注意**：验收标准采用用户视角（黑盒），技术细节见关联 Cards

**场景 A — 操作员登录**
- Given 操作员账号已创建
- When 操作员使用用户名和密码登录
- Then 系统返回登录成功，操作员可进入核销界面
- Then 如凭证无效，系统提示"用户名或密码错误"

**场景 B — 扫码核销成功**
- Given 顾客出示有效的票券二维码，该权益有剩余使用次数
- When 操作员扫描二维码并选择要核销的权益
- Then 系统显示"核销成功"，显示票券状态和剩余权益
- Then 该权益剩余次数减 1
- Then 系统记录核销日志（操作员、时间、地点、设备）

**场景 C — 同一权益重复核销拦截**
- Given 同一张二维码的某项权益已被核销过
- When 再次扫描同一二维码并尝试核销相同权益
- Then 系统提示"该权益已核销"
- Note 同一二维码可核销不同权益，但同一权益只能核销一次

**场景 D — 权益不匹配**
- Given 顾客的票券不包含所选权益
- When 操作员尝试核销该权益
- Then 系统提示"票券不包含此权益"

**场景 E — 次数已用完**
- Given 顾客的某项权益剩余次数为 0
- When 操作员尝试核销该权益
- Then 系统提示"该权益已用完"

**场景 F — 二维码过期（仅小程序票券）**
- Given 小程序用户的二维码已超过有效期（30分钟）
- When 操作员扫描该二维码
- Then 系统提示"二维码已过期，请刷新"
- Note OTA 票券二维码为长期有效，不受此限制

**场景 G — 二维码已被取代**
- Given 顾客重新生成了新的二维码
- When 操作员扫描旧的二维码
- Then 系统提示"二维码已失效，请使用最新二维码"

## Non-functional constraints
- QR token TTL: 小程序票券 30 分钟，OTA 票券长期有效
- 每个 QR 包含唯一 jti（JWT ID）用于追踪和防重放
- Idempotency: 同一 jti + function_code 组合只能核销一次
- 一码失效机制: 重新生成 QR 会使旧 QR 失效（current_jti 校验）
- Transactional lock (SELECT … FOR UPDATE) on entitlement row
- P99 scan latency ≤ 300ms

## Data notes
- redemption_events 记录每次核销，包含 jti + function_code 组合（同一组合唯一）
- Ticket status transitions: PRE_GENERATED → ACTIVATED → (可核销) → USED
- 票券 extra/raw 字段存储 current_jti，用于一码失效机制
- validator_sessions binds operator_id + device_id (+ optional location_id)

## Links
- OAS paths: /operators/login, /venue/scan, /qr/decrypt
- Related cards: operators-login, venue-enhanced-scanning, qr-generation-api

> **Deprecated**: `/validators/sessions` and `/tickets/scan` have been replaced by operator JWT auth and `/venue/scan`.