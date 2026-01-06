# API 规范文档

## 统一返回格式

### 成功响应
```json
{
  "ok": true,
  "data": { ... }
}
```

### 错误响应
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `UNAUTHORIZED` | 401 | 未登录或 token 无效 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `CONFLICT` | 409 | 资源冲突（如重复创建） |
| `INVALID_TOKEN` | 400 | 邀请 token 无效或已失效 |
| `INVITE_COMPLETED` | 400 | 邀请已完成，禁止继续操作 |
| `INVITE_EXPIRED` | 400 | 邀请已过期 |
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 1. Client 端接口

### 1.1 解析邀请 Token

**路由**: `GET /api/public/invite/resolve`

**查询参数**:
- `token` (string, required): 邀请 token（原始 token，非 hash）

**响应**:
```json
{
  "ok": true,
  "data": {
    "invite": {
      "id": "invite_id",
      "status": "active" | "entered" | "completed" | "expired",
      "customer": {
        "id": "customer_id",
        "nickname": "客户昵称",
        "name": "客户姓名"
      },
      "coach": {
        "id": "coach_id",
        "username": "助教用户名"
      },
      "version": "fast" | "pro",
      "quizVersion": "v1",
      "expiresAt": "2024-01-01T00:00:00Z" | null
    }
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 不存在或无效
- `INVITE_EXPIRED`: 邀请已过期

**RBAC 校验点**:
- 无（公开接口）

**审计写入点**:
- 无

**幂等策略**:
- GET 请求，天然幂等

---

### 1.2 启动测评

**路由**: `POST /api/attempt/start`

**请求体**:
```json
{
  "token": "invite_token"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "attemptId": "attempt_id",
    "quizVersion": "v1",
    "version": "fast" | "pro"
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 无效
- `INVITE_COMPLETED`: 邀请已完成，禁止启动新测评
- `INVITE_EXPIRED`: 邀请已过期
- `CONFLICT`: 该邀请已有进行中的测评

**RBAC 校验点**:
- 验证 token → invite 存在且 status 为 `active` 或 `entered`
- 验证 invite 未过期（如有 expiresAt）
- 验证 invite 未完成（status !== `completed`）
- 同一 invite 同一时间只能有一个未提交的 attempt

**审计写入点**:
- `action: "attempt.start"`, `target_type: "attempt"`, `target_id: attempt_id`

**幂等策略**:
- 如果已有进行中的 attempt，返回现有 attempt_id（幂等）

---

### 1.3 获取题目列表

**路由**: `GET /api/quiz`

**查询参数**:
- `token` (string, required): 邀请 token

**响应**:
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
    "version": "fast" | "pro",
    "quizVersion": "v1"
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 无效
- `INVITE_COMPLETED`: 邀请已完成
- `INVITE_EXPIRED`: 邀请已过期

**RBAC 校验点**:
- 验证 token → invite 存在
- 验证 invite 未过期
- 验证 invite 未完成（允许 `active` 或 `entered`）

**审计写入点**:
- 无（读操作，不记录）

**幂等策略**:
- GET 请求，天然幂等

---

### 1.4 提交答案

**路由**: `POST /api/attempt/answer`

**请求体**:
```json
{
  "token": "invite_token",
  "attemptId": "attempt_id",
  "answers": [
    {
      "questionId": "question_id",
      "optionId": "option_id"
    }
  ]
}
```

**说明**: 支持一次提交一题或批量提交多题

**响应**:
```json
{
  "ok": true,
  "data": {
    "saved": true,
    "answeredCount": 5
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 无效
- `INVITE_COMPLETED`: 邀请已完成，禁止继续答题
- `INVITE_EXPIRED`: 邀请已过期
- `NOT_FOUND`: attempt 不存在
- `VALIDATION_ERROR`: 答案格式错误或题目/选项不存在

**RBAC 校验点**:
- 验证 token → invite 存在
- 验证 invite 未完成（status !== `completed`）
- 验证 attempt 属于该 invite
- 验证 attempt 未提交（submittedAt === null）

**审计写入点**:
- `action: "attempt.answer"`, `target_type: "attempt"`, `target_id: attempt_id`

**幂等策略**:
- 支持重复提交相同答案（覆盖更新）

---

### 1.5 提交测评

**路由**: `POST /api/attempt/submit`

**请求体**:
```json
{
  "token": "invite_token",
  "attemptId": "attempt_id"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "attemptId": "attempt_id",
    "submittedAt": "2024-01-01T00:00:00Z",
    "result": {
      "tags": ["image:conservative", "stability:high"],
      "stage": "pre",
      "summary": "测评结果摘要"
    }
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 无效
- `INVITE_COMPLETED`: 邀请已完成
- `INVITE_EXPIRED`: 邀请已过期
- `NOT_FOUND`: attempt 不存在
- `BAD_REQUEST`: attempt 已提交或答案不完整

**RBAC 校验点**:
- 验证 token → invite 存在
- 验证 invite 未完成（status !== `completed`）
- 验证 attempt 属于该 invite
- 验证 attempt 未提交（submittedAt === null）
- 验证答案完整性（所有题目都有答案）

**审计写入点**:
- `action: "attempt.submit"`, `target_type: "attempt"`, `target_id: attempt_id`
- 同时更新 invite.status = `completed`

**幂等策略**:
- 如果已提交，返回现有结果（幂等）

---

### 1.6 获取测评结果

**路由**: `GET /api/public/attempt/result`

**查询参数**:
- `token` (string, required): 邀请 token

**响应**:
```json
{
  "ok": true,
  "data": {
    "attempt": {
      "id": "attempt_id",
      "version": "fast" | "pro",
      "submittedAt": "2024-01-01T00:00:00Z",
      "tags": ["image:conservative", "stability:high"],
      "stage": "pre",
      "resultSummary": {
        "primaryImage": "conservative",
        "stability": "high",
        "dimensions": {
          "risk": 60,
          "return": 40,
          "liquidity": 80
        }
      }
    }
  }
}
```

**错误码**:
- `INVALID_TOKEN`: token 无效
- `NOT_FOUND`: 测评结果不存在或未提交

**RBAC 校验点**:
- 验证 token → invite 存在
- 验证 invite 有已提交的 attempt

**审计写入点**:
- 无（读操作，不记录）

**幂等策略**:
- GET 请求，天然幂等

---

## 2. Coach 端接口

### 2.1 获取当前用户信息

**路由**: `GET /api/coach/me`

**响应**:
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

**RBAC 校验点**:
- 必须登录（session 存在）
- role 必须是 `coach` 或 `admin`

**审计写入点**:
- 无

**幂等策略**:
- GET 请求，天然幂等

---

### 2.2 创建客户档案

**路由**: `POST /api/coach/customers`

**请求体**:
```json
{
  "name": "客户姓名",
  "nickname": "客户昵称",
  "phone": "13800138000",
  "wechat": "wechat_id",
  "qq": "qq_number",
  "note": "备注信息"
}
```

**响应**:
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

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 非 coach/admin
- `VALIDATION_ERROR`: 数据验证失败

**RBAC 校验点**:
- 必须登录
- role 必须是 `coach` 或 `admin`
- 自动设置 `coachId = session.user.id`（coach 只能创建自己的客户）

**审计写入点**:
- `action: "customer.create"`, `target_type: "customer"`, `target_id: customer_id`

**幂等策略**:
- 非幂等（每次创建新客户）

---

### 2.3 获取客户列表

**路由**: `GET /api/coach/customers`

**查询参数**:
- `page` (number, optional): 页码，默认 1
- `limit` (number, optional): 每页数量，默认 20
- `status` (string, optional): 筛选状态（未测评/已完成/可复测）

**响应**:
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

**RBAC 校验点**:
- 必须登录
- role 必须是 `coach` 或 `admin`
- **严格校验**: 只返回 `coachId === session.user.id` 的客户（admin 可返回全部）

**审计写入点**:
- 无（读操作，不记录）

**幂等策略**:
- GET 请求，天然幂等

---

### 2.4 获取客户详情

**路由**: `GET /api/coach/customers/:id`

**路径参数**:
- `id` (string, required): 客户 ID

**响应**:
```json
{
  "ok": true,
  "data": {
    "customer": {
      "id": "customer_id",
      "name": "客户姓名",
      "nickname": "客户昵称",
      "phone": "13800138000",
      "wechat": "wechat_id",
      "qq": "qq_number",
      "note": "备注",
      "coachId": "coach_id",
      "coachingHint": {
        "stage": "pre",
        "stateSummary": "当前客户状态",
        "coreGoal": "本阶段唯一目标",
        "strategies": ["策略1", "策略2", "策略3"],
        "forbidden": ["禁用行为1", "禁用行为2"]
      },
      "attempts": [
        {
          "id": "attempt_id",
          "version": "fast",
          "submittedAt": "2024-01-01T00:00:00Z",
          "tags": ["image:conservative"],
          "answers": [
            {
              "questionId": "question_id",
              "questionStem": "题目",
              "optionId": "option_id",
              "optionText": "答案"
            }
          ]
        }
      ],
      "coachTags": [
        {
          "id": "tag_id",
          "tagKey": "coach:high_value",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权访问此客户
- `NOT_FOUND`: 客户不存在

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `customer.coachId === session.user.id`（admin 可访问全部）

**审计写入点**:
- `action: "customer.view"`, `target_type: "customer"`, `target_id: customer_id`

**幂等策略**:
- GET 请求，天然幂等

---

### 2.5 更新客户档案

**路由**: `PATCH /api/coach/customers/:id`

**路径参数**:
- `id` (string, required): 客户 ID

**请求体**:
```json
{
  "name": "新姓名",
  "nickname": "新昵称",
  "phone": "新手机号",
  "note": "新备注"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "customer": {
      "id": "customer_id",
      "name": "新姓名",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权修改此客户
- `NOT_FOUND`: 客户不存在
- `VALIDATION_ERROR`: 数据验证失败

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `customer.coachId === session.user.id`（admin 可修改全部）
- 禁止修改 `coachId`（只能由 admin 修改）

**审计写入点**:
- `action: "customer.update"`, `target_type: "customer"`, `target_id: customer_id`

**幂等策略**:
- 支持重复更新（幂等）

---

### 2.6 创建邀请链接

**路由**: `POST /api/coach/invites`

**请求体**:
```json
{
  "customerId": "customer_id",
  "version": "fast" | "pro",
  "quizVersion": "v1",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "invite": {
      "id": "invite_id",
      "token": "原始token（仅展示一次）",
      "tokenHash": "token_hash",
      "status": "active",
      "customerId": "customer_id",
      "version": "fast",
      "quizVersion": "v1",
      "expiresAt": "2024-12-31T23:59:59Z",
      "url": "http://localhost:3000/t/原始token"
    }
  }
}
```

**说明**: 
- token 只存 hash 到数据库
- 原始 token 只在创建时返回一次，后续查询只返回 hash

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权为此客户创建邀请
- `NOT_FOUND`: 客户不存在
- `CONFLICT`: 该客户同版本已有 active 邀请
- `VALIDATION_ERROR`: 数据验证失败

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `customer.coachId === session.user.id`（admin 可为任何客户创建）
- 验证同客户同版本只能有一个 `active` 邀请（创建新邀请前需失效旧邀请）

**审计写入点**:
- `action: "invite.create"`, `target_type: "invite"`, `target_id: invite_id`

**幂等策略**:
- 非幂等（每次创建新邀请）

---

### 2.7 获取邀请列表

**路由**: `GET /api/coach/invites`

**查询参数**:
- `customerId` (string, optional): 筛选客户 ID
- `status` (string, optional): 筛选状态
- `page` (number, optional): 页码
- `limit` (number, optional): 每页数量

**响应**:
```json
{
  "ok": true,
  "data": {
    "invites": [
      {
        "id": "invite_id",
        "tokenHash": "token_hash（不返回原始token）",
        "status": "active",
        "customer": {
          "id": "customer_id",
          "nickname": "客户昵称"
        },
        "version": "fast",
        "quizVersion": "v1",
        "createdAt": "2024-01-01T00:00:00Z",
        "expiresAt": "2024-12-31T23:59:59Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: 只返回 `coachId === session.user.id` 的邀请（admin 可返回全部）

**审计写入点**:
- 无（读操作，不记录）

**幂等策略**:
- GET 请求，天然幂等

---

### 2.8 失效邀请链接

**路由**: `POST /api/coach/invites/:id/expire`

**路径参数**:
- `id` (string, required): 邀请 ID

**响应**:
```json
{
  "ok": true,
  "data": {
    "invite": {
      "id": "invite_id",
      "status": "expired",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权失效此邀请
- `NOT_FOUND`: 邀请不存在
- `BAD_REQUEST`: 邀请已失效或已完成

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `invite.coachId === session.user.id`（admin 可失效任何邀请）

**审计写入点**:
- `action: "invite.expire"`, `target_type: "invite"`, `target_id: invite_id`

**幂等策略**:
- 如果已失效，返回现有状态（幂等）

---

### 2.9 添加客户标签

**路由**: `POST /api/coach/customers/:id/tags`

**路径参数**:
- `id` (string, required): 客户 ID

**请求体**:
```json
{
  "tagKey": "coach:high_value"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "tag": {
      "id": "tag_id",
      "tagKey": "coach:high_value",
      "customerId": "customer_id",
      "coachId": "coach_id",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权为此客户添加标签
- `NOT_FOUND`: 客户不存在
- `CONFLICT`: 标签已存在
- `VALIDATION_ERROR`: 标签格式错误（必须以 `coach:` 开头）

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `customer.coachId === session.user.id`（admin 可为任何客户添加）

**审计写入点**:
- `action: "coach_tag.create"`, `target_type: "coach_tag"`, `target_id: tag_id`

**幂等策略**:
- 如果标签已存在，返回现有标签（幂等）

---

### 2.10 删除客户标签

**路由**: `DELETE /api/coach/customers/:id/tags`

**路径参数**:
- `id` (string, required): 客户 ID

**查询参数**:
- `tagKey` (string, required): 标签 key

**响应**:
```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 无权删除此客户的标签
- `NOT_FOUND`: 标签不存在

**RBAC 校验点**:
- 必须登录
- **严格校验 ownership**: `customer.coachId === session.user.id` 且 `tag.coachId === session.user.id`（admin 可删除任何标签）

**审计写入点**:
- `action: "coach_tag.delete"`, `target_type: "coach_tag"`, `target_id: tag_id`

**幂等策略**:
- 如果标签不存在，返回成功（幂等）

---

## 3. Admin 端接口

### 3.1 创建助教账号

**路由**: `POST /api/admin/coaches`

**请求体**:
```json
{
  "username": "coach_username",
  "password": "password123",
  "status": "active"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "coach_username",
      "role": "coach",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 非 admin
- `CONFLICT`: 用户名已存在
- `VALIDATION_ERROR`: 数据验证失败

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "user.create"`, `target_type: "user"`, `target_id: user_id`

**幂等策略**:
- 如果用户名已存在，返回错误（非幂等）

---

### 3.2 更新助教账号

**路由**: `PATCH /api/admin/coaches/:id`

**路径参数**:
- `id` (string, required): 用户 ID

**请求体**:
```json
{
  "password": "new_password",
  "status": "inactive"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user_id",
      "status": "inactive",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**错误码**:
- `UNAUTHORIZED`: 未登录
- `FORBIDDEN`: 非 admin
- `NOT_FOUND`: 用户不存在
- `VALIDATION_ERROR`: 数据验证失败

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`
- 禁止修改 admin 账号（只能修改 coach）

**审计写入点**:
- `action: "user.update"`, `target_type: "user"`, `target_id: user_id`

**幂等策略**:
- 支持重复更新（幂等）

---

### 3.3 SOP Definition CRUD

#### 3.3.1 创建 SOP Definition

**路由**: `POST /api/admin/sop/definition`

**请求体**:
```json
{
  "sopId": "sop_pre_conservative",
  "sopName": "保守型客户前期陪跑",
  "sopStage": "pre",
  "status": "active",
  "priority": 100,
  "stateSummary": "客户处于前期阶段，风险偏好保守",
  "coreGoal": "建立信任，了解真实需求",
  "strategyListJson": "[\"策略1\", \"策略2\", \"策略3\"]",
  "forbiddenListJson": "[\"禁止行为1\", \"禁止行为2\"]",
  "notes": "备注"
}
```

**响应**:
```json
{
  "ok": true,
  "data": {
    "sop": {
      "sopId": "sop_pre_conservative",
      "sopName": "保守型客户前期陪跑",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 3.3.2 获取 SOP Definition 列表

**路由**: `GET /api/admin/sop/definition`

**查询参数**:
- `sopStage` (string, optional): 筛选阶段
- `status` (string, optional): 筛选状态

**响应**:
```json
{
  "ok": true,
  "data": {
    "sops": [
      {
        "sopId": "sop_pre_conservative",
        "sopName": "保守型客户前期陪跑",
        "sopStage": "pre",
        "status": "active",
        "priority": 100
      }
    ]
  }
}
```

#### 3.3.3 获取 SOP Definition 详情

**路由**: `GET /api/admin/sop/definition/:id`

#### 3.3.4 更新 SOP Definition

**路由**: `PATCH /api/admin/sop/definition/:id`

#### 3.3.5 删除 SOP Definition

**路由**: `DELETE /api/admin/sop/definition/:id`

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "sop_definition.create|update|delete"`, `target_type: "sop_definition"`, `target_id: sop_id`

---

### 3.4 SOP Rule CRUD

**路由**:
- `POST /api/admin/sop/rule` - 创建
- `GET /api/admin/sop/rule` - 列表
- `GET /api/admin/sop/rule/:id` - 详情
- `PATCH /api/admin/sop/rule/:id` - 更新
- `DELETE /api/admin/sop/rule/:id` - 删除

**请求体示例（创建）**:
```json
{
  "ruleId": "rule_001",
  "sopId": "sop_pre_conservative",
  "requiredStage": "pre",
  "requiredTagsJson": "[\"image:conservative\", \"stability:high\"]",
  "excludedTagsJson": "[\"image:aggressive\"]",
  "confidence": 90,
  "status": "active"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "sop_rule.create|update|delete"`, `target_type: "sop_rule"`, `target_id: rule_id`

---

### 3.5 Coaching Stage CRUD

**路由**:
- `POST /api/admin/sop/stage` - 创建
- `GET /api/admin/sop/stage` - 列表
- `GET /api/admin/sop/stage/:id` - 详情
- `PATCH /api/admin/sop/stage/:id` - 更新
- `DELETE /api/admin/sop/stage/:id` - 删除

**请求体示例（创建）**:
```json
{
  "stageId": "pre",
  "stageName": "前期阶段",
  "stageDesc": "客户初次接触阶段",
  "uiColor": "#FF5733",
  "allowActions": "[\"建立信任\", \"了解需求\"]",
  "forbidActions": "[\"过度推销\", \"承诺收益\"]"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "coaching_stage.create|update|delete"`, `target_type: "coaching_stage"`, `target_id: stage_id`

---

### 3.6 SOP Stage Map CRUD

**路由**:
- `POST /api/admin/sop/stage-map` - 创建
- `GET /api/admin/sop/stage-map` - 列表
- `GET /api/admin/sop/stage-map/:id` - 详情
- `PATCH /api/admin/sop/stage-map/:id` - 更新
- `DELETE /api/admin/sop/stage-map/:id` - 删除

**请求体示例（创建）**:
```json
{
  "sopId": "sop_pre_conservative",
  "stageId": "pre",
  "isDefault": true,
  "remark": "默认映射"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "sop_stage_map.create|update|delete"`, `target_type: "sop_stage_map"`, `target_id: map_id`

---

### 3.7 Quiz CRUD

**路由**:
- `POST /api/admin/quiz` - 创建
- `GET /api/admin/quiz` - 列表
- `GET /api/admin/quiz/:id` - 详情
- `PATCH /api/admin/quiz/:id` - 更新
- `DELETE /api/admin/quiz/:id` - 删除

**请求体示例（创建）**:
```json
{
  "quizVersion": "v1",
  "version": "fast",
  "title": "快速测评 v1",
  "status": "active"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "quiz.create|update|delete"`, `target_type: "quiz"`, `target_id: quiz_id`

---

### 3.8 Questions CRUD

**路由**:
- `POST /api/admin/questions` - 创建
- `GET /api/admin/questions` - 列表（支持 quizId 筛选）
- `GET /api/admin/questions/:id` - 详情
- `PATCH /api/admin/questions/:id` - 更新
- `DELETE /api/admin/questions/:id` - 删除

**请求体示例（创建）**:
```json
{
  "quizId": "quiz_id",
  "orderNo": 1,
  "stem": "题目内容",
  "status": "active"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "question.create|update|delete"`, `target_type: "question"`, `target_id: question_id`

---

### 3.9 Options CRUD

**路由**:
- `POST /api/admin/options` - 创建
- `GET /api/admin/options` - 列表（支持 questionId 筛选）
- `GET /api/admin/options/:id` - 详情
- `PATCH /api/admin/options/:id` - 更新
- `DELETE /api/admin/options/:id` - 删除

**请求体示例（创建）**:
```json
{
  "questionId": "question_id",
  "orderNo": 1,
  "text": "选项内容",
  "scorePayloadJson": "{\"risk\": 10, \"return\": 20, \"liquidity\": 30}"
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- `action: "option.create|update|delete"`, `target_type: "option"`, `target_id: option_id`

---

### 3.10 获取审计日志

**路由**: `GET /api/admin/audit`

**查询参数**:
- `actorUserId` (string, optional): 筛选操作人
- `action` (string, optional): 筛选操作类型
- `targetType` (string, optional): 筛选目标类型
- `startDate` (string, optional): 开始日期
- `endDate` (string, optional): 结束日期
- `page` (number, optional): 页码
- `limit` (number, optional): 每页数量

**响应**:
```json
{
  "ok": true,
  "data": {
    "logs": [
      {
        "id": "log_id",
        "actorUser": {
          "id": "user_id",
          "username": "admin_user"
        },
        "action": "customer.create",
        "targetType": "customer",
        "targetId": "customer_id",
        "metaJson": "{\"key\": \"value\"}",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1000,
    "page": 1,
    "limit": 20
  }
}
```

**RBAC 校验点**:
- 必须登录
- **严格校验**: role 必须是 `admin`

**审计写入点**:
- 无（读操作，不记录）

**幂等策略**:
- GET 请求，天然幂等

---

## 最容易漏的 6 个校验点

1. **Customer Ownership**: 所有 coach 端客户相关操作必须校验 `customer.coachId === session.user.id`
2. **Invite Ownership**: 所有 coach 端邀请相关操作必须校验 `invite.coachId === session.user.id`
3. **Attempt Ownership**: 所有 coach 端测评相关操作必须校验 `attempt.coachId === session.user.id`
4. **Token 越权**: client 端所有操作必须校验 `token → invite` 存在且属于正确的客户
5. **Admin-only CRUD**: 所有配置管理接口（SOP、题库）必须校验 `role === 'admin'`
6. **Completed 禁止答题**: `invite.status === 'completed'` 时禁止 `answer` 和 `submit`，只允许读 `result`

