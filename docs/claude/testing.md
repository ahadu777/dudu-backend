# Testing Guidelines

## Test Pyramid

```
PRD Tests (业务规则) → Newman + PRD Acceptance Criteria
    ↓
Story Tests (E2E流程) → Runbook + Newman Collection
    ↓
Card Tests (端点级) → curl + Newman
```

## Auto-Discovery Test System

测试系统会**自动发现**新增的测试集合，无需修改 `package.json`。

**命名规范** (建议遵循):
```
postman/auto-generated/
├── prd-{NNN}-{description}.postman_collection.json   # PRD 测试
├── us-{NNN}-{description}.postman_collection.json    # Story 测试
└── _archived/                                         # 过时测试存档
```

## 测试命令

| 命令 | 作用 | 示例 |
|------|------|------|
| `npm test` | 主测试套件 | Smoke + PRD + Story |
| `npm run test:prd` | 所有 PRD 测试 | 自动发现 prd-*.json |
| `npm run test:prd {N}` | 指定 PRD | `npm run test:prd 008` |
| `npm run test:story` | 所有 Story 测试 | 自动发现 us-*.json |
| `npm run test:story {N}` | 指定 Story | `npm run test:story 015` |
| `npm run test:all` | 全部测试 | Smoke + PRD + Story |

## 新增 PRD/Story 测试流程

1. 创建 Postman 集合: `postman/auto-generated/prd-008-xxx.postman_collection.json`
2. 运行测试: `npm run test:prd 008`
3. 无需修改任何配置文件

## Testing Workflow

| Step | Tool | Command |
|------|------|---------|
| 1. 快速验证 | curl | `curl http://localhost:8080/[endpoint]` |
| 2. E2E 流程 | Runbook | Execute `docs/integration/US-XXX-runbook.md` |
| 3. 自动化 | Newman | `npm run test:prd 006` 或 `npm run test:story 014` |
| 4. 覆盖率 | Registry | Update `docs/test-coverage/_index.yaml` |

## Test Assets

```
postman/auto-generated/                 # AI 生成的测试 (自动发现)
postman/auto-generated/_archived/       # 过时测试存档
postman/QUICK-SMOKE-TESTS.json         # 冒烟测试
reports/newman/                         # Newman 测试报告输出
docs/integration/US-XXX-runbook.md     # E2E 可执行流程
docs/test-coverage/_index.yaml         # 覆盖率追踪
scripts/run-newman-tests.js            # 测试自动发现脚本
```

## Newman Reports

**报告格式** (建议):
```bash
npx newman run {collection}.json --reporters cli,junit --reporter-junit-export reports/newman/{id}-e2e.xml
```

| 报告类型 | 命名格式 | 示例 |
|---------|---------|------|
| PRD 测试 | `prd-{id}-e2e.xml` | `prd-006-e2e.xml` |
| Story 测试 | `us-{id}-e2e.xml` | `us-012-e2e.xml` |
