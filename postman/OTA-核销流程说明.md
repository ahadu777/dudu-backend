# OTA扫码核销流程说明

## 📋 业务流程

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  OTA后台    │      │    用户      │      │  核销人员   │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                     │
       │ 1. 批量生成票券     │                     │
       │ POST /ota/tickets/bulk-generate         │
       ├────────────────────>│                     │
       │                    │                     │
       │ 2. 生成二维码       │                     │
       │ POST /qr/{code}    │                     │
       ├────────────────────>│                     │
       │                    │                     │
       │    📱发送二维码     │                     │
       │                    │                     │
       │                    │  👤用户到场出示      │
       │                    ├────────────────────>│
       │                    │                     │
       │                    │  3. 扫码解密（查看） │
       │                    │  POST /qr/decrypt   │
       │                    │<────────────────────┤
       │                    │                     │
       │                    │  ✅显示票券信息      │
       │                    │  - 顾客信息          │
       │                    │  - 可用权益          │
       │                    │  - 剩余次数          │
       │                    │                     │
       │                    │  4. 确认核销（消耗） │
       │                    │  POST /venue/scan   │
       │                    │<────────────────────┤
       │                    │                     │
       │                    │  ✅权益已消耗        │
       │                    │                     │
```

## 🔑 关键区别

### 解码端点 POST /qr/decrypt（第1步）

**用途**: 查看票券信息，不消耗权益

```json
// 请求
POST /qr/decrypt
{
  "encrypted_data": "iv:encrypted:authTag:signature"
}

// 响应
{
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "ticket_code": "OTA-CP-20251103-000001",
  "ticket_info": {
    "ticket_type": "OTA",
    "status": "ACTIVE",
    "customer_info": {
      "type": "adult",
      "name": "张三"
    },
    "entitlements": [
      {
        "function_code": "ferry",
        "remaining_uses": 1  // ⚠️ 未改变
      },
      {
        "function_code": "gift",
        "remaining_uses": 1  // ⚠️ 未改变
      }
    ]
  }
}
```

**特点**:
- ✅ 仅解密和展示信息
- ✅ remaining_uses **不变**
- ✅ 可以多次调用查看
- ✅ 无需场馆/终端信息
- ✅ 操作员确认信息后再核销

---

### 核销端点 POST /venue/scan（第2步）

**用途**: 实际核销，消耗权益

```json
// 请求
POST /venue/scan
{
  "qr_token": "iv:encrypted:authTag:signature",  // 相同的QR数据
  "function_code": "ferry",                       // 指定要核销的权益
  "terminal_device_id": "TERMINAL-CP-001"
}

// 响应
{
  "result": "success",
  "ticket_status": "partially_redeemed",
  "entitlements": [
    {
      "function_code": "ferry",
      "remaining_uses": 0  // ✅ 已减少
    },
    {
      "function_code": "gift",
      "remaining_uses": 1  // 未改变
    }
  ],
  "performance_metrics": {
    "fraud_checks_passed": true
  }
}
```

**特点**:
- ✅ **实际消耗权益**
- ✅ remaining_uses **减1**
- ✅ 同一QR+function只能核销一次
- ✅ 记录核销事件到数据库
- ✅ JTI防重复核销检查

---

## 🚀 快速测试

### 1. 导入Postman集合

```bash
# Postman中导入
postman/OTA-Scan-Redemption.postman_collection.json
```

### 2. 启动服务器

```bash
npm start
```

### 3. 按顺序运行

1. **Step 1: OTA生成预制票券** → 获取ticket_code
2. **Step 2: 生成二维码** → 获取encrypted_qr_data
3. **Step 3: 核销人员扫码解密** → 查看信息（不消耗）✅
4. **Step 4: 确认核销ferry** → 消耗ferry权益 ✅
5. **Step 5: 再次核销gift** → 同一QR码核销gift权益 ✅

### 4. 使用Newman命令行测试

```bash
# 运行完整流程
npx newman run postman/OTA-Scan-Redemption.postman_collection.json

# 只运行完整流程（不含错误测试）
npx newman run postman/OTA-Scan-Redemption.postman_collection.json \
  --folder "完整OTA核销流程 (Complete Flow)"
```

---

## 🎯 多权益核销示例

同一个QR码可以核销多个不同的权益（但每个权益只能核销一次）：

```bash
# 1. 在渡轮码头核销ferry权益
POST /venue/scan
{
  "qr_token": "...",
  "function_code": "ferry",
  "terminal_device_id": "TERMINAL-FERRY-001"
}
# ✅ 成功: ferry remaining_uses: 1 → 0

# 2. 在礼品店核销gift权益（同一QR码）
POST /venue/scan
{
  "qr_token": "...",  // 相同的QR数据
  "function_code": "gift",
  "terminal_device_id": "TERMINAL-GIFT-001"
}
# ✅ 成功: gift remaining_uses: 1 → 0

# 3. 尝试再次核销ferry（同一QR码）
POST /venue/scan
{
  "qr_token": "...",
  "function_code": "ferry",
  "terminal_device_id": "TERMINAL-FERRY-002"
}
# ❌ 拒绝: ALREADY_REDEEMED (防欺诈)
```

---

## 🛡️ 防欺诈机制

### JTI + function_code 组合检查

每次核销会检查数据库中是否已存在相同的 `(jti, function_code, result='success')` 记录：

```sql
-- 防重复核销查询
SELECT * FROM redemption_events
WHERE jti = '550e8400-...'
  AND function_code = 'ferry'
  AND result = 'success'
```

**如果存在** → 422 ALREADY_REDEEMED（防欺诈拒绝）
**如果不存在** → 继续核销流程

### 跨终端、跨场馆检测

- ✅ 无论在哪个终端扫码，都会检测全局JTI
- ✅ 同一QR码在渡轮码头核销ferry后，无法在其他码头再次核销ferry
- ✅ 但可以在礼品店核销gift权益（不同function_code）

---

## ⚠️ 常见误区

### ❌ 错误理解

**误区1**: "POST /qr/decrypt 也会消耗权益"
**正确**: decrypt仅解密查看，不消耗权益

**误区2**: "同一QR码只能使用一次"
**正确**: 同一QR码可以核销多个不同权益（ferry, gift, tokens等）

### ✅ 正确流程

```
OTA核销流程:
1. POST /ota/tickets/bulk-generate  → 批量生成票券
2. POST /qr/{code}                  → 生成二维码
3. POST /qr/decrypt                 → 解码查看（不消耗）
4. POST /venue/scan                 → 实际核销（消耗权益）
```

---

## 📊 数据库影响

### 解码操作 POST /qr/decrypt

- ✅ 无数据库写入
- ✅ 无权益变化
- ✅ 仅读取票券信息

### 核销操作 POST /venue/scan

- ✅ 插入 `redemption_events` 记录
- ✅ 更新 `entitlements.remaining_uses` 减1
- ✅ 如果所有权益耗尽，更新票券状态为 `USED`

```sql
-- 核销记录示例
INSERT INTO redemption_events (
  ticket_code,
  function_code,
  jti,
  result,
  terminal_device_id,
  redeemed_at
) VALUES (
  'OTA-CP-20251103-000001',
  'ferry',
  '550e8400-e29b-41d4-a716-446655440000',
  'success',
  'TERMINAL-CP-001',
  NOW()
);

-- 更新权益
UPDATE entitlements
SET remaining_uses = remaining_uses - 1
WHERE ticket_code = 'OTA-CP-20251103-000001'
  AND function_code = 'ferry';
```

---

## 🔍 调试技巧

### 查看核销记录

```bash
# 查询某个JTI的所有核销记录
curl "http://localhost:8080/venue/analytics/redemptions?jti=550e8400-..."

# 查询某张票的核销历史
curl "http://localhost:8080/venue/analytics/redemptions?ticket_code=OTA-CP-20251103-000001"
```

### 检查权益状态

```bash
# 解码查看当前权益状态（不消耗）
curl -X POST http://localhost:8080/qr/decrypt \
  -H "Content-Type: application/json" \
  -d '{"encrypted_data": "..."}'
```

### 防欺诈测试

```bash
# 第一次核销 - 应该成功
curl -X POST http://localhost:8080/venue/scan \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "...",
    "function_code": "ferry",
    "terminal_device_id": "TERMINAL-001"
  }'

# 第二次核销同样的权益 - 应该被拒绝
# 响应: {"result": "reject", "reason": "ALREADY_REDEEMED"}
```

---

## 📚 相关文档

- **技术规范**: `docs/cards/venue-enhanced-scanning.md`
- **完整测试集合**: `postman/QR-Generation-and-Verification.postman_collection.json`
- **OTA集成指南**: `docs/integration/US-012-runbook.md`
- **数据库Schema**: `src/modules/venue/domain/redemption-event.entity.ts`

---

## ❓ 常见问题

**Q: 为什么需要两步操作？**
A: 第一步让操作员确认票券信息（顾客姓名、权益类型），确认无误后再执行核销。避免误操作。

**Q: decrypt可以调用多次吗？**
A: 可以，decrypt不消耗权益，可以多次查看。

**Q: 一个QR码可以核销几次？**
A: 取决于票券包含的权益数量。每个权益只能核销一次，但可以核销多个不同权益。

**Q: 核销后可以撤销吗？**
A: 当前版本不支持撤销。需要实现退款流程需要新的API端点。

**Q: session_code是必须的吗？**
A: 不是必须的。从2025-11-14起，session_code变为可选参数。

---

生成时间: 2025-11-18
