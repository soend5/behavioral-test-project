# Smoke Test: 门禁层校验

## 必须验证的 4 个场景

### 1. Completed invite 调用 /attempt/answer 或 /attempt/submit 必须失败

**测试目标**: 验证 `assertInviteAllowsAnswer` 和 `assertInviteAllowsSubmit` 正确拦截

**步骤**:
1. 创建一个 invite，状态为 `completed`
2. 使用该 invite 的 token 调用 `/api/attempt/answer` 或 `/api/attempt/submit`

**预期结果**:
- HTTP 状态码: 400
- 错误码: `INVITE_EXPIRED_OR_COMPLETED`
- 错误消息: "邀请已过期或已完成，禁止继续答题" 或 "邀请已过期或已完成，禁止继续操作"

**验收命令**:
```bash
# 假设 COMPLETED_TOKEN 是 completed 状态的 invite token
# 假设 ATTEMPT_ID 是该 invite 的 attempt ID

# 测试 answer
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_TOKEN",
    "attemptId": "ATTEMPT_ID",
    "answers": [{"questionId": "q1", "optionId": "o1"}]
  }'

# 测试 submit
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_TOKEN",
    "attemptId": "ATTEMPT_ID"
  }'
```

---

### 2. Token 错误：resolve/quiz/result 必须失败

**测试目标**: 验证 `requireInviteByToken` 正确拦截无效 token

**步骤**:
1. 使用无效的 token 调用 `/api/public/invite/resolve`、`/api/quiz`、`/api/public/attempt/result`

**预期结果**:
- HTTP 状态码: 400
- 错误码: `INVITE_INVALID`
- 错误消息: "邀请 token 无效或不存在"

**验收命令**:
```bash
# 测试 resolve
curl "http://localhost:3000/api/public/invite/resolve?token=invalid_token_123"

# 测试 quiz
curl "http://localhost:3000/api/quiz?token=invalid_token_123"

# 测试 result
curl "http://localhost:3000/api/public/attempt/result?token=invalid_token_123"
```

---

### 3. Attempt 不属于该 invite：answer/submit 必须失败

**测试目标**: 验证 `requireAttemptOwnership` 正确拦截跨 invite 访问

**步骤**:
1. 创建 invite1（token1），创建 attempt1
2. 创建 invite2（token2），创建 attempt2
3. 使用 token1 调用 `/api/attempt/answer` 或 `/api/attempt/submit`，传入 `attemptId: attempt2_id`

**预期结果**:
- HTTP 状态码: 403
- 错误码: `FORBIDDEN`
- 错误消息: "无权访问此测评记录"

**验收命令**:
```bash
# 假设 TOKEN1 是 invite1 的 token
# 假设 ATTEMPT2_ID 是 invite2 的 attempt ID

# 测试 answer
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN1",
    "attemptId": "ATTEMPT2_ID",
    "answers": [{"questionId": "q1", "optionId": "o1"}]
  }'

# 测试 submit
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN1",
    "attemptId": "ATTEMPT2_ID"
  }'
```

---

### 4. Admin-only 接口（若已有任一）coach 调用必须 403

**测试目标**: 验证 `requireAdmin` 正确拦截 coach 访问

**步骤**:
1. 使用 coach 账号登录，获取 session token
2. 使用该 session token 访问 admin-only 接口（如 `/api/admin/coaches`）

**预期结果**:
- HTTP 状态码: 403
- 错误码: `FORBIDDEN`
- 错误消息: "权限不足"

**验收命令**:
```bash
# 假设已实现 admin 接口
# 假设 COACH_SESSION_TOKEN 是 coach 的 session token

curl -X GET "http://localhost:3000/api/admin/coaches" \
  -H "Cookie: next-auth.session-token=COACH_SESSION_TOKEN"
```

---

## 自动化脚本运行

```bash
# 设置环境变量
export COMPLETED_TOKEN="completed_invite_token"
export INVALID_TOKEN="invalid_token_123"
export TOKEN1="invite1_token"
export TOKEN2="invite2_token"
export ATTEMPT1_ID="attempt1_id"
export ATTEMPT2_ID="attempt2_id"

# 运行脚本
chmod +x scripts/smoke-test-authz.sh
./scripts/smoke-test-authz.sh
```

---

## 验收检查清单

- [ ] 测试 1: Completed invite 调用 answer/submit 返回 `INVITE_EXPIRED_OR_COMPLETED`
- [ ] 测试 2: 无效 token 调用 resolve/quiz/result 返回 `INVITE_INVALID`
- [ ] 测试 3: 跨 invite 访问 attempt 返回 `FORBIDDEN`
- [ ] 测试 4: Coach 访问 admin-only 接口返回 `FORBIDDEN`

---

### 5. Quiz status=inactive 禁止创建新 invite（P1）

**测试目标**：验证 `POST /api/coach/invites` 会前置校验 quiz 必须为 `active`。

**步骤**：
1. 管理员将某个 quiz 的 `status` 置为 `inactive`
2. 助教尝试为该 `quizVersion + version` 创建 invite

**预期结果**：
- HTTP 状态码：400
- 错误码：`VALIDATION_ERROR`
- 错误消息：包含“题库已停用（inactive）”

**验收命令（示例）**：
```bash
# 1) admin 获取 quiz 列表，找到要测试的 quizId
curl -X GET "http://localhost:3000/api/admin/quiz" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION_TOKEN"

# 2) admin 将 quiz 标记为 inactive
curl -X PATCH "http://localhost:3000/api/admin/quiz/QUIZ_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION_TOKEN" \
  -d '{"status":"inactive"}'

# 3) coach 创建 invite（应失败）
curl -X POST "http://localhost:3000/api/coach/invites" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=COACH_SESSION_TOKEN" \
  -d '{"customerId":"CUSTOMER_ID","version":"fast","quizVersion":"v1"}'

# 4) 测试结束后，建议恢复为 active
curl -X PATCH "http://localhost:3000/api/admin/quiz/QUIZ_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION_TOKEN" \
  -d '{"status":"active"}'
```

---

### 6. 同客户同版本唯一 active invite（事务/DB 约束）（P1）

**测试目标**：验证并发下不会产生“双 active”（DB 层兜底），且最终 **同客户同版本只有 1 条 active invite**。

**步骤**：
1. 准备一个 customer（CUSTOMER_ID）
2. 并发触发 2 次 `POST /api/coach/invites`（同 customerId + version + quizVersion）
3. 用 `GET /api/coach/invites?status=active&customer_id=...` 校验 active 数量

**预期结果**：
- 最终 active invite 数量：**1**
- 并发请求可能出现的表现（均可接受）：
  - 其中 1 个请求返回 `409 CONFLICT`（并发创建被 DB 约束拒绝）
  - 或者 2 个都返回 200，但旧的被自动 expire，最终仍只有 1 个 active

**验收命令（bash 示例）**：
```bash
PAYLOAD='{"customerId":"CUSTOMER_ID","version":"fast","quizVersion":"v1"}'

printf '%s\n' 1 2 | xargs -P 2 -I{} curl -s -X POST "http://localhost:3000/api/coach/invites" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=COACH_SESSION_TOKEN" \
  -d "$PAYLOAD"

curl -s "http://localhost:3000/api/coach/invites?status=active&customer_id=CUSTOMER_ID&page=1&limit=50" \
  -H "Cookie: next-auth.session-token=COACH_SESSION_TOKEN"
```


