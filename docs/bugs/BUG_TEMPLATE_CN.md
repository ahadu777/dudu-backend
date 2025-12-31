# Bug 模板（中文版）

创建新的 bug 报告时使用此模板。根据需要选择合适的格式：
- **完整格式**：复杂 bug，影响多个 cards/stories
- **标准格式**：常规 bug，范围明确
- **简化格式**：简单快速修复

---

## 完整格式

```yaml
---
id: BUG-XXX
title: "[简洁的 bug 描述]"
slug: kebab-case-标题
severity: "[Critical | High | Medium | Low]"
status: "[Open | In Progress | PR | Resolved | Closed]"
affected_cards: ["card-slug-1", "card-slug-2"]
affected_stories: ["US-XXX", "US-YYY"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
reporter: "[报告人姓名/邮箱]"
reported_at: "YYYY-MM-DDTHH:mm:ss+0800"
discovered_in_readiness: "[prototype | mvp | production]"
discovered_in_mode: "[mock | database | both]"
pr: "[PR-URL 或 null]"
resolved_at: "[解决时间戳 或 null]"
root_cause: "[原因分类: null-check-missing | logic-error | race-condition | config-error | etc]"
---

# [Bug 标题] — 开发笔记

## 1) 问题概述
[一段话描述出了什么问题、影响谁、业务影响]

## 2) 复现步骤
- 步骤 1
- 步骤 2
- 步骤 3

**期望结果**: [应该发生什么]
**实际结果**: [实际发生了什么]

## 3) 根本原因分析
[技术层面解释为什么会出现这个问题]

**文件**: `path/to/file.ts`
**行号**: XX
**问题代码**:
```typescript
// 有问题的代码
```

## 4) 影响组件
- **卡片**: card-slug (路径, 模块)
- **实体**: EntityName (相关领域类型)
- **服务**: service-name.ts
- **测试**: 应该捕获此问题的测试

## 5) 影响评估
- **范围**: 什么功能受影响？(例如："pricing_context 为空时订单创建失败")
- **严重性**: 为什么是这个级别？(例如："阻塞 US-011 实现")
- **数据风险**: 是否有数据损坏？有没有临时解决方案？

## 6) 修复方案
**修改 1**: 文件路径
- 改了什么
- 为什么这样修复

**修改 2**: 文件路径
- 改了什么
- 为什么这样修复

**测试覆盖**: 添加或更新了哪些测试

## 7) 验证方式
**手动测试**:
```bash
curl http://localhost:8080/endpoint -d '...'
# 期望结果: ...
```

**Newman 测试**: [测试场景链接，如果有]

## 8) 关系追踪
- **阻塞**: [US-XXX, BUG-YYY]
- **被阻塞**: [BUG-ZZZ, Card ABC]
- **相关**: [类似问题或受影响的功能]

## 9) 事后分析
- **解决日期**: YYYY-MM-DD
- **修复耗时**: X 小时
- **预防措施**: 如何防止类似问题？
```

---

## 标准格式

```yaml
---
id: BUG-XXX
title: "[Bug 描述]"
severity: "[Critical | High | Medium | Low]"
status: "[Open | In Progress | PR | Resolved | Closed]"
affected_cards: ["card-slug"]
affected_stories: ["US-XXX"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
reported_at: "YYYY-MM-DDTHH:mm:ss+0800"
discovered_in_mode: "[mock | database | both]"
pr: null
---

# [Bug 标题]

## 问题描述
[清晰描述问题]

## 复现方式
[如何触发 bug]

**期望**: [应该发生什么]
**实际**: [实际发生什么]

## 根本原因
[技术解释]

**文件**: `path/to/file.ts:line`
**问题**: [代码哪里有问题]

## 修复方案
[如何修复]

## 验证
```bash
# 测试命令
curl http://localhost:8080/endpoint
```

## 影响
- **阻塞**: [US-XXX]
- **严重性**: [为什么是这个级别]
```

---

## 简化格式

```yaml
---
id: BUG-XXX
title: "[Bug 描述]"
severity: "[High | Medium | Low]"
status: "[Open | In Progress | Resolved]"
affected_cards: ["card-slug"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
---

# [Bug 标题]

## 问题
[什么坏了]

## 复现
[如何看到 bug]

## 原因
[为什么会这样 - 文件:行号]

## 修复
[如何解决]
```

---

## 严重性指南

### Critical（关键）
- 系统宕机或无法使用
- 数据丢失或损坏
- 安全漏洞
- 阻塞生产环境部署

### High（高）
- 功能完全损坏
- 阻塞用户故事实现
- 影响多个团队
- 没有合理的临时解决方案

### Medium（中）
- 功能问题但有临时解决方案
- 影响单个团队/功能
- 性能下降
- 错误提示不清晰

### Low（低）
- 小的 UI 问题
- 文档错误
- 代码质量改进
- 锦上添花的增强

---

## 状态生命周期

1. **Open（待处理）**: Bug 已报告，尚未开始处理
2. **In Progress（进行中）**: 开发人员已分配，开始工作，已创建 PR
3. **PR（代码审查）**: Pull request 已提交，等待审查
4. **Resolved（已解决）**: 修复已合并到主分支
5. **Closed（已关闭）**: 修复已在生产环境验证，bug 已归档到 RESOLVED/

---

## 命名规范

**文件名**: `BUG-[ID]-[kebab-case-标题].md`

**示例**:
- `BUG-001-inventory-filter-null-check.md`
- `BUG-042-wallyt-payment-timeout.md`
- `BUG-103-typescript-build-error.md`

**位置**:
- 活跃的 bug: `docs/bugs/ACTIVE/`
- 已解决的 bug: `docs/bugs/RESOLVED/`

---

## 快速开始

1. 复制上面合适的格式
2. 填写 frontmatter 字段
3. 保存到 `docs/bugs/ACTIVE/BUG-[ID]-[标题].md`
4. 添加条目到 `docs/bugs/_index.yaml`
5. 如需要，从受影响的 cards/stories 链接
6. 随着工作进展更新状态
7. 修复并验证后，移到 `RESOLVED/`

---

## 使用场景示例

### 场景 1: 发现订单创建 bug

```yaml
---
id: BUG-042
title: 大订单处理时支付回调超时
severity: High
status: Open
affected_cards: [wallyt-payment]
affected_stories: [US-001]
team: A - Commerce
---

# 支付回调超时

## 问题
处理包含 10+ 商品的大订单时，回调 5秒后超时

## 复现
POST /payments/wallyt/notify，订单包含 10+ 商品
期望: 5秒内返回 200 OK
实际: 504 Gateway Timeout

## 原因
同步发放票据阻塞了回调响应
文件: src/modules/payments/router.ts:175

## 修复
将票据发放移到异步队列 (RabbitMQ/Redis)
```

### 场景 2: 库存检查逻辑错误

```yaml
---
id: BUG-001
title: 库存为零时返回 null 导致 500 错误
severity: High
status: Open
affected_cards: [order-create]
team: A - Commerce
---

# 库存检查返回 Null

## 问题
产品库存为 0 时，检查方法返回 null 而非 {available: 0}

## 复现
curl -X POST http://localhost:8080/orders -d '{"product_id": 103}'
期望: 400 INSUFFICIENT_INVENTORY
实际: 500 Internal Server Error

## 原因
src/modules/orders/services/inventory.ts:47
return product.available > 0 ? {available} : null; // 应该返回 {available: 0}

## 修复
始终返回对象：return { available: product.available ?? 0 }
```

---

## 工作流集成

### 与 Git 集成
```bash
# 提交时引用 bug ID
git commit -m "fix: 解决 BUG-001 库存检查 null 问题"

# PR 描述中链接
修复 BUG-042: 将支付回调响应改为异步处理
详见: docs/bugs/ACTIVE/BUG-042-wallyt-payment-timeout.md
```

### 与 Card 集成
在 card frontmatter 中添加：
```yaml
known_issues: ["BUG-001", "BUG-042"]  # 影响此卡片的活跃 bug
blocked_by_bugs: ["BUG-015"]  # 阻塞实现的 bug
```

### 与 Story 集成
在 `docs/stories/_index.yaml` 中添加：
```yaml
stories:
  - id: US-001
    known_issues: [BUG-001, BUG-042]  # 影响此故事的 bug
```

---

## 快速查询命令

```bash
# 查看所有高危/关键 bug
grep "severity: Critical\|High" docs/bugs/_index.yaml | grep -v "#"

# 查找影响特定故事的 bug
grep "US-001" docs/bugs/_index.yaml

# 列出所有待处理的 bug
grep "status: Open" docs/bugs/_index.yaml

# 查找分配给特定团队的 bug
grep "team: A - Commerce" docs/bugs/_index.yaml

# 统计活跃 bug 数量
ls docs/bugs/ACTIVE/ | wc -l

# 查看最近修复的 bug
ls -lt docs/bugs/RESOLVED/ | head -5
```

---

## 团队责任分工

### Team A - Commerce（商务团队）
负责：订单、支付、目录、定价、库存
示例 Bug: 库存检查、支付超时、定价计算

### Team B - Fulfillment（履约团队）
负责：票据、权益、用户体验、QR 码
示例 Bug: 票据发放失败、QR 生成错误

### Team C - Gate（闸机团队）
负责：核销、操作员、验证、扫描
示例 Bug: 扫码失败、重复核销、操作员登录

---

## 最佳实践

1. **及时记录**: 发现 bug 立即创建文档，不要依赖记忆
2. **详细复现**: 提供可执行的复现步骤，方便其他人验证
3. **明确影响**: 说清楚影响范围和严重性，便于优先级排序
4. **代码定位**: 精确到文件和行号，节省调试时间
5. **关联追踪**: 链接到相关 cards/stories，保持知识图谱完整
6. **及时更新**: 状态变化时同步更新文档和索引
7. **归档整理**: 解决后及时归档，保持 ACTIVE 目录整洁
8. **经验总结**: 在事后分析中记录预防措施，避免重复

---

完整工作流程详见: [CLAUDE.md - Bug 报告流程](../CLAUDE.md#bug-reporting-workflow)
