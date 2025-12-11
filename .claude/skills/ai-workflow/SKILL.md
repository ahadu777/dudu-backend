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
  触发条件：用户请求实现功能、修改代码、修复 bug、或描述任何开发需求
---

# AI Development Workflow

## Mandatory 4-Step Process

Every development task MUST follow these steps:

### Step 0: Task Classification

Identify task type and load corresponding reference:

| Request Pattern | Task Type | Load Reference |
|-----------------|-----------|----------------|
| "我想做..." / "Help me implement..." | Natural Language | `references/natural-language.md` |
| New feature / New Story | New Feature | `references/duplicate-prevention.md` |
| "PRD or Story?" | Document Layer | `references/document-layer.md` |
| Modify existing API | API Change | `references/api-change.md` |
| Error / Stuck / Bug | Troubleshooting | `references/troubleshooting.md` |
| Simple fix / typo | Simple Fix | No ref needed → Go to Step 1 |

### Step 1: Reality Check (Required)

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

### Step 3: Verify Completion

```bash
# Endpoint test
curl http://localhost:8080/[endpoint]

# Run related tests
npm run test:prd [N]    # PRD test
npm run test:story [N]  # Story test

# Update status
# Card: "In Progress" → "Done"
```

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
- Breaking (remove/rename field) → ⚠️ WARN USER, ask for strategy, version in same Card file
- Business logic change → Update PRD + Card + Tests

### Document Layer Decision

| User Says | Layer | Action |
|-----------|-------|--------|
| "我想做会员积分系统" | PRD | Create PRD |
| "用户能查看订单历史" | Story | Create Story |
| "订单列表需要分页" | Card | Update Card |
| "修复分页的bug" | Code | Fix code directly |

### Status Updates

- **测试通过 ≠ Done**
- Card status changes require verification:
  - `Draft → In Progress`: Starting implementation
  - `In Progress → Done`: Requires business verification, not just passing tests

## Anti-Patterns to Avoid

| Wrong | Correct |
|-------|---------|
| Implement without reading spec doc | Load reference doc first (Step 0) |
| Assume without asking | Ask clarifying questions |
| Create new Card file for API version | Version sections in same Card file |
| Skip Reality Check | Always verify current state first |
| Mark Done after tests pass | Verify business requirements met |

## References

Load these as needed based on task type:

- `references/natural-language.md` - Structured prompt templates
- `references/duplicate-prevention.md` - Three-layer search pattern
- `references/document-layer.md` - PRD vs Story vs Card decision
- `references/api-change.md` - Breaking vs non-breaking changes
- `references/troubleshooting.md` - Common issues and fixes
