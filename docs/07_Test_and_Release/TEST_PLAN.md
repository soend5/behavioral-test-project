# TEST_PLAN

## 目的

定义测试计划：功能/权限/并发幂等/内容合规/部署 gate 的测试范围与策略。

## 适用范围

- v1 灰度上线前复验

## 非目标

- 不替代具体验收脚本（脚本在 `scripts/`）

## 目录 / TODO

- [ ] 功能测试（Client/Coach/Admin）
- [ ] 权限与门禁（RBAC/Ownership/token）
- [ ] 幂等与并发（invite/attempt）
- [ ] 内容合规校验
- [ ] 发布 gate（migrate/seed/只读）

## 关联实现/数据位置

- 门禁 smoke：`scripts/smoke-invite-rules.ts`、`scripts/smoke-attempt-idempotency.ts`、`scripts/smoke-v1-readonly.ts`
- 生产 gate：`scripts/smoke-prod-gate.ts`
- 内容校验：`scripts/validate-seed-content.ts`

