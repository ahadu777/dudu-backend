# CASE-DISCOVER-AI-WORKFLOW.md

## Goal: AI-Guided Human Development

**Primary Objective**: Enable AI to guide human developers rather than just follow instructions.

**Context**: Through building the OTA platform integration (US-012), we discovered that PRD-code synchronization is a critical challenge for AI-driven development. The question is how to make AI reliably maintain consistency between business requirements and implementation.

## Experience Log

### 2025-11-06: Initial Discovery

**Problem Identified**:
- PRDs become stale as requirements evolve
- Code implements features not documented in PRDs
- AI lacks systematic way to know when to update documentation vs when to implement

**First Attempt - Theoretical Synchronization**:
- Added complex PRD-Code synchronization section to CLAUDE.md
- Included theoretical scripts (prd-sync-check.js, sync-prd-from-code.js)
- Added elaborate metadata tracking for PRD evolution

**Result**: User feedback: "we had cleaned up claude.md to be effective in building context for ai driven workflow. whenever we update the claude.md, we need to be sure the update is for the true foundation of ai workflow."

**Learning**: Theoretical additions dilute proven workflow foundations. CLAUDE.md should focus on what actually works, not what we think should work.

### 2025-11-06: Constraint Analysis Approach

**Second Attempt - Systematic Constraints**:
- Analyzed core AI limitations: no persistent memory, context window limits, pattern matching vs reasoning
- Proposed constraint-based rules: Information Flow, Context Window, Verification, Scope Drift
- Suggested mandatory search commands before any src/ changes

**Realization**: Still trying to fight AI limitations rather than work with them.

**Third Attempt - Information Architecture**:
- Shift focus from workflow rules to structural design
- Make documentation naturally visible to AI
- Use TypeScript/tooling to enforce correctness automatically
- Design so correct path is easiest path

### Current Understanding

**What Actually Works** (Proven through US-012):
1. When human explicitly says "update PRD/Story/Card first" - AI does it correctly
2. Human-guided synchronization is reliable
3. AI can implement complex requirements when documentation is clear

**What Doesn't Work**:
- Expecting AI to remember to check documentation
- Complex theoretical synchronization systems
- Automated sync without human guidance

**Core Insight**: Maybe the problem isn't solvable with current AI limitations. The goal should be making human guidance as efficient as possible.

## Open Questions

1. **Can AI reliably detect when requirements evolution needs documentation updates?**
   - Current evidence: No, AI needs explicit guidance

2. **Should we focus on human-guided sync vs automated sync?**
   - Leaning toward: Human-guided is more reliable

3. **What's the minimal viable sync pattern?**
   - Hypothesis: Simple prompts like "check if this requirement exists in docs first"

4. **Information architecture vs workflow rules?**
   - Unknown: Whether structural changes help more than process changes

## Next Experiments

### Experiment 1: Minimal Sync Pattern
Test adding one simple rule to CLAUDE.md: "Before implementing new requirements, check if they exist in relevant documentation"

**Hypothesis**: Simple, actionable rules work better than complex systems

### Experiment 2: Context Injection
Structure project so requirements are always visible in AI context when implementing

**Hypothesis**: Information architecture matters more than workflow rules

### Experiment 3: Human-AI Collaboration Pattern
Focus on making it easy for humans to guide AI synchronization rather than making AI do it automatically

**Hypothesis**: AI-guided human development means AI suggests when sync is needed, human decides what to update

## Success Metrics

**For AI Workflow Effectiveness**:
- Can AI detect when a requirement needs documentation updates?
- Does AI consistently update the right documentation layer?
- Do future AI sessions maintain context from previous decisions?

**For Human Efficiency**:
- How quickly can human understand what needs to be synced?
- How easy is it to guide AI to make the right updates?
- Does the system reduce cognitive load on human developers?

### 2025-11-06: Reality Check Failure

**Fourth Attempt - Implementation Exercise**:
- Picked "order-create database persistence" as next priority using "systematic constraint analysis"
- Analysis claimed it was "ready for database implementation"
- Followed CLAUDE.md workflow step by step

**Reality Check Revealed**:
- Database implementation already exists (`service.ts`)
- Migration file already exists (`0002_orders.sql`)
- **BUT controller imports `service.centralized.ts` (mock mode)**
- Real issue: switch from hard-coded mock to dual-mode pattern

**Workflow Failure Points**:
1. **"Check what exists first"** - I read docs but never verified actual running code
2. **PRD sync check** - Performative, didn't help understand real state
3. **Missing basic verification** - Never ran `grep -r "service.centralized" src/`

**30-second command would have caught this**:
```bash
grep -r "OrderService" src/modules/orders/
# Shows: controller imports service.centralized, not database service
```

**Critical Insight**: **Elaborate analysis was procrastination to avoid basic investigation**

### Key Realizations

**What CLAUDE.md Gets Wrong**:
1. **"Knowledge Graph Analysis"** - Complex but inaccurate
2. **"Systematic Constraint Discovery"** - Sounds systematic, produces wrong results
3. **Missing "Reality Check"** - No verification of actual running code
4. **Documentation bias** - Assumes cards/PRDs reflect reality

**What Actually Works**:
1. **Basic verification commands** - curl, grep, ls
2. **"5-minute rule"** - If you can't understand current state quickly, complex analysis will be wrong
3. **Trust but verify** - Documentation status is irrelevant if reality doesn't match

**Proposed CLAUDE.md Fix**:
```markdown
## Step 1: Reality Check (Before Any Analysis)

# What's actually running?
curl http://localhost:8080/[endpoint]

# What's actually imported?
grep -r "import.*Service" src/modules/[name]/

# What files exist vs what's used?
ls src/modules/[name]/ && grep -r "from.*[name]" src/

Rule: Documentation status is irrelevant if reality doesn't match.
```

### 2025-11-06: Overcorrection and Balance Recovery

**Initial Reaction - Overcorrection**:
- Completely removed Knowledge Graph Patterns from CLAUDE.md
- Threw out systematic analysis approaches entirely
- Generalized from one failure case

**User Pushback**: "I'm not sure if the stuff removed was good idea. You based it off this experience. But what about other experience?"

**Reality Check on My Analysis**:
- **US-011 Success**: Constraint discovery DID work for complex pricing
- **US-012 Success**: Knowledge graph patterns helped OTA integration design
- **US-013 Success**: Systematic analysis identified real technical requirements
- **My failure**: Used elaborate analysis as substitute for, not addition to, basic verification

**Key Insight**: The problem wasn't systematic analysis being inherently bad - it was **skipping basic verification first**.

**Two Potential Approaches Identified**:

**Option A - Simple Verification Only**:
- Remove Knowledge Graph Patterns entirely
- Focus on Reality Check + basic implementation
- Rationale: Prevents elaborate procrastination

**Option B - Hierarchical Approach**:
- Keep both Reality Check and Knowledge Graph Patterns
- Make Reality Check mandatory Step 0
- Use systematic analysis only for complex scenarios
- Rationale: Preserves tools that worked for US-011, US-012, US-013

### 2025-11-06: Reality Check Pattern Success

**CLAUDE.md Updated to Option B - Hierarchical Approach**:
- Made Reality Check mandatory Step 0 before any analysis
- Preserved Knowledge Graph Patterns for complex scenarios
- Added "ALWAYS START HERE" navigation to Reality Check
- Clear hierarchy: Simple verification first, systematic analysis for complex cases

**Test Case: Orders Database Implementation**:
- **Reality Check commands (30 seconds)**:
  ```bash
  curl http://localhost:8080/healthz          # ✅ Server running
  curl http://localhost:8080/api/orders       # ❌ 404 error
  ls src/modules/orders/                      # ✅ Files exist
  grep -r "OrderService" src/modules/orders/  # 🔍 Found the issue
  ```

**Results**:
- **Immediate diagnosis**: Controller imports `service.centralized` (mock mode) instead of dual-mode `service.ts`
- **No complex analysis needed**: 30-second Reality Check revealed exact problem
- **Prevented elaborate procrastination**: Would have spent time on documentation analysis instead of basic verification
- **5-minute rule held**: Quick understanding led to accurate diagnosis

**Key Validation**:
✅ **Reality Check prevents the failure mode**: Mandatory verification caught the real issue immediately
✅ **Hierarchical approach works**: Simple case only needed Reality Check, no Knowledge Graph analysis required
✅ **Preserved proven tools**: Knowledge Graph Patterns still available for complex scenarios

## Current Status

**Status**: **Reality Check pattern validated successfully**
**Next Action**: **Apply pattern to more implementation scenarios to test robustness**
**Proven Learning**: **Mandatory Reality Check Step 0 prevents elaborate analysis procrastination**

**Validated Workflow**:
- **Simple cases**: Reality Check → Basic implementation ✅ **WORKS**
- **Complex cases**: Reality Check → Knowledge Graph Analysis → Implementation (to be tested)

**Critical Success Factor Confirmed**: **Reality Check prevents elaborate analysis from being used as procrastination to avoid basic investigation**

### 2025-11-06: Requirements Synchronization Framework Testing

**Problem**: Need to handle requirements evolution while keeping PRD/stories/cards synchronized with code.

**First Framework Test - "PDF Export" Scenario**:
- **Command**: `grep -r "export\|pdf\|PDF" docs/prd/ docs/stories/ docs/cards/`
- **Result**: False positives (TypeScript exports, not PDF feature)
- **Failures Identified**:
  1. Keyword search too broad (TypeScript export ≠ PDF export)
  2. No guidance on which PRD to update
  3. "New user journey vs feature enhancement" logic unclear
  4. Decision tree too vague to be actionable

**Improved Framework V2**:
1. **Specific keyword search**: `grep -ri "pdf.*export\|export.*pdf\|download.*pdf" docs/`
2. **Context-aware search**: Include business domain terms
3. **Clear documentation targeting**:
   - New user capability → Update primary PRD (PRD-001 for tickets)
   - Enhancement to existing flow → Update relevant story
   - New API endpoint → Create/update specific card
4. **Validation step**: After doc updates, verify scope matches implementation

**Test Results V2**: ✅ **SUCCESSFUL VALIDATION**

**Real Scenario Test**: User requirement "check the products, because it has field to record the discounts"
- **Search command**: `grep -ri "customer.*discount" docs/`
- **Results**: Found documentation across PRD-002, US-012, and ota-channel-management card
- **Decision logic**: Enhancement to existing API flow → Update specific card ✓
- **Code validation**: `grep "customer_discounts" src/modules/ota/service.ts` confirmed implementation matches docs ✓
- **Framework outcome**: Successfully guided requirements-code synchronization

**Framework V2 Status**: **PROVEN EFFECTIVE** → Added to CLAUDE.md

### 2025-11-06: Immediate Feedback Loop Implementation

**Pattern Discovered**: Each action with user provides validated learning for AI workflow improvement.

**Validation Process**:
1. **Test immediately** - V2 framework tested with real customer discount requirement
2. **Document results** - Success documented in this case study
3. **Update CLAUDE.md** - Added Requirements-Code Synchronization and Immediate Feedback Loop patterns
4. **Verify with commands** - Used grep/curl to confirm patterns work as described

**Key Success**: Experience-based learning approach ensures CLAUDE.md contains only proven, actionable patterns.

### 2025-11-06: Immediate Feedback Loop - Test Failed

**Concept Tested**: "Each action provides validated learning that updates CLAUDE.md"

**Test Scenario**: After learning about experience-based validation, AI immediately added "Immediate Feedback Loop" section to CLAUDE.md without testing it first.

**User Feedback**: "this idea needs to be put into the claude.md in a effective way to improve workflow. even before adding it, need to validate it"

**Test Result**: ❌ **FAILED** - The "immediate feedback loop" concept did not prevent AI from making the same mistake

**Analysis**: Even with awareness of experience-based learning, AI still added untested theoretical content. This proves that meta-concepts about improvement don't actually improve decision-making in practice.

**Action Taken**: Removed ineffective "Immediate Feedback Loop" section from CLAUDE.md

**Learning**: Simple awareness of feedback principles is insufficient. What works: **direct commands and validation steps built into the workflow**, not abstract concepts about continuous improvement.

---

### 2025-11-19: Pattern Reuse Discovery (CASE-004)

**Pattern Tested**: Searching for existing implementations before creating new ones

**Scenario**: User requested batch details for resellers with pagination support

**AI Workflow**:
1. User asked: "是否有写好分页的中间件" (Is there a pagination middleware?)
2. AI searched: `grep -r "page.*limit" src/modules/*/router.ts`
3. Found existing pattern in `/api/ota/tickets` endpoint
4. Reused exact validation logic and response format
5. Provided 3 implementation options to user
6. User chose Option 2 (detailed batches with pagination)
7. Implemented using two-step query strategy

**Commands Used**:
```bash
# Pattern discovery
grep -r "page.*limit" src/modules/*/router.ts
grep -A 10 "page.*limit" src/modules/ota/router.ts

# Found working pattern with:
# - Router validation: parseInt(page), parseInt(limit)
# - Service defaults: page || 1, Math.min(limit || 100, 1000)
# - Response format: { total, page, page_size, items: [] }
```

**Implementation Strategy**:
- Router: Reused existing parameter validation (lines 757-788)
- Service: Two-step query (aggregation + details)
- Repository: Separate methods for summary and batch details

**Test Result**: ✅ **SUCCESS**
- Full pagination working (page=1&limit=3 returned 3 resellers)
- Batch details included in response
- Consistent with existing API patterns
- Implementation time: ~45 minutes (vs estimated 2+ hours without reuse)

**Evidence of Success**:
```bash
curl 'http://localhost:8080/api/ota/resellers/summary?page=1&limit=3&batches_per_reseller=5' \
  -H 'X-API-Key: ota_full_access_key_99999'

# Returned:
# - total: 24
# - page: 1
# - page_size: 3
# - resellers: [... with batches array ...]
```

**What Worked**:
- ✅ Searching for existing patterns before implementing
- ✅ Providing multiple options for user to choose
- ✅ Two-step query strategy (aggregation + detail)
- ✅ Pattern consistency across codebase

**Added to CLAUDE.md**:
1. "Pattern Reuse & Discovery" in What Actually Works
2. "Two-Step Query Strategy" architectural pattern
3. Full case study documentation

**Key Learning**: Always search project for existing implementations. Pattern reuse saves time and ensures consistency. Providing options to users reduces assumption-based errors.

---

### 2025-12-15: Intent Analysis & Context Awareness (CASE-005)

**Problem Identified**: AI was distracted by user's open file instead of focusing on user's actual question.

**Scenario**: User asked "你觉得现在的ai工作流还有能够改进的地方吗" (Do you think the AI workflow can be improved?)

**AI Failure**:
1. User had `complianceAuditor.ts` open in IDE
2. AI read that file first (irrelevant to the question)
3. User correctly pointed out: "查看工作流你不应该是去看claude.md文档或者skill吗"

**Root Cause Analysis**:
- Step 0 (Task Classification) existed but lacked "Intent Analysis" step
- No guidance on handling "context noise" (open files unrelated to task)
- Missing task types: Explanation, Feasibility, Meta/Process, Code Review

**Improvements Made**:

1. **CLAUDE.md Simplified** - Removed duplicate workflow details, points to skill
2. **Step 0 Enhanced** - Added "Intent Analysis" with 3 sub-steps:
   - 0.1 检查上下文干扰 (Check context interference)
   - 0.2 匹配任务类型 (Match task type)
   - 0.3 判断是否需要完整流程 (Determine if full workflow needed)
3. **New Task Types Added**:
   - Explanation (解释类) → 直接回答
   - Feasibility (可行性评估) → 分析后回答
   - Meta/Process (工作流改进) → 完整流程
   - Code Review (代码审查) → 阅读后回答
4. **Step 1 Enhanced** - Added "上下文相关性检查"
5. **Step 4 Added** - Experience Learning (可选)
6. **Anti-Patterns Updated** - Added "被用户打开的文件带偏"

**Files Changed**:
- `CLAUDE.md` - Simplified to entry point
- `.claude/skills/ai-workflow/SKILL.md` - Core workflow (5 steps)
- `.claude/skills/ai-workflow/references/experience-learning.md` - New reference

**Test Result**: ✅ **SUCCESS**
- Workflow now explicitly addresses "context noise" issue
- Clear guidance on when to ignore open files
- New task types cover previously missing scenarios

**Key Learning**: AI context includes irrelevant signals (open files, recent navigation). Step 0 must actively filter noise by analyzing user intent first, not just matching patterns.

---

---

### 2025-12-19: Step 3 检查清单完整性问题 (US-018)

**Problem Identified**: 上下文恢复后，AI 继续执行任务但遗漏了 Step 3 检查清单中的多个关键项。

**Scenario**: US-018 OTA 票券 PDF 导出功能实现

**AI Failure Points**:
1. **未更新 `docs/stories/_index.yaml`** - 新建 Story 后未在索引中注册
2. **未更新 `openapi/openapi.json`** - 新增 2 个 API 端点但未更新 OpenAPI 规范
3. **未执行 API 契约三方一致性验证** - 跳过了 Card = Code = OpenAPI 验证
4. **未执行 Step 4 经验学习** - 遇到问题但未记录

**Root Cause Analysis**:
- 上下文恢复时，AI 从 todo list 继续执行，但 todo list 本身不完整
- Step 3 检查清单在 SKILL.md 中定义，但 AI 未主动对照完整清单
- AI 倾向于"做完眼前的事"而非"确保所有事都做完"

**Evidence**:
```bash
# 用户运行 validate:docs 发现警告
npm run validate:docs
# ⚠️ Story US-018 未被其关联的 PRD (PRD-002) 的 related_stories 列出
# ⚠️ PRD-002 未列出关联的 US-018

# 用户指出遗漏
# "index.yaml没有对应的更新"
# "我发现你还是有很多事情没有遵循ai工作流去做的"
```

**Improvements Needed**:

1. **Step 3 检查清单应作为 todo list 模板**
   - 当进入 Step 3 时，自动将完整检查清单加入 todo list
   - 不依赖 AI 记忆，显式追踪每个检查项

2. **OpenAPI 更新应与路由修改联动**
   - 新增 API 端点 → 自动提示更新 OpenAPI
   - 可考虑在 Code Review 阶段检查

3. **文档索引更新应作为文档创建的后置步骤**
   - 创建 Story → 更新 `_index.yaml`
   - 创建 Card → 检查相关 Story 引用

**Files Changed** (补充遗漏):
- `openapi/openapi.json` - 添加 PDF 导出端点规范
- `docs/stories/_index.yaml` - 添加 US-018 条目
- `docs/prd/PRD-002-ota-platform-integration.md` - related_stories 添加 US-018

**Key Learning**:
- **检查清单必须显式化** - 依赖 AI 记忆检查清单不可靠
- **上下文恢复时重新加载工作流** - 不能假设 todo list 包含所有必要步骤
- **validate:docs 是最后防线** - 应在提交前强制运行

**Proposed Workflow Enhancement**:
```markdown
## Step 3 进入时，自动加载检查清单到 todo list:
- [ ] 相关测试全部通过
- [ ] API 契约一致（Card = Code = OpenAPI）
- [ ] OpenAPI 已更新（如有新端点）
- [ ] Newman collection 创建/更新
- [ ] Runbook 创建/更新（Story 级别）
- [ ] docs/stories/_index.yaml 已更新（如有新 Story）
- [ ] 覆盖率更新 docs/test-coverage/_index.yaml
- [ ] npm run validate:docs 无错误
- [ ] Card 状态更新为 "Done"
```

---

### 2025-12-30: 信息源选择与 Runbook 重新定位 (CASE-006)

**Problem Identified**: AI 回答业务流程问题时给出错误的 API，因为直接搜索代码找到了废弃的接口。

**Scenario**: 用户问"扫码核销的流程是什么"

**AI Failure**:
1. 用户问业务流程
2. AI 直接搜索代码 `grep "validate\|verify" src/modules/operators/`
3. 找到废弃的 API `/operators/validate-ticket`、`/operators/verify-ticket`
4. 返回错误答案
5. 用户纠正：正确的是 `/operators/login` → `/qr/decrypt` → `/venue/scan`

**Root Cause Analysis**:
- SKILL.md 的 `Explanation 类型 → 直接回答` 被误解为不需要查任何资料
- 没有定义"回答业务流程问题应该查什么"
- 直接搜索代码容易找到废弃/未使用的代码

**Discovery - 信息分层架构**:

| 层级 | 信息源 | 提供内容 |
|------|--------|----------|
| 索引层 | Story `_index.yaml` | API 调用顺序（`sequence`）|
| 契约层 | Card `*.md` | API 路径（`oas_paths`）|
| 实现层 | 代码 `src/` | 内部业务逻辑 |

**Key Insight**: Story 的 `sequence` 字段 + Card 的 `oas_paths` 已经能确定正确的 API 列表，不需要 Runbook。

**Improvements Made**:

1. **添加 Step 0.1.5 信息源选择**:
   ```
   | 问题类型 | 查询顺序 |
   |----------|----------|
   | 业务流程 | Story → Card → 代码 |
   | API 用法 | Card → 代码 |
   | 项目状态 | /ai-sitemap |
   | 代码细节 | 代码 |
   ```

2. **Runbook 分析与重新定位**:
   - 分析发现 Runbook ~70% 内容与 Story/Card/Newman 重复
   - QA Checklist 已被 `/tests` 页面替代
   - 重新定位为"前端对接文档"
   - 更新 `references/runbook.md` 规范

3. **删除旧 Runbook**:
   - Runbook 是派生文档（基于 Story + Card 生成）
   - 信息源在 Story + Card 中，删除不丢失信息
   - 删除 22 个 `*-runbook.md` 文件

**Files Changed**:
- `.claude/skills/ai-workflow/SKILL.md` - 添加 Step 0.1.5，更新 Runbook 引用
- `.claude/skills/ai-workflow/references/runbook.md` - 重写为前端对接文档规范
- `docs/integration/*-runbook.md` - 删除 22 个文件

**What Worked**:
- ✅ 分析现有文档结构发现 Story `sequence` 已有价值
- ✅ 分析 Runbook 与其他文档的重叠找到真正问题
- ✅ 发现 QA Checklist 已被 `/tests` 替代

**What Didn't Work**:
- ❌ 只定义了新规范，但没有创建实际的前端对接文档
- ❌ 删除前未评估是否有功能需要新文档

**Key Learning**:
1. **查询顺序比禁止更有效** - 不是"禁止搜索代码"，而是"先 Story → Card 确定 API，再看代码"
2. **派生文档可以删除** - 信息源在上游，派生文档没有独特价值时可废弃
3. **重新定位比废弃更好** - Runbook 作为前端对接文档有新价值

**Open Question**:
- 是否需要按新规范创建前端对接文档？何时创建？

---

### 2025-12-30: Story 创建时遗漏 _index.yaml 同步 (CASE-007)

**Problem Identified**: 创建 US-019 Story 时，未同时更新 `docs/stories/_index.yaml`。

**Scenario**: 创建 OTA 操作员管理 Story (US-019)

**AI Failure**:
1. 创建了 `docs/stories/US-019-ota-operator-management.md`
2. 创建了 `docs/cards/ota-operator-management.md`
3. **未更新 `docs/stories/_index.yaml`**
4. 导致 Step 0.1.5 信息源选择无法发现该 Story

**Root Cause Analysis**:
- SKILL.md Step 2 只说"执行开发"，没有 Story 创建步骤清单
- Step 3 完成检查清单没有 "_index.yaml 同步检查"
- Card 创建有完整步骤（Step 3.3.1），但 Story 创建没有

**对比**:
| 文档类型 | 创建步骤清单 | 索引同步要求 |
|----------|-------------|-------------|
| Card | ✅ Step 3.3.1 有完整步骤 | ✅ 有 `_index.yaml` 同步 |
| Story | ❌ 无明确步骤 | ❌ 无明确要求 |

**Improvements Made**:

1. **添加 Step 2.1 Story 创建步骤**:
   - 创建 Story 文件
   - 更新 `docs/stories/_index.yaml`
   - 验证索引同步

2. **在 Step 3 完成检查清单添加**:
   - `[ ] Story 索引同步 docs/stories/_index.yaml（如创建/修改了 Story）`

**Files Changed**:
- `.claude/skills/ai-workflow/SKILL.md` - 添加 Step 2.1 + Step 3 检查项

**Key Learning**:
1. **文档创建与索引同步必须成对** - 创建文档后立即更新对应索引
2. **对称设计** - Story 创建步骤应与 Card 创建步骤同等详细
3. **显式检查清单** - 依赖 AI 记忆不可靠，必须在工作流中显式列出

---

*This case study documents our journey to discover effective AI-guided development workflows. Key insight: Balance simple verification with systematic analysis - use the right tool for the right complexity level, but always verify reality first. **Core learning: Test every pattern immediately - even patterns about testing patterns. Checklists must be explicit - relying on AI memory is unreliable. Query order matters - Story → Card → Code prevents finding deprecated APIs.***