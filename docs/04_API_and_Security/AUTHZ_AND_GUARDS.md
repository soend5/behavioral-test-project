# AUTHZ_AND_GUARDS

## 目的

汇总门禁体系：RBAC、Ownership（资源归属）、token 访问与 API 的统一错误返回。

## 适用范围

- 所有 `app/api/*` Route Handlers
- `/admin/*`、`/coach/*` 页面访问保护

## 非目标

- 不替代接口清单（见 `API_SPEC.md`）

## 目录 / TODO

- [ ] 会话获取：NextAuth session
- [ ] RBAC：admin/coach 访问规则
- [ ] Ownership：customer/invite/attempt 归属校验
- [ ] token：invite token → invite 校验（hash 策略）
- [ ] 错误码与 HTTP 映射（统一返回）

## 关联实现/数据位置

- 会话与 RBAC：`lib/auth.ts`、`lib/rbac.ts`
- 门禁函数：`lib/authz.ts`
- 页面路由保护：`middleware.ts`
- 错误码：`lib/errors.ts`
- token hash：`lib/token.ts`

