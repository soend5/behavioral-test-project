# V1 Prompt 对照审计（开发进度 & 功能完成度）

> 审计角色：资深全栈架构师 + 技术审计官  
> 审计目的：判断“allprompt_v1.md 的预期”与“当前代码仓库现状”的达成率（而非新增功能）。  
> 审计范围：`docs/99_Archive/allprompt_v1.md` + `docs/` 现有规范文档 + `app/`、`lib/`、`prisma/` 当前实现（静态审计）。

## 结论摘要（TL;DR）

- **当前状态**：**B) 可内部灰度**（偏后端联调/接口验收），**不具备“小规模真实上线”条件**。
- **综合完成度（估算）**：**≈ 60%**
  - 功能闭环（What）：≈ 55%（API/数据链路较完整，但 UI/登录/账号管理缺失明显）
  - 工程与架构（How）：≈ 65%（规范文档齐，但认证/门禁接入存在关键缺口）
- **最大差距 Top 5（按风险排序）**
  1) **NextAuth 会话读取接入缺口**：`lib/authz.ts` 调用 `getServerSession()` **未绑定 authOptions**，会导致 **requireCoach/requireAdmin 实际不可用**（或 session 恒为 null）。  
  2) **Coach/Admin 登录页均为“待实现”**：页面存在但无可用登录链路，无法完成“从页面进入后台”的最小闭环。  
  3) **Admin 助教账号管理缺失**：`/admin/coaches` 为占位页，且 **缺少 `/api/admin/coaches`** 实现，无法满足“管理员创建/停用助教账号”。  
  4) **Client/Coach 核心页面多数为占位**：`/t/[token]`、`/t/[token]/quiz`、`/t/[token]/result`、`/coach/*` 页面未联通 API，无法达成 prompt 的“页面可验收跑通”。  
  5) **题库 status=inactive 禁止新 invite 未落地**：prompt 明确要求，但 `POST /api/coach/invites` 未校验 quiz 是否 active，规则仅在 client 取题时被动触发。

---

## 一、功能覆盖审计（What）

> 说明：  
> - **Prompt 覆盖**：该能力在 `docs/99_Archive/allprompt_v1.md` 中是“明确/隐含/缺失”。  
> - **代码达成**：当前仓库对该能力的落地情况“是/部分/否”（以 **可验收** 为准：接口可跑通 + 必要页面可用）。

### 1) Client 测评闭环

| 功能项 | Prompt 覆盖 | 代码达成 | 证据与备注（关键文件） |
|---|---|---|---|
| 邀请 token 访问 | 明确 | **部分** | API 已实现：`app/api/public/invite/resolve/route.ts`；页面占位：`app/t/[token]/page.tsx`（未联通 resolve、无“开始测评”按钮） |
| 从 DB 读题 | 明确 | **部分** | API 已实现：`app/api/quiz/route.ts`（按 invite 的 quizVersion+version 取题）；页面占位：`app/t/[token]/quiz/page.tsx` |
| 作答 / 提交 / 幂等 | 明确 | **是（API）** | `app/api/attempt/start/route.ts`（start 幂等 + 状态流转）、`app/api/attempt/answer/route.ts`（校验+写入）、`app/api/attempt/submit/route.ts`（事务+并发幂等） |
| 结果生成与展示 | 明确 | **部分** | 生成&存储：`lib/scoring.ts` + `app/api/attempt/submit/route.ts`；结果读取：`app/api/public/attempt/result/route.ts`；展示页面占位：`app/t/[token]/result/page.tsx` |
| invite 状态机（active→entered→completed/expired） | 明确 | **部分** | 关键流转已实现：start 置 entered、submit 置 completed、coach expire 置 expired；但 **基于 expiresAt 的自动过期不落库**（仅校验拒绝）：`lib/authz.ts` |

### 2) Coach 助教后台

| 功能项 | Prompt 覆盖 | 代码达成 | 证据与备注（关键文件） |
|---|---|---|---|
| 登录与 RBAC | 明确 | **部分（偏缺口）** | NextAuth 配置存在：`app/api/auth/[...nextauth]/route.ts`；页面占位：`app/coach/login/page.tsx`；关键缺口：`lib/authz.ts` 中 `getServerSession()` 未绑定 `authOptions`（会导致 requireCoach/requireAdmin 失效） |
| 客户档案 CRUD | 明确 | **部分** | API 已实现：`app/api/coach/customers/route.ts`、`app/api/coach/customers/[id]/route.ts`；页面占位：`app/coach/dashboard/page.tsx`、`app/coach/clients/[id]/page.tsx` |
| 邀请生成 / 失效（同客户同版本唯一 active） | 明确 | **部分** | API 已实现：`app/api/coach/invites/route.ts`（创建时自动 expire 旧 active）、`app/api/coach/invites/[id]/expire/route.ts`；但缺少 **事务/DB 约束** 防并发双 active（prompt 目标是“唯一 active”） |
| 客户详情聚合页 | 明确 | **部分** | 聚合 API 已实现：`app/api/coach/customers/[id]/route.ts`（customer+attemptTimeline+tags+realtimePanel）；页面占位：`app/coach/clients/[id]/page.tsx` |
| realtime_panel（阶段 + SOP + 禁用行为） | 明确 | **部分** | 引擎实现：`lib/sop-matcher.ts`；API 已返回 realtimePanel：`app/api/coach/customers/[id]/route.ts`；页面未展示 |

> 额外对照：prompt 中还提到“助教可查看客户每道题答案（仅答案）/画像标签解释”。当前 `GET /api/coach/customers/:id` **未返回 answersJson/resultSummaryJson**，且 `/coach/clients/[id]` 页面占位，整体仍未达成可用闭环。

### 3) Admin v1

| 功能项 | Prompt 覆盖 | 代码达成 | 证据与备注（关键文件） |
|---|---|---|---|
| 助教账号管理 | 明确 | **否** | 页面占位：`app/admin/coaches/page.tsx`；缺少接口：未发现 `app/api/admin/coaches/**`（但 `docs/04_API_and_Security/API_SPEC.md`、`docs/04_API_and_Security/RBAC_SPEC.md` 中已写入该接口规范） |
| 题库管理（quiz / questions / options） | 明确 | **部分** | API 已实现：`app/api/admin/quiz/*`、`app/api/admin/questions/*`、`app/api/admin/options/*`；页面已能拉列表：`app/admin/quiz/page.tsx`、`app/admin/questions/page.tsx`、`app/admin/options/page.tsx`（但缺少创建/编辑表单） |
| quiz_version 不可破坏策略 | 明确 | **部分（核心满足）** | 保护逻辑在 `app/api/admin/quiz/[id]/route.ts`（quiz 被 invite/attempt 使用后，阻止修改 version/quizVersion）；但 “status=inactive 禁止新 invite 使用”未在 coach 创建 invite 时前置校验 |
| SOP 配置（4 张表） | 明确 | **部分** | API 已实现：`app/api/admin/sop/definition/*`、`app/api/admin/sop/rule/*`、`app/api/admin/sop/stage/*`、`app/api/admin/sop/stage-map/*`；页面仅展示 definition 列表：`app/admin/sop/page.tsx`（缺少 rule/stage/stage-map 的可视化配置） |
| 审计日志 | 明确 | **是（基础可用）** | API：`app/api/admin/audit/route.ts`；页面：`app/admin/audit/page.tsx`；写入点分散在 coach/client/admin 的各 route 中：`lib/audit.ts` + 各 route `writeAudit()` |

---

## 二、工程与架构审计（How）

### 技术栈一致性

- **结论：基本一致**。Next.js App Router + TypeScript + Prisma + Supabase(Postgres) + NextAuth(Credentials) 与 prompt 要求匹配。
- Tailwind 已接入，页面能渲染（尽管多数为占位）。

### 是否禁止本地 JSON/mock

- **结论：基本满足**。题库/邀请/作答/结果/SOP 均以 DB 为主；未发现“本地 JSON 题库/规则”作为主数据源。  
- 但存在少量“兜底字符串/默认数组”（如 SOP 默认面板文案）属于可接受的 fallback，不构成“本地 SOP 配置”。

### Prisma + Supabase 使用是否合理

- **结论：整体合理**：`prisma/schema.prisma` 明确区分 `DATABASE_URL`（运行）与 `DIRECT_URL`（迁移/seed）。
- 近期补齐了关键唯一约束/索引与迁移文件（但这属于实现加固，不是 prompt 原始要求的一部分）。

### NextAuth 使用方式是否符合 RBAC 要求（关键）

- **结论：目前未达到生产级最小标准（阻断）**。  
  prompt 要求“所有 admin/coach 接口必须通过统一门禁层 RBAC”。当前门禁层在 `lib/authz.ts`，但：
  - `getServerSession()` 调用未绑定 `authOptions`（仓库中也未提供可复用的 `authOptions` 导出）。  
  - 在 NextAuth v4/JWT 策略下，这会导致 session 回调无法生效，进而 **session.user.id/role/username 读不到**，`requireAuth()/requireRole()` 可能恒失败。  
  - 直接影响：几乎所有 `/api/coach/**`、`/api/admin/**` 的可用性与验收路径。

### 是否具备清晰的 Step-by-step 实现与验收路径

- **结论：文档层面具备**：`docs/04_API_and_Security/API_SPEC.md`、`docs/04_API_and_Security/RBAC_SPEC.md`、`docs/07_Test_and_Release/CLIENT_API_ACCEPTANCE.md`、`docs/04_API_and_Security/COACH_API_IMPLEMENTATION.md`、`docs/04_API_and_Security/ADMIN_V1_IMPLEMENTATION.md`、`docs/07_Test_and_Release/SMOKE_TEST_AUTHZ.md` 提供了清晰验收清单。  
- **但存在“文档宣称 vs 代码缺失”**：如 admin coaches 接口在文档中存在、代码中不存在。

### 特别检查：quiz_version 是否真的不可被破坏式修改

- **结论：核心目标基本达成**：`PATCH /api/admin/quiz/:id` 对“已被 invites/attempts 使用的 quizVersion+version”做保护（`app/api/admin/quiz/[id]/route.ts`）。  
- **缺口**：prompt 还要求 `status=inactive` 后不能被新 invite 使用；目前 `POST /api/coach/invites` 未校验 quiz 的 `status`，规则仅在 client 取题时被动暴露。

### 特别检查：已完成测评是否不受后续配置影响

- **结论：基本达成（以结果一致性为准）**：提交时将 `scoresJson/tagsJson/resultSummaryJson` 写入 attempts；后续题库/SOP 变更不应影响已提交结果。  
- **注意**：若未来 coach 端要展示“逐题答案文本”，仍依赖 option 文本的实时 join（目前未实现该展示），需要明确“展示的是什么”：选项 ID/文本/快照。

---

## 三、安全与权限审计（Must-have）

> 说明：这里以“潜在越权/敏感数据泄露”为第一优先，其次是“可修复性”。

### 1) RBAC 是否强制通过统一门禁层

- **现状**：代码意图满足（大部分 route 调用 `requireAdmin/requireCoach/requireCoachOwnsX/requireInviteByToken`）。  
- **风险等级：高（功能阻断 + 容易产生误判）**：门禁层依赖的 session 获取方式当前存在接入缺口（见第二部分）。  
- **可修复性**：**可在现有结构下修复**（导出 `authOptions` 并统一传入，或改用 `getToken` 方案）。

### 2) coach 是否可能访问他人 customer / invite / attempt

- **现状**：大多数路径通过 `requireCoachOwnsCustomer/Invite/Attempt` 或查询时 `where.coachId=session.user.id` 限制。  
- **风险等级：低~中**：核心校验点齐，但需要依赖“session 能正确读到 user.id/role”。  
- **可修复性**：可修复（先修会话读取，再补充少量遗漏点检查/测试用例）。

### 3) admin-only 接口是否可能被 coach 访问

- **现状**：`/api/admin/**` 基本都调用 `requireAdmin()`。  
- **风险等级：中**：逻辑上是对的，但仍受“session 读取缺口”影响（可能导致 fail-close）。  
- **可修复性**：可修复（同上）。

### 4) client token 是否可能越权访问他人数据

- **现状**：  
  - token→invite：`requireInviteByToken`（hash 校验 + 状态/过期校验）  
  - attempt ownership：`requireAttemptOwnership`  
  - 题库归属：`/attempt/answer`、`/attempt/submit` 已做 quiz 绑定校验  
- **风险等级：低**：目前未发现明显“跨 invite 越权读取/写入”通路。

### 5) token 是否只存 hash，且不在任何地方回显

- **现状**：符合。DB 存 `token_hash`；仅在创建 invite 时返回一次明文 token；列表/其他接口不返回明文。  
- **风险等级：低**：满足 prompt 的“只回显一次”要求。  
- **注意**：`POST /api/coach/invites` 返回 `tokenHash` 属于可接受但非必要信息，若要更保守可仅返回 `token`（一次）与 inviteUrl。

---

## 四、幂等性与状态机审计（容易被忽略）

### Prompt 约束是否明确

- 明确：`attempt/start` 幂等、completed invite 禁止 answer/submit、token 越权禁止、ownership 校验必须统一门禁、SOP 未命中需兜底。

### 当前代码达成情况

- **attempt/start 是否幂等**：**是**（`app/api/attempt/start/route.ts`：同 invite 未提交 attempt 复用；并发场景有兜底）。  
- **attempt/submit 是否幂等**：  
  - **并发幂等（防重复写）**：**是**（`app/api/attempt/submit/route.ts`：事务 + `updateMany(where: submittedAt=null)`）。  
  - **与“completed 禁止 submit”的 prompt 约束**：**是**（completed/expired 会被门禁拒绝）。  
  - **注意**：若你们希望“已提交再次 submit 返回相同结果”而非报错，需要调整 allowStatuses 与分支策略；但这会与 prompt 的“completed 禁止 submit”形成产品决策冲突，需要先统一规范口径。
- **submit 是否可能重复写结果**：低概率（事务内锁定提交；但仍建议对关键约束提供 DB 层保证/或补充测试）。  
- **invite completed 后是否绝对禁止再次答题**：**是**（`/attempt/answer`、`/attempt/submit` 均只允许 active/entered）。  
- **SOP 未命中是否有兜底策略**：**是**（`lib/sop-matcher.ts#getDefaultRealtimePanel`）。

---

## 五、上线准备度评估（结论）

### 当前属于哪一档

- **结论：B) 可内部灰度**  
  - 适合：后端接口联调、数据模型与门禁策略演练、Admin 配置联调、灰度环境压测与数据校验。  
  - 不适合：让真实业务用户“从页面完成一次完整闭环”（登录/页面联通缺失，且 admin/coach 账号管理不全）。

### 当前完成度百分比（功能 + 工程综合）

- **≈ 60%（估算）**
  - 已完成的“硬骨架”占比较高（DB 模型、主要 API、SOP 引擎、审计日志、规范文档）。
  - 但“可用闭环”占比较低（UI/登录/账号管理缺失），导致整体完成度被显著拉低。

### 距离“生产级正式上线”还缺的 Top 5（按风险排序）

1) **必须补齐（P0）**：统一 NextAuth 会话读取的正确接入方式（给 `getServerSession` 传入同一份 `authOptions`，或采用一致的 token 读取方案），并补齐最小登录闭环。  
2) **必须补齐（P0）**：实现 Admin 助教账号管理（`/api/admin/coaches` + `/admin/coaches`），满足“管理员创建/停用助教账号”的产品约束。  
3) **必须补齐（P0）**：Client/Coach 核心页面联通（至少：invite 落地 → quiz 作答 → 提交 → 结果；coach dashboard → 创建 invite → 查看客户详情 realtime_panel）。  
4) **强烈建议（P1）**：落实“quiz status=inactive 禁止新 invite 使用”的前置校验（coach 创建 invite 时校验 quiz 存在且 active）。  
5) **强烈建议（P1）**：将“同客户同版本唯一 active invite”从“代码约定”升级为“事务/DB 约束可证明”（并发下避免双 active），并补充对应 smoke test。

### 哪些必须补齐 / 哪些可以延后

- **必须补齐**：1~3（否则无法形成可验收的“生产级 V1 最小闭环”）。  
- **可以延后**：4~5（不影响单人/低并发联调，但会在多人协作/并发/灰度规模扩大时暴露问题）。

---

## 六、修复计划与执行结果（2026-01-06）

> 目标：本轮对话内将本次审计（Top 5 + 文中提到的缺口）全部修复到“可上线标准”，不延后 P4/P5。

### 6.1 修复计划（按风险优先级）

1) **P0 / 会话与门禁**：统一 NextAuth `authOptions` 导出，并在所有 `getServerSession()` 调用处传入同一份配置，修复 `requireCoach/requireAdmin` 不可用风险。  
2) **P0 / Admin 助教账号管理**：补齐 `/api/admin/coaches`（创建/更新/列表）与 `/admin/coaches` 页面，满足“管理员创建/停用助教账号”。  
3) **P0 / 最小闭环 UI**：补齐可验收的最小路径：  
   - Client：`/t/[token]` → `/t/[token]/quiz` → `/t/[token]/result`  
   - Coach：`/coach/login` → `/coach/dashboard` → 创建 invite → `/coach/clients/[id]` 展示 realtime_panel/答案/标签  
4) **P1 / 题库停用规则**：`POST /api/coach/invites` 前置校验 quiz 必须为 `active`。  
5) **P1 / 唯一 active invite**：新增 DB 约束（partial unique index）+ 创建 invite 使用事务，避免并发双 active，并补充 smoke test 说明。

### 6.2 已执行修复（关键变更点）

#### A) NextAuth / 会话读取接入（P0）
- 新增统一配置：`lib/auth.ts` 导出 `authOptions`（Credentials + jwt/session callbacks 注入 `user.id/role/username`）。
- NextAuth handler 改为复用：`app/api/auth/[...nextauth]/route.ts` 使用 `NextAuth(authOptions)`。
- 门禁层修复：`lib/authz.ts` / `lib/rbac.ts` / `lib/auth-helpers.ts` 改为 `getServerSession(authOptions)`，从根上修复 RBAC 会话字段不可读问题。

#### B) Admin 助教账号管理（P0）
- 新增 API：  
  - `app/api/admin/coaches/route.ts`：`GET` 列表、`POST` 创建 coach（bcrypt hash，用户名冲突返回 `409 CONFLICT`，写入审计 `user.create`）。  
  - `app/api/admin/coaches/[id]/route.ts`：`PATCH` 更新 status/password（禁止修改非 coach），写入审计 `user.update`。
- 补齐页面：`app/admin/coaches/page.tsx` 支持创建/启用/禁用/重置密码。

#### C) Invite 规则与并发约束（P1）
- 前置校验 quiz active：`app/api/coach/invites/route.ts` 创建前校验 `quiz.status === "active"`（inactive 禁止新 invite）。
- 创建 invite 事务化：同文件 `POST` 将“自动过期旧 active + 创建新 invite + 审计写入”放入事务。
- DB 约束：新增迁移 `prisma/migrations/20260106183000_invites_active_unique/migration.sql`，增加 `customer_id + version` 在 `status='active'` 下的 partial unique index，避免并发双 active。
- invite expiresAt 落库：`lib/authz.ts` 在发现 `expiresAt < now` 时 best-effort 将状态更新为 `expired`（避免长期“逻辑过期但状态仍 active”）。

#### D) 页面闭环（P0）
- 登录页可用：`app/coach/login/*`、`app/admin/login/*`（使用 `<Suspense>` 包裹 `useSearchParams`，修复 Next.js build 的 CSR-bailout 报错）。
- Client 闭环：`app/t/[token]/*` 全部联通 API（resolve/start/quiz/answer/submit/result）。
- Coach 闭环：  
  - `app/coach/dashboard/page.tsx`：客户列表 + 创建客户  
  - `app/coach/invites/page.tsx`：邀请列表 + 失效  
  - `app/coach/invites/new/*`：创建邀请并回显 token（一次性）  
  - `app/coach/clients/[id]/page.tsx`：客户聚合页，展示 realtime_panel、系统标签、助教标签、逐题答案、测评时间线
- 入口体验：新增 `app/coach/page.tsx`、`app/admin/page.tsx` 将 `/coach`、`/admin` 重定向到主页面。

### 6.3 验证结果

- `npm run lint` ✅（无告警）  
- `npm run build` ✅（通过，包含类型检查）

### 6.4 更新后的上线结论（保守口径）

- **建议档位**：C) 可小规模真实上线（具备可验收的最小闭环 + 关键权限/并发约束已落库）。  
- **综合完成度（估算）**：≈ 85%（核心闭环补齐；后续更多是 UI/易用性/更细颗粒的管理能力与更完整的验收脚本）。
