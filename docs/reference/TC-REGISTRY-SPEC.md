# TC 注册表规范

## 目的

1. 防止 TC（Test Case）重复创建
2. 统一 TC 命名规范
3. 建立 TC 的中央索引，便于追踪和管理

---

## TC 命名规范

### 格式

```
TC-{MODULE}-{NNN}
```

| 部分 | 说明 | 示例 |
|------|------|------|
| `TC` | 固定前缀 | TC |
| `MODULE` | 模块代码（2-4 位大写） | AUTH, PAY, ORDER |
| `NNN` | 3 位序号 | 001, 002, 100 |

### 标准模块代码

> **重要**：新建 TC 必须使用以下标准代码，禁止自创缩写。

| 代码 | 模块 | 归属 Category | 说明 |
|------|------|---------------|------|
| **认证相关** |
| AUTH | 认证/登录 | platform | 微信登录、Token、会话管理 |
| ~~LOGIN~~ | - | - | 废弃，统一用 AUTH |
| ~~WX~~ | - | - | 废弃，统一用 AUTH（微信登录）或其他具体模块 |
| **核心业务** |
| ORDER | 订单 | core | 订单创建、查询、状态管理 |
| ~~ORD~~ | - | - | 废弃，统一用 ORDER |
| PAY | 支付 | core | 支付发起、回调、退款 |
| TKT | 票券 | core | 票券生成、查询、状态 |
| ~~TICKET~~ | - | - | 废弃，统一用 TKT |
| ACT | 激活 | core | 票券激活流程 |
| RSV | 预约 | core | 时段预约、日历 |
| VERIFY | 核销 | core | 票券核销验证 |
| SCAN | 扫描 | core | QR 扫描相关 |
| QR | 二维码 | core | QR 生成、展示 |
| **产品相关** |
| PROD | 产品 | core | 产品目录、详情 |
| ~~PRO~~ | - | - | 废弃，统一用 PROD |
| ~~PRODUCT~~ | - | - | 废弃，统一用 PROD |
| PRC | 定价 | core | 价格计算、规则 |
| INV | 库存 | core | 库存查询、扣减 |
| **渠道相关** |
| OTA | OTA 渠道 | channel | OTA API 对接 |
| RSL | 分销商 | channel | 分销商管理 |
| **运营相关** |
| OPR | 操作员 | operation | 操作员认证、操作 |
| ~~OP~~ | - | - | 废弃，统一用 OPR |
| ~~OPS~~ | - | - | 废弃，统一用 OPR |
| VEN | 场馆 | operation | 场馆管理 |
| RPT | 报表 | operation | 报表生成、导出 |
| ~~REPORT~~ | - | - | 废弃，统一用 RPT |
| **平台相关** |
| ADM | 管理 | platform | 后台管理功能 |
| ~~ADMIN~~ | - | - | 废弃，统一用 ADM |
| NOTIFY | 通知 | platform | 消息通知 |
| PDF | PDF | platform | PDF 生成 |
| **其他** |
| PRF | 性能 | - | 性能测试 |
| E2E | 端到端 | - | 端到端流程测试 |
| ENV | 环境 | - | 环境检查 |

### 序号规则

| 序号范围 | 用途 |
|----------|------|
| 001-099 | 基础功能测试 |
| 100-199 | 边界条件测试 |
| 200-299 | 错误处理测试 |
| 300-399 | 性能/压力测试 |

---

## 新增 TC 流程

```
1. 确定功能模块
      │
      ▼
2. 查询 tc-registry.yaml
   是否已存在相似 TC？
      │
      ├─ 是 → 复用或扩展现有 TC
      │
      ▼ 否
3. 选择标准模块代码
   （禁止自创缩写）
      │
      ▼
4. 获取该模块下一个可用序号
      │
      ▼
5. 创建 TC，更新 tc-registry.yaml
```

### 检查清单

新建 TC 前，必须确认：

- [ ] 查询 `tc-registry.yaml`，确认不存在相似 TC
- [ ] 使用标准模块代码（非废弃代码）
- [ ] 序号在正确范围内
- [ ] 更新 `tc-registry.yaml` 索引

---

## TC 生命周期

### 状态定义

| 状态 | 说明 |
|------|------|
| `active` | 有效测试用例 |
| `deprecated` | 已废弃（被合并或不再需要） |
| `pending` | 待实现 |

### 废弃处理

当 TC 需要废弃时：

```yaml
deprecated:
  - id: TC-WX-101
    reason: "与 TC-AUTH-001 重复"
    migrated_to: TC-AUTH-001
    deprecated_date: "2025-12-20"
```

**规则**：
1. 不删除废弃 TC 记录，保留历史追溯
2. 必须记录废弃原因和迁移目标
3. 更新所有引用该 TC 的文档

---

## TC 注册表位置

```
docs/test-coverage/tc-registry.yaml
```

### 索引结构

```yaml
# TC 注册表
modules:
  AUTH:
    description: 认证相关
    category: platform
    test_cases:
      - id: TC-AUTH-001
        name: 微信一键登录
        status: active
        source_stories: [US-010A, US-014]
        runbook: docs/integration/US-010A-frontend-e2e-runbook.md

deprecated:
  - id: TC-WX-101
    reason: "与 TC-AUTH-001 重复"
    migrated_to: TC-AUTH-001
    deprecated_date: "2025-12-20"
  - id: TC-LOGIN-001
    reason: "与 TC-AUTH-001 重复"
    migrated_to: TC-AUTH-001
    deprecated_date: "2025-12-20"
```

---

## 常见问题

### Q: 发现两个 TC 测试同一功能怎么办？

1. 确定哪个 TC 使用标准命名
2. 保留标准命名的 TC
3. 将非标准 TC 标记为 deprecated
4. 更新相关 runbook 引用

### Q: 新模块没有标准代码怎么办？

1. 先评估是否可归入现有模块
2. 如确需新增，提交 PR 更新本规范
3. 新代码应为 2-4 位大写字母

### Q: 如何查找某功能的现有 TC？

```bash
# 按模块查找
grep "TC-AUTH-" docs/test-coverage/tc-registry.yaml

# 按关键词查找
grep -r "登录" docs/test-coverage/tc-registry.yaml
```

---

## 相关文档

- [DOCUMENT-SPEC.md](./DOCUMENT-SPEC.md) - 文档规范
- [tc-registry.yaml](../test-coverage/tc-registry.yaml) - TC 索引
