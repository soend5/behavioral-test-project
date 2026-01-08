# Coach 端接口实现总结

## 实现的 Route 文件路径列表

1. `app/api/coach/me/route.ts` - GET /api/coach/me
2. `app/api/coach/customers/route.ts` - POST /api/coach/customers, GET /api/coach/customers
3. `app/api/coach/customers/[id]/route.ts` - GET /api/coach/customers/:id, PATCH /api/coach/customers/:id
4. `app/api/coach/invites/route.ts` - POST /api/coach/invites, GET /api/coach/invites
5. `app/api/coach/invites/[id]/expire/route.ts` - POST /api/coach/invites/:id/expire
6. `app/api/coach/customers/[id]/tags/route.ts` - POST /api/coach/customers/:id/tags, DELETE /api/coach/customers/:id/tags

## 新增的工具文件

1. `lib/sop-matcher.ts` - SOP 匹配引擎
   - `matchSOP(prisma, stage, tags)` - 匹配 SOP
   - `getDefaultRealtimePanel(prisma, stageId)` - 获取默认 realtime_panel

## 每个接口的门禁函数使用

### 1. GET /api/coach/me
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色

**验收方式**:
```bash
# 需要先登录获取 session token
curl -X GET "http://localhost:3000/api/coach/me" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "coach_username",
      "role": "coach"
    }
  }
}
```

---

### 2. POST /api/coach/customers
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- 自动设置 `coachId = session.user.id`

**验收方式**:
```bash
curl -X POST "http://localhost:3000/api/coach/customers" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "客户姓名",
    "nickname": "客户昵称",
    "phone": "13800138000",
    "wechat": "wechat_id",
    "qq": "qq_number",
    "note": "备注信息"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "customer": {
      "id": "customer_id",
      "name": "客户姓名",
      "nickname": "客户昵称",
      "coachId": "coach_id",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### 3. GET /api/coach/customers
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- 查询时自动过滤 `coachId === session.user.id`

**验收方式**:
```bash
curl "http://localhost:3000/api/coach/customers?page=1&limit=20&query=客户&status=completed" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "customers": [
      {
        "id": "customer_id",
        "name": "客户姓名",
        "nickname": "客户昵称",
        "phone": "13800138000",
        "latestAttempt": {
          "id": "attempt_id",
          "submittedAt": "2024-01-01T00:00:00Z",
          "status": "completed"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4. GET /api/coach/customers/:id
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)` - 验证 ownership

**验收方式**:
```bash
curl "http://localhost:3000/api/coach/customers/CUSTOMER_ID" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "customer": { ... },
    "latestAttempt": { ... },
    "attemptTimeline": [ ... ],
    "coachTags": [ ... ],
    "realtimePanel": {
      "stage": "pre",
      "stateSummary": "当前客户状态",
      "coreGoal": "本阶段唯一目标",
      "strategyList": ["策略1", "策略2", "策略3"],
      "forbiddenList": ["禁用行为1", "禁用行为2"]
    }
  }
}
```

---

### 5. PATCH /api/coach/customers/:id
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)` - 验证 ownership

**验收方式**:
```bash
curl -X PATCH "http://localhost:3000/api/coach/customers/CUSTOMER_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "新姓名",
    "nickname": "新昵称",
    "note": "新备注"
  }'
```

---

### 6. POST /api/coach/invites
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)` - 验证 customer ownership

**验收方式**:
```bash
curl -X POST "http://localhost:3000/api/coach/invites" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "customerId": "customer_id",
    "version": "fast",
    "quizVersion": "v1",
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "invite": {
      "id": "invite_id",
      "token": "原始token（仅返回一次）",
      "tokenHash": "token_hash",
      "status": "active",
      "url": "http://localhost:3000/t/原始token"
    }
  }
}
```

**关键点**: 
- 同客户同版本只能有1个 active invite
- 创建新 invite 时自动过期旧的 active invite
- token 只返回一次明文，之后任何列表/详情都不返回

---

### 7. GET /api/coach/invites
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- 查询时自动过滤 `coachId === session.user.id`

**验收方式**:
```bash
curl "http://localhost:3000/api/coach/invites?status=active&customer_id=CUSTOMER_ID&page=1&limit=20" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "invites": [
      {
        "id": "invite_id",
        "tokenHash": "token_hash（不返回原始token）",
        "status": "active",
        "customer": { ... },
        "version": "fast",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

### 8. POST /api/coach/invites/:id/expire
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsInvite(prisma, session.user.id, inviteId)` - 验证 ownership

**验收方式**:
```bash
curl -X POST "http://localhost:3000/api/coach/invites/INVITE_ID/expire" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

---

### 9. POST /api/coach/customers/:id/tags
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)` - 验证 ownership

**验收方式**:
```bash
curl -X POST "http://localhost:3000/api/coach/customers/CUSTOMER_ID/tags" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "tagKey": "coach:high_value"
  }'
```

**关键点**: 标签必须以 `coach:` 开头

---

### 10. DELETE /api/coach/customers/:id/tags
**使用的门禁函数**:
- `requireCoach()` - 要求 coach 角色
- `requireCoachOwnsCustomer(prisma, session.user.id, customerId)` - 验证 ownership

**验收方式**:
```bash
curl -X DELETE "http://localhost:3000/api/coach/customers/CUSTOMER_ID/tags?tagKey=coach:high_value" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

---

## 邀请"同客户同版本仅 1 个 active"的实现方式

**实现方式**: **自动过期旧的 active invite**

**逻辑**:
1. 创建新 invite 前，检查是否存在同 `customerId` + 同 `version` 的 `active` invite
2. 如果存在，自动将其状态更新为 `expired`
3. 写入审计日志：`coach.expire_invite`，原因：`auto_expired_by_new_invite`
4. 然后创建新的 `active` invite

**代码位置**: `app/api/coach/invites/route.ts` POST 方法

**优点**:
- 用户无需手动失效旧邀请
- 保证数据一致性（同一客户同一版本只有一个 active）
- 审计日志完整记录

---

## /coach/clients/[id] 首屏 realtime_panel 的数据来源与 SOP 命中逻辑

### 数据来源

1. **有 latest_attempt 时**:
   - `stage`: 从 `latestAttempt.stage` 获取（默认 "pre"）
   - `tags`: 
     - 系统标签：从 `latestAttempt.tagsJson` 解析（image:*, stability:*, phase:*）
     - 助教标签：从 `coachTags` 获取（coach:*）
   - 合并所有标签后调用 `matchSOP(prisma, stage, allTags)`

2. **没有 latest_attempt 时**:
   - 调用 `getDefaultRealtimePanel(prisma, "pre")`
   - 从 `coaching_stage` 表获取默认阶段信息
   - 如果有默认 SOP（`sop_stage_map.is_default = true`），使用该 SOP
   - 否则使用 `coaching_stage` 的基础信息

### SOP 命中逻辑

**匹配规则**（`lib/sop-matcher.ts`）:
1. 查询所有 `active` 的 `sop_rule`，其中 `required_stage = stage`
2. 对每个 rule：
   - 解析 `required_tags_json` 和 `excluded_tags_json`
   - 检查 `required_tags` 是否**全包含**在 tags 中
   - 检查 `excluded_tags` 是否**不包含**在 tags 中
3. 排序：先按 `sop.priority` desc，再按 `rule.confidence` desc
4. 返回 Top1 匹配的 SOP

**输出结构**:
```json
{
  "stage": "pre",
  "stateSummary": "当前客户状态",
  "coreGoal": "本阶段唯一目标",
  "strategyList": ["策略1", "策略2", "策略3"], // 最多3条
  "forbiddenList": ["禁用行为1", "禁用行为2", ...] // 可多于3条
}
```

**代码位置**: `app/api/coach/customers/[id]/route.ts` GET 方法

---

## 审计日志记录

所有关键操作都写入审计日志：

- `coach.create_customer` - 创建客户
- `coach.update_customer` - 更新客户
- `coach.view_customer` - 查看客户详情（可选）
- `coach.create_invite` - 创建邀请
- `coach.expire_invite` - 失效邀请（包括自动过期）
- `coach.create_tag` - 添加标签
- `coach.delete_tag` - 删除标签

