---
name: ai-workflow
description: |
  AI 开发工作流规范。当 Claude 执行任何开发任务时自动触发：
  (1) 新功能开发 - 需要创建 PRD/Story/Card
  (2) API 修改 - 修改现有端点、字段、业务逻辑
  (3) Bug 修复 - 排查和修复问题
  (4) 重构 - 代码结构变更
  (5) 自然语言需求 - 用户用口语描述需求
  (6) 文档创建/更新 - 创建或更新 PRD/Story/Card
  (7) 测试执行 - 运行测试、测试失败排查、测试覆盖率检查
  (8) 工作流改进 - 改进 CLAUDE.md、SKILL.md 或开发流程本身
  触发条件：用户请求实现功能、修改代码、修复 bug、运行测试、或描述任何开发需求
---

# AI Development Workflow

## Mandatory 5-Step Process

Every development task MUST follow these steps:

### Step 0: Intent Analysis (意图解析)

**首先解析用户意图，而不是直接执行命令。**

#### 0.1 检查上下文干扰

```
⚠️ 用户打开的文件可能与任务无关！

判断方法：
- 用户的问题关键词是否与打开的文件相关？
- 如果不相关 → 忽略打开的文件，专注于用户问题
- 如果相关 → 作为 Reality Check 的输入
```

#### 0.2 匹配任务类型

| Request Pattern | Task Type | Load Reference |
|-----------------|-----------|----------------|
| "我想做..." / "Help me implement..." | Natural Language | `references/natural-language.md` |
| New feature / New Story | New Feature | `references/duplicate-prevention.md` |
| "PRD or Story?" | Document Layer | `references/document-layer.md` |
| Modify existing API | API Change | `references/api-change.md` |
| Error / Stuck / Bug | Troubleshooting | `references/troubleshooting.md` |
| Run tests / Test failed | Testing | `references/testing.md` |
| Create/update Runbook | Runbook | `references/runbook.md` |
| **"这是什么" / "解释" / "为什么"** | **Explanation** | No ref → 直接回答 |
| **"能不能" / "可行吗" / "评估"** | **Feasibility** | No ref → 分析后回答 |
| **"改进工作流" / "优化流程"** | **Meta/Process** | `references/experience-learning.md` |
| **Code review / "审查代码"** | **Code Review** | Load `code-review` skill |
| Simple fix / typo | Simple Fix | No ref → Go to Step 1 |

#### 0.3 判断是否需要完整流程

```
❌ 不需要完整流程：
- Explanation 类型 → 直接回答
- Feasibility 类型 → 分析后回答
- Code Review 类型 → 阅读代码后给出意见

✅ 需要完整流程：
- 会修改代码的任务
- 会修改文档的任务
- Meta/Process 类型（改进工作流本身）
```

### Step 1: Reality Check (现状检查)

**先验证现状，再动手实施。**

#### 1.1 上下文相关性检查 (新增)

```bash
# 用户打开了什么文件？与任务相关吗？
# - 相关 → 作为分析起点
# - 不相关 → 忽略，搜索正确的文件

# 用户最近的对话上下文是什么？
# - 是否有未完成的任务？
# - 是否是之前任务的延续？
```

#### 1.2 系统状态检查

```bash
# Service status
curl http://localhost:8080/healthz

# Document status
grep -ri "keywords" docs/cards/ docs/stories/
grep "status:" docs/cards/related-card.md

# Code status
ls src/modules/related-module/
grep -r "related-function" src/modules/
```

**5-Minute Rule**: If basic commands don't clarify state, complex analysis won't help.

### Step 2: Execute Development

1. Update Card status: "Ready" → "In Progress"
2. Follow reference document loaded in Step 0
3. Follow existing patterns in `src/modules/`
4. Ensure TypeScript compiles

### Step 2.5: Code Review (代码审查)

**自动触发时机：** 开发完成后、测试前

**执行方式：** 加载 `code-review` skill

```
代码审查流程：
1. Quick Scan - 编译检查、改动范围、调试代码残留
2. Deep Review - Card 一致性、代码质量、TypeScript、安全、错误处理
3. 生成报告 - Critical/Warning/Info 分级
```

**审查结果处理：**

| 结果 | 动作 |
|------|------|
| 🔴 BLOCKED | 返回 Step 2 修复 Critical issues |
| 🟡 NEEDS WORK | 修复 Warnings 后继续（或用户确认跳过） |
| 🟢 APPROVED | 进入 Step 3 |

**可跳过的场景：**
- 修复 typo
- 仅改文档
- 配置文件改动（仅 Quick Scan）

> 详细检查清单见 `.claude/skills/code-review/` 目录

### Step 3: Verify Completion

```bash
# Endpoint test
curl http://localhost:8080/[endpoint]

# Run related tests
npm run test:prd [N]    # PRD test
npm run test:story [N]  # Story test

# Document consistency
npm run validate:docs

# Update status
# Card: "In Progress" → "Done"
```

### Step 4: Experience Learning (经验学习) - 可选

**触发条件：**
- 任务过程中遇到"卡住"或"返工"
- 发现工作流可以改进的地方
- 新的 pattern 被验证有效

**记录方式：**

```bash
# 更新案例研究
echo "### $(date +%Y-%m-%d): [简述]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Pattern**: [使用的工作流]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Result**: [成功/失败 + 证据]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Learning**: [CLAUDE.md 应该如何改进]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
```

**或提议改进：**
```
💡 工作流改进建议：
- 问题：[遇到的问题]
- 建议：[改进方案]
- 证据：[为什么这样改进有效]
```

---

## Key Workflow Rules

### Natural Language Requirements

**NEVER implement directly.** Always:
1. Parse & understand user intent
2. Generate structured prompt with:
   - API contract
   - Document layer (PRD/Story/Card)
   - Clarifying questions
3. Wait for user confirmation
4. Then implement

### New Features

**NEVER create without searching.** Always:
1. Three-layer search: PRD → Story → Card → Code
2. If similar found → Ask user: Merge vs Extend vs Separate?
3. Then create if confirmed

### API Changes

**ALWAYS classify first:**
- Non-breaking (add optional field) → Update Card, verify backward compatibility
- Breaking (remove/rename field) → ⚠️ WARN USER, ask for strategy
- Business logic change → Update PRD + Card + Tests

### Document Layer Decision

| User Says | Layer | Action |
|-----------|-------|--------|
| "我想做会员积分系统" | PRD | Create PRD |
| "用户能查看订单历史" | Story | Create Story |
| "订单列表需要分页" | Card | Update Card |
| "修复分页的bug" | Code | Fix code directly |

### Testing Workflow

**Test execution triggers workflow:**
- Test failed → Load `references/testing.md` + `references/troubleshooting.md`
- Test passed → Verify if Card status can change to Done
- Coverage gap → Check if new tests needed

### Status Updates

- **测试通过 ≠ Done**
- Card status changes require verification:
  - `Draft → In Progress`: Starting implementation
  - `In Progress → Done`: Requires business verification, not just passing tests

---

## Anti-Patterns to Avoid

| Wrong | Correct |
|-------|---------|
| 被用户打开的文件带偏 | 先解析用户意图，判断文件相关性 |
| 直接执行而不理解意图 | Step 0 先解析意图 |
| 假设而不询问 | 有歧义时询问确认 |
| 跳过 Reality Check | 每次都先验证现状 |
| 跳过代码审查直接测试 | Step 2.5 先审查代码质量 |
| 测试通过就标 Done | 验证业务需求是否满足 |
| 遇到问题不记录 | Step 4 记录经验教训 |

---

## References

Load these as needed based on task type:

- `references/natural-language.md` - Structured prompt templates
- `references/duplicate-prevention.md` - Three-layer search pattern
- `references/document-layer.md` - PRD vs Story vs Card decision
- `references/api-change.md` - Breaking vs non-breaking changes
- `references/troubleshooting.md` - Common issues and fixes
- `references/testing.md` - Test execution, failure handling, coverage
- `references/runbook.md` - Runbook 格式规范、命名规则、GWT 编写指南
- `docs/reference/EXPERIENCE-LEARNING.md` - Experience-based improvement

### Code Review Skill

- `.claude/skills/code-review/SKILL.md` - 代码审查主流程
- `.claude/skills/code-review/references/checklist.md` - 通用检查清单
- `.claude/skills/code-review/references/security.md` - 安全检查（OWASP）
- `.claude/skills/code-review/references/typescript.md` - TypeScript 规范
- `.claude/skills/code-review/references/project.md` - 本项目特定规则
