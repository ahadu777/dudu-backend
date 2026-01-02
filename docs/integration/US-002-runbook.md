# US-002: Operator Scan & Redemption Runbook

操作员扫描核销完整测试：登录认证 → 票券扫描 → 核销成功/拒绝 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-002 |
| **PRD** | PRD-003 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-002-*.json` |
| Newman Command | `npm run test:story 002` |
| Related Cards | `operators-login`, `venue-enhanced-scanning` |

---

## 🎯 Business Context

### 用户旅程

```
操作员登录系统
  → 用户出示 QR 码
  → 操作员扫描验证
  → 系统返回核销结果
  → 操作员确认/拒绝入场
```

### 测试目标

- [ ] 验证操作员认证流程
- [ ] 验证票券扫描核销
- [ ] 验证重复核销防护
- [ ] 验证错误场景处理

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **操作员账号** | `alice / secret123` | 测试操作员 |
| **场馆代码** | `central-pier` | 测试场馆 |

---

## 🧪 Test Scenarios

### Module 1: 操作员认证

**Related Card**: `operators-login`
**Coverage**: 3/3 ACs (100%)

#### TC-OPR-001: 操作员登录成功

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效操作员凭证 alice/secret123 | POST /operators/login | 返回 200，包含 operator_token |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 JWT 格式的 operator_token
- [ ] Token 可用于后续请求

---

#### TC-OPR-002: 操作员登录失败

**AC Reference**: `operators-login.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 错误的密码 wrong_password | POST /operators/login | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 不返回 token

---

#### TC-OPR-003: 无认证扫描被拒绝

**AC Reference**: `operators-login.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | POST /venue/scan | 返回错误 |

**验证点**:
- [ ] 返回错误信息
- [ ] 提示需要 operator token

---

### Module 2: 票券扫描

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 4/4 ACs (100%)

#### TC-OPR-004: 扫描核销成功

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

#### TC-OPR-005: 重复扫描被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一 QR Token 第二次扫描 | POST /venue/scan | 返回 ALREADY_REDEEMED |

**验证点**:
- [ ] result = reject
- [ ] reason = ALREADY_REDEEMED
- [ ] fraud_checks_passed = false

---

#### TC-OPR-006: 错误功能码被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用不存在的功能码 airplane | POST /venue/scan | 返回 WRONG_FUNCTION |

**验证点**:
- [ ] result = reject
- [ ] reason = WRONG_FUNCTION

---

#### TC-OPR-007: 无效操作员 Token 被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无效的 operator_token | POST /venue/scan | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示 Token 无效

---

### Module 3: QR Token 生成

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 2/2 ACs (100%)

#### TC-OPR-008: 生成 QR Token

**AC Reference**: `venue-enhanced-scanning.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效票券和用户 Token | GET /qr/:ticket_code | 返回加密 QR 数据 |

**验证点**:
- [ ] 返回 encrypted_data
- [ ] 返回 jti (唯一标识)
- [ ] QR Token 可用于扫描

---

#### TC-OPR-009: 过期 QR Token 被拒绝

**AC Reference**: `venue-enhanced-scanning.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 过期的 QR Token | POST /venue/scan | 返回 TOKEN_EXPIRED |

**验证点**:
- [ ] result = reject
- [ ] reason = TOKEN_EXPIRED

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 操作员认证 | 3 | pending |
| 票券扫描 | 4 | pending |
| QR Token 生成 | 2 | pending |
| **Total** | **9** | **0/9 通过** |

---

## 🔗 Related Documentation

- [operators-login](../cards/operators-login.md)
- [venue-enhanced-scanning](../cards/venue-enhanced-scanning.md)

## Error Codes Reference

| Reason | HTTP Code | Description |
|--------|-----------|-------------|
| `ALREADY_REDEEMED` | 422 | QR token already used |
| `NO_REMAINING` | 422 | No remaining uses for this function |
| `WRONG_FUNCTION` | 422 | Function not available on ticket |
| `TOKEN_EXPIRED` | 422 | QR token expired |
| `INVALID_TOKEN` | 422 | QR token malformed or invalid |
| `TICKET_NOT_FOUND` | 422 | Ticket does not exist |

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [x] **TC-OPR-101**: 操作员登录成功
  - 操作: 使用有效凭证 (alice/secret123) → 调用 POST /operators/login
  - **Expected**: 返回 200，获得 operator_token，可用于后续核销操作
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-101**: 扫码核销成功
  - 操作: 顾客出示有效票券二维码 → 操作员扫描并选择权益 (ferry) → 调用 POST /venue/scan
  - **Expected**: 显示"核销成功"，返回 ticket_code 和剩余权益，权益剩余次数减 1
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-102**: 核销记录审计
  - 操作: 核销成功后 → 查询 redemption_events 表
  - **Expected**: 记录包含操作员 ID、时间戳、地点、设备信息、jti + function_code 组合
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-103**: 查看票券状态
  - 操作: 核销后 → 查询票券详情
  - **Expected**: 票券状态显示为 ACTIVATED，权益剩余次数正确更新
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-104**: 不同权益独立核销
  - 操作: 扫描同一二维码 → 核销 ferry → 再次扫描 → 核销 sky100
  - **Expected**: 两次核销都成功，不同权益独立计数
  - **Result**: ✅ 通过 (2025-12-20)

### Round 2: 异常场景 (7 scenarios)

- [x] **TC-OPR-201**: 操作员登录失败
  - 操作: 使用错误密码 (alice/wrong_password) → 调用 POST /operators/login
  - **Expected**: 返回 401，提示"用户名或密码错误"，不返回 token
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-OPR-202**: 无认证扫描被拒绝
  - 操作: 不携带 Authorization header → 调用 POST /venue/scan
  - **Expected**: 返回 401，提示需要 operator token
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-201**: 重复核销被拒绝
  - 操作: 扫描同一二维码 → 核销 ferry → 立即再次扫描 → 尝试再次核销 ferry
  - **Expected**: 第二次返回 reject，reason = ALREADY_REDEEMED，提示"该权益已核销"
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-202**: 权益不匹配被拒绝
  - 操作: 扫描不包含 airplane 权益的票券 → 尝试核销 airplane
  - **Expected**: 返回 reject，reason = WRONG_FUNCTION，提示"票券不包含此权益"
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-203**: 权益次数用完被拒绝
  - 操作: 扫描已核销完所有 ferry 次数的票券 → 尝试核销 ferry
  - **Expected**: 返回 reject，reason = NO_REMAINING，提示"该权益已用完"
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-204**: 小程序二维码过期
  - 操作: 等待 30 分钟 → 扫描小程序生成的旧二维码
  - **Expected**: 返回 reject，reason = TOKEN_EXPIRED，提示"二维码已过期，请刷新"
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-VERIFY-205**: 二维码被取代失效
  - 操作: 用户重新生成新二维码 → 操作员扫描旧二维码
  - **Expected**: 返回 reject，提示"二维码已失效，请使用最新二维码"（current_jti 校验失败）
  - **Result**: ✅ 通过 (2025-12-20)

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | AI | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | Initial | 初始版本 |
