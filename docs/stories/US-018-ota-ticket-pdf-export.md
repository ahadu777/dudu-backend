---
id: US-018
title: OTA Ticket PDF Export
owner: Product
status: "Done"
priority: Medium
created_date: "2025-12-18"
last_updated: "2025-12-18"
business_requirement: "PRD-002"
depends_on:
  - US-012  # OTA Platform Integration required
cards:
  - ota-pdf-export
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-18 | 创建 | 初始版本 |

---

## 用户目标

**作为** OTA 合作伙伴
**我想要** 导出电子票券 PDF
**以便于** 发送给客户或打印分发

---

## 范围

### 包含 (In Scope)
- 单张票券 PDF 导出
- PDF 包含：标题、票券代码、二维码
- OTA API Key 认证

### 不包含 (Out of Scope)
- 批量导出多票到单个 PDF（后续 Phase 2）
- 自定义 PDF 模板/样式
- PDF 加密/密码保护

---

## 验收标准

### A. 单票 PDF 导出
- **Given** OTA 平台已生成票券
- **When** OTA 请求导出票券 PDF (`GET /api/ota/tickets/:code/pdf`)
- **Then** 系统返回包含标题、票券代码、二维码的 PDF 文件

### B. 权限验证
- **Given** OTA 平台请求导出其他 Partner 的票券
- **When** OTA 提交 PDF 导出请求
- **Then** 系统返回 403 Forbidden

### C. 票券不存在
- **Given** 票券代码不存在
- **When** OTA 请求导出该票券 PDF
- **Then** 系统返回 404 Not Found

### D. PDF 内容正确性
- **Given** 票券 PDF 导出成功
- **When** 用户打开 PDF 文件
- **Then** PDF 显示正确的标题【电子票券】、票券代码、可扫描的红色二维码

---

## 业务规则

### 导出规则
- 仅 OTA Partner 可导出其自己的票券
- 支持导出 PRE_GENERATED 和 ACTIVATED 状态的票券
- PDF 文件名格式：`{ticket_code}.pdf`

### 安全规则
- 需要 OTA API Key 认证
- Partner 只能导出属于自己的票券

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| ota-pdf-export | Draft | PDF 导出 API |

---

## 成功指标

| 指标 | 目标 | 状态 |
|------|------|------|
| PDF 生成成功率 | 99%+ | 待验证 |
| API 响应时间 | < 3秒 | 待验证 |
