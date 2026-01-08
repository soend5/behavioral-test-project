# PRODUCT_BOUNDARY_AND_COMPLIANCE

## 定位

这是“防跑偏文档”，用于产品、助教、内容、运营。明确“能说什么/不能说什么”的合规边界，避免产品演进中偏离非投顾定位。

---

## 本产品“明确不是什么”

### 不是投资顾问

- 不提供投资建议
- 不提供资产配置方案
- 不提供买卖决策
- 不承诺收益或回报

### 不是交易信号系统

- 不输出交易信号
- 不提示买卖时机
- 不推荐标的（个股/基金/期货等）
- 不提供点位建议

### 不是自动化交易 / AI 决策

- 不执行交易
- 不做自动化决策
- 不提供“跟单”功能
- 不输出“照这个操作”的指令

---

## 测评输出的合法定义

### 行为结构画像

**输出内容**：
- 6 种 archetype（`rule_executor`、`emotion_driven`、`experience_reliant`、`opportunity_seeker`、`defensive_observer`、`impulsive_reactor`）
- 每个 archetype 的描述：`titleCn`、`oneLinerCn`、`traitsCn`、`risksCn`、`coachGuidanceCn`
- 来源：`data/seed/archetypes_v1.json`，存储在 `archetypes` 表

**合法用途**：
- 帮助客户理解自己的交易行为结构
- 帮助助教理解客户的认知与执行模式
- 作为沟通与陪跑的参考信息

**禁止用途**：
- 作为“投资建议”的依据
- 作为“应该怎么做”的指令
- 作为“收益预测”的输入

### 执行稳定度

**输出内容**（仅 fast 测评）：
- `stability: high`（topVoteCount >= 5）
- `stability: medium`（topVoteCount >= 3）
- `stability: low`（topVoteCount < 3）

**合法用途**：
- 快速判断客户画像投票的集中度
- 作为沟通策略的参考（稳定度低可能需要更多引导）

**禁止用途**：
- 作为“交易能力”的判断
- 作为“收益预期”的依据

### 沟通与陪跑参考信息

**输出内容**：
- `realtime_panel`：阶段、状态判断、唯一目标、推荐沟通策略、禁用行为
- 来源：SOP 匹配引擎（`lib/sop-matcher.ts`）

**合法用途**：
- 给助教：理解客户当前阶段与沟通要点
- 给客户：理解自己的行为结构与稳定度
- 给系统：匹配 SOP（基于 stage + tags）

**禁止用途**：
- 作为“投资建议”
- 作为“交易指令”
- 作为“收益承诺”的依据

---

## 明确禁止的内容（清单式）

### 收益承诺

**禁止表达**：
- “保证收益”
- “稳赚不赔”
- “预期收益 X%”
- “年化收益 X%”
- “回本时间 X 天/月”

**允许表达**：
- “不承诺收益”
- “结果不构成收益保证”

### 盈利暗示

**禁止表达**：
- “跟着做就能赚钱”
- “这个方法能盈利”
- “成功率 X%”
- “胜率 X%”

**允许表达**：
- “测评结果用于理解行为结构，不预测交易结果”
- “SOP 是沟通策略，不是交易建议”

### 个股 / 点位 / 买卖建议

**禁止表达**：
- “买入 XXX 股票”
- “卖出 XXX 股票”
- “在 XXX 点位买入/卖出”
- “现在可以买/卖”
- “建议持有/清仓”

**允许表达**：
- “测评结果不包含任何标的推荐”
- “不提供买卖时机建议”

### “跟我做”“照这个操作”

**禁止表达**：
- “照这个 SOP 操作”
- “按这个策略交易”
- “跟着做就行”
- “执行这个方案”

**允许表达**：
- “SOP 是沟通策略，不是交易指令”
- “测评结果用于理解行为结构，不构成操作建议”

---

## SOP 的边界定义

### SOP = 沟通策略 / 陪跑策略

**SOP 的合法内容**（`sop_definition` 表）：
- `stateSummary`：状态判断（如“第一段认知建立期”）
- `coreGoal`：唯一目标（如“建立信任，了解客户真实需求”）
- `strategyList`：推荐沟通策略（如“建立信任”“了解需求”“提供方案”）
- `forbiddenList`：禁用行为（如“过度推销”“承诺收益”“催促决策”）

**SOP 的匹配逻辑**（`lib/sop-matcher.ts`）：
- 输入：`stage`（pre/mid/post）+ `tags[]`（系统标签 + 助教标签）
- 匹配规则：`required_stage=stage`，`required_tags` 全包含，`excluded_tags` 不包含
- 排序：`priority desc`，`confidence desc`
- 输出：Top1 SOP 或默认 panel

### SOP ≠ 投资建议

**SOP 不是**：
- 投资建议
- 交易指令
- 买卖时机
- 标的推荐

**SOP 是**：
- 沟通策略（如何与客户沟通）
- 陪跑策略（如何陪跑客户）
- 行为边界（什么不能做）

### realtime_panel 的正确使用方式

**给助教**：
- 理解客户当前阶段（pre/mid/post）
- 理解客户的状态判断（`stateSummary`）
- 理解沟通的唯一目标（`coreGoal`）
- 理解推荐沟通策略（`strategyList`，最多 3 条）
- 理解禁用行为（`forbiddenList`）

**给客户**：
- 理解自己的行为结构画像
- 理解自己的执行稳定度（fast）
- 理解自己的六维结构分数（pro）
- 理解自己的阶段判定（pre/mid/post）

**给系统**：
- 匹配 SOP（基于 stage + tags）
- 生成 realtime_panel（`app/api/coach/customers/[id]/route.ts`）

**禁止使用**：
- 作为“投资建议”的依据
- 作为“交易指令”的来源
- 作为“收益承诺”的支撑

---

## 助教行为边界（当前系统假设）

### 助教只能查看自己客户

**权限边界**（`lib/authz.ts`）：
- `requireCoachOwnsCustomer`：验证 `customer.coachId === session.user.id`
- `requireCoachOwnsInvite`：验证 `invite.coachId === session.user.id`
- `requireCoachOwnsAttempt`：验证 `attempt.coachId === session.user.id`
- Admin 可访问所有资源（用于审计与配置）

**数据隔离**：
- Coach 查询客户列表时自动过滤 `coachId`（`app/api/coach/customers/route.ts`）
- Coach 查询邀请列表时自动过滤 `coachId`（`app/api/coach/invites/route.ts`）

### 助教标签（coach:*）的使用原则

**标签格式**：
- 必须以 `coach:` 开头（`app/api/coach/customers/[id]/tags/route.ts`）
- 示例：`coach:high_value`、`coach:risk_averse`、`coach:active_trader`

**标签用途**：
- 参与 SOP 匹配（与系统标签合并，`app/api/coach/customers/[id]/route.ts`）
- 用于助教主观标记客户特征
- 用于沟通策略的个性化调整

**标签边界**：
- 不用于“投资建议”的标记
- 不用于“交易指令”的标记
- 不用于“收益承诺”的标记

### 不允许绕过系统给出交易建议

**禁止行为**：
- 助教在 realtime_panel 之外直接给出交易建议
- 助教在沟通中承诺收益
- 助教在沟通中推荐标的
- 助教在沟通中提供买卖时机

**允许行为**：
- 助教使用 realtime_panel 的沟通策略
- 助教基于测评结果理解客户
- 助教基于 SOP 进行陪跑

---

## 数据与隐私的当前事实

### Invite token hash

**实现**（`lib/token.ts`）：
- Token 生成：`crypto.randomBytes(32).toString("hex")`
- Token 哈希：`crypto.createHash("sha256").update(token).digest("hex")`
- 存储：`invites.token_hash`（SHA256 hash）
- 返回：创建邀请时返回一次 token 明文，之后任何接口不返回

**安全边界**：
- Token 验证通过 `lib/authz.ts::requireInviteByToken`
- Token 过期检查：`invites.expiresAt` 与 `invites.status`

### Attempt 数据结构

**存储**（`prisma/schema.prisma`）：
- `answersJson`：答案映射 `{ questionId: optionId }`
- `scoresJson`：分数 JSON（fast：archetypeVotes + dimensionRaw；pro：dimensions + dimensionsRaw）
- `tagsJson`：标签数组（系统标签 + phase 标签）
- `stage`：阶段（pre/mid/post，pro 测评）
- `resultSummaryJson`：结果摘要（完整输出结构）

**数据归属**：
- `attempt.customerId`：客户 ID
- `attempt.coachId`：助教 ID（用于权限控制）
- `attempt.inviteId`：邀请 ID（用于 token 验证）

### ownership + audit_log

**数据归属**（`prisma/schema.prisma`）：
- `customer.coachId`：客户归属助教
- `invite.coachId`：邀请归属助教
- `attempt.coachId`：测评归属助教
- `coach_tag.coachId`：助教标签归属助教

**审计日志**（`lib/audit.ts`）：
- 所有关键操作写入 `audit_log`（`actorUserId`、`action`、`targetType`、`targetId`、`metaJson`）
- Admin 可通过 `/admin/audit` 查看
- 示例操作：`attempt.start`、`attempt.answer`、`client.submit_attempt`、`coach.create_customer`、`coach.create_invite`、`coach.create_tag`、`admin.create_sop`

### 当前未提供客户自助删除

**事实**：
- 当前系统未提供客户自助删除数据的功能
- 客户数据由助教管理（创建、更新、查看）
- 如需删除，需通过助教或 Admin 操作

**数据保留**：
- Attempt 数据永久保留（用于时间线分析）
- Customer 数据永久保留（用于客户管理）
- Invite 数据永久保留（用于审计）

---

## 合规提示位要求

### Client 端

**落地页**（`app/t/[token]/page.tsx`）：
```
本测评用于生成交易行为结构画像与沟通建议，不构成投资顾问服务或任何买卖建议，不承诺收益。
```

**结果页**（`app/t/[token]/result/page.tsx`）：
```
结果为交易行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。
```

### Coach 端

**客户详情页 realtime_panel**（`app/coach/clients/[id]/page.tsx`）：
```
提示：以下为沟通策略建议与行为结构画像参考，不构成投资顾问服务或任何买卖建议，不承诺收益。
```

---

## 关联实现/数据位置

- **合规提示位**：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`
- **内容资产**：`data/seed/*.json`
- **结果结构**：`lib/scoring.ts`
- **SOP 规则**：`lib/sop-matcher.ts`
- **权限门禁**：`lib/authz.ts`
- **审计日志**：`lib/audit.ts`
- **数据模型**：`prisma/schema.prisma`
