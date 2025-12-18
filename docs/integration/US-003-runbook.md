# US-003: Buyer Views Tickets & QR Runbook

用户票券查看完整测试：查看票券列表 → 生成 QR 码 → 验证 Token → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-003 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-003-*.json` |
| Newman Command | `npm run test:story 003` |
| Related Cards | `my-tickets`, `qr-token-generation` |

---

## 🎯 Business Context

### 用户旅程

```
用户登录小程序
  → 查看已购票券列表
  → 选择票券查看详情
  → 生成 QR 码展示
  → 前往场馆核销
```

### 测试目标

- [ ] 验证票券列表查询
- [ ] 验证 QR Token 生成
- [ ] 验证 Token 过期机制
- [ ] 验证权限控制

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **用户 Token** | `user123` | Mock 认证 |
| **测试票券** | 运行 US-001 或使用种子数据 | 前置条件 |

---

## 🧪 Test Scenarios

### Module 1: 票券列表

**Related Card**: `my-tickets`
**Coverage**: 3/3 ACs (100%)

#### TC-TKT-001: 查看我的票券列表

**AC Reference**: `my-tickets.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证，有已购票券 | GET /my/tickets | 返回 200，包含票券列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 tickets 数组
- [ ] 每张票包含 ticket_code, product_name, status
- [ ] 包含 entitlements 权益信息

---

#### TC-TKT-002: 票券包含权益详情

**AC Reference**: `my-tickets.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户有多功能票券 | GET /my/tickets | 返回权益使用情况 |

**验证点**:
- [ ] entitlements 包含 function_code
- [ ] 显示 max_uses 最大次数
- [ ] 显示 used_count 已用次数
- [ ] 显示 remaining_uses 剩余次数

---

#### TC-TKT-003: 无认证访问被拒绝

**AC Reference**: `my-tickets.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | GET /my/tickets | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示需要认证

---

### Module 2: QR Token 生成

**Related Card**: `qr-token-generation`
**Coverage**: 4/4 ACs (100%)

#### TC-TKT-004: 生成 QR Token 成功

**AC Reference**: `qr-token-generation.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效票券和用户 Token | POST /tickets/:code/qr-token | 返回 200，包含 qr_token |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 JWT 格式的 qr_token
- [ ] 返回 expires_at 过期时间
- [ ] 返回 ticket_code

---

#### TC-TKT-005: QR Token 5 分钟过期

**AC Reference**: `qr-token-generation.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 生成 QR Token | 检查 expires_at | 5 分钟后过期 |

**验证点**:
- [ ] expires_at - now ≈ 300 秒
- [ ] Token payload 包含 exp 字段

---

#### TC-TKT-006: 非本人票券被拒绝

**AC Reference**: `qr-token-generation.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用其他用户的票券码 | POST /tickets/:code/qr-token | 返回 403 |

**验证点**:
- [ ] 返回状态码 403
- [ ] 提示无权限

---

#### TC-TKT-007: 无效票券码被拒绝

**AC Reference**: `qr-token-generation.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用不存在的票券码 | POST /tickets/INVALID-123/qr-token | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 提示票券不存在

---

### Module 3: 票券状态验证

**Related Card**: `qr-token-generation`
**Coverage**: 2/2 ACs (100%)

#### TC-TKT-008: 非激活票券无法生成 QR

**AC Reference**: `qr-token-generation.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券状态为 INACTIVE | POST /tickets/:code/qr-token | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示票券未激活

---

#### TC-TKT-009: 多次生成 QR Token

**AC Reference**: `qr-token-generation.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一票券多次生成 QR | POST /tickets/:code/qr-token (多次) | 每次返回新 Token |

**验证点**:
- [ ] 每次返回不同的 qr_token
- [ ] 每个 Token 都有独立的 jti
- [ ] 旧 Token 不受影响

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 票券列表 | 3 | pending |
| QR Token 生成 | 4 | pending |
| 票券状态验证 | 2 | pending |
| **Total** | **9** | **0/9 通过** |

---

## 🔗 Related Documentation

- [my-tickets](../cards/my-tickets.md)
- [qr-token-generation](../cards/qr-token-generation.md)

## Expected Response Formats

### My Tickets Response
```json
{
  "tickets": [
    {
      "ticket_code": "TKT-ABC123",
      "product_name": "3-in-1 Transport Pass",
      "status": "ACTIVE",
      "entitlements": [
        {
          "function_code": "ferry",
          "max_uses": 10,
          "remaining_uses": 8
        }
      ]
    }
  ]
}
```

### QR Token Response
```json
{
  "qr_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_at": "2025-10-20T10:05:00+08:00",
  "ticket_code": "TKT-ABC123"
}
```
