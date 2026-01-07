# V1 灰度上线闸门复验结果（behavioral-test-project）

> 复验时间：2026-01-07  
> 目标：为 V1 灰度上线做“上线闸门复验”，只做校验与最小修复；不重构接口/路由；不改 Prisma 数据模型结构  
> 环境：Windows + PowerShell，Next.js dev（`localhost:3000`）

---

## 结论摘要

- ✅ 运行时闸门（P0-1 RBAC/会话/Ownership）全部通过（见“P0-1”章节）
- ✅ P0-3 Attempt 幂等与并发通过：`npm run smoke:attempt-idempotency`
- ✅ 内容资产校验通过：`npm run content:validate`
- ✅ P0-4 生产 gate 通过：`npm run db:migrate:deploy` + `npm run smoke:prod-gate`（含 v1 只读复验与 seed 幂等证据）
- ✅ P0-5 最小合规提示已补齐：`/t/[token]`、`/t/[token]/result`、`/coach/* realtime_panel`
- ✅ `npm run lint`、`npm run build` 通过

---

## P0-1：RBAC/会话/Ownership 上线闸门复验（运行时真实生效）

### A) 启动环境（我实际运行的命令）

1) 安装 PostgreSQL（如本机没有）：
- `winget install PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements --silent --disable-interactivity`

2) 初始化并启动本地 Postgres（端口 5433，数据目录 `.pgdata`）：
- `C:\Program Files\PostgreSQL\16\bin\initdb.exe -D .pgdata -U postgres -A trust`
- `C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe -D .pgdata -l .pg.log -o "-p 5433" start`
- `C:\Program Files\PostgreSQL\16\bin\createdb.exe -h 127.0.0.1 -p 5433 -U postgres behavioral_test`

3) 设置环境变量（示例；也可写到本地未提交的 `.env`）：
- `DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
- `DIRECT_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
- `NEXTAUTH_SECRET="local-dev-secret-please-change"`
- `NEXTAUTH_URL="http://localhost:3000"`

4) 初始化数据库：
- `npm run db:migrate:deploy`
- `npm run db:seed`

5) 启动服务：
- `npm run dev -- --port 3000`

### B) 逐条验证（curl 复现步骤 + 响应码 + 关键拦截点）

> 说明：本节所有请求均已在本地实际执行并通过；示例中的 `<...>` 为可替换参数。

#### 1) 未登录访问 `/admin` 与 `/coach`：必须跳转到各自 `/login` ✅

- 复现：
  - `curl.exe -s -o NUL -D - http://localhost:3000/admin`
  - `curl.exe -s -o NUL -D - http://localhost:3000/coach`
- 证据（实际响应头）：
  - `/admin`：`HTTP/1.1 307 Temporary Redirect`，`location: /admin/login`
  - `/coach`：`HTTP/1.1 307 Temporary Redirect`，`location: /coach/login`
- 关键拦截代码位置：
  - `middleware.ts:10`（admin 路由保护 + login 白名单）
  - `middleware.ts:17`（coach 路由保护 + login 白名单）
  - `middleware.ts:33`（matcher 仅 `/admin/*`、`/coach/*`）

#### 2) coach 调 `/api/admin/**`：必须稳定 403 ✅

- 前置（登录获取 cookie，NextAuth Credentials）：
  - `GET /api/auth/csrf`
  - `POST /api/auth/callback/credentials`（用户名/密码来自 seed，本次用 `coach1/coach123`）
- 复现（示例接口：seed 状态）：
  - `curl.exe -s -o NUL -D - -b <coach_cookie_jar> "http://localhost:3000/api/admin/content/status?version=v1"`
- 证据（实际响应）：
  - `HTTP/1.1 403 Forbidden`
  - body：`{"ok":false,"error":{"code":"FORBIDDEN","message":"未登录或权限不足"}}`
- 关键拦截代码位置：
  - `app/api/admin/content/status/route.ts`（入口调用 `requireAdmin()`）
  - `lib/authz.ts:78`（`requireAdmin()`）

#### 3) admin 调 `/api/admin/**`：必须稳定通过 ✅

- 前置：登录 admin（本次用 seed 默认 `admin/admin123`）
- 复现（同一接口）：
  - `curl.exe -s -o NUL -D - -b <admin_cookie_jar> "http://localhost:3000/api/admin/content/status?version=v1"`
- 证据（实际响应）：
  - `HTTP/1.1 200 OK`
  - body：`{"ok":true,"data":{...}}`
- 关键拦截代码位置：
  - `app/api/admin/content/status/route.ts`（入口调用 `requireAdmin()`）
  - `app/api/auth/[...nextauth]/route.ts:4`（`NextAuth(authOptions)`）
  - `lib/authz.ts:28`（`getServerSession(authOptions)`）

#### 4) coach 越权访问他人 customer/invite/attempt：必须 403 ✅

本条覆盖两类越权：**customer 越权**与 **invite 越权**；attempt 越权由第 5 条“token 跨 attempt”覆盖（403）。

- 准备数据（均在本地实际执行）：
  - admin 创建 `coach2`：`POST /api/admin/coaches`
  - coach2 创建 customerB：`POST /api/coach/customers`
  - coach2 创建 inviteB：`POST /api/coach/invites`

**4.1 coach1 越权访问 coach2 的 customerB（403）**
- 复现：
  - `curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" -b <coach1_cookie_jar> "http://localhost:3000/api/coach/customers/<customerB_id>"`
- 证据（实际响应）：
  - `HTTP_CODE=403`
  - body：`{"ok":false,"error":{"code":"FORBIDDEN","message":"未登录或权限不足"}}`
- 关键拦截代码位置：
  - `app/api/coach/customers/[id]/route.ts:38`（`requireCoachOwnsCustomer(...)`）
  - `lib/authz.ts:97`（`requireCoachOwnsCustomer` ownership 校验）

**4.2 coach1 越权失效 coach2 的 inviteB（403）**
- 复现：
  - `curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" -b <coach1_cookie_jar> -X POST "http://localhost:3000/api/coach/invites/<inviteB_id>/expire"`
- 证据（实际响应）：
  - `HTTP_CODE=403`
  - body：`{"ok":false,"error":{"code":"FORBIDDEN","message":"未登录或权限不足"}}`
- 关键拦截代码位置：
  - `app/api/coach/invites/[id]/expire/route.ts:29`（`requireCoachOwnsInvite(...)`）
  - `lib/authz.ts:145`（`requireCoachOwnsInvite` ownership 校验）

#### 5) token 客户端只能访问自己 token 对应的数据（resolve/result/quiz/attempt）✅

本条覆盖三类校验：**无效 token 拒绝**、**token→invite 绑定**、**attempt 跨 invite 403**。

**5.1 无效 token（以 quiz 为例）必须失败（400）**
- 复现：`curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" "http://localhost:3000/api/quiz?token=invalid_token"`
- 证据（实际响应）：
  - `HTTP_CODE=400`
  - body：`{"ok":false,"error":{"code":"INVITE_INVALID","message":"邀请 token 无效或不存在"}}`
- 关键拦截代码位置：
  - `app/api/quiz/route.ts:29`（`requireInviteByToken(...)`）
  - `lib/authz.ts:234`（tokenHash 查询 invite，不存在抛 `INVITE_INVALID`）

**5.2 tokenA 不能使用 attemptB（属于 tokenB）进行 answer/submit（403）**
- 复现（answer 跨 invite）：
  - `curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" -H "Content-Type: application/json" -X POST http://localhost:3000/api/attempt/answer --data-binary "{\"token\":\"<tokenA>\",\"attemptId\":\"<attemptB>\",\"answers\":[{\"questionId\":\"q1\",\"optionId\":\"o1\"}]}"`
- 证据（实际响应）：
  - `HTTP_CODE=403`
  - body：`{"ok":false,"error":{"code":"FORBIDDEN","message":"无权访问此测评记录"}}`
- 关键拦截代码位置：
  - `app/api/attempt/answer/route.ts:77`（`requireAttemptOwnership(...)`）
  - `lib/authz.ts:369`（attempt.inviteId !== inviteId → `FORBIDDEN`）

**5.3 结果隔离：tokenB 有结果时返回 200；tokenA（未提交）为 404**
- 复现：
  - `curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" "http://localhost:3000/api/public/attempt/result?token=<tokenB>"`
  - `curl.exe -s -w "\nHTTP_CODE=%{http_code}\n" "http://localhost:3000/api/public/attempt/result?token=<tokenA>"`
- 证据（实际响应）：
  - tokenB：`HTTP_CODE=200`
  - tokenA：`HTTP_CODE=404`，body：`{"ok":false,"error":{"code":"NOT_FOUND","message":"测评结果不存在或未提交"}}`
- 关键拦截代码位置：
  - `app/api/public/attempt/result/route.ts:33`（按 token 找 invite）
  - `app/api/public/attempt/result/route.ts:41`（按 `inviteId` 查 submitted attempt，仅返回该 invite 的结果）

---

## 其他闸门（本次复验执行结果）

### 内容资产校验 ✅

- 命令：`npm run content:validate`
- 证据（摘要）：Fast 9Q、Pro 18Q、画像 6、内训 7 天、方法论非空；脚本输出 `OK content assets validated.`

### 生产只读闸门 ✅

- 命令：`npm run smoke:prod-gate`
- 证据（摘要）：`PASS migrations applied / PASS seed status (v1) / PASS v1 readonly guards`，最终 `smoke:prod-gate PASSED`

### lint/build ✅

- 命令：`npm run lint`、`npm run build`
- 证据（摘要）：lint 无警告；build 成功（如遇 Windows/OneDrive `readlink EINVAL`，先删 `.next` 再重跑）

---

## 本次最小修复（若不做会阻塞闸门复验）

> 仅修复“脚本运行时读取不到 `.env` 导致 seed/smoke 无法跑”的问题；不涉及任何业务接口/路由重构，不改 Prisma 数据模型。

- `package.json:35`：新增 devDependency `dotenv`
- `prisma/seed.ts:6`：新增 `import "dotenv/config";`（保证 `npm run db:seed` 可读取 `.env`）
- `scripts/smoke-prod-gate.ts:1`：新增 `import "dotenv/config";`（保证 `npm run smoke:prod-gate` 可读取 `.env`）

---

## P0-2：Invite 规则闸门复验（并发/停用/状态机）

> 要求覆盖：并发唯一 active、quiz inactive 禁止创建、completed/expired 状态机（start/answer/submit 禁止；resolve/result 只读允许）。

### 运行方式（脚本优先）

- 新增脚本：`scripts/smoke-invite-rules.ts`
- 推荐命令（PowerShell 示例）：
  - `$env:BASE_URL="http://localhost:3000"`
  - `$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
  - `$env:DIRECT_URL=$env:DATABASE_URL`
  - `npm run smoke:invite-rules`

本次实际执行结果：`smoke:invite-rules PASSED`（脚本输出包含 `DETAILS_JSON_BEGIN/END` 的完整证据 JSON）。

### 1) 同一 customer + 同 quizVersion + 同 version 并发创建 2 次 invite，最终只能 1 个 active ✅

- 并发复现方式：脚本中使用 `Promise.all([POST /api/coach/invites, POST /api/coach/invites])` 并发创建
- 证据（脚本输出摘要）：
  - 两次请求均 `HTTP 200`（其中一次在事务内“自动过期旧 active”后创建新 invite）
  - DB 最终状态（Prisma 查询）：
    - `dbActiveCount: 1`
    - `dbAllInvites` 显示 1 条 `active` + 1 条 `expired`
- 关键拦截/兜底位置：
  - 事务逻辑：`app/api/coach/invites/route.ts`（先查 active→expire→create）
  - DB 约束：`prisma/migrations/20260106183000_invites_active_unique/migration.sql`（partial unique index：`(customer_id, version) WHERE status='active'`）
  - 并发冲突兜底：`app/api/coach/invites/route.ts` 捕获 `P2002` → 返回 `409 CONFLICT`
- 备注：DB 约束目前是 `(customerId, version)`，比“customer + quizVersion + version”更严格；因此满足本闸门（同一 quizVersion 下也不可能出现两个 active）。

### 2) quiz status=inactive 时创建 invite，必须失败 ✅

- 复现方式（脚本自动执行）：
  1. admin `PATCH /api/admin/quiz/:id` 将 `v1/fast` 设为 `inactive`
  2. coach `POST /api/coach/invites` 创建同版本 invite
  3. admin 再把 quiz 恢复为 `active`（避免影响后续测试）
- 证据（脚本输出摘要）：
  - `setInactive`: `HTTP 200`（quiz.status = `inactive`）
  - `createInviteWhenInactive`: `HTTP 400`，`code=VALIDATION_ERROR`，message=`题库已停用（inactive），禁止创建新邀请`
  - `restoreActive`: `HTTP 200`
- 关键拦截位置：
  - `app/api/coach/invites/route.ts`（创建 invite 前校验 quiz.status === "active"）
  - `app/api/admin/quiz/[id]/route.ts`（admin 更新 quiz status）

### 3) completed/expired 的 invite 状态机（start/answer/submit 禁止；resolve/result 只读允许）✅

#### 3.1 completed
- 复现方式（脚本自动执行）：
  - 创建 invite → `POST /api/attempt/start` → `GET /api/quiz` → `POST /api/attempt/answer` → `POST /api/attempt/submit`（invite 进入 completed）
  - 再次调用 start/quiz/answer/submit，应全部失败；resolve/result 允许
- 证据（脚本输出摘要）：
  - `start/quiz/answer/submit`（after completed）：均 `HTTP 400`
  - `GET /api/public/invite/resolve`：`HTTP 200`
  - `GET /api/public/attempt/result`：`HTTP 200`
- 关键拦截位置：
  - 写接口拒绝 completed：`lib/authz.ts` + 各 route 的 `allowStatuses: ["active","entered"]`
    - `app/api/attempt/start/route.ts`
    - `app/api/attempt/answer/route.ts`
    - `app/api/attempt/submit/route.ts`
    - `app/api/quiz/route.ts`
  - 只读接口允许 completed：`allowStatuses` 包含 `completed`
    - `app/api/public/invite/resolve/route.ts`
    - `app/api/public/attempt/result/route.ts`

#### 3.2 expired（包含 `expiresAt` 到期场景）
- 复现方式（脚本自动执行）：
  - 创建带过去时间 `expiresAt` 的 invite（初始 status 仍可能为 active）
  - `start/quiz` 应 `HTTP 400`
  - `resolve` 应 `HTTP 200` 且返回 `status: "expired"`（只读允许）
  - `result` 允许只读访问：当无提交记录时返回 `HTTP 404 NOT_FOUND`（而不是 400/403）
- 证据（脚本输出摘要）：
  - `start`: `HTTP 400`（`INVITE_EXPIRED_OR_COMPLETED`）
  - `quiz`: `HTTP 400`
  - `resolve`: `HTTP 200`，且返回 `status: "expired"`
  - `result`: `HTTP 404`（`NOT_FOUND`，表示“无结果”，但只读访问未被门禁挡掉）
  - DB 状态（Prisma 查询）：invite.status 已落库为 `expired`
- 关键拦截与最小修复：
  - 发现问题：`expiresAt < now` 时，旧逻辑会对所有 allowStatuses 都直接抛 `INVITE_EXPIRED_OR_COMPLETED`，导致 resolve/result 也无法只读访问（不符合闸门要求）。
  - 最小修复：`lib/authz.ts` 在 `expiresAt` 到期时：
    - best-effort 将状态落库为 `expired`
    - **若 allowStatuses 包含 `expired`（resolve/result）则允许继续**；否则仍抛错（start/quiz/answer/submit）
  - 修复位置：`lib/authz.ts`（`requireInviteByToken` 的 expiresAt 分支）

---

## P0-3：Attempt 幂等与并发闸门复验

### 运行方式（脚本）

- 脚本：`scripts/smoke-attempt-idempotency.ts`
- 命令（PowerShell 示例；需 Next.js dev 正在运行在 `BASE_URL`）：
  - `$env:BASE_URL="http://localhost:3000"`
  - `$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
  - `$env:DIRECT_URL=$env:DATABASE_URL`
  - `npm run smoke:attempt-idempotency`

本次实际执行结果（证据节选）✅：

```text
smoke:attempt-idempotency PASSED
- PASS P0-3.1 attempt/start idempotent => same open attemptId and only 1 unsubmitted
- PASS P0-3.2 attempt/submit concurrent idempotent => only one submittedAt and invite completed
- PASS P0-3.3 attempt/answer validates quiz status/ownership => inactive quiz blocks writes

DETAILS_JSON_BEGIN
P0-3.1: start1.attemptId == start2.attemptId == "cmk40ardc004ceclu2atdb0nb"
P0-3.1: dbOpenAttempts.length == 1
P0-3.2: submit1.submittedAt == submit2.submittedAt == "2026-01-07T12:40:24.031Z"
P0-3.2: dbInvite.status == "completed"
P0-3.3: quizWhenInactive.http == 404; answerWhenInactive.http == 404; dbAttempt2.hasAnswersJson == false
DETAILS_JSON_END
```

### 关键拦截/幂等实现位置

- start 幂等：`lib/authz.ts`（`requireAttemptByInvite`）+ `app/api/attempt/start/route.ts`
- submit 并发幂等：`app/api/attempt/submit/route.ts`（`updateMany` + `submittedAt=null` 锁定；已提交直接返回结果）
- answer 校验题库状态/归属：`app/api/attempt/answer/route.ts` + `app/api/quiz/route.ts`（quiz 必须 `status=active`）

### 若复验失败的最小修复说明（本次已做且已复验）

- 失败现象（并发提交场景）：第二次 `POST /api/attempt/submit` 偶发 `INVITE_EXPIRED_OR_COMPLETED`（400），不符合“并发幂等返回既有结果”的闸门要求。
- 最小修复：`app/api/attempt/submit/route.ts` 调用 `requireInviteByToken` 时允许 `["active","entered","completed","expired"]`，并先读取 attempt 判断 `submittedAt` 再调用 `assertInviteAllowsSubmit()`。

---

## P0-4：生产 gate（migrate + seed + v1 只读门禁）复验

### 1) migrate deploy ✅

命令：

- `$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
- `$env:DIRECT_URL=$env:DATABASE_URL`
- `npm run db:migrate:deploy`

证据（命令输出节选）：

```text
4 migrations found in prisma/migrations
No pending migrations to apply.
```

### 2) smoke:prod-gate ✅

命令：

- `$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
- `$env:DIRECT_URL=$env:DATABASE_URL`
- `npm run smoke:prod-gate`

证据（命令输出）：

```text
== smoke:prod-gate (read-only) ==
PASS migrations applied
PASS seed status (v1)
PASS v1 readonly guards (API hard reject)
smoke:prod-gate PASSED
```

### 3) v1 内容资产“只读”在 API 层硬拒绝（运行时复验）✅

- 脚本：`scripts/smoke-v1-readonly.ts`
- 命令：
  - `$env:BASE_URL="http://localhost:3000"`
  - `$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
  - `$env:DIRECT_URL=$env:DATABASE_URL`
  - `npm run smoke:v1-readonly`
- 证据（关键输出节选）：
  - `POST /api/admin/questions` → `HTTP 400`（`VALIDATION_ERROR`），且 v1 题库 questionCount 前后不变
  - `POST /api/admin/options` → `HTTP 400`（`VALIDATION_ERROR`），且 v1 题库 optionCount 前后不变
- 关键门禁代码位置：
  - `app/api/admin/questions/route.ts`（`if (quiz.quizVersion === "v1") return fail(...);`）
  - `app/api/admin/options/route.ts`（`if (question.quiz?.quizVersion === "v1") return fail(...);`）

证据（脚本输出节选）：

```text
smoke:v1-readonly PASSED
POST /api/admin/questions -> 400 VALIDATION_ERROR (v1 题库默认只读...)
POST /api/admin/options   -> 400 VALIDATION_ERROR (v1 题库默认只读...)

DETAILS_JSON_BEGIN
{
  "results": [
    {
      "details": {
        "beforeCount": 9,
        "afterCount": 9,
        "response": { "http": 400, "body": { "ok": false, "error": { "code": "VALIDATION_ERROR" } } }
      }
    }
  ]
}
DETAILS_JSON_END
```

### 4) seed 幂等 ✅

说明：`seed:prod` 具备硬闸门，默认拒绝运行；需要显式允许并提供强密码（不会修改已存在账号，仅作为 gate 条件）。

命令（PowerShell 示例）：

- `$env:DIRECT_URL="postgresql://postgres@127.0.0.1:5433/behavioral_test?schema=public"`
- `$env:DATABASE_URL=$env:DIRECT_URL`
- `$env:ALLOW_PROD_SEED="true"`
- `$env:SEED_ADMIN_PASSWORD="ProdSeed_Strong_2026-01-07!"`
- `npm run seed:prod`（重复执行 2 次）

数据库状态快照（证据）：

- 快照脚本：`scripts/db-snapshot-v1.ts`（输出 v1 题库与内容资产计数 + stableId/orderNo 重复检查）
- 第一次 seed 后：`questionCount=9 / optionCount=36`（fast），`questionCount=18 / optionCount=72`（pro），duplicates 全空数组
- 第二次 seed 后：计数不变，duplicates 仍为空数组

证据（db snapshot 输出节选，两次一致）：

```json
{
  "counts": {
    "fast": { "questionCount": 9, "optionCount": 36 },
    "pro": { "questionCount": 18, "optionCount": 72 },
    "contentAssets": {
      "archetypeCount": 6,
      "trainingDayCount": 7,
      "trainingSectionCount": 14,
      "methodologySectionCount": 6
    }
  },
  "duplicates": {
    "questionOrderNo": [],
    "questionStableId": [],
    "optionOrderNo": [],
    "optionStableId": []
  }
}
```

---

## P0-5：最小合规文案闸门（不改 UI 结构，只补必要提示）

### 已加入的最小合规提示文案 ✅

- `/t/[token]` 邀请落地页：
  - `本测评用于生成交易行为结构画像与沟通建议，不构成投资顾问服务或任何买卖建议，不承诺收益。`
  - 代码位置：`app/t/[token]/page.tsx`
- `/t/[token]/result` 结果页：
  - `结果为交易行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。`
  - 代码位置：`app/t/[token]/result/page.tsx`
- `/coach/*` realtime_panel 顶部提示位：
  - `提示：以下为沟通策略建议与行为结构画像参考，不构成投资顾问服务或任何买卖建议，不承诺收益。`
  - 代码位置：`app/coach/clients/[id]/page.tsx`（“实时陪跑提示区”顶部）

### 本地访问/复现方式

- 启动：`npm run dev -- --port 3000`
- 访问：
  - 创建 invite 后访问 `http://localhost:3000/t/<token>`（落地页顶部可见提示）
  - 提交后访问 `http://localhost:3000/t/<token>/result`（结果页顶部可见提示）
  - coach 登录后打开 `http://localhost:3000/coach/clients/<customerId>`（实时陪跑提示区顶部可见提示）
