# US-013: Venue Operations Platform Runbook

场馆运营平台完整测试：操作员认证 → QR 生成 → 场馆扫描 → 防欺诈检测 → 实时分析

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-013 |
| **PRD** | PRD-003 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-013-*.json` |
| Newman Command | `npm run test:story 013` |
| Related Cards | `operators-login`, `venue-enhanced-scanning`, `venue-analytics` |

---

## 🎯 Business Context

### 用户旅程

```
操作员登录验票系统
  → 用户出示 QR 码
  → 操作员扫描验证
  → 系统执行防欺诈检查
  → 核销成功/拒绝
  → 管理员查看分析数据
```

### 测试目标

- [ ] 验证操作员认证流程
- [ ] 验证场馆扫描核销
- [ ] 验证跨终端防欺诈机制
- [ ] 验证实时分析功能

---

## 🔧 Prerequisites

> 📍 **环境配置**: 详见 [_environments.md](./_environments.md)

| 环境 | Base URL |
|------|----------|
| 本地开发 | `http://localhost:8080` |
| 线上开发 | `https://mesh.synque.ai` |

| 项目 | 值 | 说明 |
|------|-----|------|
| **操作员账号** | `alice / secret123` | 测试操作员 |
| **场馆代码** | `central-pier`, `cheung-chau` | 测试场馆 |

---

## 🧪 Test Scenarios

### Module 1: 操作员认证

**Related Card**: `operators-login`
**Coverage**: 3/3 ACs (100%)

#### TC-VEN-001: 操作员登录成功

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效操作员凭证 | POST /operators/login | 返回 200，包含 operator_token |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 JWT 格式的 operator_token
- [ ] Token 可用于后续请求

---

#### TC-VEN-002: 操作员登录失败（错误密码）

**AC Reference**: `operators-login.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 错误的密码 | POST /operators/login | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 不返回 token

---

#### TC-VEN-003: 无认证扫描被拒绝

**AC Reference**: `operators-login.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | POST /venue/scan | 返回错误 |

**验证点**:
- [ ] 返回错误信息
- [ ] 提示需要 operator token

---

### Module 2: 场馆扫描

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 4/4 ACs (100%)

#### TC-VEN-004: 扫描核销成功

**AC Reference**: `venue-enhanced-scanning.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 QR Token 和操作员 Token | POST /venue/scan (ferry) | 返回 success |

**验证点**:
- [ ] result = success
- [ ] 返回 ticket_code
- [ ] 返回 remaining_uses
- [ ] 包含 performance_metrics

---

#### TC-VEN-005: 错误功能码被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 在 ferry-only 场馆尝试 gift_redemption | POST /venue/scan | 返回 WRONG_FUNCTION |

**验证点**:
- [ ] result = reject
- [ ] reason = WRONG_FUNCTION

---

#### TC-VEN-006: 跨终端防欺诈检测

**AC Reference**: `venue-enhanced-scanning.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一 QR 在另一场馆扫描 | POST /venue/scan (不同 venue) | 返回 ALREADY_REDEEMED |

**验证点**:
- [ ] result = reject
- [ ] reason = ALREADY_REDEEMED
- [ ] JTI 重复检测生效

---

#### TC-VEN-007: 过期 QR Token 被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用过期的 QR Token | POST /venue/scan | 返回 TOKEN_EXPIRED |

**验证点**:
- [ ] result = reject
- [ ] reason = TOKEN_EXPIRED

---

### Module 3: 多功能验证

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 2/2 ACs (100%)

#### TC-VEN-008: 多功能票券 - Ferry 核销

**AC Reference**: `venue-enhanced-scanning.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 多功能票券 (ferry, bus, gift) | POST /venue/scan (ferry) | Ferry 权益减少 |

**验证点**:
- [ ] Ferry 核销成功
- [ ] 其他功能权益不变

---

#### TC-VEN-009: 多功能票券 - Bus 核销

**AC Reference**: `venue-enhanced-scanning.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一票券 | POST /venue/scan (bus) | Bus 权益减少 |

**验证点**:
- [ ] Bus 核销成功
- [ ] remaining_uses 正确递减

---

### Module 4: 实时分析

**Related Card**: `venue-analytics`
**Coverage**: 2/2 ACs (100%)

#### TC-VEN-010: 获取场馆分析数据

**AC Reference**: `venue-analytics.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 场馆有扫描记录 | GET /venue/:code/analytics | 返回统计数据 |

**验证点**:
- [ ] 返回 total_scans
- [ ] 返回 successful_scans
- [ ] 返回 fraud_attempts
- [ ] 返回 function_breakdown

---

#### TC-VEN-011: 按时间范围查询分析

**AC Reference**: `venue-analytics.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 指定 hours 参数 | GET /venue/:code/analytics?hours=24 | 返回指定时间范围数据 |

**验证点**:
- [ ] period.hours = 24
- [ ] 数据在时间范围内

---

### Module 5: 性能验证

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 2/2 ACs (100%)

#### TC-VEN-012: 响应时间 < 2 秒

**AC Reference**: `venue-enhanced-scanning.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 正常扫描请求 | POST /venue/scan | 响应时间 < 2000ms |

**验证点**:
- [ ] response_time_ms < 2000
- [ ] fraud_checks_passed = true

---

#### TC-VEN-013: 并发扫描处理

**AC Reference**: `venue-enhanced-scanning.AC-8`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 10 个并发请求 | 同时 POST /venue/scan | 所有请求成功处理 |

**验证点**:
- [ ] 所有请求在合理时间内完成
- [ ] 无请求超时或失败

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 操作员认证 | 3 | pending |
| 场馆扫描 | 4 | pending |
| 多功能验证 | 2 | pending |
| 实时分析 | 2 | pending |
| 性能验证 | 2 | pending |
| **Total** | **13** | **0/13 通过** |

---

## 🔗 Related Documentation

- [operators-login](../cards/operators-login.md)
- [venue-enhanced-scanning](../cards/venue-enhanced-scanning.md)
- [venue-analytics](../cards/venue-analytics.md)

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (8 scenarios)

- [ ] **TC-VEN-101**: 操作员登录验票系统
  - 操作: 使用操作员凭证 (alice/secret123) → 登录系统
  - **Expected**: 返回 operator_token，可用于后续操作

- [ ] **TC-VEN-102**: 用户出示有效 QR 码
  - 操作: 客户展示有效票券二维码
  - **Expected**: QR 码格式正确，可被系统识别

- [ ] **TC-VEN-103**: 操作员扫描验证（成功）
  - 操作: 操作员扫描有效 QR → 选择功能码（如 ferry_boarding）
  - **Expected**: 显示绿色，核销成功，权益减少 1

- [ ] **TC-VEN-104**: 操作员扫描验证（日期不符）
  - 操作: 操作员扫描非当日预约的 QR
  - **Expected**: 显示黄色警告，提示预约日期不符

- [ ] **TC-VEN-105**: 跨终端防欺诈检测
  - 操作: 同一 QR 在另一场馆扫描相同功能
  - **Expected**: 返回 ALREADY_REDEEMED，拒绝核销

- [ ] **TC-VEN-106**: 多功能票券验证
  - 操作: 扫描多功能票券 → 依次核销 ferry、bus、gift 功能
  - **Expected**: 每个功能独立核销，权益分别递减

- [ ] **TC-VEN-107**: 查看场馆分析数据
  - 操作: 管理员查询 /venue/:code/analytics?hours=24
  - **Expected**: 返回总扫描数、成功率、欺诈尝试、功能分布

- [ ] **TC-VEN-108**: 场馆列表管理
  - 操作: 查看所有场馆列表 → 查看各场馆支持的功能
  - **Expected**: 显示所有活跃场馆及其支持功能（如 central-pier 支持 ferry_boarding）

### Round 2: 异常场景 (5 scenarios)

- [ ] **TC-VEN-201**: 操作员登录失败
  - 操作: 使用错误密码登录
  - **Expected**: 返回 401，不返回 token

- [ ] **TC-VEN-202**: 无认证扫描被拒绝
  - 操作: 不提供 Authorization header → 尝试扫描
  - **Expected**: 返回错误，提示需要 operator token

- [ ] **TC-VEN-203**: 错误功能码扫描
  - 操作: 在 ferry-only 场馆尝试 gift_redemption
  - **Expected**: 返回 WRONG_FUNCTION，拒绝核销

- [ ] **TC-VEN-204**: 过期 QR Token
  - 操作: 使用过期的 QR Token 扫描
  - **Expected**: 返回 TOKEN_EXPIRED，拒绝核销

- [ ] **TC-VEN-205**: 未激活票券扫描
  - 操作: 扫描未激活的 OTA 票券
  - **Expected**: 返回错误，提示"票券未激活"

### Round 3: 边界测试 (3 scenarios)

- [ ] **TC-VEN-301**: 并发扫描处理
  - 操作: 10 个操作员同时扫描不同票券
  - **Expected**: 所有请求成功处理，无超时或失败

- [ ] **TC-VEN-302**: 扫描响应时间
  - 操作: 正常扫描请求
  - **Expected**: 响应时间 < 2000ms，包含防欺诈检测

- [ ] **TC-VEN-303**: 分析时间窗口限制
  - 操作: 尝试查询超过 1 周的分析数据
  - **Expected**: 返回错误，提示"时间窗口不能超过 168 小时"

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | System | 初始版本 |
