# TOKEN_AND_IDEMPOTENCY

## 目的

说明 token 安全策略与幂等/并发控制：invite 唯一 active、attempt/start 幂等、attempt/submit 并发幂等。

## 适用范围

- Client token 访问（public）
- 关键写接口（invite、attempt）

## 非目标

- 不包含业务内容解释

## 目录 / TODO

- [ ] token 生成与 hash 存储策略
- [ ] Invite 状态机与只读策略（completed/expired 的 resolve/result）
- [ ] start 幂等：同 invite 只返回一个未提交 attempt
- [ ] submit 并发幂等：并发/重复提交只产生一次提交结果
- [ ] 推荐 smoke 脚本与复验步骤

## 关联实现/数据位置

- token hash：`lib/token.ts`
- invite 校验：`lib/authz.ts`（`requireInviteByToken`）
- start/answer/submit：`app/api/attempt/*`
- 并发/幂等 smoke：`scripts/smoke-invite-rules.ts`、`scripts/smoke-attempt-idempotency.ts`

