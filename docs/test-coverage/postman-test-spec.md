# Postman 测试集合规范

> 基于 PRD-008 建立的测试最佳实践标准

## 1. 整体结构

### 1.1 Collection 描述格式

```
PRD-XXX {项目名称}测试 - 覆盖 {N} 个验收标准

## 覆盖率: {已测试}/{总数} AC

### 测试结构:
1. {Folder 1} (N tests)
2. {Folder 2} (N tests)
...

### AC 映射: docs/test-coverage/prd-XXX-ac-mapping.yaml
```

### 1.2 Folder 组织原则

- 按**用户旅程**而非技术维度分组
- 每个 Folder 对应一个 Feature 或 AC 集合
- 使用数字前缀保持顺序: `0. Setup`, `1. 认证`, `2. 产品浏览`

### 1.3 数据库依赖标注

在 Folder description 中标注:
```
(DB Required) - 需要数据库支持的测试
```

---

## 2. 请求命名格式

### 2.1 标准格式

```
FX.Y [操作] - [场景] [AC-XXX]
```

| 部分 | 说明 | 示例 |
|------|------|------|
| FX | Folder 序号 | F0, F1, F2 |
| Y | 请求序号 | 1, 2, 3 |
| 操作 | 用户动作 | Login, Create Order, Scan QR |
| 场景 | 测试场景 | Empty Code, Invalid Token |
| AC-XXX | AC 引用 | AC-AUTH-1 |

### 2.2 示例

```
F0.1 WeChat Login - Empty Code (Validation) [AC-WECHAT-4]
F1.2 Product List - Miniprogram Channel [AC-CATALOG-1]
F2.3 Create Order - With Customer Info [AC-ORDER-1]
```

---

## 3. Description 格式（用户场景）

### 3.1 三段式结构

```
{角色}{动作}{系统期望}
```

### 3.2 示例

```
用户授权微信登录时传入空授权码，系统拒绝并提示参数错误
└─ 角色: 用户
└─ 动作: 授权微信登录时传入空授权码
└─ 期望: 系统拒绝并提示参数错误
```

```
OTA运营人员批量生成50张票券，系统在5秒内完成生成并返回票券列表
└─ 角色: OTA运营人员
└─ 动作: 批量生成50张票券
└─ 期望: 系统在5秒内完成生成并返回票券列表
```

---

## 4. x-flow 元数据（前端触发点）

### 4.1 结构定义

```json
{
  "x-flow": {
    "sequence": 1,
    "page": "product-list",
    "trigger": "button:立即预订",
    "produces": ["order_id"],
    "consumes": ["product_id", "auth_token"]
  }
}
```

### 4.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| sequence | number | 在用户旅程中的顺序 |
| page | string | 前端页面标识 |
| trigger | string | 触发方式 |
| produces | string[] | 产出的变量 |
| consumes | string[] | 消费的变量 |

### 4.3 触发类型

| 类型 | 格式 | 说明 |
|------|------|------|
| 自动加载 | `auto:page-load` | 页面加载时自动触发 |
| 按钮点击 | `button:按钮文字` | 用户点击按钮 |
| 列表交互 | `tap:组件名` | 点击列表项 |
| 滚动加载 | `scroll:load-more` | 滚动到底部 |
| 输入提交 | `input:字段名` | 输入后自动触发 |
| 深度链接 | `deeplink:路径` | 外部跳转 |
| 回调触发 | `callback:事件名` | 支付/推送回调 |

### 4.4 数据流追踪

```
F1.1 WeChat Login
  produces: ["auth_token", "openid"]
      │
      ▼
F2.1 Product List
  consumes: ["auth_token"]
  produces: ["product_id"]
      │
      ▼
F3.1 Create Order
  consumes: ["auth_token", "product_id"]
  produces: ["order_id"]
```

---

## 5. 变量命名规范

### 5.1 Collection Variables

| 变量 | 用途 |
|------|------|
| `base_url` | 服务器地址 |
| `auth_token` | 认证 Token |
| `ota_api_key` | OTA API 密钥 |
| `operator_token` | 操作员 Token |

### 5.2 测试数据变量

| 前缀 | 用途 | 示例 |
|------|------|------|
| `test_` | 测试专用数据 | `test_openid` |
| `created_` | 创建的资源 ID | `created_order_id` |
| `temp_` | 临时变量 | `temp_qr_token` |

---

## 6. 测试脚本模式

### 6.1 标准模式

```javascript
// 1. DB 模式检查（可选，用于需要数据库的测试）
if (pm.response.code === 500) {
    pm.test.skip('功能需要数据库支持');
    return;
}

// 2. 状态验证
pm.test('返回正确状态码', function() {
    pm.response.to.have.status(200);
});

// 3. 数据结构验证
pm.test('响应包含必需字段', function() {
    const data = pm.response.json();
    pm.expect(data).to.have.property('id');
    pm.expect(data).to.have.property('status');
});

// 4. 业务规则验证
pm.test('订单状态正确', function() {
    const data = pm.response.json();
    pm.expect(data.status).to.equal('PENDING');
});

// 5. 变量提取（用于后续请求）
const data = pm.response.json();
pm.collectionVariables.set('order_id', data.id);
```

### 6.2 错误场景模式

```javascript
pm.test('返回错误状态码', function() {
    pm.response.to.have.status(400);
});

pm.test('错误信息正确', function() {
    const data = pm.response.json();
    pm.expect(data.error).to.include('Invalid');
});
```

### 6.3 性能验证模式

```javascript
pm.test('响应时间 <500ms', function() {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

## 7. Folder 结构示例

### 7.1 小程序用户旅程 (PRD-008)

```
0. 微信认证 (5 tests)
   └─ F0.1 WeChat Login - Valid Code
   └─ F0.2 WeChat Login - Empty Code (Validation)
   └─ F0.3 Phone Binding
   └─ F0.4 Get JWT Token
   └─ F0.5 Login Performance

1. 产品浏览 (4 tests)
   └─ F1.1 Product List - Miniprogram Channel
   └─ F1.2 Product Detail - With Pricing
   └─ F1.3 Inventory Check
   └─ F1.4 Channel Filtering

2. 订单管理 (5 tests)
   └─ F2.1 Create Order
   └─ F2.2 Price Calculation
   └─ F2.3 Order Status Query
   └─ F2.4 Order List (Pagination)
   └─ F2.5 Unauthorized Access (401)

3. 支付集成 (4 tests)
4. 票券发放 (5 tests)
5. 取消退款 (3 tests)
```

### 7.2 OTA 运营旅程 (PRD-002)

```
0. Setup (健康检查)
1. 库存查询 (3 tests)
2. 票券生成 (4 tests)
3. 票券激活 (4 tests)
4. 状态管理 (3 tests)
5. 分析报告 (4 tests)
```

---

## 8. AC 映射文件格式

每个 PRD 对应一个 AC 映射文件:

```yaml
# docs/test-coverage/prd-XXX-ac-mapping.yaml

prd_id: PRD-XXX
title: {PRD 标题}
last_updated: YYYY-MM-DD
coverage_principle: "Coverage % = (有测试的AC数 / 总AC数) × 100"

acceptance_criteria:
  category_name:
    - ac_id: AC-CAT-1
      description: "验收标准描述"
      prd_source: "PRD 来源章节"
      test_id: "1.1"
      status: tested | needs_fix | pending

coverage_summary:
  total_ac: N
  tested: N
  needs_fix: N
  coverage_percentage: "XX% (N/N)"
```

---

## 9. 检查清单

创建或更新测试集合时，确认以下项目:

- [ ] Collection description 包含覆盖率和 AC 映射引用
- [ ] 使用 Folder 按用户旅程组织
- [ ] 请求命名遵循 `FX.Y [操作] - [场景]` 格式
- [ ] 每个请求有中文用户场景 description
- [ ] 包含 x-flow 元数据（sequence, page, trigger, produces, consumes）
- [ ] 测试脚本包含状态验证和数据结构验证
- [ ] 变量命名遵循规范
- [ ] AC 映射文件已更新
