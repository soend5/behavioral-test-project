# PRD_ADMIN_CONSOLE

## 目的

定义总后台（admin console）的最小配置能力：题库/内容资产/账号/SOP/审计。

## 适用范围

- v1 灰度上线配置与维护

## 非目标

- 不做复杂运营后台或 BI

## 目录 / TODO

- [ ] 登录与权限（admin-only）
- [ ] 题库管理（Quiz/Question/Option）与 v1 只读策略
- [ ] 内容资产管理（画像/手册/方法论）
- [ ] SOP 配置（规则与映射）
- [ ] 账号管理与审计日志

## 关联实现/数据位置

- 页面：`app/admin/`
- API：`app/api/admin/*`
- v1 只读门禁：`app/api/admin/questions/route.ts`、`app/api/admin/options/route.ts`
- 数据模型：`prisma/schema.prisma`

