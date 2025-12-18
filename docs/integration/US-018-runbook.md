# US-018: OTA Ticket PDF Export

OTA 合作伙伴导出电子票券 PDF，支持单票导出和批量导出。

---

## Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-018 |
| **PRD** | PRD-002 |
| **Status** | Done |
| **Last Updated** | 2025-12-19 |
| **Test Type** | API (Newman) |
| **Automation** | 完全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-018-ota-pdf-export.postman_collection.json` |
| Newman Command | `npm run test:story 018` |
| Related Cards | ota-pdf-export |

---

## Business Context

### 用户旅程

```
OTA 平台生成预制票券
  → OTA 需要导出票券 PDF
  → 调用单票导出 API 或批量导出 API
  → 获取 PDF 文件
  → 发送给客户或打印分发
```

### 业务验收标准 (来自 Story)

| Sub-Story | Given | When | Then |
|-----------|-------|------|------|
| **A - 单票导出** | OTA 平台已生成票券 | GET /api/ota/tickets/:code/pdf | 返回包含标题、票券代码、二维码的 PDF |
| **B - 权限验证** | OTA 请求导出其他 Partner 的票券 | GET /api/ota/tickets/:code/pdf | 返回 403 Forbidden |
| **C - 票券不存在** | 票券代码不存在 | GET /api/ota/tickets/:code/pdf | 返回 404 Not Found |
| **D - 批量导出** | OTA 平台有一个包含多张票的批次 | GET /api/ota/batches/:id/pdf | 返回多页 PDF，每票一页 |

### 测试目标

- [ ] 验证单票 PDF 导出功能
- [ ] 验证批量 PDF 导出功能
- [ ] 验证权限控制（Partner 只能导出自己的票）
- [ ] 验证错误处理（404、401）

---

## Prerequisites

### 环境准备

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **启动命令** | `npm run build && npm start` | 编译并启动服务 |
| **健康检查** | `curl http://localhost:8080/healthz` | 验证服务运行中 |

### 测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| **OTA Partner** | `X-API-Key: ota_full_access_key_99999` | OTA API 调用 |

### 前置数据

| 数据 | 要求 | 验证方式 |
|------|------|----------|
| Product 106 | 存在且有库存 | `GET /api/ota/inventory` |
| OTA API Key | `ota_full_access_key_99999` 已配置 | 认证测试 |

---

## Test Scenarios

### Module 1: 单票 PDF 导出

**Related Card**: `ota-pdf-export`

#### TC-PDF-001: 导出单张票券 PDF

**AC Reference**: `ota-pdf-export.AC-A`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | OTA 已生成票券 | GET /api/ota/tickets/:code/pdf | 返回 200，Content-Type: application/pdf |

**执行命令**:
```bash
# 先生成测试票券
RESP=$(curl -s -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "X-API-Key: ota_full_access_key_99999" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 106, "quantity": 1}')
TICKET_CODE=$(echo $RESP | jq -r '.tickets[0].ticket_code')

# 导出 PDF
curl -s "http://localhost:8080/api/ota/tickets/$TICKET_CODE/pdf" \
  -H "X-API-Key: ota_full_access_key_99999" \
  -o /tmp/ticket.pdf

file /tmp/ticket.pdf
```

**验证点**:
- [ ] 返回状态码 200
- [ ] Content-Type 为 application/pdf
- [ ] Content-Disposition 包含 filename
- [ ] PDF 文件有效（1 页）

---

#### TC-PDF-002: 票券不存在返回 404

**AC Reference**: `ota-pdf-export.AC-C`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券代码不存在 | GET /api/ota/tickets/NONEXISTENT/pdf | 返回 404 TICKET_NOT_FOUND |

**执行命令**:
```bash
curl -s "http://localhost:8080/api/ota/tickets/NONEXISTENT-TICKET/pdf" \
  -H "X-API-Key: ota_full_access_key_99999" | jq '.'
```

**验证点**:
- [ ] 返回状态码 404
- [ ] 响应包含 `code: "TICKET_NOT_FOUND"`
- [ ] 响应包含 `message`

---

#### TC-PDF-003: 无 API Key 返回 401

**AC Reference**: `ota-pdf-export.AC-B`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 请求不包含 X-API-Key | GET /api/ota/tickets/:code/pdf | 返回 401 API_KEY_REQUIRED |

**执行命令**:
```bash
curl -s "http://localhost:8080/api/ota/tickets/DT-xxx/pdf" | jq '.'
```

**验证点**:
- [ ] 返回状态码 401
- [ ] 响应包含 `error: "API_KEY_REQUIRED"`

---

### Module 2: 批量 PDF 导出

**Related Card**: `ota-pdf-export`

#### TC-PDF-004: 导出批次所有票券 PDF

**AC Reference**: `ota-pdf-export.AC-D`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | OTA 有一个包含多张票的批次 | GET /api/ota/batches/:id/pdf | 返回多页 PDF |

**执行命令**:
```bash
# 先生成包含 3 张票的批次
RESP=$(curl -s -X POST http://localhost:8080/api/ota/tickets/bulk-generate \
  -H "X-API-Key: ota_full_access_key_99999" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 106, "quantity": 3}')
BATCH_ID=$(echo $RESP | jq -r '.batch_id')

# 导出批量 PDF
curl -s "http://localhost:8080/api/ota/batches/$BATCH_ID/pdf" \
  -H "X-API-Key: ota_full_access_key_99999" \
  -o /tmp/batch.pdf

file /tmp/batch.pdf
```

**验证点**:
- [ ] 返回状态码 200
- [ ] Content-Type 为 application/pdf
- [ ] PDF 文件有效（3 页）

---

#### TC-PDF-005: 批次不存在返回 404

**AC Reference**: `ota-pdf-export.AC-D (error case)`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 批次 ID 不存在 | GET /api/ota/batches/NONEXISTENT/pdf | 返回 404 BATCH_NOT_FOUND |

**执行命令**:
```bash
curl -s "http://localhost:8080/api/ota/batches/NONEXISTENT-BATCH/pdf" \
  -H "X-API-Key: ota_full_access_key_99999" | jq '.'
```

**验证点**:
- [ ] 返回状态码 404
- [ ] 响应包含 `code: "BATCH_NOT_FOUND"`

---

## Automated Test Execution

### 运行 Newman 测试

```bash
# 确保服务运行中
curl http://localhost:8080/healthz

# 运行 US-018 测试
npm run test:story 018
```

### 预期结果

| 测试用例 | 预期状态 |
|----------|----------|
| Setup: Generate Test Tickets | PASS |
| 1.1 Single Ticket PDF - Success | PASS |
| 1.2 Single Ticket PDF - Not Found | PASS |
| 1.3 Single Ticket PDF - No API Key | PASS |
| 2.1 Batch PDF - Success | PASS |
| 2.2 Batch PDF - Not Found | PASS |
| 2.3 Batch PDF - No API Key | PASS |

---

## PDF Content Verification

### PDF 布局验证（手动）

导出的 PDF 应包含以下内容：

```
+---------------------------+
|     [ E-Ticket ]          |  <- 标题
+---------------------------+
|                           |
|  Ticket Code: DT-xxxx     |  <- 票券代码
|                           |
|      +-------------+      |
|      |   QR Code   |      |  <- 二维码
|      +-------------+      |
|                           |
| Present this QR code...   |  <- 提示文字
+---------------------------+
```

### 验证命令

```bash
# 打开 PDF 进行视觉验证
open /tmp/ticket.pdf
open /tmp/batch.pdf
```
