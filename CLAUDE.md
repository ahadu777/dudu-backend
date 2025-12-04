# AI Development Guide

## ⚠️ MANDATORY WORKFLOW (每次任务必须执行)

### Step 0: Task Classification / 任务分类

Identify task type and load corresponding spec document:

| Request Pattern | Task Type | Must Read First |
|-----------------|-----------|-----------------|
| "我想做..." / "I want to..." / "Help me implement..." | Natural Language Requirement | `@docs/reference/NATURAL-LANGUAGE-OPTIMIZATION.md` |
| New feature / New Story / 新功能 | New Feature Development | `@docs/reference/DUPLICATE-PREVENTION.md` |
| "PRD or Story?" / "这应该是 PRD 还是 Story？" | Document Layer Decision | `@docs/reference/DOCUMENT-LAYER-DECISION.md` |
| Modify existing API / Change fields / 改 API | API Change | `@docs/reference/API-CHANGE-MANAGEMENT.md` |
| Design new API / New endpoint / 新端点 | New API Design | `@docs/reference/RESTFUL-API-DESIGN.md` |
| Write tests / Generate tests / 写测试 | Test Generation | `@docs/reference/AI-TEST-GENERATION.md` |
| Newman report / 测试报告 | Test Report | `@docs/reference/NEWMAN-REPORT-STANDARD.md` |
| Refactor / Change architecture / 重构 | Refactoring | `@docs/reference/REFACTORING-IMPACT.md` |
| Cross-module / Complex dependencies / 跨模块 | Complex Scenario | `@docs/reference/KNOWLEDGE-GRAPH.md` |
| Error / Stuck / Not working / 报错 | Troubleshooting | `@docs/reference/TROUBLESHOOTING.md` |
| Fix bug / Simple change / 简单改动 | Simple Fix | No doc needed → Go to Step 1 |

### Step 1: Reality Check (Required / 必须执行)

```bash
# Service status / 服务状态
curl http://localhost:8080/healthz

# Document status / 相关文档状态
grep -ri "keywords" docs/cards/ docs/stories/
grep "status:" docs/cards/related-card.md

# Code status / 代码现状
ls src/modules/related-module/
grep -r "related-function" src/modules/
```

**5-Minute Rule**: If basic commands don't clarify state, complex analysis won't help.

### Step 2: Execute Development / 执行开发

```
1. Update Card status: "Ready" → "In Progress"
2. Follow spec document loaded in Step 0
3. Follow existing patterns in src/modules/
4. Ensure TypeScript compiles
```

### Step 3: Verify Completion / 验证完成

```bash
# Endpoint test / 端点测试
curl http://localhost:8080/[endpoint]

# Run related tests / 运行相关测试
npm run test:prd [N]    # PRD test
npm run test:story [N]  # Story test

# Document consistency / 文档一致性校验
npm run validate:docs   # 检查 PRD→Stories→Cards→Code 一致性

# Update status / 更新状态
# Card: "In Progress" → "Done"
```

---

## Core Modules (Auto-loaded via @import)

### Tech Stack & TypeORM Rules
@docs/claude/tech-stack.md

### Testing Guidelines
@docs/claude/testing.md

### Development Standards (DoR/DoD)
@docs/claude/standards.md

---

## Quick Reference

### 文档层级决策

| 用户说的 | 层级 | 动作 |
|---------|------|------|
| "我想做会员积分系统" | **PRD** | 创建 PRD |
| "用户能查看订单历史" | **Story** | 创建 Story |
| "订单列表需要分页" | **Card** | 更新 Card |
| "修复分页的bug" | **Code** | 直接修代码 |

### 常用命令

```bash
# 开发
npm run build && npm start
curl http://localhost:8080/healthz

# 状态查询
grep "status:" docs/cards/*.md
grep "status: In Progress" docs/cards/*.md

# 测试 (自动发现)
npm test                      # Smoke + PRD + Story
npm run test:prd 006          # 指定 PRD
npm run test:story 014        # 指定 Story

# 文档校验
npm run validate:docs         # 检查 PRD→Stories→Cards→Code 一致性

# 搜索
grep -ri "关键词" docs/
```

### Single Source of Truth

1. **Cards** (`docs/cards/`) = API 契约
2. **domain.ts** = 类型定义
3. **OpenAPI** = 外部工具
4. **Tests** = 必须与以上对齐

---

## 状态评估原则

**测试通过 ≠ Done**

| 测试通过能证明 | 测试通过不能证明 |
|--------------|----------------|
| ✅ 已实现的代码逻辑正确 | ❌ 所有功能都已实现 |
| ✅ API 端点可用 | ❌ 业务目标已达成 |
| | ❌ 生产环境就绪 |

**状态变更原则：**
- `Draft → In Progress`: 开始实施时
- `In Progress → Done`: 需要产品/业务验收，不能仅凭测试通过

---

## What's Working (Validated)

- **US-001**: Ticket purchase → QR redemption
- **US-011**: Complex cruise pricing
- **US-012**: OTA platform integration
- **US-013**: Venue operations + fraud detection
- **US-014**: WeChat mini-program authentication
- **PRD-006**: Ticket activation system (46 assertions)
- **PRD-007**: Reservation validation (62 assertions)
- **PRD-008**: Miniprogram Phase 1 (35 assertions)

---

## Reference Links

| 资源 | 位置 |
|------|------|
| 详细工作流 | [docs/reference/](docs/reference/) |
| 案例研究 | [docs/cases/](docs/cases/) |
| PRDs | [docs/prd/](docs/prd/) |
| 测试覆盖率 | [docs/test-coverage/_index.yaml](docs/test-coverage/_index.yaml) |
| OpenAPI 规范 | [openapi/openapi.json](openapi/openapi.json) |
