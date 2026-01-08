# PRD_OVERVIEW

## 目的

给 PRD 提供总览入口：范围、流程、角色权限、验收与埋点（如有）。

## 适用范围

- fast/pro 测评与结果页
- coach/admin 后台最小集

## 非目标

- 不在本文写 UI 细节（交互稿另文档补齐）

## 目录 / TODO

- [ ] 目标与指标（完成率/复测率/转化等）
- [ ] 角色与权限边界
- [ ] 核心流程图（邀请 → 测评 → 结果 → 陪跑）
- [ ] 关键约束：合规口径 + v1 内容只读
- [ ] 验收标准与 smoke 脚本（关联 `../07_Test_and_Release/`）

## 关联实现/数据位置

- 前端：`app/`
- API：`app/api/`
- 评分：`lib/scoring.ts`
- SOP：`lib/sop-matcher.ts`
- 数据模型：`prisma/schema.prisma`

