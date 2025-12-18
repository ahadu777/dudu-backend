# US-010: Admin Package Configuration Runbook

管理后台配置完整测试：模板版本管理 → 线路票价配置 → 历史查询 → 回滚操作

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-010 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-010-*.json` |
| Newman Command | `npm run test:story 010` |
| Related Cards | `package-template`, `route-fares` |

---

## 🎯 Business Context

### 用户旅程

```
管理员登录后台
  → 创建套餐模板
  → 发布新版本
  → 配置线路票价
  → 查看历史版本
  → 必要时回滚
```

### 测试目标

- [ ] 验证模板创建和版本控制
- [ ] 验证幂等性处理
- [ ] 验证线路票价配置
- [ ] 验证历史查询和回滚

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **认证** | Mock 模式无需认证 | 假设管理员上下文 |
| **Demo UI** | `/demo/admin-packages` | 可视化测试 |

---

## 🧪 Test Scenarios

### Module 1: 套餐模板管理

**Related Card**: `package-template`
**Coverage**: 4/4 ACs (100%)

#### TC-ADM-001: 创建初始模板 (v1.0.0)

**AC Reference**: `package-template.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效模板数据 | POST /admin/packages/templates | 返回 201，version = v1.0.0 |

**验证点**:
- [ ] 返回状态码 201
- [ ] idempotent = false
- [ ] version = v1.0.0
- [ ] 返回 templateId

---

#### TC-ADM-002: 幂等性 - 重复创建

**AC Reference**: `package-template.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 相同 payload | POST /admin/packages/templates | 返回 200，idempotent = true |

**验证点**:
- [ ] 返回状态码 200
- [ ] idempotent = true
- [ ] 不创建重复版本

---

#### TC-ADM-003: 创建新版本 (v1.0.1)

**AC Reference**: `package-template.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 修改后的 payload | POST /admin/packages/templates | 返回 201，version = v1.0.1 |

**验证点**:
- [ ] 返回状态码 201
- [ ] version = v1.0.1
- [ ] 新增功能已包含

---

#### TC-ADM-004: 查看版本历史

**AC Reference**: `package-template.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已有多个版本 | GET /admin/packages/templates/:id/versions | 返回版本列表 |

**验证点**:
- [ ] 包含 v1.0.0 和 v1.0.1
- [ ] 每个版本有时间戳

---

### Module 2: 线路票价配置

**Related Card**: `route-fares`
**Coverage**: 4/4 ACs (100%)

#### TC-ADM-005: 配置线路票价 (Revision 1)

**AC Reference**: `route-fares.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效票价数据 | PUT /admin/routes/fares/RT-001 | 返回 200，revision = 1 |

**验证点**:
- [ ] 返回状态码 200
- [ ] revision = 1
- [ ] fares 已保存

---

#### TC-ADM-006: 更新线路票价 (Revision 2)

**AC Reference**: `route-fares.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 修改后的票价 | PUT /admin/routes/fares/RT-001 | 返回 200，revision = 2 |

**验证点**:
- [ ] 返回状态码 200
- [ ] revision = 2
- [ ] 新票价生效

---

#### TC-ADM-007: 查看票价历史

**AC Reference**: `route-fares.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已有多个修订 | GET /admin/routes/fares/RT-001/history | 返回历史列表 |

**验证点**:
- [ ] 包含 revision 1 和 2
- [ ] 每个修订有详细数据

---

#### TC-ADM-008: 回滚到上一修订

**AC Reference**: `route-fares.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有历史修订存在 | POST /admin/routes/fares/RT-001/restore | 返回 200，恢复上一版本 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 票价恢复到 revision 1
- [ ] blackoutDates 已恢复

---

### Module 3: 错误处理

**Related Card**: `package-template`
**Coverage**: 2/2 ACs (100%)

#### TC-ADM-009: 版本冲突

**AC Reference**: `package-template.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 相同版本号，不同内容 | POST /admin/packages/templates | 返回 409 |

**验证点**:
- [ ] 返回状态码 409
- [ ] 提示版本冲突

---

#### TC-ADM-010: 连续回滚被拒绝

**AC Reference**: `route-fares.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无更早历史 | POST /admin/routes/fares/RT-001/restore | 返回 409 |

**验证点**:
- [ ] 返回状态码 409
- [ ] 提示无可回滚版本

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 套餐模板管理 | 4 | pending |
| 线路票价配置 | 4 | pending |
| 错误处理 | 2 | pending |
| **Total** | **10** | **0/10 通过** |

---

## 🔗 Related Documentation

- [package-template](../cards/package-template.md)
- [route-fares](../cards/route-fares.md)

## Demo UI

访问 `http://localhost:8080/demo/admin-packages` 可直接在浏览器中测试以上功能。

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (7 scenarios)

- [ ] **TC-ADM-E2E-001**: 查询可售资源（热门城市）
  - 操作: 管理员已配置线路、班次、套餐 → 旅客查询热门出发地/目的地/日期
  - **Expected**: 返回车票、船票与套票列表，展示余票、阶梯定价、权益概览，命中缓存策略

- [ ] **TC-ADM-E2E-002**: 下单锁座成功
  - 操作: 旅客选定商品并填写乘客信息 → 提交订单
  - **Expected**: 系统校验库存并锁座（默认 10 分钟），生成 `pending` 订单，包含乘客、权益快照与 `lockExpireAt`

- [ ] **TC-ADM-E2E-003**: 支付与票券生成
  - 操作: 订单锁座有效期内 → 微信支付回调成功
  - **Expected**: 订单更新为 `paid`，为每位乘客生成票券（含有效期、加密二维码），发送支付成功通知

- [ ] **TC-ADM-E2E-004**: 票券状态维护（退改）
  - 操作: 订单已支付且票券可用 → 旅客发起退改/改签
  - **Expected**: 根据退改策略更新票券状态为 `refunded` 或 `changed`，全部票券终态后订单标记为 `completed` 或 `cancelled`

- [ ] **TC-ADM-E2E-005**: 核销闭环
  - 操作: 商家核销员登录 → 扫描订单码或单券码
  - **Expected**: 展示对应票券列表，支持逐项核销，记录核销日志，向旅客推送核销成功通知

- [ ] **TC-ADM-E2E-006**: 管理配置套餐模板与线路票价
  - 操作: 管理员访问后台 → 创建套餐模板 → 配置线路票价
  - **Expected**: 变更即时生效，后台可监控订单与票券状态指标

- [ ] **TC-ADM-E2E-007**: 通知能力（支付成功、核销成功）
  - 操作: 触发支付成功或核销成功事件
  - **Expected**: 旅客收到微信通知，通知内容符合约定格式

### Round 2: 异常场景 (3 scenarios)

- [ ] **TC-ADM-E2E-008**: 支付失败或超时取消订单
  - 操作: 订单锁座有效期内 → 微信支付失败或超时
  - **Expected**: 订单更新为 `cancelled`，释放锁座库存

- [ ] **TC-ADM-E2E-009**: 票券过期处理
  - 操作: 系统定时任务检测到票券过期
  - **Expected**: 票券状态更新为 `expired`，不可再核销

- [ ] **TC-ADM-E2E-010**: 核销权限校验
  - 操作: 商家核销员未登录或无扫码权限 → 尝试扫码
  - **Expected**: 拒绝操作，提示需要认证或权限不足

---

## 📝 Revision History

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1 | 2025-12-18 | 添加 QA E2E Checklist |
| v1.0 | 2025-12-17 | 初始版本 |
