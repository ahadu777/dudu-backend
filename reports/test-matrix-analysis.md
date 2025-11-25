# 🧪 OTA API 完整测试矩阵分析

**生成时间**: 2025-11-18
**目的**: 系统地识别每个 API 端点需要测试的所有参数组合、边界情况和错误处理

---

## 📊 测试覆盖率现状对比

### 当前已测试的场景 (7个基本测试)
✅ Health check - 基本调用
✅ Inventory - 无参数查询
✅ Resellers - 基本列表
✅ Bulk generate - 单一配置
✅ Tickets list - 单一状态筛选
✅ Orders - 基本列表
✅ Reservations - 基本列表

### 遗漏的测试场景 (预计 80+ 测试)
❌ 参数组合测试 (不同参数的排列组合)
❌ 边界值测试 (最大值、最小值、零值)
❌ 错误处理测试 (缺少必需参数、无效值)
❌ 状态转换测试 (PRE_GENERATED → ACTIVE → USED)
❌ 数据隔离测试 (不同 partner_id 的数据隔离)
❌ 分页边界测试 (page=0, limit=0, 超大值)
❌ 日期格式测试 (无效日期、未来日期、过去日期)
❌ 并发测试 (同时预订相同库存)
❌ 性能测试 (大批量生成、复杂查询)

---

## 🎯 完整测试矩阵

### 1. GET /api/ota/inventory - 库存查询

#### 参数定义
- `product_ids` (可选): 逗号分隔的产品ID列表

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 1.1 | 查询所有产品库存 | 无参数 | 返回所有产品库存 | 高 | ✅ 已测试 |
| 1.2 | 查询单个产品 | `product_ids=107` | 返回产品107库存 | 高 | ❌ 未测试 |
| 1.3 | 查询多个产品 | `product_ids=107,108` | 返回两个产品库存 | 高 | ❌ 未测试 |
| 1.4 | 查询不存在的产品 | `product_ids=999` | 返回空或404 | 中 | ❌ 未测试 |
| 1.5 | 无效产品ID格式 | `product_ids=abc` | 422错误 | 中 | ❌ 未测试 |
| 1.6 | 空产品ID列表 | `product_ids=` | 返回所有或空 | 低 | ❌ 未测试 |
| 1.7 | 混合有效/无效ID | `product_ids=107,abc,108` | 422错误 | 中 | ❌ 未测试 |
| 1.8 | 超长产品ID列表 | `product_ids=101,102,...,200` | 正常返回或限制 | 低 | ❌ 未测试 |

**边界情况**:
- 产品ID: 0, -1, 最大整数, 特殊字符
- 列表长度: 空, 1, 10, 100+

---

### 2. POST /api/ota/reserve - 创建预订

#### 参数定义
- `product_id` (必需): 产品ID
- `quantity` (必需): 数量
- `reservation_expires_at` (可选): 过期时间

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 2.1 | 正常预订 | `product_id=107, quantity=5` | 201成功创建 | 高 | ❌ 未测试 |
| 2.2 | 预订带过期时间 | 包含 `reservation_expires_at` | 成功创建带过期时间 | 高 | ❌ 未测试 |
| 2.3 | 缺少product_id | 只有 `quantity` | 400错误 | 高 | ❌ 未测试 |
| 2.4 | 缺少quantity | 只有 `product_id` | 400错误 | 高 | ❌ 未测试 |
| 2.5 | 产品不存在 | `product_id=999` | 404错误 | 高 | ❌ 未测试 |
| 2.6 | 库存不足 | `quantity=99999` | 409 SOLD_OUT错误 | 高 | ❌ 未测试 |
| 2.7 | 零数量 | `quantity=0` | 422验证错误 | 中 | ❌ 未测试 |
| 2.8 | 负数数量 | `quantity=-5` | 422验证错误 | 中 | ❌ 未测试 |
| 2.9 | 非数字product_id | `product_id="abc"` | 400错误 | 中 | ❌ 未测试 |
| 2.10 | 过去的过期时间 | `expires_at=2020-01-01` | 422验证错误 | 中 | ❌ 未测试 |
| 2.11 | 无效日期格式 | `expires_at=invalid` | 422验证错误 | 中 | ❌ 未测试 |

**边界情况**:
- quantity: 0, 1, 最大库存, 超过库存, -1, 最大整数
- product_id: 0, -1, 不存在的ID, 字符串, null
- expires_at: 过去时间, 当前时间, 未来1小时, 未来1年, 无效格式

---

### 3. GET /api/ota/tickets - 票券列表查询

#### 参数定义
- `status` (可选): 票券状态
- `batch_id` (可选): 批次ID
- `created_after` (可选): 创建时间起始
- `created_before` (可选): 创建时间结束
- `page` (可选): 页码
- `limit` (可选): 每页数量

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 3.1 | 无参数查询 | 无 | 返回所有票券 | 高 | ❌ 未测试 |
| 3.2 | 按状态筛选 | `status=PRE_GENERATED` | 只返回预生成票券 | 高 | ✅ 已测试 |
| 3.3 | 按batch_id筛选 | `batch_id=VERIFY_001` | 返回特定批次票券 | 高 | ❌ 未测试 |
| 3.4 | 日期范围筛选 | `created_after=2025-11-01&created_before=2025-11-30` | 返回11月票券 | 高 | ❌ 未测试 |
| 3.5 | 分页查询 | `page=1&limit=10` | 返回第1页10条 | 高 | ❌ 未测试 |
| 3.6 | 组合筛选 | `status=ACTIVE&batch_id=XXX&page=1` | 多条件筛选 | 高 | ❌ 未测试 |
| 3.7 | 无效状态值 | `status=INVALID` | 返回空或错误 | 中 | ❌ 未测试 |
| 3.8 | page=0 | `page=0` | 422错误 | 中 | ❌ 未测试 |
| 3.9 | limit=0 | `limit=0` | 422错误 | 中 | ❌ 未测试 |
| 3.10 | 负数分页 | `page=-1&limit=-10` | 422错误 | 中 | ❌ 未测试 |
| 3.11 | 无效日期格式 | `created_after=invalid-date` | 忽略或错误 | 中 | ❌ 未测试 |
| 3.12 | 时间范围倒置 | `created_after > created_before` | 返回空结果 | 低 | ❌ 未测试 |
| 3.13 | 超大limit | `limit=10000` | 限制或正常返回 | 低 | ❌ 未测试 |
| 3.14 | 不存在的批次 | `batch_id=NONEXIST` | 返回空数组 | 低 | ❌ 未测试 |

**状态枚举值** (需要每个都测试):
- `PRE_GENERATED` ✅
- `ACTIVE` ❌
- `USED` ❌
- `EXPIRED` ❌
- `CANCELLED` ❌

**边界情况**:
- page: 0, 1, 最大页数, 超出范围
- limit: 0, 1, 10, 100, 1000, 10000
- 日期: 过去时间, 当前时间, 未来时间, 无效格式

---

### 4. POST /api/ota/tickets/bulk-generate - 批量生成票券

#### 参数定义
- `product_id` (必需): 产品ID
- `quantity` (必需): 数量
- `batch_id` (必需): 批次ID
- `distribution_mode` (可选): 分发模式 (direct_sale | reseller_batch)
- `reseller_metadata` (可选): 分销商元数据
- `batch_metadata` (可选): 批次元数据
- `special_pricing` (可选): 特殊定价

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 4.1 | 基本生成 (direct_sale) | 最小必需参数 | 201成功生成 | 高 | ✅ 已测试 |
| 4.2 | reseller_batch模式 | 包含 `reseller_metadata` | 成功生成分销商批次 | 高 | ❌ 未测试 |
| 4.3 | 缺少reseller_metadata | `distribution_mode=reseller_batch` 无metadata | 400错误 | 高 | ❌ 未测试 |
| 4.4 | 批次元数据 | 包含 `batch_metadata` | 成功附加元数据 | 中 | ❌ 未测试 |
| 4.5 | 特殊定价 | 包含 `special_pricing` | 成功应用特殊价格 | 高 | ❌ 未测试 |
| 4.6 | 缺少product_id | 只有quantity和batch_id | 400错误 | 高 | ❌ 未测试 |
| 4.7 | 缺少quantity | 只有product_id和batch_id | 400错误 | 高 | ❌ 未测试 |
| 4.8 | 缺少batch_id | 只有product_id和quantity | 400错误 | 高 | ❌ 未测试 |
| 4.9 | 重复batch_id | 两次使用相同batch_id | 成功或冲突错误 | 高 | ❌ 未测试 |
| 4.10 | 产品不存在 | `product_id=999` | 404错误 | 高 | ❌ 未测试 |
| 4.11 | 库存不足 | `quantity=99999` | 409 SOLD_OUT | 高 | ❌ 未测试 |
| 4.12 | 零数量 | `quantity=0` | 422验证错误 | 中 | ❌ 未测试 |
| 4.13 | 负数数量 | `quantity=-10` | 422验证错误 | 中 | ❌ 未测试 |
| 4.14 | 大批量生成 | `quantity=1000` | 成功或性能测试 | 中 | ❌ 未测试 |
| 4.15 | 无效distribution_mode | `distribution_mode=invalid` | 默认或错误 | 低 | ❌ 未测试 |

**distribution_mode 枚举值**:
- `direct_sale` ✅
- `reseller_batch` ❌

**边界情况**:
- quantity: 0, 1, 10, 100, 1000, 10000, -1
- batch_id: 空字符串, 超长字符串, 特殊字符, 中文
- product_id: 不存在, 0, -1

---

### 5. POST /api/ota/tickets/:code/activate - 激活票券

#### 参数定义
- `customer_details` (必需): 客户信息 {name, email, phone}
- `customer_type` (必需): 客户类型 (adult | child | elderly)
- `visit_date` (可选): 访问日期 (YYYY-MM-DD)
- `payment_reference` (必需): 支付参考

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 5.1 | 激活成人票 (工作日) | `customer_type=adult, visit_date=2025-11-18` | 成功,工作日价格 | 高 | ❌ 未测试 |
| 5.2 | 激活成人票 (周末) | `customer_type=adult, visit_date=2025-11-23` | 成功,周末价格 | 高 | ❌ 未测试 |
| 5.3 | 激活儿童票 (65%折扣) | `customer_type=child` | 成功,儿童折扣 | 高 | ❌ 未测试 |
| 5.4 | 激活老人票 (83%折扣) | `customer_type=elderly` | 成功,老人折扣 | 高 | ❌ 未测试 |
| 5.5 | 无visit_date | 不提供visit_date | 成功,默认当天 | 高 | ❌ 未测试 |
| 5.6 | 缺少customer_details | 只有customer_type | 400错误 | 高 | ❌ 未测试 |
| 5.7 | 缺少customer_type | 只有customer_details | 400错误 | 高 | ❌ 未测试 |
| 5.8 | 缺少payment_reference | 无支付参考 | 400错误 | 高 | ❌ 未测试 |
| 5.9 | customer_details不完整 | 只有name,缺email | 400错误 | 高 | ❌ 未测试 |
| 5.10 | 无效customer_type | `customer_type=invalid` | 400错误 | 高 | ❌ 未测试 |
| 5.11 | 无效日期格式 | `visit_date=11/18/2025` | 400错误 | 中 | ❌ 未测试 |
| 5.12 | 无效日期值 | `visit_date=2025-02-30` | 400错误 | 中 | ❌ 未测试 |
| 5.13 | 过去日期 | `visit_date=2020-01-01` | 成功或错误 | 中 | ❌ 未测试 |
| 5.14 | 票券不存在 | `code=INVALID_CODE` | 404错误 | 高 | ❌ 未测试 |
| 5.15 | 票券已激活 | 激活同一张票两次 | 409 ALREADY_ACTIVATED | 高 | ❌ 未测试 |
| 5.16 | 不同partner_id | 用partner A的key激活partner B的票 | 403或404 | 高 | ❌ 未测试 |

**customer_type 枚举值** (价格差异测试):
- `adult` (100%价格) ❌
- `child` (65%价格) ❌
- `elderly` (83%价格) ❌

**visit_date 定价测试** (周末 vs 工作日):
- 工作日 (Mon-Fri) ❌
- 周末 (Sat-Sun) ❌

**边界情况**:
- visit_date: 过去, 今天, 明天, 1年后, 无效格式, 无效日期
- customer_details: 缺少字段, 空字符串, 特殊字符, 超长字符串
- ticket_code: 不存在, 已激活, 已使用, 已取消, 已过期

---

### 6. GET /api/ota/resellers/summary - 分销商汇总

#### 参数定义
- `status` (可选): 分销商状态 (默认active)
- `date_range` (可选): 日期范围
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `batches_per_reseller` (可选): 每个分销商显示的批次数

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 6.1 | 默认查询 | 无参数 | 返回active分销商 | 高 | ❌ 未测试 |
| 6.2 | 指定状态 | `status=terminated` | 返回已终止分销商 | 高 | ❌ 未测试 |
| 6.3 | 分页查询 | `page=1&limit=5` | 返回第1页5条 | 高 | ❌ 未测试 |
| 6.4 | 指定批次数量 | `batches_per_reseller=3` | 每个分销商显示3个批次 | 中 | ❌ 未测试 |
| 6.5 | 日期范围筛选 | `date_range=2025-11` | 返回11月数据 | 中 | ❌ 未测试 |
| 6.6 | 组合筛选 | `status=active&page=1&limit=10` | 多条件组合 | 中 | ❌ 未测试 |
| 6.7 | 无效分页参数 | `page=-1&limit=0` | 422错误 | 中 | ❌ 未测试 |
| 6.8 | 无效batches参数 | `batches_per_reseller=-1` | 422错误 | 中 | ❌ 未测试 |
| 6.9 | 无效date_range | `date_range=invalid` | 忽略或错误 | 低 | ❌ 未测试 |

**边界情况**:
- status: active, terminated, suspended, 无效值
- page/limit: 0, -1, 1, 100, 10000
- batches_per_reseller: 0, -1, 1, 10, 100

---

### 7. GET /api/ota/billing/summary - 计费汇总

#### 参数定义
- `period` (必需): 账期 (YYYY-MM格式)
- `reseller` (可选): 分销商名称

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 7.1 | 所有分销商 | `period=2025-11` | 返回11月所有分销商计费 | 高 | ❌ 未测试 |
| 7.2 | 特定分销商 | `period=2025-11&reseller=XXX` | 返回特定分销商计费 | 高 | ❌ 未测试 |
| 7.3 | 缺少period | 只有reseller参数 | 400错误 | 高 | ❌ 未测试 |
| 7.4 | 无效period格式 | `period=11/2025` | 400或422错误 | 中 | ❌ 未测试 |
| 7.5 | 未来period | `period=2026-12` | 返回空或错误 | 低 | ❌ 未测试 |
| 7.6 | 不存在的reseller | `reseller=NONEXIST` | 返回空 | 低 | ❌ 未测试 |

**边界情况**:
- period: 过去月份, 当前月份, 未来月份, 无效格式
- reseller: 存在, 不存在, 空字符串, 特殊字符

---

### 8. GET /api/ota/campaigns/analytics - 营销活动分析

#### 参数定义
- `campaign_type` (可选): 活动类型
- `date_range` (可选): 日期范围

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 8.1 | 无参数查询 | 无 | 返回所有活动数据 | 高 | ❌ 未测试 |
| 8.2 | 按类型筛选 | `campaign_type=promotion` | 返回特定类型 | 高 | ❌ 未测试 |
| 8.3 | 日期范围筛选 | `date_range=2025-11-01,2025-11-30` | 返回11月数据 | 高 | ❌ 未测试 |
| 8.4 | 组合筛选 | `campaign_type=XXX&date_range=XXX` | 多条件筛选 | 中 | ❌ 未测试 |
| 8.5 | 无效date_range格式 | `date_range=invalid` | 忽略或错误 | 低 | ❌ 未测试 |

---

### 9. GET /api/ota/batches/:id/analytics - 批次分析

#### 参数定义
- `id` (路径参数): 批次ID

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 9.1 | 存在的批次 | 有效batch_id | 返回批次分析数据 | 高 | ❌ 未测试 |
| 9.2 | 不存在的批次 | `id=NONEXIST` | 404错误 | 高 | ❌ 未测试 |

---

### 10. POST /api/ota/reservations/:id/activate - 激活预订

#### 参数定义
- `customer_details` (必需): {name, email, phone}
- `customer_type` (可选): 客户类型数组
- `payment_reference` (必需): 支付参考
- `special_requests` (可选): 特殊要求

#### 测试场景矩阵

| # | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|------|------|---------|--------|---------|
| 10.1 | 正常激活 | 完整参数 | 201创建订单 | 高 | ❌ 未测试 |
| 10.2 | 多客户类型 | `customer_type=[adult,child]` | 成功,混合定价 | 高 | ❌ 未测试 |
| 10.3 | 缺少customer_details | 只有payment_reference | 400错误 | 高 | ❌ 未测试 |
| 10.4 | 缺少payment_reference | 只有customer_details | 400错误 | 高 | ❌ 未测试 |
| 10.5 | customer_details不完整 | 缺少email | 400错误 | 高 | ❌ 未测试 |
| 10.6 | 无效customer_type | `customer_type=[invalid]` | 400错误 | 高 | ❌ 未测试 |
| 10.7 | customer_type非数组 | `customer_type=adult` (字符串) | 400错误 | 中 | ❌ 未测试 |
| 10.8 | 预订不存在 | `id=INVALID` | 404错误 | 高 | ❌ 未测试 |
| 10.9 | 预订已激活 | 激活同一预订两次 | 409错误 | 高 | ❌ 未测试 |
| 10.10 | 特殊要求 | 包含special_requests | 成功附加特殊要求 | 低 | ❌ 未测试 |

**customer_type 组合测试**:
- `[adult]` ❌
- `[child]` ❌
- `[elderly]` ❌
- `[adult, child]` ❌
- `[adult, elderly]` ❌
- `[adult, child, elderly]` ❌

---

### 11. CRUD Resellers - 分销商管理

#### 测试场景矩阵

| # | API | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|-----|------|------|---------|--------|---------|
| 11.1 | GET /resellers | 列出所有分销商 | 无 | 返回分销商列表 | 高 | ✅ 已测试 |
| 11.2 | GET /resellers/:id | 获取单个分销商 | 有效ID | 返回分销商详情 | 高 | ❌ 未测试 |
| 11.3 | GET /resellers/:id | 不存在的分销商 | 无效ID | 404错误 | 高 | ❌ 未测试 |
| 11.4 | POST /resellers | 创建分销商 | 完整参数 | 201成功创建 | 高 | ❌ 未测试 |
| 11.5 | POST /resellers | 缺少reseller_name | 无名称 | 400错误 | 高 | ❌ 未测试 |
| 11.6 | POST /resellers | 自动生成code | 不提供reseller_code | 成功,自动生成code | 中 | ❌ 未测试 |
| 11.7 | PUT /resellers/:id | 更新分销商 | 有效ID+更新数据 | 200成功更新 | 高 | ❌ 未测试 |
| 11.8 | PUT /resellers/:id | 更新不存在分销商 | 无效ID | 404错误 | 高 | ❌ 未测试 |
| 11.9 | DELETE /resellers/:id | 停用分销商 | 有效ID | 成功停用 | 高 | ❌ 未测试 |
| 11.10 | DELETE /resellers/:id | 停用不存在分销商 | 无效ID | 404错误 | 高 | ❌ 未测试 |

---

### 12. 其他端点

#### 测试场景矩阵

| # | API | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|-----|------|------|---------|--------|---------|
| 12.1 | GET /reservations/:id | 查询单个预订 | 有效ID | 返回预订详情 | 高 | ❌ 未测试 |
| 12.2 | GET /reservations/:id | 不存在的预订 | 无效ID | 404错误 | 高 | ❌ 未测试 |
| 12.3 | POST /reservations/cleanup | 清理过期预订 | 无 | 返回清理数量 | 中 | ❌ 未测试 |
| 12.4 | DELETE /reservations/:id | 取消预订 | 有效ID | 204成功 | 高 | ❌ 未测试 |
| 12.5 | DELETE /reservations/:id | 取消不存在预订 | 无效ID | 404错误 | 高 | ❌ 未测试 |
| 12.6 | DELETE /reservations/:id | 取消已激活预订 | 已激活ID | 409 CANNOT_CANCEL | 高 | ❌ 未测试 |
| 12.7 | GET /orders/:id/tickets | 获取订单票券 | 有效订单ID | 返回QR码列表 | 高 | ❌ 未测试 |
| 12.8 | GET /orders/:id/tickets | 不存在的订单 | 无效ID | 404错误 | 高 | ❌ 未测试 |
| 12.9 | GET /batches/:id/redemptions | 获取批次核销记录 | 有效batch_id | 返回核销列表 | 中 | ❌ 未测试 |
| 12.10 | GET /batches/:id/redemptions | 不存在的批次 | 无效batch_id | 404错误 | 中 | ❌ 未测试 |

---

### 13. Admin API (需要admin_api_key)

#### 测试场景矩阵

| # | API | 场景 | 参数 | 预期结果 | 优先级 | 当前状态 |
|---|-----|------|------|---------|--------|---------|
| 13.1 | GET /admin/partners | 列出所有合作伙伴 | 无 | 返回合作伙伴列表 | 高 | ❌ 未测试 |
| 13.2 | GET /admin/partners/:id/statistics | 合作伙伴统计 | partnerId + 日期范围 | 返回统计数据 | 高 | ❌ 未测试 |
| 13.3 | GET /admin/dashboard | 平台仪表板 | 日期范围 | 返回汇总数据 | 高 | ❌ 未测试 |
| 13.4 | GET /admin/* | 无admin权限 | 使用OTA key | 403 Forbidden | 高 | ❌ 未测试 |

---

## 🔐 认证和权限测试

### 测试场景矩阵

| # | 场景 | API Key | 预期结果 | 优先级 | 当前状态 |
|---|------|---------|---------|--------|---------|
| A.1 | 无API Key | 不提供 `X-API-Key` | 401 Unauthorized | 高 | ❌ 未测试 |
| A.2 | 无效API Key | `X-API-Key: invalid_key` | 401/403错误 | 高 | ❌ 未测试 |
| A.3 | OTA权限验证 | OTA key访问admin端点 | 403 Forbidden | 高 | ❌ 未测试 |
| A.4 | Admin权限验证 | Admin key访问admin端点 | 200成功 | 高 | ❌ 未测试 |
| A.5 | Partner隔离 | Partner A访问Partner B数据 | 返回空或403 | 高 | ❌ 未测试 |

---

## 📊 测试覆盖率统计

### 当前测试覆盖率

| 测试类别 | 总场景数 | 已测试 | 未测试 | 覆盖率 |
|---------|---------|--------|--------|--------|
| **参数组合测试** | 80+ | 7 | 73+ | **8.75%** |
| **边界值测试** | 30+ | 0 | 30+ | **0%** |
| **错误处理测试** | 40+ | 0 | 40+ | **0%** |
| **认证权限测试** | 5 | 0 | 5 | **0%** |
| **数据隔离测试** | 10 | 0 | 10 | **0%** |
| **状态转换测试** | 15 | 0 | 15 | **0%** |
| **总计** | **180+** | **7** | **173+** | **3.89%** |

---

## 🎯 优先级测试建议

### 高优先级 (必须测试)
1. **错误处理**: 缺少必需参数、无效值 (40个场景)
2. **认证权限**: API Key验证、partner隔离 (5个场景)
3. **核心业务流程**: 预订→激活→核销完整链路 (10个场景)
4. **状态枚举值**: 每个状态值都测试 (15个场景)

### 中优先级 (重要但非关键)
1. **参数组合**: 多个筛选条件组合 (30个场景)
2. **分页边界**: page=0, limit=0, 超大值 (10个场景)
3. **日期格式**: 无效格式、边界值 (15个场景)

### 低优先级 (可选)
1. **性能测试**: 大批量生成、复杂查询 (5个场景)
2. **极端边界**: 超长字符串、特殊字符 (10个场景)

---

## 📝 下一步行动计划

1. **立即执行**: 补充高优先级测试 (55个场景)
2. **本周完成**: 中优先级测试 (55个场景)
3. **逐步完善**: 低优先级测试 (15个场景)

**预计完整测试时间**: 3-5小时
**当前实际覆盖率**: 3.89%
**目标覆盖率**: 95%+

