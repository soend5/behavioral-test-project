# 00_README

## 一句话定位

交易行为结构测评（fast/pro）+ 助教后台（轻 CRM + SOP/陪跑面板）+ 总后台配置（题库/内容资产/账号/审计），用于输出**行为结构画像与沟通建议**；**非投顾、非买卖建议、不承诺收益**。

## 系统分层（从外到内）

- Client 测评端：`/t/[token]` → `/t/[token]/quiz` → `/t/[token]/result`
- Coach 助教端：客户列表/详情、邀请管理、实时陪跑提示区
- Admin 总后台：题库/内容资产/账号/SOP 配置、审计日志
- API 与门禁：Next.js Route Handlers（`app/api/*`）+ `lib/authz.ts` + `middleware.ts`
- 数据与内容资产：Postgres（Prisma）+ `data/seed/*.json`（题库/画像/手册/方法论）

## 核心路径（最小闭环）

1. Admin 配置内容资产（v1 默认只读；新版本以 `quizVersion` 演进）
2. Coach 创建客户与邀请（invite/token）
3. Client 通过 token 启动测评、答题、提交
4. Client 查看结果（画像与建议）
5. Coach 在客户详情页查看测评时间线与实时陪跑提示

## 合规边界（最小口径）

- 输出是“行为结构画像/沟通建议/陪跑策略参考”
- 不提供投资顾问服务；不构成任何买卖建议；不承诺收益
- 相关提示位（已落地）：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`

## 从哪里开始看（5 分钟入口）

按阅读顺序：

1. `01_Project/PROJECT_OVERVIEW.md`
2. `02_Product/ASSESSMENT_DESIGN.md`
3. `03_Architecture/DATA_FLOW.md`
4. `04_API_and_Security/API_SPEC.md`
5. `08_Deployment_and_Ops/DEPLOY_PROD.md`

## 文档地图（目录树）

> 约定：历史/调试/prompt 类文档统一归档在 `99_Archive/`。

- `01_Project/`：立项共识、边界与场景
- `02_Product/`：PRD、测评设计、结果解释、SOP 映射、内容资产规范
- `03_Architecture/`：架构、数据流、数据模型、评分与 SOP 引擎
- `04_API_and_Security/`：API 规范、RBAC、门禁与幂等
- `05_Admin_and_Coach/`：后台产品文档、教练手册、运营指南
- `06_Content_and_Assets/`：题库/画像/手册/方法论资产指南与版本策略
- `07_Test_and_Release/`：测试计划、验收、灰度与回滚、发布模板
- `08_Deployment_and_Ops/`：生产部署、环境、运维手册与应急
- `09_Operations_and_Growth/`：冷启动、指标埋点、迭代机制、培训与客服

## 关联实现（快速索引）

- 权限与门禁：`lib/authz.ts`、`middleware.ts`、`lib/rbac.ts`
- Token 与 hash：`lib/token.ts`
- 评分与画像：`lib/scoring.ts`
- SOP 匹配：`lib/sop-matcher.ts`
- 数据模型：`prisma/schema.prisma`
- 内容资产：`data/seed/*.json`、`prisma/seed-content.ts`

