# AI Development Guide

## CEO Context

**If Jimmy (CEO/CTO) is asking questions**, read this first:
- `docs/reference/CEO-CONTEXT.md` - His goals, philosophy, and evaluation framework

Jimmy focuses on **evaluating the foundation**, not implementing features. He wants data-driven answers that hold the team accountable.

---

## AI Project Knowledge Base (Critical)

### Why This Matters

The `/ai-sitemap` endpoint is the **machine-readable institutional knowledge** of this project. It solves a fundamental problem:

```
Problem: AI context is ephemeral. Conversations reset. Knowledge is lost.
Solution: The project itself exposes its complete state as structured data.
```

**This enables:**
- **AI Onboarding**: Any AI agent can understand the entire project in one request
- **Knowledge Continuity**: When context is lost, fetch `/ai-sitemap` to reconstruct
- **Verification**: AI can answer "Is X ready?" by checking actual sources, not summaries
- **External Integration**: Other systems/AI tools can programmatically navigate the project

### The Endpoint

```
GET http://localhost:8080/ai-sitemap
```

### What It Contains (v3.0)

| Section | Purpose |
|---------|---------|
| `project` | What is this? Tech stack, description |
| `knowledge_sources.documentation` | PRDs → Stories → Cards → Memos (full hierarchy with items) |
| `knowledge_sources.reference_guides` | How to work here (all docs/reference/*.md with purposes) |
| `knowledge_sources.case_studies` | What we learned (real implementation examples) |
| `knowledge_sources.integration_runbooks` | How to test (E2E flows per story) |
| `knowledge_sources.testing` | What's actually tested (Postman JSON = source of truth) |
| `knowledge_sources.codebase` | Where's the code (modules, key files) |
| `verification_guide` | How to verify "Is feature X ready?" |
| `summary` | Quick counts across all documentation |

### AI Recovery Protocol

When starting a new session or losing context:

```
1. Fetch /ai-sitemap
2. Read project.description and summary
3. For specific questions, navigate knowledge_sources
4. For "Is X ready?" questions, follow verification_guide
```

### Trust Hierarchy

| Source | Trust | Why |
|--------|-------|-----|
| `/ai-sitemap` | ✅ HIGH | Dynamically generated from actual files |
| `/tests` | ✅ HIGH | Parses actual Postman JSON |
| `postman/auto-generated/*.json` | ✅ HIGH | Executable tests |
| `src/modules/**/*.ts` | ✅ HIGH | Actual implementation |
| `/coverage` | ⚠️ MEDIUM | YAML summary, manually maintained |
| `docs/test-coverage/_index.yaml` | ⚠️ MEDIUM | May be outdated |

---

## Research Context

**Full context:** `docs/reference/RESEARCH-CONTEXT.md`

**Goal:** Transform scattered research into systematic business value drivers.

```
Scattered Sources          Synthesized Memos         Business Outcomes
─────────────────          ─────────────────         ─────────────────
ChatGPT analysis    ──┐
Claude strategy     ──┼──▶  MEMO-001              ──▶  Investor deck
WeChat insights     ──┤     MEMO-002              ──▶  Team alignment
Partner feedback    ──┤     MEMO-003              ──▶  PRD → Product
Market signals      ──┘         ↓
                           leads_to: PRD-XXX       ──▶  Revenue
```

### Pathways to Synthesized Ideas

| Pathway | Example | Capture Trigger |
|---------|---------|-----------------|
| Market exploration | "What should we charge?" | Deep analysis emerges |
| Client conversation | Client asks → pricing strategy | Strategic response worth keeping |
| Investor prep | Value proposition articulation | Pitch content crystallizes |
| Partner negotiation | Deal structure | Terms documented |

### When to Create a Memo

| User says | Action |
|-----------|--------|
| "Save this as a memo" | Create memo from conversation content |
| "This is worth keeping" | Prompt for memo title and tags |
| Strategic analysis, value prop, pitch content | Suggest saving as memo |

### Memo System

| What | Where | Purpose |
|------|-------|---------|
| **Memos** | `docs/memos/` | Synthesized strategic thinking |
| **Web UI** | `/memos` | Browse, filter by tag, share |
| **Reference** | `docs/reference/RESEARCH-CONTEXT.md` | Full strategic framework |

### Memo → PRD Connection

```
Memo (strategic thinking) → PRD (when ready to build) → Story → Card → Code
```

When a memo leads to building something:
- PRD adds `source_memo: "MEMO-001"`
- Memo adds `leads_to: ["PRD-010"]`

---

## ⚠️ MANDATORY WORKFLOW

**所有开发任务必须遵循 5 步工作流，详见 skill：**

```
@.claude/skills/ai-workflow/SKILL.md
```

### 工作流概述

| Step | 名称 | 关键动作 |
|------|------|----------|
| 0 | Intent Analysis | 解析用户意图 → 匹配任务类型 → 加载参考文档 |
| 1 | Reality Check | 验证服务状态、文档状态、代码现状 |
| 2 | Execute | 按规范执行，更新 Card 状态 |
| 3 | Verify | 测试验证，文档一致性检查 |
| 4 | Learn (可选) | 记录经验教训，改进工作流 |

### 快速判断：是否需要完整工作流？

| 情况 | 需要完整流程？ |
|------|---------------|
| 用户问"这是什么" / "解释一下" | ❌ 直接回答 |
| 用户问"能不能做X" / 可行性评估 | ❌ 分析后回答 |
| 修复 typo / 简单改动 | ⚠️ 简化流程（跳过 Step 0/4） |
| 新功能 / API 修改 / 重构 | ✅ 完整 5 步 |
| 改进工作流本身 | ✅ 完整 5 步 |

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

| 用户说的 | 层级 | 动作 | 视角 |
|---------|------|------|------|
| "我想做会员积分系统" | **PRD** | 创建 PRD | 产品/商业 |
| "用户能查看订单历史" | **Story** | 创建 Story | 用户（黑盒） |
| "订单列表需要分页" | **Card** | 更新 Card | 技术（白盒） |
| "修复分页的bug" | **Code** | 直接修代码 | - |

### 三层职责边界

| 层级 | 应该包含 | 不应该包含 |
|------|----------|------------|
| PRD | 为什么做、成功指标、功能列表 | API路径、验收标准、实现细节 |
| Story | 用户能力、业务验收标准 | API路径、字段名、错误码 |
| Card | API契约、技术验收标准、数据影响 | 业务目标、成功指标 |

> 详细规范见 `docs/reference/DOCUMENT-SPEC.md`

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

| 资源 | 位置 | 说明 |
|------|------|------|
| **文档规范** | [docs/reference/DOCUMENT-SPEC.md](docs/reference/DOCUMENT-SPEC.md) | PRD/Story/Card 模板、关系、生命周期 |
| 详细工作流 | [docs/reference/](docs/reference/) | 各类任务的详细指南 |
| 案例研究 | [docs/cases/](docs/cases/) | 实际案例分析 |
| PRDs | [docs/prd/](docs/prd/) | 产品需求文档 |
| Stories | [docs/stories/](docs/stories/) | 用户故事 |
| Cards | [docs/cards/](docs/cards/) | 技术卡片 |
| 测试覆盖率 | [docs/test-coverage/_index.yaml](docs/test-coverage/_index.yaml) | 测试状态追踪 |
| OpenAPI 规范 | [openapi/openapi.json](openapi/openapi.json) | API 文档 |
