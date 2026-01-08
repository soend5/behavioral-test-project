# PRD_ADMIN_CONSOLE

## 目的

定义总后台（admin console）的最小配置能力：题库/内容资产/账号/SOP/审计。

## 适用范围

- v1 灰度上线配置与维护

## 非目标

- 不做复杂运营后台或 BI

## 目录 / TODO

- [ ] 登录与权限（admin-only）
- [ ] 系统设置（助教创建邀请默认 quizVersion）
- [ ] 题库管理（Quiz/Question/Option）与版本策略（建议通过 quizVersion 演进）
- [ ] 内容资产管理（画像/手册/方法论）
- [ ] SOP 配置（规则与映射）
- [ ] 账号管理与审计日志

## 系统设置

### 默认题库版本（inviteDefaultQuizVersion）

**功能说明**：
- Admin 可在系统设置中配置助教创建邀请时的默认 quizVersion
- 助教创建邀请时不再需要手动选择 quizVersion（但仍可选择 fast/pro）
- 系统自动使用全局默认 quizVersion

**配置要求**：
- 默认 quizVersion 必须同时存在 fast 与 pro 两套题库
- 两套题库的 status 必须为 `active`（已停用的题库不能作为默认）

**使用场景**：
- 灰度发布新版本题库时，Admin 可统一切换默认版本
- 避免助教手动选择版本时出错
- 简化助教操作流程

## 关联实现/数据位置

- 页面：`app/admin/`
- API：`app/api/admin/*`
- 系统设置：`app/admin/settings/page.tsx`、`app/api/admin/settings/route.ts`
- 数据模型：`prisma/schema.prisma`

