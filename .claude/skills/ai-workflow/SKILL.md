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

#### 0.1.5 信息源选择

**回答代码/业务相关问题前，必须按正确顺序查询信息源。**

| 问题类型 | 查询顺序 | 说明 |
|----------|----------|------|
| **业务流程**（如"核销流程是什么"） | Story → Card → 代码 | 先确定 API 列表，再看实现逻辑 |
| **API 用法**（如"这个API怎么用"） | Card → 代码 | Card 是契约，代码是实现 |
| **项目状态**（如"XX功能完成了吗"） | `/ai-sitemap` | 动态生成的项目状态 |
| **代码细节**（如"这个函数做什么"） | 代码 | 直接查 `src/` |

**业务流程查询示例 - "核销流程是什么"**：

```
Step 1: Story (索引层)
  docs/stories/_index.yaml → US-002
  sequence: operators-login → venue-enhanced-scanning

Step 2: Card (契约层)
  oas_paths: /operators/login, /venue/scan
  Card 内容: 还需要 /qr/decrypt

Step 3: 代码 (实现层)
  src/modules/venue/service.ts → validateAndRedeem()
  了解内部业务逻辑（7步验证流程）
```

⚠️ **错误模式**：直接搜索代码 → 找到废弃的 `/operators/validate-ticket`
✅ **正确模式**：Story → Card 确定 API → 代码了解实现

#### 0.2 匹配任务类型

| Request Pattern | Task Type | Load Reference |
|-----------------|-----------|----------------|
| "我想做..." / "Help me implement..." | Natural Language | `references/natural-language.md` |
| New feature / New Story | New Feature | `references/duplicate-prevention.md` |
| "PRD or Story?" | Document Layer | `references/document-layer.md` |
| Modify existing API | API Change | `references/api-change.md` |
| Error / Stuck / Bug | Troubleshooting | `references/troubleshooting.md` |
| Run tests / Test failed | Testing | `references/testing.md` |
| Create/update 前端对接文档 | Frontend Doc | `references/runbook.md` |
| **"这是什么" / "解释" / "为什么"** | **Explanation** | No ref → 直接回答 |
| **"能不能" / "可行吗" / "评估"** | **Feasibility** | No ref → 分析后回答 |
| **"改进工作流" / "优化流程"** | **Meta/Process** | `references/experience-learning.md` |
| **Code review / "审查代码"** | **Code Review** | Load `code-review` skill |
| Simple fix / typo | Simple Fix | No ref → Go to Step 1 |

#### 0.3 判断是否需要完整流程

```
❌ 不需要完整流程（但仍需 Step 0.1.5 信息源选择）：
- Explanation 类型 → 选择正确信息源 → 直接回答
- Feasibility 类型 → 选择正确信息源 → 分析后回答
- Code Review 类型 → 阅读代码后给出意见

✅ 需要完整流程：
- 会修改代码的任务
- 会修改文档的任务
- Meta/Process 类型（改进工作流本身）
```

### Step 0.5: Proposal Generation (提案生成)

**在执行实质性变更前，生成提案供用户确认。**

#### 触发条件（任一满足）

- 新功能实现
- API 变更（尤其是 Breaking Change）
- 涉及 3+ 文件修改
- 数据库结构变更
- 重构

#### 跳过条件

- 简单任务（typo、单点 bug fix）
- 用户已给出详细规范
- 用户明确说"直接做"

#### 提案格式

```markdown
## Proposal: [简短标题]

### 理解
我理解您的需求是：[复述]

### 影响范围
| 层级 | 文件 | 操作 |
|------|------|------|
| Card | docs/cards/xxx.md | 新建/修改 |
| Code | src/modules/xxx/ | 新建/修改 |

### 实施步骤
1. [步骤]
2. [步骤]

### 风险与假设
- 假设：[列出]
- 风险：[列出]

### 待确认
- [ ] 理解正确？
- [ ] 可以开始？
```

#### 用户确认后

- 将步骤转化为 TodoWrite 任务列表
- 进入 Step 1 Reality Check

> 详细模板见 `references/proposal.md`

### Step 1: Reality Check (现状检查)

**先验证现状，再动手实施。**

#### 1.0 上下文恢复检查 (新会话)

**仅在新会话开始时执行。**

```bash
# 检查进行中的工作
cat docs/cards/_index.yaml | grep -A 5 "in_progress:"
grep -l "status:.*In Progress" docs/cards/*.md 2>/dev/null

# 检查未提交的变更
git status --short docs/ src/
```

**发现未完成工作时：**

```markdown
## 上下文恢复

我发现以下未完成的工作：

| 类型 | 文件 | 状态 |
|------|------|------|
| Card | xxx.md | In Progress |

请选择：
1. 继续这个任务
2. 开始新任务
```

**无未完成工作时：** 继续正常流程

> 详细协议见 `references/context-recovery.md`

#### 1.1 上下文相关性检查

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

#### 2.1 Story 创建（如适用）

创建新 Story 时，必须同时完成：

1. **创建 Story 文件**
   - 路径：`docs/stories/US-{NNN}-{slug}.md`
   - 遵循 `docs/reference/DOCUMENT-SPEC.md` 模板

2. **更新 Story 索引**
   - 文件：`docs/stories/_index.yaml`
   - 必填字段：
     ```yaml
     - id: US-{NNN}
       title: {Story 标题}
       status: {Draft|In Progress|Done}
       cards: [{关联的 Card slugs}]
       sequence: [{Card 依赖顺序}]
       enhances: [{增强的其他 Stories}]
       business_requirement: "PRD-{NNN}"
     ```

3. **验证索引同步**
   - 运行 `npm run validate:docs`
   - 确认无 Story 引用错误

#### 2.2 AC 映射规则

当 PRD 或 Story 有功能标记为暂缓时：

1. **PRD 标记方式**
   ```markdown
   - ~~Weekend premiums~~ [DEFERRED] - 周末定价功能暂缓实现
   ```

2. **AC 映射架构**
   ```yaml
   acceptance_criteria:    # 需要实现的功能 → 计入覆盖率
     ...
   excluded_criteria:      # [DEFERRED] 功能 → 不计入覆盖率
     - ac_id: AC-XXX
       reason: "产品决定暂缓实现"
       prd_reference: "PRD-XXX 第N行"
   coverage_summary:
     total_in_scope: N     # 只计 acceptance_criteria
     excluded: M           # 仅供参考
   ```

3. **规范参考**: `docs/reference/AC-EXTRACTION-SPEC.md`

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

### Step 3: Test & Verify（测试与验证）

**开发完成不测试 = 未完成。测试是强制步骤，不是可选项。**

#### 测试金字塔

```
PRD Tests (业务规则)     → Newman + PRD Acceptance Criteria
    ↓
Story Tests (E2E流程)    → 前端对接文档 + Newman Collection
    ↓
Card Tests (端点级)      → curl + Newman
```

| 层级 | 工具 | 集合位置 | 运行命令 |
|------|------|----------|----------|
| PRD | Newman | `postman/auto-generated/prd-{NNN}-*.json` | `npm run test:prd [N]` |
| Story | Newman | `postman/auto-generated/us-{NNN}-*.json` | `npm run test:story [N]` |
| Card | curl | - | 直接 curl 验证 |

#### Newman 简介

**Newman = Postman 命令行工具**，自动运行 API 测试集合。

```bash
# Newman 底层命令（了解即可，通常用 npm scripts）
npx newman run postman/auto-generated/prd-006-*.json

# 推荐使用封装好的命令
npm run test:prd 006      # 运行 PRD-006 测试
npm run test:story 012    # 运行 US-012 测试
npm test                  # 运行全部测试
```

**Newman 集合命名规范**:
```
postman/auto-generated/
├── prd-{NNN}-{description}.postman_collection.json   # PRD 测试
├── us-{NNN}-{description}.postman_collection.json    # Story 测试
└── _archived/                                         # 过时测试存档
```

#### 3.1 运行相关测试

```bash
# 确保服务运行中
curl http://localhost:8080/healthz

# 检查测试集合是否存在
ls postman/auto-generated/prd-*.json
ls postman/auto-generated/us-*.json

# 运行相关测试
npm run test:prd [N]    # PRD 测试
npm run test:story [N]  # Story 测试

# 或运行全部测试确保无回归
npm test
```

**何时需要创建 Newman 集合？**

| 场景 | 是否需要创建 |
|------|-------------|
| 新 PRD 实现 | ✅ 创建 `prd-{NNN}-*.json` |
| 新 Story 实现 | ✅ 创建 `us-{NNN}-*.json` |
| Card 级改动 | ⚠️ 更新现有集合或用 curl |
| Bug 修复 | ❌ 通常不需要新集合 |

#### 3.2 测试失败处理

```bash
# 1. 识别失败的断言
npm run test:prd [N] 2>&1 | grep -A 5 "AssertionError"

# 2. 对比 API 响应与 Card 规范
curl http://localhost:8080/[endpoint] | jq .
grep -A 20 "Response" docs/cards/[related-card].md

# 3. 确定根因并修复
#    - 代码 bug → 修复代码 → 返回 Step 2
#    - 规范不匹配 → 更新 Card 或代码
#    - 测试过时 → 更新测试
```

**测试未通过 → 不能进入下一步**

#### 3.3 测试通过验证

测试通过后，仍需验证：

| 检查项 | 动作 |
|--------|------|
| API 响应与 Card 一致？ | 对比实际响应与 Card 规范 |
| OpenAPI 需要更新？ | 如有 API 变更，更新 `openapi/openapi.json` |
| 覆盖率需要更新？ | 更新 `docs/test-coverage/_index.yaml` |
| 业务验收？ | 简单 bug → 可标 Done；业务逻辑 → 需产品确认 |

```bash
# API 契约验证（三者必须一致）
# 1. Card 规范
grep -A 30 "endpoint" docs/cards/[card].md

# 2. 实际响应
curl http://localhost:8080/[endpoint] | jq .

# 3. OpenAPI 规范
grep -A 20 "[endpoint]" openapi/openapi.json
```

#### 3.3.1 OpenAPI 同步

**Card 是 API 契约的唯一真相源，OpenAPI 从 Card 自动生成。**

```bash
# 从 Card Contract 生成 OpenAPI
npm run generate:openapi

# 验证生成结果
cat openapi/openapi.json | jq '.paths | keys | length'
```

**何时需要同步？**

| 场景 | 需要同步？ |
|------|-----------|
| 新增/修改 API 端点 | ✅ 必须 |
| 修改 API 参数或响应 | ✅ 必须 |
| 仅修复 bug（无契约变更） | ❌ 不需要 |
| 仅修改文档 | ❌ 不需要 |

#### 3.4 前端对接文档（可选）

**当 Story 涉及前端集成时，创建对接文档帮助前端开发。**

| 场景 | 是否需要 |
|------|----------|
| 新 Story 涉及前端集成 | ✅ 推荐创建 |
| 纯后端功能 | ❌ 不需要 |
| API 变更影响前端 | ✅ 更新现有文档 |

**位置**: `docs/integration/US-{NNN}-runbook.md`

**最小结构**:
```markdown
# US-{NNN}: {功能名称} - 前端对接指南

## 调用流程
| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /api/xxx | {目的} |

## API 详情
### 1. {API名称}
**路径**: POST /xxx
**请求**: { field }
**响应**: { result }

## 认证说明
Header: Authorization: Bearer {token}

## 常见错误
| 错误码 | 含义 | 处理建议 |
```

> 详细规范见 `references/runbook.md`（已重新定位为前端对接文档规范）

#### 3.5 更新测试覆盖率

```bash
# 更新覆盖率注册表
vim docs/test-coverage/_index.yaml

# 检查覆盖缺口
grep -L "test:" docs/cards/*.md
```

#### 3.6 文档一致性验证

```bash
# 运行文档校验
npm run validate:docs

# 更新 Card 状态
# Card: "In Progress" → "Done"
```

#### Step 3 完成检查清单

- [ ] 相关测试全部通过
- [ ] API 契约一致（Card = Code = OpenAPI）
- [ ] Newman collection 创建/更新
- [ ] 前端对接文档创建/更新（如涉及前端）
- [ ] Story 索引同步 `docs/stories/_index.yaml`（如创建/修改了 Story）
- [ ] PRD AC 映射同步 `docs/test-coverage/prd-{NNN}-ac-mapping.yaml`（如 Story 完成，需更新对应 PRD 的 AC 状态）
  - 注意：PRD 中标记 `[DEFERRED]` 的功能应放入 `excluded_criteria`，不计入覆盖率
  - 参考规范：`docs/reference/AC-EXTRACTION-SPEC.md`
- [ ] 覆盖率更新 `docs/test-coverage/_index.yaml`
- [ ] `npm run validate:docs` 无错误
- [ ] Card 状态更新为 "Done"

### Step 4: Experience Learning (经验学习) - 条件必须

**触发条件（任一满足则必须执行）：**

| 触发条件 | 检测方法 |
|---------|---------|
| 返工超过 1 次 | 回顾执行过程 |
| 发现工作流可改进点 | 执行过程中意识到 |
| 新 pattern 被验证有效 | 测试通过 |
| 用户明确反馈问题 | 用户指出 |
| 任务耗时超出预期 2x | 时间对比 |

**跳过条件：**
- 简单任务（typo、仅改文档）
- 无任何触发条件满足
- 任务顺利完成且无新发现

#### 记录格式

**快速记录（默认）：**

```markdown
### YYYY-MM-DD: [简述]

**触发原因**: [哪个条件触发]
**问题/发现**: [描述]
**改进建议**: [具体建议]
**验证方法**: [如何验证改进有效]
```

**完整案例（重大发现）：**
- 创建新的 `docs/cases/CASE-XXX.md`
- 使用 CASE-US013 模板

#### 记录位置

| 类型 | 位置 |
|------|------|
| 工作流问题 | `docs/cases/CASE-DISCOVER-AI-WORKFLOW.md` |
| 实现案例 | `docs/cases/CASE-[STORY-ID].md` |
| 案例索引 | `docs/cases/_index.yaml` |

#### 示例

```markdown
### 2025-12-24: Step 3 检查清单遗漏

**触发原因**: 返工 - 忘记更新 OpenAPI
**问题/发现**: Step 3 检查清单没有明确列出 OpenAPI 更新
**改进建议**: 在 Step 3.3 添加 "OpenAPI 同步检查" 子步骤
**验证方法**: 下次 API 变更时检查是否自动提醒
```

**或提议改进（直接在对话中）：**
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

**测试是 Step 3 的强制组成部分，详见 Step 3: Test & Verify。**

- 测试失败 → 修复后重测（不能跳过）
- 测试通过 → 仍需验证 API 契约一致性
- Story 涉及前端 → 推荐创建前端对接文档

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
| 开发完不运行测试 | Step 3 测试是强制步骤 |
| 测试通过就标 Done | 验证业务需求是否满足 |
| 前端集成无对接文档 | Step 3.4 创建前端对接文档 |
| 遇到问题不记录 | Step 4 记录经验教训 |

---

## References

按需加载的详细参考文档：

**核心流程已整合到主工作流：**
- `references/testing.md` - 测试详细指南（核心已整合到 Step 3）
- `references/runbook.md` - 前端对接文档规范（原 Runbook，已重新定位）
- `references/proposal.md` - 提案生成模板（Step 0.5）
- `references/context-recovery.md` - 上下文恢复协议（Step 1.0）

**其他参考文档：**
- `references/natural-language.md` - Structured prompt templates
- `references/duplicate-prevention.md` - Three-layer search pattern
- `references/document-layer.md` - PRD vs Story vs Card decision
- `references/api-change.md` - Breaking vs non-breaking changes
- `references/troubleshooting.md` - Common issues and fixes
- `docs/reference/EXPERIENCE-LEARNING.md` - Experience-based improvement

**索引文件：**
- `docs/cards/_index.yaml` - Card 状态索引（Context 恢复用）
- `docs/cases/_index.yaml` - 经验案例索引

### Code Review Skill

- `.claude/skills/code-review/SKILL.md` - 代码审查主流程
- `.claude/skills/code-review/references/checklist.md` - 通用检查清单
- `.claude/skills/code-review/references/security.md` - 安全检查（OWASP）
- `.claude/skills/code-review/references/typescript.md` - TypeScript 规范
- `.claude/skills/code-review/references/project.md` - 本项目特定规则
