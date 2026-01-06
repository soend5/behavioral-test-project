# Smoke Test 验收清单

## 前置条件

1. 数据库已初始化（运行 `npm run db:migrate` 和 `npm run db:seed`）
2. 至少需要以下测试数据：
   - 2 个 coach 账号（coach1, coach2）
   - 每个 coach 至少 1 个客户
   - 每个客户至少 1 个 invite（active 状态）
   - 至少 1 个 invite 已完成（completed 状态）
   - 至少 1 个 quiz 和对应的 questions/options

## 测试用例

### 1. Coach 不能访问别的 coach 的客户

**测试目标**: 验证 `requireCoachOwnsCustomer` 正确工作

**步骤**:
1. 使用 coach1 登录，获取 session token
2. 创建 coach1 的客户 A（customer1）
3. 创建 coach2 的客户 B（customer2）
4. 使用 coach1 的 session 访问 `/api/coach/customers/customer2_id`

**预期结果**:
- 返回 `{ ok: false, error: { code: "FORBIDDEN", message: "..." } }`
- HTTP 状态码 403

**验收命令**:
```bash
# 假设已实现 coach 端接口
curl -X GET "http://localhost:3000/api/coach/customers/CUSTOMER2_ID" \
  -H "Cookie: next-auth.session-token=COACH1_SESSION_TOKEN"
```

---

### 2. Token 不能跨 invite 看结果

**测试目标**: 验证 `requireAttemptBelongsToInvite` 正确工作

**步骤**:
1. 创建 invite1（token1），创建对应的 attempt1 并提交
2. 创建 invite2（token2），创建对应的 attempt2 并提交
3. 使用 token1 访问 `/api/attempt/answer`，传入 `attemptId: attempt2_id`

**预期结果**:
- 返回 `{ ok: false, error: { code: "FORBIDDEN", message: "无权访问此测评记录" } }`
- HTTP 状态码 403

**验收命令**:
```bash
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN1",
    "attemptId": "ATTEMPT2_ID",
    "answers": [{"questionId": "Q1", "optionId": "O1"}]
  }'
```

---

### 3. Completed invite 不能继续答题

**测试目标**: 验证 `requireTokenInvite` 拒绝 completed 状态

**步骤**:
1. 创建 invite（token），状态为 `completed`
2. 使用该 token 调用 `/api/attempt/start`

**预期结果**:
- 返回 `{ ok: false, error: { code: "INVITE_EXPIRED_OR_COMPLETED", message: "邀请已过期或已完成，禁止启动新测评" } }`
- HTTP 状态码 400

**验收命令**:
```bash
# 测试 start
curl -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d '{"token": "COMPLETED_INVITE_TOKEN"}'

# 测试 answer（如果已有 attempt）
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_INVITE_TOKEN",
    "attemptId": "ATTEMPT_ID",
    "answers": [{"questionId": "Q1", "optionId": "O1"}]
  }'

# 测试 submit（如果已有 attempt）
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_INVITE_TOKEN",
    "attemptId": "ATTEMPT_ID"
  }'
```

**注意**: `/api/public/attempt/result` 应该允许 completed 状态（查看结果）

---

### 4. Admin-only 的接口 coach 访问必须 403

**测试目标**: 验证 `requireRole('admin')` 正确工作

**步骤**:
1. 使用 coach 账号登录，获取 session token
2. 访问 admin-only 接口（如 `/api/admin/coaches`）

**预期结果**:
- 返回 `{ ok: false, error: { code: "FORBIDDEN", message: "..." } }`
- HTTP 状态码 403

**验收命令**:
```bash
# 假设已实现 admin 端接口
curl -X GET "http://localhost:3000/api/admin/coaches" \
  -H "Cookie: next-auth.session-token=COACH_SESSION_TOKEN"
```

---

### 5. Token 越权保护

**测试目标**: 验证 `requireTokenInvite` 正确校验 token → invite 绑定

**步骤**:
1. 使用无效 token 访问 `/api/public/invite/resolve`

**预期结果**:
- 返回 `{ ok: false, error: { code: "INVITE_INVALID", message: "邀请 token 无效或不存在" } }`
- HTTP 状态码 400

**验收命令**:
```bash
curl "http://localhost:3000/api/public/invite/resolve?token=INVALID_TOKEN"
```

---

### 6. Attempt Ownership 校验

**测试目标**: 验证 attempt 必须属于指定的 invite

**步骤**:
1. 创建 invite1（token1），创建 attempt1
2. 创建 invite2（token2），创建 attempt2
3. 使用 token1 访问 `/api/attempt/submit`，传入 `attemptId: attempt2_id`

**预期结果**:
- 返回 `{ ok: false, error: { code: "FORBIDDEN", message: "无权访问此测评记录" } }`
- HTTP 状态码 403

**验收命令**:
```bash
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN1",
    "attemptId": "ATTEMPT2_ID"
  }'
```

---

## 快速验收脚本

创建测试数据后，运行以下命令验证：

```bash
# 1. 测试无效 token
curl "http://localhost:3000/api/public/invite/resolve?token=invalid_token"

# 2. 测试 completed invite（假设有 completed_invite_token）
curl -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d '{"token": "completed_invite_token"}'

# 3. 测试跨 invite 访问 attempt（假设有 token1 和 attempt2_id）
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token1",
    "attemptId": "attempt2_id",
    "answers": [{"questionId": "q1", "optionId": "o1"}]
  }'
```

---

## 验收标准

所有测试用例必须：
1. ✅ 返回正确的错误码
2. ✅ 返回正确的 HTTP 状态码
3. ✅ 错误消息清晰明确
4. ✅ 不会泄露敏感信息（如其他 coach 的客户信息）
5. ✅ 审计日志正确记录（如适用）

