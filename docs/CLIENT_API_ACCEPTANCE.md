# Client 邀请测评闭环 - 手工验收步骤

## 前置条件

1. 数据库已初始化并填充测试数据：
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

2. 需要以下测试数据：
   - 至少 1 个 `invite` 记录（status: 'active'，包含有效的 `token_hash`）
   - 对应的 `customer` 和 `coach`
   - 对应的 `quiz`（version: 'fast' 或 'pro'，quizVersion: 'v1'）
   - 至少 8-12 个 `questions`（fast 版本）或 16-24 个（pro 版本）
   - 每个 question 至少 2-4 个 `options`（包含 `scorePayloadJson`）

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

---

## 完整闭环验收步骤

### Step 1: 解析邀请 Token

**接口**: `GET /api/public/invite/resolve?token=...`

**验收命令**:
```bash
# 替换 YOUR_TOKEN 为实际的原始 token（创建 invite 时返回的 token）
curl "http://localhost:3000/api/public/invite/resolve?token=YOUR_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "invite": {
      "id": "invite_id",
      "status": "active",
      "customer": {
        "id": "customer_id",
        "nickname": "客户昵称",
        "name": "客户姓名"
      },
      "coach": {
        "id": "coach_id",
        "username": "助教用户名"
      },
      "version": "fast",
      "quizVersion": "v1",
      "expiresAt": null
    }
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ 返回 invite 信息（包括 customer、coach、version）

**错误测试**:
```bash
# 无效 token
curl "http://localhost:3000/api/public/invite/resolve?token=invalid_token"
# 预期: { "ok": false, "error": { "code": "INVITE_INVALID", ... } }
```

---

### Step 2: 启动测评

**接口**: `POST /api/attempt/start`

**验收命令**:
```bash
curl -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN"}'
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "attemptId": "attempt_id",
    "quizVersion": "v1",
    "version": "fast"
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ 状态机：invite.status 从 'active' 变为 'entered'
- ✅ 幂等性：重复调用返回相同的 attemptId（不创建新 attempt）

**验证幂等性**:
```bash
# 再次调用，应该返回相同的 attemptId
curl -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN"}'
# 预期: 返回相同的 attemptId
```

**错误测试**:
```bash
# Completed invite 不能启动
curl -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d '{"token": "COMPLETED_INVITE_TOKEN"}'
# 预期: { "ok": false, "error": { "code": "INVITE_EXPIRED_OR_COMPLETED", ... } }
```

---

### Step 3: 获取题目列表

**接口**: `GET /api/quiz?token=...`

**验收命令**:
```bash
curl "http://localhost:3000/api/quiz?token=YOUR_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "questions": [
      {
        "id": "question_id",
        "orderNo": 1,
        "stem": "题目内容",
        "options": [
          {
            "id": "option_id",
            "orderNo": 1,
            "text": "选项内容"
          }
        ]
      }
    ],
    "version": "fast",
    "quizVersion": "v1"
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ 从 DB 读取题目（quiz/questions/options）
- ✅ 题目按 orderNo 排序

**错误测试**:
```bash
# Completed invite 不能获取题目
curl "http://localhost:3000/api/quiz?token=COMPLETED_INVITE_TOKEN"
# 预期: { "ok": false, "error": { "code": "INVITE_EXPIRED_OR_COMPLETED", ... } }
```

---

### Step 4: 提交答案

**接口**: `POST /api/attempt/answer`

**验收命令**:
```bash
# 替换 ATTEMPT_ID, QUESTION_ID, OPTION_ID 为实际值
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "attemptId": "ATTEMPT_ID",
    "answers": [
      {"questionId": "QUESTION_ID_1", "optionId": "OPTION_ID_1"},
      {"questionId": "QUESTION_ID_2", "optionId": "OPTION_ID_2"}
    ]
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "saved": true,
    "answeredCount": 2
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ Ownership：attempt.inviteId === invite.id
- ✅ 状态校验：invite.status !== 'completed'，attempt.submittedAt === null
- ✅ 答案格式校验：questionId 和 optionId 存在且匹配

**批量提交测试**:
```bash
# 一次提交多个答案
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "attemptId": "ATTEMPT_ID",
    "answers": [
      {"questionId": "Q1", "optionId": "O1"},
      {"questionId": "Q2", "optionId": "O2"},
      {"questionId": "Q3", "optionId": "O3"}
    ]
  }'
```

**错误测试**:
```bash
# Completed invite 不能答题
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_INVITE_TOKEN",
    "attemptId": "ATTEMPT_ID",
    "answers": [{"questionId": "Q1", "optionId": "O1"}]
  }'
# 预期: { "ok": false, "error": { "code": "INVITE_EXPIRED_OR_COMPLETED", ... } }

# 跨 invite 访问 attempt
curl -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN1",
    "attemptId": "ATTEMPT2_ID",
    "answers": [{"questionId": "Q1", "optionId": "O1"}]
  }'
# 预期: { "ok": false, "error": { "code": "FORBIDDEN", ... } }
```

---

### Step 5: 提交测评

**接口**: `POST /api/attempt/submit`

**验收命令**:
```bash
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "attemptId": "ATTEMPT_ID"
  }'
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "attemptId": "attempt_id",
    "submittedAt": "2024-01-01T00:00:00Z",
    "result": {
      "primaryImage": "conservative",
      "stability": "high",
      "dimensions": {
        "risk": 60,
        "return": 40,
        "liquidity": 80,
        "stability": 70
      }
    }
  }
}
```

**pro 版本额外字段**:
```json
{
  "result": {
    "primaryImage": "conservative",
    "stability": "high",
    "dimensions": {
      "risk": 60,
      "return": 40,
      "liquidity": 80,
      "stability": 70,
      "growth": 50,
      "diversification": 65
    }
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ Ownership：attempt.inviteId === invite.id
- ✅ 状态机：invite.status 从 'entered' 变为 'completed'
- ✅ 幂等性：重复调用返回相同结果（不重复计算）
- ✅ 数据写入：
  - attempts.answers_json ✅
  - attempts.scores_json ✅
  - attempts.tags_json ✅（至少包含 image:*, stability:*, phase:*）
  - attempts.stage ✅
  - attempts.result_summary_json ✅
  - attempts.matched_sop_id ✅（保留字段，可为 null）
- ✅ 审计日志：client.submit_attempt（包含 invite_id, attempt_id）

**验证幂等性**:
```bash
# 再次调用，应该返回相同结果
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "attemptId": "ATTEMPT_ID"
  }'
# 预期: 返回相同的 result，不重复计算
```

**验证数据库写入**:
```bash
# 检查数据库（使用 Prisma Studio 或直接查询）
npm run db:studio
# 查看 attempts 表，确认所有字段已写入
# 查看 audit_log 表，确认 client.submit_attempt 已记录
```

**错误测试**:
```bash
# Completed invite 不能提交
curl -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "COMPLETED_INVITE_TOKEN",
    "attemptId": "ATTEMPT_ID"
  }'
# 预期: { "ok": false, "error": { "code": "INVITE_EXPIRED_OR_COMPLETED", ... } }
```

---

### Step 6: 获取测评结果

**接口**: `GET /api/public/attempt/result?token=...`

**验收命令**:
```bash
curl "http://localhost:3000/api/public/attempt/result?token=YOUR_TOKEN"
```

**预期结果**:
```json
{
  "ok": true,
  "data": {
    "attempt": {
      "id": "attempt_id",
      "version": "fast",
      "submittedAt": "2024-01-01T00:00:00Z",
      "tags": ["image:conservative", "stability:high", "phase:fast_completed"],
      "stage": "pre",
      "resultSummary": {
        "primaryImage": "conservative",
        "stability": "high",
        "dimensions": {
          "risk": 60,
          "return": 40,
          "liquidity": 80,
          "stability": 70
        }
      }
    }
  }
}
```

**pro 版本额外字段**:
```json
{
  "resultSummary": {
    "dimensions": {
      "risk": 60,
      "return": 40,
      "liquidity": 80,
      "stability": 70,
      "growth": 50,
      "diversification": 65
    }
  }
}
```

**校验点**:
- ✅ Token 校验：hash(token) == invites.token_hash
- ✅ Ownership：只返回该 invite 的 attempt 结果
- ✅ 允许 completed 状态（查看结果）

**错误测试**:
```bash
# 未提交的 attempt
curl "http://localhost:3000/api/public/attempt/result?token=UNSUBMITTED_INVITE_TOKEN"
# 预期: { "ok": false, "error": { "code": "NOT_FOUND", ... } }
```

---

## 完整闭环流程示例

```bash
# 1. 解析邀请
TOKEN="your_invite_token"
RESPONSE=$(curl -s "http://localhost:3000/api/public/invite/resolve?token=$TOKEN")
echo "解析邀请: $RESPONSE"

# 2. 启动测评
ATTEMPT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/attempt/start" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}")
ATTEMPT_ID=$(echo $ATTEMPT_RESPONSE | jq -r '.data.attemptId')
echo "启动测评: $ATTEMPT_ID"

# 3. 获取题目
QUIZ_RESPONSE=$(curl -s "http://localhost:3000/api/quiz?token=$TOKEN")
echo "获取题目: $(echo $QUIZ_RESPONSE | jq '.data.questions | length') 题"

# 4. 提交答案（假设有 Q1, Q2, Q3）
curl -s -X POST "http://localhost:3000/api/attempt/answer" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"attemptId\": \"$ATTEMPT_ID\",
    \"answers\": [
      {\"questionId\": \"Q1\", \"optionId\": \"O1\"},
      {\"questionId\": \"Q2\", \"optionId\": \"O2\"},
      {\"questionId\": \"Q3\", \"optionId\": \"O3\"}
    ]
  }"

# 5. 提交测评
SUBMIT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/attempt/submit" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"attemptId\": \"$ATTEMPT_ID\"}")
echo "提交结果: $SUBMIT_RESPONSE"

# 6. 获取结果
RESULT_RESPONSE=$(curl -s "http://localhost:3000/api/public/attempt/result?token=$TOKEN")
echo "测评结果: $RESULT_RESPONSE"
```

---

## 验收检查清单

- [ ] Step 1: 解析邀请 Token 成功
- [ ] Step 2: 启动测评成功，幂等性正确
- [ ] Step 3: 获取题目列表成功，从 DB 读取
- [ ] Step 4: 提交答案成功，支持批量提交
- [ ] Step 5: 提交测评成功，所有字段写入，幂等性正确
- [ ] Step 6: 获取结果成功，包含完整信息
- [ ] 错误处理：无效 token 返回正确错误码
- [ ] 错误处理：completed invite 禁止 answer/submit
- [ ] 错误处理：跨 invite 访问 attempt 返回 FORBIDDEN
- [ ] 数据库验证：attempts 表所有字段正确写入
- [ ] 数据库验证：audit_log 正确记录 client.submit_attempt
- [ ] 数据库验证：invites.status 正确更新为 completed

