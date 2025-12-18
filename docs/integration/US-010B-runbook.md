# US-010B: DeepTravel 运营支撑体系 Runbook

验证后台配置、票券生命周期守护、通知编排与商家核销端的协同，确保运营支撑链路健康。

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-010B |
| **PRD** | PRD-008 |
| **Status** | Draft |
| **Last Updated** | 2025-12-18 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ⚠️ 部分自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `reports/collections/us-010b-operations-backbone.json` |
| Newman Command | `npm run test:story 010B` |
| Related Cards | `admin-package-config`, `operators-login`, `venue-enhanced-scanning`, `notification-orchestrator`, `reports-redemptions` |

---

## 🎯 Business Context

### 用户旅程

```
管理员配置套票模板与票价
  → 系统执行票券生命周期守护
  → 通知编排处理各类事件
  → 操作员登录核销控制台
  → 执行扫码核销
  → 核销事件同步至报表
```

### 业务验收标准 (来自 Story)

| Sub-Story | Given | When | Then |
|-----------|-------|------|------|
| **A - 配置** | 管理员发布线路、票价、退改规则 | 变更保存成功 | 配置在三端即时生效 |
| **B - 守护** | 票券进入待过期或退改流程 | 生命周期守护任务触发 | 更新票券状态，写入审计日志 |
| **C - 通知** | 出现支付/取消/核销等事件 | 通知编排接到事件 | 生成通知并具备重试策略 |
| **D - 核销** | 商家核销员登录控制台 | 扫描票券码核销 | 逐项核销，写入日志，同步报表 |

### 测试目标

- [ ] 验证套票模板与票价配置
- [ ] 验证票券生命周期守护任务
- [ ] 验证通知编排机制
- [ ] 验证商家核销流程
- [ ] 验证报表数据同步

---

## 🔧 Prerequisites

### 环境准备

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **启动命令** | `npm run build && npm start` | 编译并启动服务 |
| **健康检查** | `curl http://localhost:8080/healthz` | 验证服务运行中 |
| **前置依赖** | US-010A 已完成 | 需要可用票券数据 |

### 测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| **Admin** | `Authorization: Bearer admin-token` | 后台配置操作 |
| **Operator** | `alice / secret123` | 操作员登录，获取 operator_token |

### 前置数据

| 数据 | 要求 | 验证方式 |
|------|------|----------|
| Operator alice | 用户名密码已配置 | `POST /operators/login` 成功 |
| 可用票券 | 至少一张 ACTIVE 票券 | 完成 US-010A 流程 |

---

## 🧪 Test Scenarios

### Module 1: 后台配置管理

**Related Card**: `admin-package-config`
**Coverage**: 3/3 ACs (100%)

#### TC-OPS-001: 创建套票模板

**AC Reference**: `admin-package-config.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 管理员已认证 | POST /admin/packages/templates | 模板创建成功，返回 template_id |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer admin-token' \
  -d '{
    "name": "DeepTravel Peak Explorer",
    "status": "active",
    "entitlements": [
      {"function_code": "ferry", "label": "TurboJet", "quantity": 2, "validity_type": "relative", "validity_duration_days": 14},
      {"function_code": "tram", "label": "Peak Tram", "quantity": 1, "validity_type": "relative", "validity_duration_days": 14}
    ],
    "pricing": {
      "currency": "HKD",
      "tiers": [
        {"tier_id": "adult", "name": "Adult", "customer_types": ["adult"], "price": 4500},
        {"tier_id": "family", "name": "Family", "customer_types": ["adult", "child"], "price": 7800}
      ]
    }
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200/201
- [ ] 响应包含 `template_id`
- [ ] entitlements 配置正确保存
- [ ] pricing tiers 配置正确保存

---

#### TC-OPS-002: 配置线路票价

**AC Reference**: `admin-package-config.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 线路 DT-PEAK 存在 | PUT /admin/routes/fares/:id | 票价更新成功，revision 递增 |

**执行命令**:
```bash
curl -s -X PUT http://localhost:8080/admin/routes/fares/DT-PEAK \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer admin-token' \
  -d '{
    "fares": [
      {"passenger_type": "adult", "price": 220, "currency": "HKD"},
      {"passenger_type": "child", "price": 140, "currency": "HKD"}
    ],
    "lockMinutes": 15,
    "blackoutDates": ["2025-12-24"]
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `revision` 为 1 或递增
- [ ] fares 配置正确保存
- [ ] blackoutDates 配置生效

---

#### TC-OPS-003: 查询套票模板列表

**AC Reference**: `admin-package-config.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已创建套票模板 | GET /admin/packages/templates | 返回模板列表 |

**执行命令**:
```bash
curl -s http://localhost:8080/admin/packages/templates \
  -H 'Authorization: Bearer admin-token' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含之前创建的模板
- [ ] 每个模板有 id, name, status

---

### Module 2: 票券生命周期守护

**Related Card**: `ticket-lifecycle-daemon`
**Coverage**: 2/2 ACs (100%)

#### TC-OPS-004: 触发生命周期守护任务

**AC Reference**: `ticket-lifecycle-daemon.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 存在待处理的票券 | POST /internal/tasks/tickets/lifecycle/run | 返回处理统计 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/internal/tasks/tickets/lifecycle/run \
  -H 'X-Debug-Mode: true' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 `expiredProcessed` 统计
- [ ] 包含 `refundTriggered` 统计
- [ ] 票券状态符合策略

---

#### TC-OPS-005: 过期票券自动处理

**AC Reference**: `ticket-lifecycle-daemon.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 存在已过期的票券 | 生命周期守护任务执行 | 票券状态更新为 EXPIRED |

**执行命令**:
```bash
# 查询票券状态验证
curl -s http://localhost:8080/admin/tickets?status=EXPIRED \
  -H 'Authorization: Bearer admin-token' | jq '.tickets | length'
```

**验证点**:
- [ ] 过期票券状态已更新
- [ ] 审计日志已记录
- [ ] 相关退款流程已触发（如适用）

---

### Module 3: 通知编排

**Related Card**: `notification-orchestrator`
**Coverage**: 2/2 ACs (100%)

#### TC-OPS-006: 发送通知事件

**AC Reference**: `notification-orchestrator.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 通知服务运行中 | POST /internal/notifications/dispatch | 通知加入队列 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/internal/notifications/dispatch \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "ticket.expired",
    "orderId": "DT-ORDER-001",
    "ticketId": "TK-001"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `queued` 为 true
- [ ] 通知上下文已记录

---

#### TC-OPS-007: 通知重试机制

**AC Reference**: `notification-orchestrator.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 通知发送失败 | 重试策略触发 | 按指数退避重试 |

**执行命令**:
```bash
# 查询通知队列状态
curl -s http://localhost:8080/internal/notifications/queue/status \
  -H 'Authorization: Bearer admin-token' | jq '.'
```

**验证点**:
- [ ] 失败通知进入重试队列
- [ ] 重试次数记录正确
- [ ] 遵循指数退避策略

---

### Module 4: 商家核销控制台

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 4/4 ACs (100%)

#### TC-OPS-008: 操作员登录

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 操作员 alice 已配置 | POST /operators/login | 返回 operator_token |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `operator_token`
- [ ] token 有效期合理

---

#### TC-OPS-009: 执行扫码核销

**AC Reference**: `venue-enhanced-scanning.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 操作员已登录，票券有效 | POST /venue/scan | 核销成功 |

**执行命令**:
```bash
# 先获取 operator_token
OPERATOR_TOKEN=$(curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' | jq -r '.operator_token')

# 执行核销（替换 <QR_TOKEN> 为实际值）
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `result` 为 "success"
- [ ] 核销日志已记录

---

#### TC-OPS-010: 无效票券核销拒绝

**AC Reference**: `venue-enhanced-scanning.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券无效或已过期 | POST /venue/scan | 返回错误码 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "invalid-token",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] 返回错误状态
- [ ] 包含具体错误码
- [ ] 错误信息清晰

---

#### TC-OPS-011: 重复核销防护

**AC Reference**: `venue-enhanced-scanning.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券已核销 | 再次 POST /venue/scan | 返回已核销错误 |

**执行命令**:
```bash
# 再次尝试核销同一票券
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<SAME_QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] 返回错误状态
- [ ] 错误码为 ALREADY_REDEEMED 或类似
- [ ] 不产生重复核销记录

---

### Module 5: 报表联动

**Related Card**: `reports-redemptions`
**Coverage**: 2/2 ACs (100%)

#### TC-OPS-012: 查询核销报表

**AC Reference**: `reports-redemptions.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已有核销记录 | GET /reports/redemptions | 返回核销事件列表 |

**执行命令**:
```bash
curl -s "http://localhost:8080/reports/redemptions?from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z" \
  -H 'Authorization: Bearer admin-token' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 `events` 数组
- [ ] 事件数量包含最新核销

---

#### TC-OPS-013: 核销事件实时同步

**AC Reference**: `reports-redemptions.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 刚完成一次核销 | 查询报表 | 包含最新核销事件 |

**执行命令**:
```bash
# 记录核销前事件数
BEFORE=$(curl -s "http://localhost:8080/reports/redemptions?from=2025-01-01&to=2025-12-31" \
  -H 'Authorization: Bearer admin-token' | jq '.events | length')

# 执行核销后再次查询
AFTER=$(curl -s "http://localhost:8080/reports/redemptions?from=2025-01-01&to=2025-12-31" \
  -H 'Authorization: Bearer admin-token' | jq '.events | length')

echo "Before: $BEFORE, After: $AFTER"
```

**验证点**:
- [ ] 事件数量递增
- [ ] 最新事件包含正确的核销信息
- [ ] 时间戳准确

---

## 📊 Test Summary

### 验证清单

| 模块 | 测试用例数 | 状态 |
|------|-----------|------|
| Module 1: 后台配置 | 3 | pending |
| Module 2: 生命周期守护 | 2 | pending |
| Module 3: 通知编排 | 2 | pending |
| Module 4: 商家核销 | 4 | pending |
| Module 5: 报表联动 | 2 | pending |
| **Total** | **13** | - |

### 自动化测试

```bash
# 运行 US-010B Newman 测试
npx newman run reports/collections/us-010b-operations-backbone.json

# 运行完整测试脚本
chmod +x docs/integration/scripts/us-010b-test.sh
./docs/integration/scripts/us-010b-test.sh
```

---

## 📎 API 变更说明

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `POST /validators/sessions` | **已废弃** | 不再需要创建 session |
| `POST /merchant/redemptions` | `POST /venue/scan` | 统一使用 venue/scan |
| `session_id` 参数 | `Authorization: Bearer <token>` | 使用 operator token |

---

## 📎 相关资产

| 资产 | 路径 |
|------|------|
| Story 文档 | `docs/stories/US-010B-operations-backbone.md` |
| PRD 文档 | `docs/prd/PRD-008-miniprogram-phase1.md` |
| Newman Collection | `reports/collections/us-010b-operations-backbone.json` |
| 前置依赖 | `docs/integration/US-010A-runbook.md` |
| 扫码核销参考 | `docs/integration/US-013-runbook.md` |
