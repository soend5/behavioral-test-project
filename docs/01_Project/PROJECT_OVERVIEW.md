# PROJECT_OVERVIEW

## 一句话定位

本系统是一个**交易行为结构测评与助教陪跑工具**，包含：
- **Client 端**：被邀请客户通过 token 链接完成 fast/pro 测评，获得行为结构画像与阶段判定
- **Coach 端**：助教后台（轻 CRM + SOP 实时面板），只能查看自己名下客户，基于测评结果与助教标签匹配 SOP 沟通策略
- **Admin 端**：总后台配置（题库、SOP、内容资产、账号、审计日志）

**明确不是**：投资顾问、交易信号系统、自动化交易/AI 决策工具。

---

## 系统整体结构（分层）

### Client（被邀请客户）

**路由**：
- `/t/[token]`：邀请落地页（解析 token，显示邀请信息与合规提示）
- `/t/[token]/quiz`：测评作答页（start attempt → 答题 → submit）
- `/t/[token]/result`：结果查看页（显示 tags、stage、resultSummary）

**特点**：
- 无账号、无登录
- 一人一链（每个 invite 生成唯一 token）
- Token 只存 hash 到数据库（`invites.token_hash`），任何接口不返回 token 明文
- 状态机：`active` → `entered` → `completed` / `expired`

**API 端点**：
- `GET /api/public/invite/resolve?token=xxx`：解析邀请信息
- `POST /api/attempt/start`：启动测评（幂等）
- `GET /api/quiz?token=xxx`：获取题目列表
- `POST /api/attempt/answer`：保存答案（累积写入）
- `POST /api/attempt/submit`：提交测评（幂等，触发 scoring）
- `GET /api/public/attempt/result?token=xxx`：获取结果

### Coach（助教后台）

**路由**：
- `/coach/login`：登录页（NextAuth）
- `/coach/dashboard`：客户列表（创建客户、查看最新测评状态）
- `/coach/invites`：邀请列表（创建邀请、失效邀请）
- `/coach/invites/new`：创建邀请页
- `/coach/clients/[id]`：客户详情页（聚合：customer + latest_attempt + attempt_timeline + coach_tags + realtime_panel）

**权限边界**：
- 只能查看自己名下客户（`customer.coachId === session.user.id`）
- 只能为自己的客户创建邀请
- 只能为自己的客户添加/删除助教标签（`coach:*` 前缀）
- Admin 可访问所有资源（`lib/authz.ts` 中的 `requireCoachOwns*` 函数）

**API 端点**：
- `GET /api/coach/me`：获取当前助教信息
- `POST /api/coach/customers`：创建客户
- `GET /api/coach/customers`：获取客户列表（自动过滤 `coachId`）
- `GET /api/coach/customers/[id]`：获取客户详情（含 realtime_panel）
- `PATCH /api/coach/customers/[id]`：更新客户信息
- `POST /api/coach/invites`：创建邀请（自动过期同客户同版本旧 invite）
- `GET /api/coach/invites`：获取邀请列表（自动过滤 `coachId`）
- `POST /api/coach/invites/[id]/expire`：失效邀请
- `POST /api/coach/customers/[id]/tags`：添加助教标签
- `DELETE /api/coach/customers/[id]/tags?tagKey=xxx`：删除助教标签

### Admin（总后台）

**路由**：
- `/admin/login`：登录页（NextAuth）
- `/admin`：Dashboard（内容资产状态概览）
- `/admin/settings`：系统设置（助教创建邀请默认 quizVersion）
- `/admin/quiz`：题库管理（可编辑/可删除；删除需确认）
- `/admin/questions`：题目管理（可编辑/可删除）
- `/admin/options`：选项管理（可编辑/可删除）
- `/admin/archetypes`：画像文案（可编辑）
- `/admin/training-handbook`：7 天内训（可编辑）
- `/admin/methodology`：SOP 精修方法论（可编辑）
- `/admin/sop`：SOP 配置 CRUD（Definition / Rule / Stage / StageMap）
- `/admin/coaches`：助教账号管理
- `/admin/audit`：审计日志查看

**权限边界**：
- 必须 `role === 'admin'`（`middleware.ts` + `lib/authz.ts`）
- 可访问所有资源（coach 的客户、邀请、attempt）
- 可 CRUD 所有内容资产与 SOP 配置

**API 端点**：
- 所有 `/api/admin/*` 路由（25+ 个端点，详见 `app/api/admin/`）

---

## 核心业务闭环（文字流程图）

```
1. 创建客户
   Coach → POST /api/coach/customers
   → 创建 Customer（coachId 自动绑定）

2. 创建邀请
   Coach → POST /api/coach/invites
   → 生成 token（SHA256 hash 存库）
   → 创建 Invite（status='active'）
   → 返回 token 明文（仅一次）与完整 URL

3. 客户测评
   Client → GET /t/[token]
   → POST /api/attempt/start（幂等：重复调用返回相同 attemptId）
   → Invite.status: 'active' → 'entered'
   → 创建 Attempt（submittedAt=null）

   Client → POST /api/attempt/answer（可多次调用，累积写入 answersJson）
   → 验证题目/选项归属与状态

   Client → POST /api/attempt/submit（幂等：并发安全）
   → 调用 lib/scoring.ts::calculateScores()
   → 计算 scoresJson / tagsJson / stage / resultSummaryJson
   → Attempt.submittedAt = now()
   → Invite.status: 'entered' → 'completed'

4. Attempt → Scoring → Tags
   lib/scoring.ts 职责：
   - fast：画像投票（6 个 archetype）→ primaryArchetype
       稳定度（high/medium/low，基于 topVoteCount）
       标签：image:* + stability:* + phase:fast_completed + option tags
   - pro：六维分数（0-100 归一）→ dimensions
       阶段判定（pre/mid/post，基于阈值规则）
       标签：image:* + phase:pro_completed + option tags

5. Tags → SOP 匹配 → realtime_panel
   Coach → GET /api/coach/customers/[id]
   → 聚合：latestAttempt.tagsJson + coachTags（coach:*）
   → 调用 lib/sop-matcher.ts::matchSOP(stage, allTags)
   → 匹配规则：required_stage=stage，required_tags 全包含，excluded_tags 不包含
   → 排序：priority desc，confidence desc
   → 返回 Top1 SOP 或默认 panel（CoachingStage + 默认 SOP 映射）
   → realtime_panel：{ stage, stateSummary, coreGoal, strategyList, forbiddenList }

6. realtime_panel 展示
   app/coach/clients/[id]/page.tsx
   → 显示阶段、状态判断、唯一目标、推荐沟通策略（最多 3 条）、禁用行为
   → 顶部合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益
```

---

## fast / pro 的角色差异

### fast 测评

**定位**：快速判断结构与稳定度

**题目数量**：9 题（`data/seed/quiz_fast_v1.json`）

**输出结构**：
- `archetypeVotes`：6 个画像的投票数
- `primaryArchetype`：得票最多的画像（`image:rule_executor` 等）
- `stability`：`high`（topVoteCount >= 5）/ `medium`（>= 3）/ `low`（< 3）
- `dimensionRaw`：六维原始分数（未归一）
- `tags`：`image:*` + `stability:*` + `phase:fast_completed` + 选项自带 tags

**适用场景**：初次接触、快速筛选、稳定度初判

### pro 测评

**定位**：六维行为结构 + 阶段判定

**题目数量**：18 题（`data/seed/quiz_pro_v1.json`，按 6 个维度各 3 题组织）

**输出结构**：
- `dimensions`：六维分数（0-100 归一）
  - `rule_dependence`：规则依赖度
  - `emotion_involvement`：情绪介入度
  - `experience_reliance`：经验依赖度
  - `opportunity_sensitivity`：机会敏感度
  - `risk_defense`：风险防御度
  - `action_consistency`：行动一致性
- `stage`：`pre` / `mid` / `post`（基于维度阈值判定）
- `archetypeVotes`：画像投票数（用于 primaryArchetype）
- `tags`：`image:*` + `phase:pro_completed` + 选项自带 tags

**适用场景**：深度分析、阶段判定、SOP 匹配输入

**与 fast 的关系**：
- 可独立使用，也可作为 fast 的后续深化
- 同一客户可多次测评（fast 或 pro），形成 attempt_timeline

---

## 合规与风险控制总览

### 输出边界

**不输出**：
- 收益预测
- 点位建议
- 标的推荐（个股/基金/期货等）
- 买卖时机

**输出内容**：
- 行为结构画像（6 种 archetype）
- 执行稳定度（fast）
- 六维结构分数（pro）
- 阶段判定（pre/mid/post）
- 沟通与陪跑参考信息（SOP）

### SOP 的边界定义

**SOP = 沟通策略 / 陪跑策略**

**SOP ≠ 投资建议**

- `strategyList`：推荐沟通策略（如“建立信任”“了解需求”）
- `forbiddenList`：禁用行为（如“过度推销”“承诺收益”）
- `coreGoal`：唯一目标（如“建立信任，了解客户真实需求”）

**realtime_panel 的正确使用方式**：
- 给助教：理解客户当前阶段与沟通要点
- 给客户：理解自己的行为结构与稳定度
- 给系统：匹配 SOP（基于 stage + tags）

### 数据归属与权限原则

**coach ownership**：
- 客户数据归属创建该客户的助教（`customer.coachId`）
- 助教只能查看自己名下客户（`lib/authz.ts::requireCoachOwnsCustomer`）
- Admin 可访问所有资源（用于审计与配置）

**token 安全**：
- Token 只存 hash（SHA256）到数据库
- 任何接口不返回 token 明文（除创建邀请时返回一次）
- Token 验证通过 `lib/authz.ts::requireInviteByToken`

**审计日志**：
- 所有关键操作写入 `audit_log`（`lib/audit.ts::writeAudit`）
- Admin 可通过 `/admin/audit` 查看

**当前未提供**：
- 客户自助删除数据（如属事实，需注明）
- 数据导出功能（批量导出客户/测评数据）

---

## 从哪里开始看文档

### 新成员快速上手

1. **本文档（PROJECT_OVERVIEW）**：了解系统整体结构与角色
2. **`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`**：了解合规边界与禁止事项
3. **`docs/02_Product/ASSESSMENT_DESIGN.md`**：了解测评设计原理
4. **`docs/03_Architecture/FRONTEND_ROUTES_AND_PAGES.md`**：了解前端路由与页面
5. **`docs/04_API_and_Security/API_SPEC.md`**：了解 API 规范

### 开发人员

1. **`prisma/schema.prisma`**：数据模型
2. **`lib/authz.ts`**：权限门禁
3. **`lib/scoring.ts`**：打分逻辑
4. **`lib/sop-matcher.ts`**：SOP 匹配引擎
5. **`app/api/`**：API 实现

### 产品/内容人员

1. **`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`**：合规边界
2. **`docs/02_Product/ASSESSMENT_DESIGN.md`**：测评设计
3. **`data/seed/quiz_fast_v1.json`**：fast 题库
4. **`data/seed/quiz_pro_v1.json`**：pro 题库
5. **`docs/06_Content_and_Assets/QUIZ_CONTENT_GUIDE.md`**：题库内容规范

---

## 关联实现/数据位置

- **路由与页面**：`app/`
- **API**：`app/api/`
- **门禁**：`lib/authz.ts`、`middleware.ts`
- **数据模型**：`prisma/schema.prisma`
- **内容资产**：`data/seed/*.json`
- **打分逻辑**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **审计日志**：`lib/audit.ts`
