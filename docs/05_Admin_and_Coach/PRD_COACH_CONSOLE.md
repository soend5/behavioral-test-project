# PRD_COACH_CONSOLE

## 目的

定义助教后台（coach console）的功能范围、核心流程与验收口径。

## 适用范围

- 客户管理（轻 CRM）
- 邀请生成/失效
- 客户详情页（测评时间线 + realtime panel）

## 非目标

- 不覆盖运营增长策略（见 `../09_Operations_and_Growth/`）

## 目录 / TODO

- [ ] 登录与权限（coach/admin）
- [ ] 客户列表/新建/详情
- [ ] 邀请管理（创建/失效/状态展示）
- [ ] 结果查看与复盘入口
- [ ] realtime panel 的输入/输出字段

## 关联实现/数据位置

- 页面：`app/coach/`
- API：`app/api/coach/*`
- 门禁：`lib/authz.ts`、`middleware.ts`

