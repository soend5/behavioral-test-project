# itisme：项目现状交接（给协作智能体/新成员）

> 最后更新：2026-01-07  
> 仓库：`behavioral-test-project`（Next.js 14 + Prisma + Supabase Postgres + NextAuth）

## 0. 一句话定位

这是一个「**交易行为结构测评（fast/pro）** + **助教（销售陪跑）后台（轻 CRM + SOP 面板）** + **总后台配置（题库/SOP/内容资产/账号/审计）**」的 MVP 工程，用于帮助助教通过测评理解客户并给出可执行的沟通策略建议；**非投顾/非信号/非教学工具**。

---

## 1. 产品边界（防跑偏/合规口径）

基于 `docs/交易行为结构测评系统.md` 的“冻结共识版”：

- **对外营销层（/）**：只讲价值，不提供测评入口、不登录、不留数据。
- **测评体验层（/t/[token]）**：只允许助教邀请的客户进入；客户无账号无密码；一人一链；只能看自己的题目与结果。
- **助教/商业层（/coach/*）**：助教登录后只看自己的客户、邀请与测评数据；看到实时 SOP 面板（realtime_panel）。
- **总后台（/admin/*）**：管理员做系统配置（题库、SOP 映射、内容资产、助教账号、审计日志）。

合规口径建议（项目已按此方向实现，但文案可继续补齐）：
- 测评输出是“行为结构画像/沟通建议”，不承诺收益、不提供买卖点位/个股建议。
- 客户数据属于业务数据资产，需明确“采集目的/保存期限/访问权限/删除机制”（文档待补齐）。

---

## 2. 当前已实现能力（MVP 功能面）

### 2.1 Client（被邀请客户）

路径：
- 邀请落地页：`/t/[token]`（展示邀请信息：客户、助教、版本、状态；根据状态引导开始/继续/看结果）
- 测评页：`/t/[token]/quiz`（start attempt → 拉题 → 提交答案 → submit → 跳转结果）
- 结果页：`/t/[token]/result`（读取已提交 attempt 的 tags + resultSummary）

接口（详见 `docs/API_SPEC.md`、`docs/CLIENT_API_ACCEPTANCE.md`）：
- `GET /api/public/invite/resolve`
- `POST /api/attempt/start`（幂等）
- `GET /api/quiz`（按 invite 的 `quizVersion + version` 锁定题库）
- `POST /api/attempt/answer`（合并写入 answersJson，校验题库归属/状态）
- `POST /api/attempt/submit`（事务 + submittedAt 并发幂等 + 计算分数/标签 + invite 置 completed）
- `GET /api/public/attempt/result`

### 2.2 Coach（助教后台）

路径：
- 登录：`/coach/login`
- 客户列表/创建客户：`/coach/dashboard`
- 邀请列表：`/coach/invites`
- 创建邀请：`/coach/invites/new`
- 客户详情聚合页：`/coach/clients/[id]`（latestAttempt + timeline + tags + realtime_panel）

关键规则：
- **同一客户同一版本仅 1 个 active invite**（DB 约束 + 事务创建，避免并发双 active）
- coach 标签必须以 `coach:` 开头（用于 SOP 匹配）

### 2.3 Admin（总后台）

路径：
- 登录：`/admin/login`
- Dashboard（seed 状态总览）：`/admin`
- 助教账号：`/admin/coaches`
- SOP 配置：`/admin/sop`
- 审计日志：`/admin/audit`
- 题库/题目/选项：`/admin/quiz`、`/admin/questions`、`/admin/options`
- 内容资产：`/admin/archetypes`、`/admin/training-handbook`、`/admin/methodology`

关键规则：
- **题库版本保护**：v1 内容资产默认只读（避免破坏已使用版本；通过 API 层门禁硬拒绝，详见 `docs/ADMIN_V1_IMPLEMENTATION.md`、`scripts/smoke-prod-gate.ts`）。

---

## 3. 技术架构与关键设计（工程视角）

### 3.1 技术栈

- Next.js 14（App Router）+ TypeScript
- Supabase Postgres（唯一数据库）
- Prisma ORM（含 migrations/seed）
- NextAuth（Credentials provider，JWT session）
- Tailwind CSS

### 3.2 目录结构（重点）

- `app/`：页面与 API routes（App Router）
  - `app/t/[token]/*`：客户测评端
  - `app/coach/*`：助教后台
  - `app/admin/*`：总后台
  - `app/api/*`：HTTP API（按 admin/coach/public/attempt 分组）
- `lib/`：领域逻辑与门禁
  - `lib/auth.ts`：NextAuth `authOptions`
  - `lib/authz.ts`：统一门禁（RBAC/Ownership/Token/状态断言）
  - `lib/scoring.ts`：评分与标签生成（fast/pro）
  - `lib/sop-matcher.ts`：SOP 匹配引擎 + 默认 panel
  - `lib/apiResponse.ts` + `lib/errors.ts`：统一响应格式与错误码映射
- `prisma/`：schema、migrations、seed
  - `prisma/seed.ts`：本地/开发 seed（含弱默认口令，仅用于开发）
  - `prisma/seed.prod.ts`：生产 seed（强门禁 + advisory lock + 幂等）
  - `prisma/seed-content.ts`：从 `data/seed/*.json` 幂等导入内容资产
- `data/seed/`：内容资产 JSON（题库/画像/内训/方法论）
- `scripts/`：内容资产校验与生产 smoke gate

> 注意：仓库里同时存在一些“旧工具文件”（例如 `lib/api-response.ts`、`lib/rbac.ts`、`lib/auth-helpers.ts`），当前主流程以 `lib/authz.ts` + `lib/apiResponse.ts` 为准。

### 3.3 核心数据模型（Prisma）

数据模型见 `prisma/schema.prisma`，核心表：

- `User`：`admin|coach`，账号密码（bcrypt hash）
- `Customer`：客户档案（归属 `coachId`）
- `Invite`：邀请（仅存 `tokenHash`；`status: active|entered|completed|expired`；绑定 `customerId + coachId + quizVersion + version`）
- `Attempt`：测评记录（answersJson/scoresJson/tagsJson/stage/resultSummaryJson；submittedAt 幂等锁）
- `CoachTag`：助教标签（`coach:*`，用于 SOP 匹配）
- `SopDefinition/SopRule/CoachingStage/SopStageMap`：SOP 配置与默认 panel
- `Quiz/Question/Option`：题库（`quizVersion + version(fast|pro)` 唯一；question/option 有 stableId + orderNo）
- `AuditLog`：审计日志（按动作写入）
- 内容资产（v1）：`Archetype/TrainingHandbook/TrainingDay/TrainingSection/MethodologyDoc/MethodologySection`

### 3.4 门禁与安全策略（重点）

- **Token 只存 hash**：`lib/token.ts` 用 SHA256；任何接口不回写明文 token。
- **路由层门禁**：`middleware.ts` 保护 `/admin/*`、`/coach/*`，未授权会重定向登录页；API 权限主要在 route 内用 `lib/authz.ts` 统一处理。
- **Ownership 校验**：coach 只能访问自己名下 customer/invite/attempt；admin 可访问全局资源。
- **状态机约束**：completed/expired 的 invite 禁止 start/answer/submit；result/resolve 允许 completed/expired（只读）。
- **并发幂等**：
  - `attempt/start`：幂等返回同一未提交 attempt
  - `attempt/submit`：`updateMany(where: submittedAt=null)` 做并发锁，重复提交返回已计算结果
  - `seed:prod`：Postgres advisory lock 防并发写库

### 3.5 评分与标签（`lib/scoring.ts`）

- **fast**：主画像投票（6 选 1）+ 稳定度（high/medium/low）+ 标签（含 `image:*`、`stability:*`、`phase:fast_completed`）
- **pro**：6 维度分数（0-100 结构化归一）+ stage（pre/mid/post）+ 标签（含 `image:*`、`phase:pro_completed`）

### 3.6 SOP 匹配引擎（`lib/sop-matcher.ts`）

- 输入：`stage + tags[]`（系统标签 + `coach:*` 标签）
- 规则：required_stage 匹配、required_tags 全包含、excluded_tags 不包含
- 排序：`priority desc`，再 `confidence desc`
- 输出：命中 Top1 SOP；未命中则返回默认 realtime_panel（来自 `CoachingStage` + 默认 SOP 映射）

### 3.7 内容资产（`data/seed/*` + seed/validate）

内容资产文件（v1）：
- `data/seed/quiz_fast_v1.json`
- `data/seed/quiz_pro_v1.json`
- `data/seed/archetypes_v1.json`
- `data/seed/training_handbook_v1.json`
- `data/seed/methodology_v1.json`

导入：
- `prisma/seed-content.ts` 将 JSON 幂等写入 DB（stableId + orderNo 保证可重复导入）

校验：
- `npm run content:validate`（`scripts/validate-seed-content.ts`）会做结构校验、去重校验、tag 合规校验、随机采样分布 sanity check。

---

## 4. 本地开发与部署（当前工程做法）

### 4.1 本地运行

参考 `README.md`：

1) 配置环境变量：复制 `.env.example` → `.env`  
2) 安装依赖：`npm install`  
3) 迁移：`npm run db:migrate`  
4) 本地 seed：`npm run db:seed`（会创建 admin/coach1 默认账号；仅开发用）  
5) 启动：`npm run dev`

### 4.2 生产灰度部署策略（推荐路径）

核心共识：**Vercel 只负责应用发布；数据库 migrate/seed 由 GitHub Actions 执行**。

- `vercel.json`：build 只跑 `npm run db:generate && npm run build`
- `.github/workflows/db-deploy.yml`：main 分支触发 DB Deploy（含 concurrency）
- `docs/GITHUB_ENV_PRODUCTION.md`：要求使用 GitHub Environments（production）+ required reviewers + environment secrets
- `docs/DEPLOY_PROD.md`：生产部署说明（含 env、回滚、安全检查清单）
- `npm run smoke:prod-gate`：生产只读验收（migrations+seed+v1 只读门禁检查）

---

## 5. 研发进度与当前状态（截至 2026-01-07）

从 `README.md` 的里程碑看，核心闭环已具备：
- Next.js/Prisma/NextAuth 初始化与路由骨架
- Prisma schema + migrations + seed（含内容资产 v1）
- 登录与 RBAC/Ownership/Token 门禁
- 客户档案 CRUD、邀请链接生成/失效/状态流转
- Client 测评闭环（start/answer/submit/result）
- SOP 配置 CRUD + SOP 匹配引擎 + realtime_panel 输出
- audit_log 最小实现
- 生产部署工程化（DB Deploy 解耦 + 门禁 + smoke gate）：`docs/260107.md`

项目当前更像“可灰度验证的 MVP 工具”，下一阶段主要是 **内容完善**（题库/文案/SOP）、**合规与运营体系化**、以及 **体验优化**。

---

## 6. 已有文档索引（你可以直接复用/引用）

产品/共识：
- `docs/交易行为结构测评系统.md`：产品结构总览（冻结共识版）

接口/权限/实现总结：
- `docs/API_SPEC.md`：API 规范文档（含错误码、返回结构、Client/Coach/Admin 接口）
- `docs/RBAC_SPEC.md`：RBAC 权限规范（最容易漏的校验点、门禁函数、每个 route 的使用）
- `docs/CLIENT_API_ACCEPTANCE.md`：Client 邀请测评闭环手工验收步骤
- `docs/COACH_API_IMPLEMENTATION.md`：Coach 端接口实现总结（含 realtime_panel 数据来源与 SOP 命中）
- `docs/ADMIN_V1_IMPLEMENTATION.md`：Admin v1 实现总结（题库版本保护、审计写入点、验收方式）
- `docs/SMOKE_TEST_AUTHZ.md`：门禁层 smoke test 清单（含 P1 场景）

部署/运维：
- `docs/DEPLOY_PROD.md`：生产环境灰度部署指南
- `docs/GITHUB_ENV_PRODUCTION.md`：GitHub Environments: production 配置（DB Deploy）
- `docs/260107.md`：DB Deploy 工程化落地（migrate + seed + smoke gate）

审计/复盘（历史）：
- `docs/debug260106.md`：生产级 debug 与代码审查报告（含修复项与验收结果）
- `docs/debug_v2.md`：V1 prompt 对照审计（开发进度 & 功能完成度）
- `docs/allprompt_v1.md`：最初需求 prompt（历史参考，非现行规范）

---

## 7. 下一步计划（建议给协作智能体的“落地任务”）

> 下面是“建议”，不是已在仓库实现的事实；协作智能体可以按优先级补齐文档与工作项。

P0（上线前必须有清晰口径）：
- 合规与免责声明文案：首页/结果页/助教话术边界（避免投顾红线）
- 数据与隐私说明：采集字段、用途、保留期限、删除/导出流程、权限与审计
- UAT 验收清单：按“客户闭环 + 助教闭环 + admin 配置”逐项验收

P1（提升可运营性）：
- 结果页可解释化：把 `resultSummaryJson` 变成可读的解释组件（尤其 pro：6 维度/阶段/偏移/稳定度呈现）
- 埋点与指标：完成率、题目耗时、转化与复测率；以及后台数据聚合报表需求
- SOP 内容生产流程：画像/阶段 → SOP/话术映射的版本管理、灰度与回滚

P2（长期演进）：
- 复测机制/对比报告（年度复测、行为演进轨迹）
- 风险控制与运营工具：黑名单、频控、渠道追踪、客户支持与 FAQ

---

## 8. 从“思维导图”到“开发→上线运营”的文档清单（按本项目定制）

说明：本项目已具备较多“工程/接口类文档”，但缺少“产品/合规/运营”文档。建议按阶段补齐，并尽量落在 `docs/` 下，文件名可按你们团队习惯调整。

### A. 0→1 立项与共识冻结（把想法变成可开工）

已存在：
- ✅ `docs/交易行为结构测评系统.md`：产品定位/分层/角色边界/测评体系/邀请体系/页面结构/价值流向

建议新增（优先级 P0~P1）：
- ⬜ `docs/PRODUCT_VISION_AND_BOUNDARY.md`：一句话定位、不做什么、合规免责声明口径
- ⬜ `docs/SCOPE_FREEZE.md`：范围冻结点（fast/pro、三层结构、关键规则与不做项）
- ⬜ `docs/USER_SCENARIOS.md`：适合/不适合人群、典型路径（快测→解释→陪跑承接）
- ⬜ `docs/COMPETITION_AND_POSITIONING.md`：为什么不是投顾/信号/“AI 工具”主卖点
- ⬜ `docs/MILESTONES.md`：MVP→灰度→小规模上线→迭代里程碑

### B. 产品设计（PRD/交互/内容）

已存在（偏工程规范）：
- ✅ `docs/API_SPEC.md`、`docs/RBAC_SPEC.md`（接口/权限规范）

建议新增（优先级 P0~P2）：
- ⬜ `docs/PRD_OVERVIEW.md`：总 PRD（范围、流程、权限、埋点、验收）
- ⬜ `docs/PRD_ASSESSMENT_FAST.md`：fast 题型/计分/分档/解释规则/一致性软检测
- ⬜ `docs/PRD_ASSESSMENT_PRO.md`：pro 六维、画像结构、结果页组件、阶段判定规则
- ⬜ `docs/CONTENT_ASSET_SPEC.md`：题库/画像/方法论/内训的字段规范与版本策略（对应 `data/seed/*.json`）
- ⬜ `docs/COPYWRITING_RULES_RESULT_PAGE.md`：结果解释文案规范（可解释、可复述、可承接 SOP，且不触碰红线）
- ⬜ `docs/SOP_MAPPING_SPEC.md`：画像/阶段/tags → SOP 的映射策略（可配置项、优先级、灰度与回滚）
- ⬜ `docs/TEACHER_PLAYBOOK.md`：助教陪跑交付制度（边界、话术、违规分级处置、升级/降级机制）
- ⬜ `docs/PRD_COACH_CONSOLE.md`：助教后台 PRD（客户/邀请/测评/解释/标签/SOP/导出/复训记录）
- ⬜ `docs/PRD_ADMIN_CONSOLE_MINI.md`：总后台 PRD（账号、题库、SOP、内容资产、审计）

### C. 研发与架构（让全栈可直接开干）

已存在：
- ✅ `README.md`：本地启动/结构说明
- ✅ `docs/API_SPEC.md`、`docs/RBAC_SPEC.md`：接口与权限
- ✅ `docs/DEPLOY_PROD.md`、`docs/260107.md`、`docs/GITHUB_ENV_PRODUCTION.md`：部署工程化

建议新增（优先级 P0~P2）：
- ⬜ `docs/ARCHITECTURE.md`：端到端数据流（invite→attempt→scoring→tags→SOP→realtime_panel）
- ⬜ `docs/DATA_MODEL_AND_DICTIONARY.md`：数据字典（对应 `prisma/schema.prisma`，字段语义与约束说明）
- ⬜ `docs/SCORING_AND_TAGS_SPEC.md`：评分/标签规则说明（对应 `lib/scoring.ts` + `data/seed/*.json`）
- ⬜ `docs/SOP_ENGINE_SPEC.md`：SOP 匹配引擎说明（对应 `lib/sop-matcher.ts`）
- ⬜ `docs/FRONTEND_PAGES_AND_ROUTES.md`：页面/路由清单与权限（/、/t、/coach、/admin）
- ⬜ `docs/REPO_CONVENTIONS.md`：工程规范（env、脚本、seed、CI/CD、分支/发布策略）
- ⬜ `docs/SEED_AND_MIGRATION_POLICY.md`：seed/migration 策略（幂等、门禁、回滚、校验脚本）

### D. 测试、验收与合规上线

已存在：
- ✅ `docs/CLIENT_API_ACCEPTANCE.md`：Client 闭环手工验收
- ✅ `docs/SMOKE_TEST_AUTHZ.md` + `scripts/smoke-test-authz.sh`：门禁 smoke
- ✅ `scripts/smoke-prod-gate.ts`：生产只读 gate（migrations/seed/v1 只读门禁）

建议新增（优先级 P0~P2）：
- ⬜ `docs/TEST_PLAN.md`：功能/兼容/性能/安全测试计划（重点：权限与数据隔离）
- ⬜ `docs/UAT_CHECKLIST.md`：UAT 验收标准（流程/解释可承接/红线校验）
- ⬜ `docs/CONTENT_COMPLIANCE_CHECKLIST.md`：内容合规审查清单（禁用词、暗示收益、投顾风险）
- ⬜ `docs/GRAY_RELEASE_AND_ROLLBACK.md`：灰度与回滚方案（题库/规则引擎/内容资产版本可回滚）
- ⬜ `docs/RELEASE_NOTES_TEMPLATE.md`：上线说明与变更记录模板
- ⬜ `docs/RUNBOOK.md`：运行手册（告警、日志、数据修复、应急预案、手工补单）

### E. 运营增长与交付（上线后跑起来）

建议新增（优先级 P1~P2）：
- ⬜ `docs/OPS_COLD_START_PLAN.md`：冷启动运营方案（邀请制、助教 SOP、样本收集与复盘）
- ⬜ `docs/METRICS_AND_TRACKING_PLAN.md`：指标与埋点方案（完成率、复测率、转化率、陪跑留存）
- ⬜ `docs/CONTENT_ITERATION_MECHANISM.md`：内容迭代机制（题库/画像解释 A/B、SOP 映射优化）
- ⬜ `docs/CS_FAQ_AND_SUPPORT.md`：客户支持与 FAQ（解读边界、投诉处理、退款/条款若涉及）
- ⬜ `docs/COACH_TRAINING_MATERIALS.md`：助教培训材料（PPT/话术手册/考核题库）
- ⬜ `docs/DATA_ASSET_STRATEGY.md`：数据资产策略（行为演进记录如何沉淀为长期客户关系资产）

