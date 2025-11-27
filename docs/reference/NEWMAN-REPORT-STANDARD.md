# Newman Report Generation Standard

## Core Principle

```
Newman Test → JUnit XML Report → reports/newman/{id}-e2e.xml
```

---

## Standard Command Format

```bash
npx newman run {collection}.json --reporters cli,junit --reporter-junit-export reports/newman/{id}-e2e.xml
```

**Parameters:**
- `--reporters cli,junit`: 同时输出到控制台和 JUnit XML
- `--reporter-junit-export`: 指定 XML 报告输出路径

---

## Naming Convention

| 报告类型 | 命名格式 | 示例 |
|---------|---------|------|
| PRD 测试 | `prd-{id}-e2e.xml` | `prd-006-e2e.xml` |
| Story 测试 | `us-{id}-e2e.xml` | `us-012-e2e.xml` |
| 自定义测试 | `{name}-e2e.xml` | `ota-b2b2c-billing.xml` |

---

## Verified Examples

### PRD-006 Ticket Activation

```bash
npx newman run postman/auto-generated/prd-006-ticket-activation.postman_collection.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman/prd-006-e2e.xml
```

**Output:** `reports/newman/prd-006-e2e.xml` (5.9KB, 25 assertions)

### PRD-007 Reservation Validation

```bash
npx newman run postman/auto-generated/prd-007-reservation-validation.postman_collection.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman/prd-007-e2e.xml
```

**Output:** `reports/newman/prd-007-e2e.xml` (8.5KB, 36 assertions)

### Story E2E Test (via script)

```bash
node scripts/run-e2e-by-context.mjs --story US-012
```

**Output:** `reports/newman/us-012-e2e.xml`

---

## npm Scripts Integration

在 `package.json` 中配置测试脚本时，必须包含报告输出：

```json
{
  "scripts": {
    "test:prd006": "npx newman run postman/auto-generated/prd-006-ticket-activation.postman_collection.json --reporters cli,junit --reporter-junit-export reports/newman/prd-006-e2e.xml",
    "test:prd007": "npx newman run postman/auto-generated/prd-007-reservation-validation.postman_collection.json --reporters cli,junit --reporter-junit-export reports/newman/prd-007-e2e.xml"
  }
}
```

---

## Directory Structure

```
reports/
└── newman/
    ├── prd-006-e2e.xml           # PRD-006 测试报告
    ├── prd-007-e2e.xml           # PRD-007 测试报告
    ├── us-010a-e2e.xml           # Story US-010A 报告
    ├── us-010b-e2e.xml           # Story US-010B 报告
    ├── us-012-e2e.xml            # Story US-012 报告
    └── us-013-venue-operations-e2e.xml
```

---

## AI Workflow Integration

### When to Generate Reports

| 触发事件 | 命令 | 报告输出 |
|---------|------|---------|
| 代码修改后 | `npm test` | `prd-006-e2e.xml`, `prd-007-e2e.xml` |
| Card 标记 Done 前 | `npm test` | 自动生成 |
| Story E2E 验证 | `node scripts/run-e2e-by-context.mjs --story US-XXX` | `us-xxx-e2e.xml` |

### AI Must Follow

1. **运行测试时必须生成报告** - 不能只用 `--reporters cli`
2. **报告路径固定** - `reports/newman/`
3. **命名必须一致** - `{id}-e2e.xml`
4. **测试失败时保留报告** - 便于分析

---

## Report Content (JUnit XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="PRD-006: Ticket Activation &amp; Reservation System Tests" tests="25" failures="0">
  <testsuite name="PRD-006: Ticket Activation System / AC-1.1" tests="2" failures="0">
    <testcase name="Status code is 200 or 400" time="0.013"/>
    <testcase name="AC-1.1: Inactive ticket validation fails" time="0.001"/>
  </testsuite>
  <!-- more test suites -->
</testsuites>
```

---

## Troubleshooting

### 报告未生成

```bash
# 检查目录是否存在
ls -la reports/newman/

# 如果不存在，创建
mkdir -p reports/newman/
```

### 报告格式错误

确保使用 `--reporters cli,junit` 而不是 `--reporters junit`（后者不会输出到控制台）

---

## Related

- [AI-TEST-GENERATION.md](AI-TEST-GENERATION.md) - 测试生成工作流
- [run-e2e-by-context.mjs](../../scripts/run-e2e-by-context.mjs) - Story E2E 测试脚本
