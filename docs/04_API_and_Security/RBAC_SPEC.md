# RBAC 权限规范文档

## 角色定义

| 角色 | 标识 | 说明 |
|------|------|------|
| 公开用户 | `public` | 未登录用户，只能访问首页 |
| 客户 | `client` | 通过邀请 token 访问测评的用户 |
| 助教 | `coach` | 登录的助教账号，管理自己的客户 |
| 管理员 | `admin` | 登录的管理员账号，拥有全部权限 |

---

## 权限矩阵

### 页面访问权限

| 路由 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/t/[token]` | ✅ | ✅ | ❌ | ❌ |
| `/t/[token]/quiz` | ✅ | ✅ | ❌ | ❌ |
| `/t/[token]/result` | ✅ | ✅ | ❌ | ❌ |
| `/coach/login` | ✅ | ✅ | ✅ | ✅ |
| `/coach/dashboard` | ❌ | ❌ | ✅ | ✅ |
| `/coach/clients/[id]` | ❌ | ❌ | ✅* | ✅ |
| `/coach/invites/*` | ❌ | ❌ | ✅* | ✅ |
| `/admin/login` | ✅ | ✅ | ✅ | ✅ |
| `/admin/coaches` | ❌ | ❌ | ❌ | ✅ |
| `/admin/sop` | ❌ | ❌ | ❌ | ✅ |
| `/admin/questions` | ❌ | ❌ | ❌ | ✅ |
| `/admin/audit` | ❌ | ❌ | ❌ | ✅ |

*coach 只能访问自己创建的客户和邀请

---

## 数据访问权限

### 1. Customer（客户）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 创建 | ❌ | ❌ | ✅* | ✅ |
| 查看列表 | ❌ | ❌ | ✅* | ✅ |
| 查看详情 | ❌ | ❌ | ✅* | ✅ |
| 更新 | ❌ | ❌ | ✅* | ✅ |
| 删除 | ❌ | ❌ | ❌ | ✅ |

**Ownership 校验规则**:
- coach 只能操作 `customer.coachId === session.user.id` 的客户
- admin 可以操作所有客户
- 所有 coach 端 API 必须校验 ownership

---

### 2. Invite（邀请）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 创建 | ❌ | ❌ | ✅* | ✅ |
| 查看列表 | ❌ | ❌ | ✅* | ✅ |
| 查看详情 | ❌ | ❌ | ✅* | ✅ |
| 失效 | ❌ | ❌ | ✅* | ✅ |
| 通过 token 解析 | ✅ | ✅ | ❌ | ❌ |

**Ownership 校验规则**:
- coach 只能操作 `invite.coachId === session.user.id` 的邀请
- admin 可以操作所有邀请
- client 只能通过 token 访问自己的邀请（token → invite 绑定校验）

**Token 安全规则**:
- token 只存 hash 到数据库
- 创建邀请时只返回原始 token 一次
- 后续查询只返回 tokenHash，不返回原始 token

---

### 3. Attempt（测评）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 启动 | ❌ | ✅** | ❌ | ❌ |
| 提交答案 | ❌ | ✅** | ❌ | ❌ |
| 提交测评 | ❌ | ✅** | ❌ | ❌ |
| 查看结果 | ❌ | ✅** | ✅* | ✅ |
| 查看答案详情 | ❌ | ❌ | ✅* | ✅ |

**Ownership 校验规则**:
- coach 只能查看 `attempt.coachId === session.user.id` 的测评
- admin 可以查看所有测评
- client 只能通过 token 访问自己的测评（token → invite → attempt 绑定校验）

**状态校验规则**:
- `invite.status === 'completed'` 时，禁止 `answer` 和 `submit`
- `invite.status === 'completed'` 时，只允许读取 `result`
- `attempt.submittedAt !== null` 时，禁止继续 `answer`

---

### 4. Quiz / Question / Option（题库）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 查看（通过 token） | ✅ | ✅ | ❌ | ❌ |
| CRUD | ❌ | ❌ | ❌ | ✅ |

**访问规则**:
- client 只能通过有效的 invite token 查看题目
- 所有 CRUD 操作仅限 admin

---

### 5. SOP 配置（SOP Definition / Rule / Stage / Stage Map）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 查看（通过客户详情） | ❌ | ❌ | ✅* | ✅ |
| CRUD | ❌ | ❌ | ❌ | ✅ |

**访问规则**:
- coach 只能通过客户详情页查看匹配的 SOP（系统自动匹配）
- 所有 CRUD 操作仅限 admin

---

### 6. Coach Tag（助教标签）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 创建 | ❌ | ❌ | ✅* | ✅ |
| 删除 | ❌ | ❌ | ✅* | ✅ |
| 查看 | ❌ | ❌ | ✅* | ✅ |

**Ownership 校验规则**:
- coach 只能操作 `coachTag.coachId === session.user.id` 的标签
- coach 只能为 `customer.coachId === session.user.id` 的客户添加标签
- admin 可以操作所有标签

---

### 7. User（用户账号）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 创建 coach | ❌ | ❌ | ❌ | ✅ |
| 更新 coach | ❌ | ❌ | ❌ | ✅ |
| 停用 coach | ❌ | ❌ | ❌ | ✅ |
| 查看列表 | ❌ | ❌ | ❌ | ✅ |
| 修改自己密码 | ❌ | ❌ | ✅ | ✅ |

**访问规则**:
- 所有用户管理操作仅限 admin
- coach 只能修改自己的密码（通过 `/api/coach/me` 相关接口）

---

### 8. Audit Log（审计日志）

| 操作 | public | client | coach | admin |
|------|--------|--------|-------|-------|
| 查看 | ❌ | ❌ | ❌ | ✅ |
| 写入 | 系统自动 | 系统自动 | 系统自动 | 系统自动 |

**访问规则**:
- 只有 admin 可以查看审计日志
- 所有关键操作都会自动写入审计日志

---

## 关键校验点

### 1. Customer Ownership（最容易漏）

**场景**: coach 访问客户相关资源

**校验逻辑**:
```typescript
// 必须校验
if (user.role === 'coach' && customer.coachId !== user.id) {
  throw new Error('FORBIDDEN: 无权访问此客户');
}
```

**涉及接口**:
- `GET /api/coach/customers/:id`
- `PATCH /api/coach/customers/:id`
- `POST /api/coach/customers/:id/tags`
- `DELETE /api/coach/customers/:id/tags`
- `POST /api/coach/invites` (customerId 校验)

---

### 2. Invite Ownership（最容易漏）

**场景**: coach 访问邀请相关资源

**校验逻辑**:
```typescript
// 必须校验
if (user.role === 'coach' && invite.coachId !== user.id) {
  throw new Error('FORBIDDEN: 无权访问此邀请');
}
```

**涉及接口**:
- `GET /api/coach/invites`
- `POST /api/coach/invites/:id/expire`

---

### 3. Attempt Ownership（最容易漏）

**场景**: coach 查看客户详情时，显示该客户的测评记录

**校验逻辑**:
```typescript
// 必须校验
if (user.role === 'coach' && attempt.coachId !== user.id) {
  throw new Error('FORBIDDEN: 无权访问此测评');
}
```

**涉及接口**:
- `GET /api/coach/customers/:id` (返回 attempts 列表)

---

### 4. Token 越权（最容易漏）

**场景**: client 通过 token 访问测评相关资源

**校验逻辑**:
```typescript
// 必须校验 token → invite 绑定
const invite = await prisma.invite.findFirst({
  where: { tokenHash: hashToken(token) }
});

if (!invite || invite.status === 'expired') {
  throw new Error('INVALID_TOKEN');
}

// 校验 invite 状态
if (invite.status === 'completed' && action !== 'read_result') {
  throw new Error('INVITE_COMPLETED: 邀请已完成，禁止继续操作');
}
```

**涉及接口**:
- `GET /api/public/invite/resolve`
- `POST /api/attempt/start`
- `GET /api/quiz`
- `POST /api/attempt/answer`
- `POST /api/attempt/submit`
- `GET /api/public/attempt/result`

---

### 5. Admin-only CRUD（最容易漏）

**场景**: 配置管理接口（SOP、题库）

**校验逻辑**:
```typescript
// 必须校验
if (user.role !== 'admin') {
  throw new Error('FORBIDDEN: 仅管理员可操作');
}
```

**涉及接口**:
- 所有 `/api/admin/sop/*` 接口
- 所有 `/api/admin/quiz` 接口
- 所有 `/api/admin/questions` 接口
- 所有 `/api/admin/options` 接口
- `POST /api/admin/coaches`
- `PATCH /api/admin/coaches/:id`

---

### 6. Completed 禁止答题（最容易漏）

**场景**: invite 完成后，禁止继续答题

**校验逻辑**:
```typescript
// 在 answer 和 submit 接口中必须校验
if (invite.status === 'completed') {
  throw new Error('INVITE_COMPLETED: 邀请已完成，禁止继续操作');
}

// 在 answer 接口中额外校验
if (attempt.submittedAt !== null) {
  throw new Error('BAD_REQUEST: 测评已提交，禁止继续答题');
}
```

**涉及接口**:
- `POST /api/attempt/answer`
- `POST /api/attempt/submit`

**允许操作**:
- `GET /api/public/attempt/result` (允许读取结果)

---

## 中间件保护策略

### Next.js Middleware

```typescript
// middleware.ts
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin 路由保护
    if (path.startsWith("/admin")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Coach 路由保护
    if (path.startsWith("/coach") && !path.startsWith("/coach/login")) {
      if (!token || (token.role !== "coach" && token.role !== "admin")) {
        return NextResponse.redirect(new URL("/coach/login", req.url));
      }
    }

    return NextResponse.next();
  }
);
```

### API Route 保护

所有 API Route 必须：
1. 检查 session（除公开接口外）
2. 检查 role（根据接口要求）
3. 检查 ownership（coach 端接口）
4. 检查 token 绑定（client 端接口）

---

## 审计日志记录点

以下操作必须写入审计日志：

1. **客户管理**
   - `customer.create`
   - `customer.update`
   - `customer.view` (仅查看详情时记录)

2. **邀请管理**
   - `invite.create`
   - `invite.expire`

3. **测评操作**
   - `attempt.start`
   - `attempt.answer` (批量提交时记录一次)
   - `attempt.submit`

4. **标签管理**
   - `coach_tag.create`
   - `coach_tag.delete`

5. **配置管理** (admin only)
   - `sop_definition.create|update|delete`
   - `sop_rule.create|update|delete`
   - `coaching_stage.create|update|delete`
   - `sop_stage_map.create|update|delete`
   - `quiz.create|update|delete`
   - `question.create|update|delete`
   - `option.create|update|delete`
   - `user.create|update`

---

## 实现建议

### 1. 创建权限辅助函数

```typescript
// lib/rbac.ts
export async function requireRole(role: 'admin' | 'coach') {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (user.role !== role && user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireCustomerOwnership(customerId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });
  
  if (!customer) throw new Error('NOT_FOUND');
  
  if (user.role === 'coach' && customer.coachId !== user.id) {
    throw new Error('FORBIDDEN');
  }
  
  return { user, customer };
}
```

### 2. 创建 Token 验证函数

```typescript
// lib/token.ts
export async function validateInviteToken(token: string) {
  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findFirst({
    where: { tokenHash },
    include: { customer: true, coach: true }
  });
  
  if (!invite) throw new Error('INVALID_TOKEN');
  if (invite.status === 'expired') throw new Error('INVITE_EXPIRED');
  
  return invite;
}
```

### 3. 统一错误处理

```typescript
// lib/errors.ts
export function createErrorResponse(code: string, message: string) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status: getHttpStatus(code) }
  );
}

export function createSuccessResponse(data: any) {
  return NextResponse.json({ ok: true, data });
}
```

---

---

## 门禁函数一览

所有 API route 必须使用 `lib/authz.ts` 提供的门禁函数，禁止散写校验逻辑。

### 认证相关

| 函数 | 说明 | 用途 |
|------|------|------|
| `getSessionOrNull()` | 获取会话（可为 null） | 可选登录场景 |
| `requireAuth()` | 要求必须登录 | 需要登录的接口 |
| `requireRole(role)` | 要求特定角色 | 需要特定角色的接口 |
| `requireAdmin()` | 要求 admin 角色 | admin-only 接口 |
| `requireCoach()` | 要求 coach 角色 | coach-only 接口 |

### Ownership 校验

| 函数 | 说明 | 用途 |
|------|------|------|
| `requireCoachOwnsCustomer(prisma, coachId, customerId)` | 要求 coach 拥有指定的 customer | coach 端客户相关接口 |
| `requireCoachOwnsInvite(prisma, coachId, inviteId)` | 要求 coach 拥有指定的 invite | coach 端邀请相关接口 |
| `requireCoachOwnsAttempt(prisma, coachId, attemptId)` | 要求 coach 拥有指定的 attempt | coach 端测评相关接口 |

### Token → Invite 校验

| 函数 | 说明 | 用途 |
|------|------|------|
| `requireInviteByToken(prisma, token, options)` | 通过 token 获取 invite（含状态校验） | client 端所有接口 |
| `requireAttemptByInvite(prisma, inviteId)` | 获取 invite 的 attempt（幂等性检查） | start 接口幂等性 |
| `requireAttemptOwnership(prisma, attemptId, inviteId)` | 验证 attempt 属于指定的 invite | answer/submit 接口 |

### 状态断言

| 函数 | 说明 | 用途 |
|------|------|------|
| `assertInviteAllowsAnswer(invite)` | 断言 invite 允许答题 | answer 接口 |
| `assertInviteAllowsSubmit(invite)` | 断言 invite 允许提交 | submit 接口 |
| `assertAttemptNotSubmitted(attempt)` | 断言 attempt 未提交 | answer/submit 接口 |

---

## 每个 Route 使用的门禁函数

### Client 端接口

#### GET /api/public/invite/resolve
- `requireInviteByToken` (允许 completed 状态)

#### POST /api/attempt/start
- `requireInviteByToken` (拒绝 completed/expired)
- `requireAttemptByInvite` (幂等性检查)

#### GET /api/quiz
- `requireInviteByToken` (拒绝 completed/expired)

#### POST /api/attempt/answer
- `requireInviteByToken` (拒绝 completed/expired)
- `requireAttemptOwnership` (验证 attempt 属于该 invite)
- `assertInviteAllowsAnswer` (断言 invite 允许答题)
- `assertAttemptNotSubmitted` (断言 attempt 未提交)

#### POST /api/attempt/submit
- `requireInviteByToken` (拒绝 completed/expired)
- `requireAttemptOwnership` (验证 attempt 属于该 invite)
- `assertInviteAllowsSubmit` (断言 invite 允许提交)
- `assertAttemptNotSubmitted` (断言 attempt 未提交，幂等性处理)

#### GET /api/public/attempt/result
- `requireInviteByToken` (允许 completed，因为这是查看结果)

### Coach 端接口（待实现）

#### GET /api/coach/customers
- `requireCoach()` (要求 coach 角色)
- 查询时自动过滤 `coachId === session.user.id`

#### GET /api/coach/customers/:id
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)`

#### POST /api/coach/invites
- `requireCoach()` (要求 coach 角色)
- 自动设置 `coachId = session.user.id`

#### GET /api/coach/invites
- `requireCoach()` (要求 coach 角色)
- 查询时自动过滤 `coachId === session.user.id`

### Admin 端接口（待实现）

#### 所有 /api/admin/* 接口
- `requireAdmin()` (要求 admin 角色)

---

## 总结

**最容易漏的 6 个校验点**：
1. ✅ Customer Ownership: `customer.coachId === session.user.id` → `requireCoachOwnsCustomer`
2. ✅ Invite Ownership: `invite.coachId === session.user.id` → `requireCoachOwnsInvite`
3. ✅ Attempt Ownership: `attempt.coachId === session.user.id` → `requireCoachOwnsAttempt`
4. ✅ Token 越权: token → invite 绑定校验 → `requireInviteByToken`
5. ✅ Admin-only CRUD: `role === 'admin'` 校验 → `requireAdmin`
6. ✅ Completed 禁止答题: `invite.status === 'completed'` 时禁止 answer/submit → `assertInviteAllowsAnswer` / `assertInviteAllowsSubmit`

**实现顺序建议**：
1. 先实现 client 端（token 验证逻辑）
2. 再实现 coach 端（ownership 校验逻辑）
3. 最后实现 admin 端（role 校验逻辑）

