# AC 测试点提取规范

## 目的

1. 系统化从 PRD → Story → Card → Code 各层级提取验收标准 (AC)
2. 统一 AC 编号规范，确保可追溯性
3. 建立 AC 与测试的映射关系，验证覆盖完整性

---

## 一、AC 来源层级

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   PRD    │────▶│  Story   │────▶│   Card   │────▶│   Code   │
│ (业务AC) │     │ (用户AC) │     │ (技术AC) │     │ (隐式AC) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
 业务成功指标     用户场景验收      API契约验证      边界/异常处理
```

| AC 类型 | 来源 | 视角 | 测试方式 |
|---------|------|------|----------|
| **业务 AC** | PRD 成功指标 | 产品/商业 | E2E 测试 |
| **用户 AC** | Story Given/When/Then | 用户（黑盒） | 集成测试 |
| **技术 AC** | Card Given/When/Then | 技术（白盒） | API 测试 |
| **隐式 AC** | 代码边界条件 | 实现细节 | 手动验证 (/tests) |

---

## 二、AC 编号规范

### 格式

```
AC-{PRD_ID}-{DOMAIN}-{SEQUENCE}
```

| 部分 | 说明 | 示例 |
|------|------|------|
| `AC` | 固定前缀 | AC |
| `PRD_ID` | PRD 编号 (3位) | 001, 006, 008 |
| `DOMAIN` | 功能域代码 (2-4位大写) | CATALOG, ORDER |
| `SEQUENCE` | 2位序号 | 01, 30, 60 |

### 示例

- `AC-001-CATALOG-01` - PRD-001 产品目录第1条
- `AC-006-ACTIVATE-03` - PRD-006 票券激活第3条
- `AC-008-ORDER-30` - PRD-008 订单异常第30条

### 标准功能域代码

> **重要**：新建 AC 必须使用以下标准代码，禁止自创缩写。

| 代码 | 功能 | 适用 PRD |
|------|------|----------|
| **产品相关** |
| CATALOG | 产品目录 | PRD-001, PRD-008 |
| PRICE | 定价 | PRD-001, PRD-011 |
| INV | 库存 | PRD-001, PRD-002 |
| **订单相关** |
| ORDER | 订单管理 | PRD-001, PRD-008 |
| PAY | 支付 | PRD-008 |
| **票券相关** |
| QR | 二维码 | PRD-001, PRD-003 |
| ACTIVATE | 激活 | PRD-006 |
| RESERVE | 预约 | PRD-006 |
| VALIDATE | 验证 | PRD-006, PRD-007 |
| **认证相关** |
| AUTH | 认证 | PRD-004, PRD-008 |
| OPR | 操作员 | PRD-003, PRD-006 |
| **渠道相关** |
| OTA | OTA集成 | PRD-002 |
| BATCH | 批次 | PRD-002 |
| **运营相关** |
| VENUE | 场馆 | PRD-003 |
| FRAUD | 防欺诈 | PRD-003 |
| REPORT | 报表 | PRD-002, PRD-003 |
| **通用** |
| PERF | 性能 | 所有 PRD |
| ERROR | 错误处理 | 所有 PRD |
| SEC | 安全 | 所有 PRD |

---

## 三、AC 分类体系（三分法）

每个功能域的 AC 按以下三类组织，使用序号范围区分：

| 分类 | 序号范围 | 说明 | 示例 |
|------|----------|------|------|
| **正常流程** | 01-29 | 核心功能、预期输入输出 | AC-006-ACTIVATE-01 |
| **异常流程** | 30-59 | 输入验证、业务规则违反、权限失败 | AC-006-ACTIVATE-30 |
| **边界情况** | 60-99 | 并发、临界值、幂等性、性能 | AC-006-ACTIVATE-60 |

### 详细分类

```
正常流程 (01-29)           异常流程 (30-59)           边界情况 (60-99)
├─ 01-09 核心功能           ├─ 30-39 输入验证失败       ├─ 60-69 并发处理
├─ 10-19 变种场景           ├─ 40-49 业务规则违反       ├─ 70-79 临界值
└─ 20-29 复杂组合           └─ 50-59 权限/认证失败      ├─ 80-89 幂等性
                                                      └─ 90-99 性能/超时
```

---

## 四、AC 提取流程

### 5 步工作流

```
Step 1: 从 PRD 提取业务 AC
        │
        ▼
Step 2: 从 Story 提取用户 AC
        │
        ▼
Step 3: 从 Card 提取技术 AC
        │
        ▼
Step 4: 从代码提取隐式 AC
        │
        ▼
Step 5: 整合与去重
```

### Step 1: 从 PRD 提取业务 AC

**输入**: PRD 文档的「成功指标」和「核心功能」章节

**操作**:
1. 阅读 PRD 成功指标
2. 识别核心功能列表
3. 为每个业务目标创建 AC

**输出**: AC-{PRD}-{DOMAIN}-01~09

**示例**:
```markdown
PRD-001 成功指标: "用户能浏览产品目录并查看价格"
→ AC-001-CATALOG-01: 产品列表显示所有可用套餐
→ AC-001-CATALOG-02: 产品详情包含价格信息
```

### Step 2: 从 Story 提取用户 AC

**输入**: Story 文档的「验收标准」章节 (Given/When/Then)

**操作**:
1. 阅读 Story 的每个场景 (A/B/C/D)
2. 将用户视角的验收标准转换为 AC
3. 标记 story_mapping 字段

**输出**: AC-{PRD}-{DOMAIN}-10~29

**示例**:
```markdown
US-006 场景 A: 用户激活票券
  Given 用户持有未激活票券
  When 用户点击激活按钮
  Then 票券状态变为已激活

→ AC-006-ACTIVATE-10: 激活按钮可用于 inactive 票券
   story_mapping: "US-006.A"
```

### Step 3: 从 Card 提取技术 AC

**输入**: Card 文档的「验收标准」章节 (技术视角 Given/When/Then)

**操作**:
1. 阅读 Card 的正常流程、异常流程、边界情况
2. 提取 API 契约中的验证规则
3. 标记 card_mapping 字段

**输出**: AC-{PRD}-{DOMAIN}-01~99 (按分类)

**示例**:
```markdown
Card ticket-activation:
  正常流程 AC-1: 激活端点转换状态
    Given tickets.status = 'inactive'
    When POST /tickets/:code/activate
    Then 返回 200，tickets.status = 'active'

→ AC-006-ACTIVATE-01: 激活端点返回 200 并更新状态
   card_mapping: "ticket-activation AC-1"
   category: happy_path
```

### Step 4: 从代码提取隐式 AC

**输入**: Service 层代码的边界条件检查

**操作**:
1. 审查代码中的 if/else、try/catch
2. 识别未在文档中记录的验证逻辑
3. 通过 `/tests` 页面添加手动验证记录

**输出**: manual_check 记录 (qa_verification_records 表)

**示例**:
```typescript
// 代码中发现的边界条件
if (ticket.activatedAt && Date.now() - ticket.activatedAt > 24 * 60 * 60 * 1000) {
  throw new Error('ACTIVATION_EXPIRED');
}

→ 在 /tests 页面添加手动验证:
   PRD: PRD-006
   描述: "激活超过24小时后无法再次操作"
   状态: pending
```

### Step 5: 整合与去重

**操作**:
1. 合并重复 AC（同一验证点在多层出现）
2. 建立 Story AC → Card AC 映射
3. 更新 prd-XXX-ac-mapping.yaml

**输出**: 完整的 AC 映射文件

---

## 五、AC 映射文件格式

**文件位置**: `docs/test-coverage/prd-{XXX}-ac-mapping.yaml`

### 完整格式

```yaml
# PRD-XXX AC 映射文件
# 遵循 AC-EXTRACTION-SPEC.md 规范

prd_id: PRD-006
title: "Ticket Activation and Time-Slot Reservation System"
last_updated: 2025-12-29
spec_version: "2.0"

# ===== AC 来源追溯 =====
source_traceability:
  prd_document: "docs/prd/PRD-006-ticket-activation.md"
  related_stories: ["US-006", "US-007"]
  related_cards: ["ticket-activation", "reservation-calendar"]

# ===== AC 定义 =====
acceptance_criteria:

  # === 功能域: 票券激活 ===
  activate:
    # 正常流程 (01-29)
    - ac_id: AC-006-ACTIVATE-01
      description: "激活端点转换 inactive → active"
      category: happy_path
      source:
        type: card
        document: "docs/cards/ticket-activation.md"
        section: "正常流程 AC-1"
      story_mapping: "US-006.A"
      card_mapping: "ticket-activation AC-1"
      test_id: "F1.1"
      status: tested

    # 异常流程 (30-59)
    - ac_id: AC-006-ACTIVATE-30
      description: "激活已激活票券返回错误"
      category: error_path
      source:
        type: card
        document: "docs/cards/ticket-activation.md"
        section: "异常流程 AC-4"
      expected_error:
        code: "ALREADY_ACTIVATED"
        http_status: 400
      test_id: "F1.6"
      status: tested

    # 边界情况 (60-99)
    - ac_id: AC-006-ACTIVATE-60
      description: "并发激活同一票券"
      category: edge_case
      source:
        type: code
        file: "src/modules/tickets/service.ts"
        line: 125
      test_id: ""
      status: pending
      skip_reason: "需要并发测试工具"

# ===== EXCLUDED CRITERIA (不计入覆盖率) =====
# PRD 中标记为 [DEFERRED] 或 out_of_scope 的功能
excluded_criteria:
  - ac_id: AC-006-EXAMPLE-99
    description: "示例：被暂缓的功能"
    prd_source: "PRD 中标记 [DEFERRED] 的章节"
    reason: "产品决定暂缓实现"
    prd_reference: "PRD-006 第XX行"

# ===== Story → AC 映射表 =====
story_ac_mapping:
  US-006:
    A: [AC-006-ACTIVATE-01, AC-006-ACTIVATE-02]
    B: [AC-006-ACTIVATE-10]
    C: [AC-006-ACTIVATE-30, AC-006-ACTIVATE-31]

# ===== 覆盖率摘要 =====
# 注意：excluded_criteria 中的 AC 不计入覆盖率分母
coverage_summary:
  total_ac: 26
  by_category:
    happy_path: { total: 10, tested: 10 }
    error_path: { total: 8, tested: 8 }
    edge_case: { total: 8, tested: 6 }
  coverage_percentage: "92% (24/26)"
  gaps:
    - ac_id: AC-006-ACTIVATE-60
      reason: "需要并发测试工具"
    - ac_id: AC-006-RESERVE-61
      reason: "需要压力测试环境"
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `ac_id` | ✅ | AC 编号，遵循命名规范 |
| `description` | ✅ | AC 描述 |
| `category` | ✅ | happy_path / error_path / edge_case |
| `source.type` | ✅ | prd / story / card / code |
| `source.document` | ✅ | 来源文档路径 |
| `source.section` | ⚪ | 章节引用 |
| `story_mapping` | ⚪ | 对应 Story 场景 (如 "US-006.A") |
| `card_mapping` | ⚪ | 对应 Card AC (如 "ticket-activation AC-1") |
| `test_id` | ✅ | Postman 测试 ID (如 "F1.1") |
| `status` | ✅ | tested / pending / skipped |
| `skip_reason` | ⚪ | 当 status=skipped 时必填 |
| `expected_error` | ⚪ | 错误场景的预期错误码 |

### excluded_criteria 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `ac_id` | ✅ | AC 编号（保留用于追溯） |
| `description` | ✅ | 功能描述 |
| `prd_source` | ✅ | PRD 中的来源章节 |
| `reason` | ✅ | 被排除的原因 |
| `prd_reference` | ⚪ | PRD 中 [DEFERRED] 标记位置 |

**重要原则**：
- `excluded_criteria` 中的 AC **不计入覆盖率分母**
- 只有 PRD 中明确标记 `[DEFERRED]` 或 `out_of_scope` 的功能才放入此处
- 功能恢复实现时，需从 `excluded_criteria` 移回 `acceptance_criteria`

---

## 六、Postman 测试命名规范

### 请求命名格式

```
FX.Y [操作] - [场景] [AC-XXX-DOMAIN-NN]
```

| 部分 | 说明 | 示例 |
|------|------|------|
| FX | Folder 编号 | F1, F2, F3 |
| Y | 测试序号 | 1, 2, 3 |
| 操作 | 动作动词 | 查询, 创建, 验证 |
| 场景 | 场景描述 | 产品列表, 无效ID |
| AC-XXX | AC 编号 | AC-006-ACTIVATE-01 |

### 示例

```
F1.1 激活票券 - 默认inactive状态 [AC-006-ACTIVATE-01]
F1.6 激活票券 - 重复激活返回错误 [AC-006-ACTIVATE-30]
F5.1 性能测试 - 激活响应时间 [AC-006-PERF-01]
```

---

## 七、覆盖验证规则

### 验证命令

```bash
npm run validate:ac-coverage
npm run validate:ac-coverage 006  # 指定 PRD
```

### 验证输出

```
PRD-006 AC Coverage Check
═══════════════════════════════════════════════════
✓ AC-006-ACTIVATE-01: 激活端点 → F1.1 (tested)
✓ AC-006-ACTIVATE-02: 即时激活 → F1.2 (tested)
✗ AC-006-ACTIVATE-60: 并发激活 → (no test)
⚠ AC-006-RESERVE-61: 压力测试 → (skipped: 需要压测环境)

Coverage: 24/26 = 92.3%
Gaps: 2
  - AC-006-ACTIVATE-60 [MISSING] - 测试缺失
  - AC-006-RESERVE-61 [SKIPPED] - 需要压测环境
```

### 覆盖率计算

```
覆盖率 = (tested + skipped_with_reason) / total × 100%
```

- `tested`: 有对应测试且通过
- `skipped`: 有明确跳过原因
- `pending`: 待测试（计入未覆盖）

---

## 八、维护更新流程

### 变更触发条件

| 变更类型 | 触发动作 |
|----------|----------|
| PRD 新增功能 | 新增业务 AC，更新 mapping 文件 |
| Story 场景变更 | 更新用户 AC，调整 Story 映射 |
| Card API 变更 | 更新技术 AC，调整测试用例 |
| 代码边界条件变更 | 通过 /tests 补充手动验证 |
| 测试通过/失败 | 更新 AC status |

### 更新流程

```
1. 识别变更来源（PRD/Story/Card/Code）
       │
       ▼
2. 更新对应层级的 AC
       │
       ▼
3. 更新 prd-XXX-ac-mapping.yaml
       │
       ▼
4. 更新/新增 Postman 测试
       │
       ▼
5. 运行 npm run validate:ac-coverage
       │
       ▼
6. 更新 /tests 页面的手动验证（如有隐式 AC）
```

---

## 九、与 QA 验证系统集成

隐式 AC 通过 `/tests` 页面的手动验证功能追踪：

```
文档 AC (mapping.yaml)  ←→  自动测试 (Postman/Newman)
        ↓
隐式 AC (代码边界)      ←→  手动验证 (qa_verification_records)
        ↓
/tests 页面统一展示
```

### 集成点

- `manual_check.prd_id` 关联 PRD 编号
- `/tests` 页面显示: mapping.yaml AC + 数据库手动验证
- 覆盖率合并计算

---

## 附录：旧编号迁移对照表

| 旧编号 | 新编号 | PRD |
|--------|--------|-----|
| AC-ACTIVATION-1 | AC-006-ACTIVATE-01 | PRD-006 |
| AC-ACTIVATION-2 | AC-006-ACTIVATE-02 | PRD-006 |
| AC-RESERVE-1 | AC-006-RESERVE-01 | PRD-006 |
| AC-CATALOG-1 | AC-001-CATALOG-01 | PRD-001 |
| AC-ORDER-1 | AC-001-ORDER-01 | PRD-001 |

> 迁移时同步更新 mapping.yaml 和 Postman 测试中的 AC 引用。
