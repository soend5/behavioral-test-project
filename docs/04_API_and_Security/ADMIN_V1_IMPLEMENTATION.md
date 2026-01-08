# Admin v1 实现总结

## 实现的 Route 文件路径列表

### 题库管理

1. `app/api/admin/quiz/route.ts` - GET /api/admin/quiz, POST /api/admin/quiz
2. `app/api/admin/quiz/[id]/route.ts` - PATCH /api/admin/quiz/:id

3. `app/api/admin/questions/route.ts` - GET /api/admin/questions, POST /api/admin/questions
4. `app/api/admin/questions/[id]/route.ts` - PATCH /api/admin/questions/:id

5. `app/api/admin/options/route.ts` - GET /api/admin/options, POST /api/admin/options
6. `app/api/admin/options/[id]/route.ts` - PATCH /api/admin/options/:id

### SOP 配置（4 张表）

7. `app/api/admin/sop/definition/route.ts` - GET, POST /api/admin/sop/definition
8. `app/api/admin/sop/definition/[id]/route.ts` - PATCH, DELETE /api/admin/sop/definition/:id

9. `app/api/admin/sop/rule/route.ts` - GET, POST /api/admin/sop/rule
10. `app/api/admin/sop/rule/[id]/route.ts` - PATCH, DELETE /api/admin/sop/rule/:id

11. `app/api/admin/sop/stage/route.ts` - GET, POST /api/admin/sop/stage
12. `app/api/admin/sop/stage/[id]/route.ts` - PATCH, DELETE /api/admin/sop/stage/:id

13. `app/api/admin/sop/stage-map/route.ts` - GET, POST /api/admin/sop/stage-map
14. `app/api/admin/sop/stage-map/[id]/route.ts` - PATCH, DELETE /api/admin/sop/stage-map/:id

### 审计

15. `app/api/admin/audit/route.ts` - GET /api/admin/audit

### Admin 页面

16. `app/admin/login/page.tsx` - /admin/login（已存在，可复用）
17. `app/admin/quiz/page.tsx` - /admin/quiz
18. `app/admin/questions/page.tsx` - /admin/questions
19. `app/admin/options/page.tsx` - /admin/options
20. `app/admin/sop/page.tsx` - /admin/sop
21. `app/admin/audit/page.tsx` - /admin/audit

---

## 每个 Admin 页面对应调用的接口

### /admin/quiz
- **调用接口**: `GET /api/admin/quiz`
- **功能**: 显示题库列表（版本、问卷版本、标题、状态、题目数）

### /admin/questions
- **调用接口**: `GET /api/admin/questions?quiz_id=...`（可选筛选）
- **功能**: 显示题目列表（顺序、题目、状态、选项数）

### /admin/options
- **调用接口**: `GET /api/admin/options?question_id=...`（可选筛选）
- **功能**: 显示选项列表（顺序、选项文本、题目）

### /admin/sop
- **调用接口**: `GET /api/admin/sop/definition`
- **功能**: 显示 SOP Definition 列表（SOP ID、名称、阶段、优先级、状态、规则数）

### /admin/audit
- **调用接口**: `GET /api/admin/audit?page=...&limit=50`
- **功能**: 显示审计日志列表（时间、操作人、操作、目标类型、目标ID）

---

## 每个接口调用的门禁函数

### 所有 /api/admin/** 接口
- **统一使用**: `requireAdmin()` - 要求 admin 角色
- **校验点**:
  - ✅ 必须登录（session 存在）
  - ✅ role 必须是 `admin`
  - ✅ coach 访问必须返回 403 FORBIDDEN
  - ✅ client token 永远不能访问（通过 middleware 保护）

---

## 题库"版本不可破坏"的实现方式

### 实现逻辑

**位置**: `app/api/admin/quiz/[id]/route.ts` PATCH 方法

**检查步骤**:
1. 获取现有 quiz 的 `quizVersion` 和 `version`
2. 检查是否有 `invites` 使用该 `quizVersion` + `version`：
   ```typescript
   const inviteCount = await prisma.invite.count({
     where: {
       quizVersion: quiz.quizVersion,
       version: quiz.version,
     },
   });
   ```
3. 检查是否有 `attempts` 使用该 `quizVersion` + `version`：
   ```typescript
   const attemptCount = await prisma.attempt.count({
     where: {
       quizVersion: quiz.quizVersion,
       version: quiz.version,
     },
   });
   ```
4. 如果 `inviteCount > 0` 或 `attemptCount > 0`：
   - ❌ 禁止修改 `version` 和 `quizVersion`（返回错误）
   - ✅ 只允许修改 `title` 和 `status`
5. 如果未被使用：
   - ✅ 允许修改所有字段

**错误提示**:
```
"该 quiz_version (v1) 已被使用，禁止修改 version 或 quizVersion。请创建新版本。"
```

**建议流程**:
- 创建新版本：POST /api/admin/quiz，使用新的 `quizVersion`（如 v1.1）
- 旧版本保持不动，已完成测评不受影响

---

## SOP 配置如何影响 realtime_panel 的数据流

### 数据流路径

1. **Admin 修改 SOP 配置** → 写入数据库
   - 修改 `sop_definition` 表
   - 修改 `sop_rule` 表
   - 修改 `coaching_stage` 表
   - 修改 `sop_stage_map` 表

2. **Coach 查看客户详情** → `/api/coach/customers/:id`
   - 获取 `latest_attempt`（如果有）
   - 获取 `coach_tags`
   - 合并所有 tags：`systemTags + coachTags`

3. **调用 SOP 匹配引擎** → `lib/sop-matcher.ts`
   - 输入：`stage`（从 attempt.stage 获取，默认 "pre"）+ `tags[]`
   - 查询 `sop_rule` 表：
     - `required_stage = stage`
     - `status = 'active'`
     - `sop.status = 'active'`
   - 匹配规则：
     - `required_tags` 全包含在 tags 中
     - `excluded_tags` 不包含在 tags 中
   - 排序：`sop.priority desc` → `rule.confidence desc`
   - 返回 Top1 匹配的 SOP

4. **返回 realtime_panel** → Coach 页面显示
   - `stage`: SOP 的阶段
   - `stateSummary`: SOP 的状态摘要
   - `coreGoal`: SOP 的核心目标
   - `strategyList`: SOP 的策略列表（最多3条）
   - `forbiddenList`: SOP 的禁用列表

### 实时生效

- ✅ **无需重启**：修改 SOP 配置后，下次 Coach 查看客户详情时立即生效
- ✅ **完全走 DB**：所有 SOP 文案都从数据库读取，代码中不写死
- ✅ **匹配逻辑统一**：所有匹配都通过 `lib/sop-matcher.ts` 完成

### 默认 Panel（无 attempt 时）

- 调用 `getDefaultRealtimePanel(prisma, "pre")`
- 查找 `coaching_stage` 表获取默认阶段信息
- 查找 `sop_stage_map.is_default = true` 的默认 SOP
- 如果没有默认 SOP，使用 `coaching_stage` 的基础信息

---

## Audit Log 写入点清单

### 题库管理

| 操作 | Action | Target Type | 位置 |
|------|--------|-------------|------|
| 创建题库 | `admin.create_quiz` | `quiz` | `app/api/admin/quiz/route.ts` POST |
| 更新题库 | `admin.update_quiz` | `quiz` | `app/api/admin/quiz/[id]/route.ts` PATCH |

### 题目管理

| 操作 | Action | Target Type | 位置 |
|------|--------|-------------|------|
| 创建题目 | `admin.create_question` | `question` | `app/api/admin/questions/route.ts` POST |
| 更新题目 | `admin.update_question` | `question` | `app/api/admin/questions/[id]/route.ts` PATCH |

### 选项管理

| 操作 | Action | Target Type | 位置 |
|------|--------|-------------|------|
| 创建选项 | `admin.create_option` | `option` | `app/api/admin/options/route.ts` POST |
| 更新选项 | `admin.update_option` | `option` | `app/api/admin/options/[id]/route.ts` PATCH |

### SOP 配置

| 操作 | Action | Target Type | 位置 |
|------|--------|-------------|------|
| 创建 SOP | `admin.create_sop` | `sop_definition` | `app/api/admin/sop/definition/route.ts` POST |
| 更新 SOP | `admin.update_sop` | `sop_definition` | `app/api/admin/sop/definition/[id]/route.ts` PATCH |
| 删除 SOP | `admin.delete_sop` | `sop_definition` | `app/api/admin/sop/definition/[id]/route.ts` DELETE |
| 创建 SOP Rule | `admin.create_sop_rule` | `sop_rule` | `app/api/admin/sop/rule/route.ts` POST |
| 更新 SOP Rule | `admin.update_sop_rule` | `sop_rule` | `app/api/admin/sop/rule/[id]/route.ts` PATCH |
| 删除 SOP Rule | `admin.delete_sop_rule` | `sop_rule` | `app/api/admin/sop/rule/[id]/route.ts` DELETE |
| 创建 Stage | `admin.create_stage` | `coaching_stage` | `app/api/admin/sop/stage/route.ts` POST |
| 更新 Stage | `admin.update_stage` | `coaching_stage` | `app/api/admin/sop/stage/[id]/route.ts` PATCH |
| 删除 Stage | `admin.delete_stage` | `coaching_stage` | `app/api/admin/sop/stage/[id]/route.ts` DELETE |
| 创建 Stage Map | `admin.create_stage_map` | `sop_stage_map` | `app/api/admin/sop/stage-map/route.ts` POST |
| 更新 Stage Map | `admin.update_stage_map` | `sop_stage_map` | `app/api/admin/sop/stage-map/[id]/route.ts` PATCH |
| 删除 Stage Map | `admin.delete_stage_map` | `sop_stage_map` | `app/api/admin/sop/stage-map/[id]/route.ts` DELETE |

---

## 验收方式

### 1. 题库版本保护

```bash
# 1. 创建 quiz v1
curl -X POST "http://localhost:3000/api/admin/quiz" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "version": "fast",
    "quizVersion": "v1",
    "title": "快速测评 v1"
  }'

# 2. 创建 invite 使用该 quiz（模拟已使用）
# （需要先有 customer 和 invite）

# 3. 尝试修改 quiz 的 version（应该失败）
curl -X PATCH "http://localhost:3000/api/admin/quiz/QUIZ_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "version": "pro"
  }'
# 预期: 400 VALIDATION_ERROR "该 quiz_version (v1) 已被使用，禁止修改 version 或 quizVersion。请创建新版本。"

# 4. 创建新版本 v1.1（应该成功）
curl -X POST "http://localhost:3000/api/admin/quiz" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "version": "fast",
    "quizVersion": "v1.1",
    "title": "快速测评 v1.1"
  }'
```

### 2. SOP 配置实时生效

```bash
# 1. 创建 SOP Definition
curl -X POST "http://localhost:3000/api/admin/sop/definition" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "sopId": "sop_pre_conservative",
    "sopName": "保守型客户前期陪跑",
    "sopStage": "pre",
    "priority": 100,
    "stateSummary": "客户处于前期阶段，风险偏好保守",
    "coreGoal": "建立信任，了解真实需求",
    "strategyListJson": "[\"策略1\", \"策略2\", \"策略3\"]",
    "forbiddenListJson": "[\"禁止行为1\", \"禁止行为2\"]"
  }'

# 2. 创建 SOP Rule
curl -X POST "http://localhost:3000/api/admin/sop/rule" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "ruleId": "rule_001",
    "sopId": "sop_pre_conservative",
    "requiredStage": "pre",
    "requiredTagsJson": "[\"image:conservative\", \"stability:high\"]",
    "excludedTagsJson": "[]",
    "confidence": 90
  }'

# 3. Coach 查看客户详情（应该匹配到新创建的 SOP）
curl "http://localhost:3000/api/coach/customers/CUSTOMER_ID" \
  -H "Cookie: next-auth.session-token=COACH_SESSION"
# 预期: realtime_panel 显示新创建的 SOP 内容

# 4. 修改 SOP（应该立即生效）
curl -X PATCH "http://localhost:3000/api/admin/sop/definition/sop_pre_conservative" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{
    "coreGoal": "修改后的核心目标"
  }'

# 5. Coach 再次查看客户详情（应该看到修改后的内容）
curl "http://localhost:3000/api/coach/customers/CUSTOMER_ID" \
  -H "Cookie: next-auth.session-token=COACH_SESSION"
# 预期: realtime_panel.coreGoal 显示 "修改后的核心目标"
```

### 3. RBAC 验证

```bash
# 1. Coach 访问 admin 接口（应该 403）
curl "http://localhost:3000/api/admin/quiz" \
  -H "Cookie: next-auth.session-token=COACH_SESSION"
# 预期: 403 FORBIDDEN

# 2. Admin 访问 admin 接口（应该成功）
curl "http://localhost:3000/api/admin/quiz" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION"
# 预期: 200 OK
```

### 4. 审计日志

```bash
# 1. Admin 创建 quiz
curl -X POST "http://localhost:3000/api/admin/quiz" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION" \
  -d '{"version": "fast", "quizVersion": "v1", "title": "测试"}'

# 2. 查看审计日志
curl "http://localhost:3000/api/admin/audit?action=admin.create_quiz" \
  -H "Cookie: next-auth.session-token=ADMIN_SESSION"
# 预期: 能看到 admin.create_quiz 记录
```

---

## 验收检查清单

- [ ] 能创建 quiz v1（fast/pro）
- [ ] 能给 quiz 添加题目与选项
- [ ] 能创建 quiz v1.1，不影响 v1 已完成测评
- [ ] 已被使用的 quiz_version：PATCH 不允许破坏式修改（应返回错误）
- [ ] 能 CRUD 四张 SOP 表
- [ ] 修改 SOP 后，Coach 客户详情页 realtime_panel 能立刻体现变化
- [ ] coach 调用任一 /api/admin/** → 403
- [ ] admin 登录后才能访问 admin 页面与接口
- [ ] 任一 admin 修改动作都能在 audit 表中查到

