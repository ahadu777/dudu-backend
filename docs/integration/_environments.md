# 测试环境配置

> 所有 Runbook 共享的环境配置信息

## 环境地址

| 环境 | Base URL | 说明 |
|------|----------|------|
| **本地开发** | `http://localhost:8080` | 本地调试、单元测试 |
| **线上开发** | `https://mesh.synque.ai` | 前端对接、集成测试 |

## 健康检查

```bash
# 本地
curl http://localhost:8080/healthz

# 线上
curl https://mesh.synque.ai/healthz
```

## 通用测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| **OTA Partner** | `X-API-Key: ota_full_access_key_99999` | OTA API 调用 |
| **Operator** | `POST /operators/login` | 场馆操作员 |

## Swagger 文档

| 环境 | 地址 |
|------|------|
| 本地 | http://localhost:8080/api-docs |
| 线上 | https://mesh.synque.ai/api-docs |

---

> 注意：线上环境的测试账号和本地可能不同，请联系管理员获取正式凭证。
