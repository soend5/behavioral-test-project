# ASSESSMENT_DESIGN

## 定位

这是“为什么你们的测评这样设计”的说明文档，给内容/产品/智能体。描述测评体系设计：维度/题型/计分/分层输出结构，以及 fast/pro 的差异与演进策略。

---

## 设计目标

### 不预测结果

**核心原则**：
- 测评不预测交易结果
- 测评不预测收益
- 测评不预测胜率

**测评目标**：
- 识别行为结构（6 种 archetype）
- 识别执行稳定度（fast）
- 识别六维结构分数（pro）
- 识别阶段（pre/mid/post，pro）

### 识别结构与稳定性

**结构识别**：
- 6 种 archetype：`rule_executor`、`emotion_driven`、`experience_reliant`、`opportunity_seeker`、`defensive_observer`、`impulsive_reactor`
- 六维结构（pro）：`rule_dependence`、`emotion_involvement`、`experience_reliance`、`opportunity_sensitivity`、`risk_defense`、`action_consistency`

**稳定性识别**（fast）：
- `stability: high`（topVoteCount >= 5）
- `stability: medium`（topVoteCount >= 3）
- `stability: low`（topVoteCount < 3）

### 为陪跑与沟通服务

**输出用途**：
- 给助教：理解客户的行为结构与稳定度
- 给客户：理解自己的行为结构画像
- 给系统：匹配 SOP（基于 stage + tags）

---

## fast 测评设计说明

### 画像投票机制

**题目数量**：9 题（`data/seed/quiz_fast_v1.json`）

**投票逻辑**（`lib/scoring.ts`）：
- 每个选项包含 `score_payload.archetype_vote`（6 种 archetype 之一）
- 统计每个 archetype 的得票数
- 选择得票最多的 archetype 作为 `primaryArchetype`

**输出结构**：
```json
{
  "version": "fast",
  "archetypeVotes": {
    "rule_executor": 3,
    "emotion_driven": 1,
    "experience_reliant": 2,
    "opportunity_seeker": 1,
    "defensive_observer": 1,
    "impulsive_reactor": 1
  },
  "dimensionRaw": {
    "rule_dependence": 5,
    "emotion_involvement": 2,
    "experience_reliance": 3,
    "opportunity_sensitivity": 2,
    "risk_defense": 4,
    "action_consistency": 4
  }
}
```

### 稳定度（high / medium / low）

**计算逻辑**（`lib/scoring.ts::calcFastStability`）：
- `high`：topVoteCount >= 5
- `medium`：topVoteCount >= 3
- `low`：topVoteCount < 3

**含义**：
- `high`：画像投票集中，结构清晰
- `medium`：画像投票中等集中，结构一般清晰
- `low`：画像投票分散，结构不清晰

### 生成标签（image:* / stability:* / phase:fast_completed）

**标签生成逻辑**（`lib/scoring.ts::buildTags`）：
- `image:{primaryArchetype}`：主画像标签（固定收敛：只保留一个）
- `stability:{high|medium|low}`：稳定度标签（仅 fast）
- `phase:fast_completed`：完成阶段标签（仅 fast）
- 选项自带 tags（去掉多余 `image:*` 标签，避免污染 SOP 匹配）

**示例输出**：
```json
[
  "image:rule_executor",
  "stability:medium",
  "phase:fast_completed",
  "rule:high",
  "consistency:high"
]
```

### 适用场景

**快速筛选**：
- 初次接触客户
- 快速判断结构
- 稳定度初判

**后续深化**：
- 可继续做 pro 测评
- 形成 attempt_timeline

---

## pro 测评设计说明

### 六维结构（0–100 归一）

**题目数量**：18 题（`data/seed/quiz_pro_v1.json`，按 6 个维度各 3 题组织）

**维度定义**：
- `rule_dependence`：规则依赖度
- `emotion_involvement`：情绪介入度
- `experience_reliance`：经验依赖度
- `opportunity_sensitivity`：机会敏感度
- `risk_defense`：风险防御度
- `action_consistency`：行动一致性

**计分逻辑**（`lib/scoring.ts`）：
- 每个选项包含 `score_payload.dimension_delta`（6 个维度各 0/1/2 分）
- 累加每个维度的原始分数（`dimensionRaw`）
- 归一化：`normalizeDimensionScore(raw, maxPerDimension)`，其中 `maxPerDimension = scoredAnswerCount * 2`
- 输出 0-100 的分数

**输出结构**：
```json
{
  "version": "pro",
  "dimensions": {
    "rule_dependence": 65,
    "emotion_involvement": 35,
    "experience_reliance": 50,
    "opportunity_sensitivity": 40,
    "risk_defense": 70,
    "action_consistency": 55
  },
  "dimensionsRaw": {
    "rule_dependence": 13,
    "emotion_involvement": 7,
    "experience_reliance": 10,
    "opportunity_sensitivity": 8,
    "risk_defense": 14,
    "action_consistency": 11
  },
  "maxPerDimension": 36
}
```

### stage 判定（pre / mid / post）

**判定逻辑**（`lib/scoring.ts::decideProStage`）：
- `pre`：`rule_dependence >= 60` && `risk_defense >= 60` && `action_consistency <= 45`
- `post`：`action_consistency >= 60` && `emotion_involvement <= 45`
- `mid`：其他情况

**含义**：
- `pre`：前期阶段（规则依赖高、风险防御高、行动一致性低）
- `mid`：中期阶段（其他情况）
- `post`：后期阶段（行动一致性高、情绪介入度低）

### 标签体系

**标签生成逻辑**（`lib/scoring.ts::buildTags`）：
- `image:{primaryArchetype}`：主画像标签（固定收敛：只保留一个）
- `phase:pro_completed`：完成阶段标签（仅 pro）
- 选项自带 tags（去掉多余 `image:*` 标签，避免污染 SOP 匹配）

**示例输出**：
```json
[
  "image:rule_executor",
  "phase:pro_completed",
  "rule:high",
  "consistency:high",
  "risk:medium"
]
```

### 与 fast 的关系

**独立使用**：
- 可独立使用，不依赖 fast 测评

**后续深化**：
- 可作为 fast 的后续深化
- 同一客户可多次测评（fast 或 pro），形成 attempt_timeline

**输出差异**：
- fast：画像投票 + 稳定度 + 原始维度分数
- pro：六维归一分数 + 阶段判定 + 画像投票

---

## attempt / scoring / tag 的数据流

### attempt/start

**API**：`POST /api/attempt/start`

**幂等性**：
- 重复调用返回相同的 `attemptId`
- 如果已存在未提交的 attempt，直接返回

**状态机**：
- `invite.status: 'active' → 'entered'`

**创建 Attempt**：
- `submittedAt = null`
- `answersJson = null`
- `scoresJson = null`
- `tagsJson = null`
- `stage = null`

### answer 累积

**API**：`POST /api/attempt/answer`

**累积写入**：
- 读取现有 `answersJson`（如有）
- 合并新答案：`existingAnswers[questionId] = optionId`
- 更新 `answersJson`

**验证**：
- 验证题目/选项归属与状态
- 验证 attempt 未提交（`submittedAt === null`）

### submit 幂等

**API**：`POST /api/attempt/submit`

**幂等性**：
- 使用 `updateMany` + `submittedAt=null` 实现并发幂等
- 如果已提交，返回既有结果

**打分流程**：
1. 读取 `answersJson`
2. 读取选项的 `scorePayloadJson`
3. 调用 `lib/scoring.ts::calculateScores(answers, options, version)`
4. 计算 `scoresJson`、`tagsJson`、`stage`、`resultSummaryJson`
5. 更新 Attempt：`submittedAt = now()`，写入所有结果字段
6. 更新 Invite：`status = 'completed'`

### lib/scoring.ts 的职责

**输入**：
- `answers`：答案映射 `{ questionId: optionId }`
- `options`：选项列表（包含 `scorePayloadJson`）
- `version`：`'fast'` 或 `'pro'`

**输出**：
- `scoresJson`：分数 JSON
- `tagsJson`：标签数组 JSON
- `stage`：阶段（pre/mid/post，pro 测评）
- `resultSummaryJson`：结果摘要 JSON

**核心函数**：
- `calculateScores`：主函数
- `pickPrimaryArchetype`：选择主画像
- `calcFastStability`：计算稳定度（fast）
- `normalizeDimensionScore`：归一化维度分数（pro）
- `decideProStage`：判定阶段（pro）
- `buildTags`：构建标签数组

---

## 为什么不做“更聪明”的测评

### 不做预测

**原因**：
- 交易结果不可预测
- 收益不可预测
- 胜率不可预测

**设计原则**：
- 只识别结构与稳定性
- 不预测结果

### 不做黑箱

**原因**：
- 需要可解释性
- 需要可审计性
- 需要可调试性

**设计原则**：
- 计分逻辑透明（`lib/scoring.ts`）
- 标签生成规则明确
- 阶段判定规则清晰

### 不追求一次性结论

**原因**：
- 行为结构可能变化
- 需要多次测评形成时间线
- 需要持续观察

**设计原则**：
- 支持多次测评（fast 或 pro）
- 形成 attempt_timeline
- 支持阶段演进观察

---

## 测评结果的正确使用方式

### 给助教：理解客户

**使用方式**：
- 查看 `latestAttempt`：了解客户最新测评结果
- 查看 `attemptTimeline`：了解客户测评历史
- 查看 `tags`：了解客户标签（系统标签 + 助教标签）
- 查看 `realtime_panel`：了解客户当前阶段与沟通要点

**禁止使用**：
- 作为“投资建议”的依据
- 作为“交易指令”的来源
- 作为“收益承诺”的支撑

### 给客户：理解自己

**使用方式**：
- 查看 `resultSummary`：了解自己的行为结构画像
- 查看 `tags`：了解自己的标签
- 查看 `stage`：了解自己的阶段（pro）

**禁止使用**：
- 作为“投资建议”的依据
- 作为“交易指令”的来源
- 作为“收益承诺”的支撑

### 给系统：匹配 SOP

**使用方式**：
- 输入：`stage`（pre/mid/post）+ `tags[]`（系统标签 + 助教标签）
- 匹配：`lib/sop-matcher.ts::matchSOP(stage, tags)`
- 输出：Top1 SOP 或默认 panel

**匹配规则**：
- `required_stage = stage`
- `required_tags` 全包含
- `excluded_tags` 不包含
- 排序：`priority desc`，`confidence desc`

---

## 关联实现/数据位置

- **fast 题库**：`data/seed/quiz_fast_v1.json`
- **pro 题库**：`data/seed/quiz_pro_v1.json`
- **画像/标签计算**：`lib/scoring.ts`
- **数据模型**：`prisma/schema.prisma`
- **API 实现**：`app/api/attempt/start/route.ts`、`app/api/attempt/answer/route.ts`、`app/api/attempt/submit/route.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
