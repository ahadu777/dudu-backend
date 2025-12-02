# Development Standards

## Definition of Ready (DoR)

- [ ] Complete API contract in card
- [ ] Dependencies identified
- [ ] 测试数据准备方案确定 (数据库/外部服务 Mock)

## Definition of Done (DoD)

- [ ] Matches card spec
- [ ] TypeScript compiles
- [ ] Endpoints respond (curl test)
- [ ] Card status = "Done"
- [ ] **Testing Complete** (建议自动运行测试):
  - [ ] Newman collection created: `postman/auto-generated/{prd|us}-{NNN}-xxx.postman_collection.json`
  - [ ] Run `npm run test:prd {N}` or `npm run test:story {N}` to verify
  - [ ] Run `npm test` to ensure no regression
  - [ ] Runbook created/updated (`docs/integration/US-XXX-runbook.md`)
  - [ ] Coverage updated (`docs/test-coverage/_index.yaml`)

## Code Style

- **Variables/functions**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- async/await for async code
- Proper TypeScript types (no `any`)
- Consistent JSON response formats

## Security

- Never commit secrets (use .env)
- Validate all inputs
- Use parameterized queries
- Add authentication where needed

## Anti-Script Principle

**优先使用简单命令：**
```bash
# ✅ 推荐
curl http://localhost:8080/endpoint
grep "status:" docs/cards/*.md
npm run test:prd

# ⚠️ 以下场景通常不需要创建脚本
# - 一次性检查
# - 测试端点
# - 进度查询
```

**适合创建脚本的场景**:
- Database migrations
- 复杂的自动化流程 (如 `scripts/run-newman-tests.js`)

## When Stuck

1. Copy patterns from working modules
2. 准备数据库测试数据 (参考 tech-stack.md Mock 策略)
3. Simple logging: `logger.info('event', data)`
4. Read: @docs/reference/TROUBLESHOOTING.md
