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
