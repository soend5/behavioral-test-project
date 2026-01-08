 Codex/Cursor 主控 Prompt（Next.js 全站一体 + Supabase + 题库走 DB）
你把下面整段 原样复制给 Codex 或 Cursor。
注意：让它在本地跑通即可，不需要真的上线，但要按生产思路做 RBAC 和数据结构。

你是资深全栈工程师 + 技术负责人。请从 0 开始在一个全新仓库里实现一个可灰度上线的生产环境 MVP。

【产品定位（必须遵守）】
- 这是“助教（销售陪跑）营销工具”，不是投顾/荐股产品；不要出现投顾/荐股能力相关功能或文案。
- 游客访问首页只能看营销说明页面：无测评入口、无公开测评链接、无任何“开始测评”按钮。
- 测评只能通过助教生成的唯一邀请链接访问；一人一链；链接绑定客户档案与助教；测评完成后链接自动进入完成态并失效（同客户同版本仅允许一个 active）。
- 助教后台必须账号密码登录（不开放注册，仅管理员创建助教账号）。
- 助教可以：创建客户档案、生成邀请链接、查看客户每道题答案（仅答案）、查看系统生成的画像/标签解释、查看“实时陪跑提示区”（当前阶段+唯一目标+允许/禁用动作+推荐SOP）。
- 总后台：创建/停用助教账号；管理 SOP 配置（配置表驱动，改 SOP 不改代码）；查看基础审计日志（最轻量即可）。

【技术栈（必须按这个来）】
- Next.js (App Router) + TypeScript
- Supabase（PostgreSQL）作为唯一数据库与托管
- Prisma 连接 Supabase Postgres
- NextAuth（Credentials）做会话登录（不要用 Supabase Auth 的注册/邮件流程）
- 题库、SOP、客户、邀请、作答、结果全部走 DB（不读本地 JSON）
- 提供：.env.example、README、本地启动、迁移、seed、最小验收路径（smoke test 或手工清单）

【环境变量（必须）】
- DATABASE_URL=（Supabase 提供的 Postgres connection string）
- NEXTAUTH_SECRET=
- NEXTAUTH_URL=http://localhost:3000
- SUPABASE_URL=（可选，仅用于管理端或存储；若不需要可不接）
- SUPABASE_ANON_KEY=（可选，不要写死在代码里；仅在确有需要时使用）
注意：不要把任何 key 写入代码或 README 的明文示例里；只写变量名。

【页面与路由（必须实现）】
Public
- GET /                     首页营销说明（无测评入口）

Client（邀请访问）
- GET /t/[token]            邀请落地页（展示客户昵称/助教信息/测评版本说明 + 进入测评按钮）
- GET /t/[token]/quiz       题目页（从 DB 拉题；按版本与问卷发布版本取题）
- POST /api/attempt/start
- POST /api/attempt/answer  （允许一次提交一题或批量提交）
- POST /api/attempt/submit
- GET /t/[token]/result     结果页（客户只看：标签/画像 + 个性化展示 + 条形图（专业版需要））

Coach（助教后台）
- GET /coach/login
- GET /coach/dashboard              客户列表（状态：未测评/已完成/可复测）
- GET /coach/clients/[id]           客户详情（首屏：实时陪跑提示区；下方：每题答案、画像解释、条形图、历史测评时间线）
- GET /coach/invites/new            创建邀请：先选/建客户档案→选版本→生成 token
- GET /coach/invites                邀请列表：可失效、可复制链接

Admin（总后台）
- GET /admin/login
- GET /admin/coaches                助教账号管理（创建/停用）
- GET /admin/sop                    SOP 配置管理（CRUD：sop_definition, sop_rule, coaching_stage, sop_stage_map）
- GET /admin/questions              题库管理（最小 CRUD：题目、选项、所属版本、所属问卷版本、是否启用）
- GET /admin/audit                  基础审计（记录：谁创建邀请、谁查看客户、谁改 SOP、谁改题库）

【数据模型（必须包含；可增不可删）】
用户与权限
- users: {id, role:'admin'|'coach', username, password_hash, status, created_at}

客户与邀请
- customers: {id, name?, nickname?, phone?, wechat?, qq?, note?, coach_id, created_at, updated_at}
- invites: {id, token_hash, status:'active'|'entered'|'completed'|'expired', customer_id, coach_id, version:'fast'|'pro', quiz_version, created_at, expires_at?}

测评作答与结果
- attempts: {id, invite_id, customer_id, coach_id, version, quiz_version, started_at, submitted_at, answers_json, scores_json, tags_json, stage:'pre'|'mid'|'post', matched_sop_id?, result_summary_json}

助教主观标签
- coach_tags: {id, customer_id, coach_id, tag_key, created_at}

SOP 配置表
- sop_definition: {sop_id, sop_name, sop_stage, status, priority, state_summary, core_goal, strategy_list_json, forbidden_list_json, notes}
- sop_rule: {rule_id, sop_id, required_stage, required_tags_json, excluded_tags_json, confidence, status}
- coaching_stage: {stage_id, stage_name, stage_desc, ui_color, allow_actions, forbid_actions}
- sop_stage_map: {sop_id, stage_id, is_default, remark}

题库（必须 DB 化）
- quiz: {id, quiz_version, version:'fast'|'pro', title, status, created_at}
- questions: {id, quiz_id, order_no, stem, status}
- options: {id, question_id, order_no, text, score_payload_json}  // score_payload_json 用于评分映射（MVP 可简单）
（允许你在 v1 直接把 answers_json 存 option_id 列表或 question_id->option_id map）

审计
- audit_log: {id, actor_user_id, action, target_type, target_id, meta_json, created_at}

【RBAC（必须严格）】
- coach 只能访问自己 coach_id 绑定的 customers/invites/attempts
- admin 可访问全部，并可创建/停用 coach
- public/client 域无后台数据访问权限
- 所有 server actions / api routes 都必须做鉴权 + 授权校验

【邀请链接安全（必须）】
- token 只存 hash；生成链接时只展示原 token 一次
- 完成测评后 invite 自动变为 completed，并禁止再次答题（除非助教另建新 invite）

【SOP 引擎（必须实现）】
- 输入：stage + tags[]
- tags 来源：
  - 系统标签（至少：image:*、stability:*、phase:*）
  - 助教标签（coach:*）
- 匹配：required_stage=stage，required_tags 全包含，excluded_tags 不包含
- 排序：priority desc，再 confidence desc
- 输出：Top1 SOP 渲染到客户详情首屏“实时陪跑提示区”
- 记录：attempts.matched_sop_id

【实时陪跑提示区 UI（必须按此结构）】
1) 当前陪跑阶段（只显示一个）
2) 当前客户状态判断（state_summary）
3) 本阶段唯一目标（core_goal，突出显示）
4) 推荐沟通策略（最多 3 条）
5) 本阶段禁用行为（可多于 3 条）
（标签明细仅允许后台 debug 折叠查看）

【评分（MVP 先跑通）】
- fast: 8-12题；pro: 16-24题（先做一套 quiz_version=v1）
- 输出：主画像（6选1）、六维条形图（pro）、稳定度（高/中/低）
- 结果写入 attempts.result_summary_json / tags_json / scores_json

【交付方式（必须按步骤输出，并每步可验收）】
Step 1: 初始化 Next.js + TS + Prisma + NextAuth，创建路由骨架
Step 2: Prisma schema + migration + seed（创建 admin 与一个 coach；插入 quiz v1 + 最小题库）
Step 3: 实现登录与 RBAC（coach/admin）
Step 4: 实现客户档案 CRUD（coach）
Step 5: 实现邀请链接生成/失效/状态流转（active→entered→completed/expired）
Step 6: 实现测评端（token访问、从DB读题、答题、提交、写入attempts）
Step 7: 实现结果页（fast/pro）+ pro 条形图
Step 8: 实现 SOP 配置 CRUD（admin）+ SOP 匹配引擎 + 客户详情首屏提示区
Step 9: audit_log 最小实现（关键动作记录）
Step 10: Smoke test（或手工验收清单）+ README 完整

请从 Step 1 开始，每完成一步都给“验收方式（点哪里/看什么）”。不要只搭框架，必须可运行。


你现在的状态非常明确：Cursor 已经在写生产环境代码了，所以接下来你给 Cursor 的内容要从“长篇说明”切换为 它能按步骤落地的 Spec Prompt。

下面给你 3 套你可以直接复制进 Cursor 的“可执行 Prompt 文档”。推荐顺序：先 A（落库成文档）→ 再 B（逐接口实现）→ 最后 C（验收与兜底）。

A）把接口清单“告知 Cursor”的最佳方式：先落成仓库内规范文档（强烈推荐）
目的：让 Cursor 永远有一个“唯一真相”，避免你每次口头解释导致跑偏。
用法：在 Cursor 里让它先创建 docs/04_API_and_Security/API_SPEC.md 和 docs/04_API_and_Security/RBAC_SPEC.md，然后实现代码。

你现在在一个 Next.js App Router + TypeScript + Prisma(Supabase Postgres) 项目里工作。请先不要继续写功能代码，先完成“规范落库”。

任务 1：在仓库中创建两个文档（如果已存在则更新，确保内容与本 prompt 一致）：
- docs/04_API_and_Security/API_SPEC.md
- docs/04_API_and_Security/RBAC_SPEC.md

任务 2：把以下内容按“可执行规范”写入文档（要包含：路由、方法、入参、出参、错误码、幂等策略、RBAC 校验点、审计写入点）。
注意：
- 所有返回格式统一：{ ok: true, data } / { ok:false, error:{code,message}}
- coach 的 ownership 必须严格校验：record.coach_id === session.user.id
- client 侧必须 token→invite 绑定校验，不允许越权
- invite completed 后禁止继续 answer/submit（只允许读 result）
- token 只存 hash；创建时只展示原 token 一次

接口范围（必须全部写入 docs/04_API_and_Security/API_SPEC.md）：
1) Client
- GET /api/public/invite/resolve?token=...
- POST /api/attempt/start
- GET /api/quiz?token=...
- POST /api/attempt/answer
- POST /api/attempt/submit
- GET /api/public/attempt/result?token=...

2) Coach
- GET /api/coach/me
- POST /api/coach/customers
- GET /api/coach/customers
- GET /api/coach/customers/:id
- PATCH /api/coach/customers/:id
- POST /api/coach/invites
- GET /api/coach/invites
- POST /api/coach/invites/:id/expire
- POST /api/coach/customers/:id/tags
- DELETE /api/coach/customers/:id/tags

3) Admin
- POST /api/admin/coaches
- PATCH /api/admin/coaches/:id
- CRUD /api/admin/sop/definition
- CRUD /api/admin/sop/rule
- CRUD /api/admin/sop/stage
- CRUD /api/admin/sop/stage-map
- CRUD /api/admin/quiz
- CRUD /api/admin/questions
- CRUD /api/admin/options
- GET /api/admin/audit

RBAC 规则（写入 docs/04_API_and_Security/RBAC_SPEC.md）：
- public：只读首页
- client：仅 token 绑定 invite 的测评与结果
- coach：仅能访问自己 coach_id 绑定的 customers/invites/attempts/coach_tags
- admin：全量 + 管理配置（题库、SOP、账号、审计）
- 必须列出“最容易漏的 6 个校验点”：customer/invite/attempt ownership、token 越权、admin-only CRUD、completed 禁止答题

完成上述文档后，输出：
- 你创建/更新了哪些文件
- 每个文件的关键章节目录
- 下一步实现顺序建议（先 client 再 coach 再 admin）


我们进入下一步：让 Cursor 按 API_SPEC.md 真正把第一批“可跑通闭环”的接口落地（先把 Client 邀请测评链路跑通，后面再做 Coach/Admin）。

下面给你一份直接复制给 Cursor 的下一步主控 Prompt（它会读取你刚写好的 docs/04_API_and_Security/API_SPEC.md，按文档实现并自检）。

你已经在仓库中生成了 docs/04_API_and_Security/API_SPEC.md（接口规范）与可能的 docs/04_API_and_Security/RBAC_SPEC.md。现在请严格以这些文档为唯一真相实现第一批“Client 邀请测评闭环”接口，并确保可手工验收跑通。

【本轮范围（只做这些，不要扩散到 coach/admin 其它功能）】
实现以下 6 个接口（按顺序）：
1) GET  /api/public/invite/resolve?token=...
2) POST /api/attempt/start
3) GET  /api/quiz?token=...
4) POST /api/attempt/answer
5) POST /api/attempt/submit
6) GET  /api/public/attempt/result?token=...

【硬性要求】
A) token 安全
- token 只存 hash（invites.token_hash），任何时候都不能把 token 明文落库
- resolve/quiz/answer/submit/result 都必须先 token→invite 校验：hash(token)==token_hash

B) invite 状态机（必须）
- active -> entered -> completed
- submit 时把 invites.status 置为 completed
- completed/expired 后禁止 answer/submit（只能 result 读）

C) 幂等（必须）
- start：重复调用不得生成多条 attempt（复用同一个未提交 attempt）
- submit：重复调用返回同一份结果，不重复插入/重复算

D) ownership（必须）
- attempt 必须属于该 invite：attempt.invite_id === invite.id
- result 只能读该 token 绑定 invite 的 attempt 结果

E) 统一响应（必须）
- { ok:true, data } / { ok:false, error:{code,message} }
- 错误码至少包含：
  INVITE_INVALID
  INVITE_EXPIRED_OR_COMPLETED
  ATTEMPT_NOT_FOUND
  ATTEMPT_ALREADY_SUBMITTED
  UNAUTHORIZED
  FORBIDDEN

F) 数据写入（submit 必须写）
- attempts.answers_json / scores_json / tags_json / stage / result_summary_json / matched_sop_id(若此时能命中则写，不能命中可先留空但字段要保留)
- audit_log 至少写：client.submit_attempt（meta 包含 invite_id, attempt_id）

【题库与评分（本轮只需最小可用）】
- 题库从 DB 读（quiz/questions/options）
- 提交后生成最小结果即可：main_image(6选1)、stability(高/中/低)、pro 版本需要 scores 六维条形图
- tags_json 至少包含：image:*、stability:*、phase:*（phase 可用“极速版完成/完整版完成”）

【交付要求】
1) 输出你实现的 route 文件路径列表
2) 给出每个接口的“手工验收步骤”（用浏览器或 curl，能跑通闭环）
3) 列出你在每个接口里做了哪些校验（token 校验/状态机/幂等/ownership）
4) 如果你新增了 util（hash、prisma helper、error helper），列出文件与用途
5) 不要顺便重构 UI；只要接口可跑通即可





好，进入 “门禁层（RBAC + Token Guard）”。这一层做完，你后续让 Cursor 写任何接口都会稳很多：少漏校验、少越权、少返工。

下面这份是直接复制给 Cursor 的可执行 Prompt（按你们当前 Next.js App Router + NextAuth + Prisma + Supabase 的约束写）。
你现在在 Next.js App Router + TypeScript + NextAuth(Credentials) + Prisma(Supabase Postgres) 项目中。我们进入“门禁层”任务：统一 RBAC/Ownership/Token 校验，避免每个 route 自己散写校验逻辑。

【目标】
1) 新增门禁工具文件（lib/），提供统一的鉴权、授权、ownership 校验、token→invite 解析、错误返回
2) 将这些门禁工具回填到“所有已实现的 API routes”（至少是 client 测评闭环那 6 个接口）
3) 增加最小 smoke test（脚本或手工清单）验证关键越权场景被拦截
4) 更新 docs/04_API_and_Security/RBAC_SPEC.md（如存在）补充“门禁函数一览 + 每个 route 使用哪些门禁”

【硬性约束】
- 所有 API route 的校验逻辑必须收敛到门禁函数；route 内只做：解析入参 → 调门禁 → 执行业务 → 返回统一响应
- 统一响应格式：{ ok:true, data } / { ok:false, error:{code,message} }
- completed/expired invite 绝对禁止 answer/submit（result 可读）
- token 只存 hash；任何接口不可回写 token 明文
- coach ownership：任何 customer/invite/attempt/tag 的访问都必须验证 record.coach_id === session.user.id
- admin-only：sop/题库/账号/审计等接口 coach 访问必须 403

【需要新增/完善的文件（建议路径，可按你项目调整但要统一）】
1) lib/apiResponse.ts
- ok(data)
- fail(code, message, statusCode?)

2) lib/errors.ts
- 错误码枚举（至少包含：UNAUTHORIZED, FORBIDDEN, INVITE_INVALID, INVITE_EXPIRED_OR_COMPLETED, ATTEMPT_NOT_FOUND, ATTEMPT_ALREADY_SUBMITTED）

3) lib/token.ts
- hashToken(token): string   // 使用稳定的 hash（例如 sha256）
- generateToken(): string    // 仅用于创建邀请

4) lib/authz.ts（门禁层核心）
必须提供这些函数（签名可略调，但能力必须覆盖）：
- getSessionOrNull(req): session|null  （NextAuth 取 session）
- requireAuth(session) -> session
- requireRole(session, 'admin'|'coach') -> session
- requireAdmin(session) -> session
- requireCoach(session) -> session
- requireCoachOwnsCustomer(prisma, coachId, customerId) -> customer
- requireCoachOwnsInvite(prisma, coachId, inviteId) -> invite
- requireCoachOwnsAttempt(prisma, coachId, attemptId) -> attempt
- requireInviteByToken(prisma, token, { allowStatuses: [...] }) -> invite
- requireAttemptByInvite(prisma, inviteId) -> attempt|null （用于 start 幂等）
- assertInviteAllowsAnswer(invite) / assertInviteAllowsSubmit(invite)  // completed/expired 直接抛错

5) lib/audit.ts
- writeAudit(prisma, actorUserId|null, action, target_type, target_id, meta_json)

【回填要求：把门禁应用到这些 client 接口（至少）】
- GET  /api/public/invite/resolve?token=...
- POST /api/attempt/start
- GET  /api/quiz?token=...
- POST /api/attempt/answer
- POST /api/attempt/submit
- GET  /api/public/attempt/result?token=...

回填标准：
- route 内不再手写 hash(token)==token_hash；统一调用 requireInviteByToken
- status 允许范围通过 allowStatuses 参数控制
- attempt.invite_id 校验通过 requireInviteByToken + requireAttemptByInvite / requireAttemptOwnership 完成
- 错误返回统一走 fail()

【必须补充的 4 个 smoke test 场景（脚本或手工清单都可以）】
1) completed invite 调用 /attempt/answer 或 /attempt/submit 必须失败（INVITE_EXPIRED_OR_COMPLETED）
2) token 错误：resolve/quiz/result 必须失败（INVITE_INVALID）
3) attempt 不属于该 invite：answer/submit 必须失败（FORBIDDEN 或 ATTEMPT_NOT_FOUND）
4) admin-only 接口（若已有任一）coach 调用必须 403（FORBIDDEN）

【交付输出】
- 新增/修改文件列表（含路径）
- 每个文件做什么（1-2 句）
- 列出 6 个 client route：你在每个 route 顶部用注释标注“使用了哪些门禁函数”
- 给出 smoke test 的运行方式或手工步骤




进入下一步：Coach 核心闭环（助教后台）。目标是让助教端先跑通“建档 → 发邀请 → 看客户详情”，后面再做 Admin 配置/题库 CRUD 的精修与审计增强。
下面是 直接复制给 Cursor 的主控 Prompt（可执行、可验收、限制范围避免发散）：
你现在在 Next.js App Router + TypeScript + NextAuth(Credentials) + Prisma(Supabase Postgres) 项目里，已经完成了 Client 测评闭环接口与门禁层（lib/authz.ts 等）。现在进入下一步：实现 Coach（助教后台）核心闭环接口 + 最小页面联通。

【本轮范围（只做这些，不要扩散到 Admin 的配置/题库 CRUD）】
实现并打通以下接口与页面数据需求：

接口（必须实现）
1) GET    /api/coach/me
2) POST   /api/coach/customers
3) GET    /api/coach/customers?query=&status=&page=
4) GET    /api/coach/customers/:id
5) PATCH  /api/coach/customers/:id
6) POST   /api/coach/invites
7) GET    /api/coach/invites?status=&customer_id=&page=
8) POST   /api/coach/invites/:id/expire
9) POST   /api/coach/customers/:id/tags
10) DELETE /api/coach/customers/:id/tags

页面（只需最小联通，不追求 UI 漂亮）
- /coach/login（若已有可略）
- /coach/dashboard：调用 customers list
- /coach/invites/new：创建 invite
- /coach/invites：列表 + expire
- /coach/clients/[id]：客户详情（首屏 realtime_panel）

【硬性要求】
A) 必须使用门禁层（lib/authz.ts 等）
- 所有 coach 接口：requireAuth + requireCoach
- 所有资源访问：requireCoachOwnsCustomer/Invite/Attempt，禁止 route 内散写 ownership
- 返回统一格式：{ok:true,data}/{ok:false,error:{code,message}}

B) Ownership / RBAC（必须）
- coach 只能访问 customers/invites/attempts/coach_tags 中 coach_id==session.user.id 的记录
- 任何越权必须 403 FORBIDDEN

C) 邀请链接策略（必须）
- 同一 customer + 同一 version 只能有 1 个 active invite
- 创建新 invite 时：自动把旧的 active 标记 expired（并写 audit）
- token 只存 hash；创建时返回一次明文 token + url（之后任何列表/详情都不能再返回 token 明文）

D) 客户详情聚合输出（/api/coach/customers/:id 必须返回）
- customer 基础信息
- latest_attempt（最近一次 submitted 的 attempt，可能为空）
- attempt_timeline（按时间倒序）
- coach_tags（tag_key 数组）
- realtime_panel：如果 latest_attempt 存在则基于 (stage + tags_json + coach_tags) 命中 SOP 并返回：
  {stage, state_summary, core_goal, strategy_list, forbidden_list}
  若没有 attempt：返回一个“第一段认知建立期”的默认 panel（可从 coaching_stage / sop_stage_map default 取）

E) 审计（本轮最小实现）
写 audit_log（用 lib/audit.ts）
- coach.create_customer
- coach.update_customer
- coach.create_invite
- coach.expire_invite
- coach.view_customer（可选但建议）

【错误码（至少）】
- UNAUTHORIZED
- FORBIDDEN
- CUSTOMER_NOT_FOUND
- INVITE_NOT_FOUND
- INVITE_ALREADY_EXPIRED
- INVALID_INPUT

【交付输出（必须）】
1) 实现的 route 文件路径列表
2) 每个接口的验收方式（curl 或页面点击路径）
3) 每个接口调用了哪些门禁函数（逐条列出）
4) 邀请“同客户同版本仅 1 个 active”的实现方式说明（是自动过期还是拒绝创建）
5) /coach/clients/[id] 首屏 realtime_panel 的数据来源与 SOP 命中逻辑说明

开始实现，按接口顺序推进，先把接口跑通再补页面联通；不要顺手做 admin 端内容。



好，进入 Admin v1。
这一轮我们只做**“能支撑生产使用的最小 Admin 配置闭环”**，目标非常明确：不动已完成的 Client / Coach 逻辑，只补上“可配置、可控、可追溯”的能力。

下面是 你可以直接复制给 Cursor 的 Admin v1 主控 Prompt（已严格限制范围，避免它发散或重构你现有成果）。

你现在在一个已完成 Client 测评闭环、门禁层、Coach 核心闭环的 Next.js App Router + TypeScript + Prisma(Supabase Postgres) 项目中。
现在进入 Admin v1 阶段。

【Admin v1 的唯一目标】
- 让管理员可以“不改代码”就配置：
  1) 题库 v1（DB）
  2) SOP 引擎（4 张配置表）
- 不允许破坏现有 Client / Coach 行为
- 不追求 UI 美观，只追求“可配置 + 可验证 + 可审计”

⚠️ 本轮明确禁止：
- 重构 Coach / Client 接口
- 引入自动分层模型
- 引入复杂权限系统（只需 admin-only）

---

## 一、Admin v1 必须实现的页面（最小）

页面（只需能操作即可）：
1) /admin/login（若已有可复用）
2) /admin/quiz
3) /admin/questions
4) /admin/options
5) /admin/sop
6) /admin/audit（最小可用）

---

## 二、Admin v1 必须实现的接口（只做这些）

### 1️⃣ 题库管理（DB）

#### Quiz（问卷）
- GET    /api/admin/quiz
- POST   /api/admin/quiz
- PATCH  /api/admin/quiz/:id

字段：
- version: 'fast' | 'pro'
- quiz_version: 'v1' | 'v1.1'
- title
- status: 'active' | 'inactive'

规则（必须）：
- 已被 invites / attempts 使用过的 quiz_version：
  ❌ 禁止覆盖式修改
  ✅ 只能新建 quiz_version（如 v1.1）
- status=inactive 后，不再被新 invite 使用

---

#### Questions（题目）
- GET    /api/admin/questions?quiz_id=
- POST   /api/admin/questions
- PATCH  /api/admin/questions/:id

字段：
- quiz_id
- order_no
- stem
- status

---

#### Options（选项）
- GET    /api/admin/options?question_id=
- POST   /api/admin/options
- PATCH  /api/admin/options/:id

字段：
- question_id
- order_no
- text
- score_payload_json

说明：
- score_payload_json 用于评分与标签映射（v1 可简单）
- answers_json 只存 option_id 或 question_id->option_id map

---

### 2️⃣ SOP 配置（4 张表 CRUD）

必须支持完整 CRUD：

- /api/admin/sop/definition
- /api/admin/sop/rule
- /api/admin/sop/stage
- /api/admin/sop/stage-map

要求：
- 完全使用数据库配置
- 不允许在代码中写死任何 SOP 文案
- 修改后立即影响新的 SOP 命中结果（无需重启）

---

### 3️⃣ 审计（最小）

- GET /api/admin/audit

至少记录以下行为：
- admin.create_quiz / update_quiz
- admin.create_question / update_question
- admin.create_option / update_option
- admin.create_sop / update_sop / delete_sop

字段：
- actor_user_id
- action
- target_type
- target_id
- meta_json
- created_at

---

## 三、RBAC（本轮重点，必须严格）

- 所有 /api/admin/** 接口：
  - requireAuth
  - requireAdmin
- coach 访问 admin 接口：
  - 必须 403 FORBIDDEN
- client token：
  - 永远不能访问 admin 接口

⚠️ 不允许 route 内散写判断，必须使用已有门禁层（lib/authz.ts）

---

## 四、验收标准（你必须逐条自检）

### 题库
1) 能创建 quiz v1（fast/pro）
2) 能给 quiz 添加题目与选项
3) 能创建 quiz v1.1，不影响 v1 已完成测评
4) 已被使用的 quiz_version：
   - PATCH 不允许破坏式修改（应返回错误）

### SOP
5) 能 CRUD 四张 SOP 表
6) 修改 SOP 后，Coach 客户详情页 realtime_panel 能立刻体现变化

### RBAC
7) coach 调用任一 /api/admin/** → 403
8) admin 登录后才能访问 admin 页面与接口

### 审计
9) 任一 admin 修改动作都能在 audit 表中查到

---

## 五、交付输出（必须）

1) 实现的 route 文件路径列表
2) 每个 admin 页面对应调用了哪些接口
3) 题库“版本不可破坏”的实现方式说明
4) SOP 配置如何影响 realtime_panel 的数据流说明
5) audit_log 写入点清单

---

## 六、实现顺序（强烈建议）

1) RBAC 验证 admin-only（先把门禁跑通）
2) quiz → questions → options
3) SOP 4 表 CRUD
4) audit 最小实现
5) admin 页面联通

开始实现，只按本 Prompt 范围推进，不要顺手改 Coach / Client。
