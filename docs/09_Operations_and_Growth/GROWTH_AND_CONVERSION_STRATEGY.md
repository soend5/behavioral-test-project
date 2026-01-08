---
doc_id: 09_Operations_and_Growth/GROWTH_AND_CONVERSION_STRATEGY
title: 增长与转化闭环设计说明
version: v1.0.0
status: draft
last_updated: 2026-01-08
owner: ops
---

# 增长与转化闭环设计说明

## 定位

定义：**如何在不踩合规红线的前提下，通过测评、解释、陪跑形成增长与转化闭环**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](../../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 核心转化逻辑（非收益导向）

### 不承诺收益

**边界**：
- 不承诺收益或回报
- 不预测交易结果
- 不提供投资建议

**系统支撑**：
- 系统不存储任何收益数据
- 系统不提供任何收益预测功能

### 以"理解自己"为价值点

**价值点**：
- 通过测评识别行为结构（6 种 archetype）
- 识别执行稳定度（fast 测评）
- 识别六维结构分数（pro 测评）
- 识别阶段（pre/mid/post，pro 测评）

**系统支撑**：
- fast 测评：`data/seed/quiz_fast_v1.json`、`lib/scoring.ts`
- pro 测评：`data/seed/quiz_pro_v1.json`、`lib/scoring.ts`
- 结果输出：`resultSummaryJson`

### 以"陪跑支持"为留存点

**留存点**：
- 基于测评结果匹配 SOP 沟通策略
- 提供实时陪跑提示区（`realtimePanel`）
- 支持多次测评形成行为演进记录

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

---

## 转化路径设计（合规版）

### 路径 1：fast → 理解 → 信任

**阶段**：
1. fast 测评：9 题快速测评，输出主画像与稳定度
2. 结果解释：帮助客户理解自己的行为结构与稳定度
3. 信任建立：通过解释建立信任，为后续陪跑做准备

**系统支撑**：
- fast 测评：`data/seed/quiz_fast_v1.json`、`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- 结果展示：`app/t/[token]/result/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 路径 2：pro → 深度理解 → 陪跑

**阶段**：
1. pro 测评：18 题深度测评，输出六维结构与阶段
2. 深度解释：帮助客户理解自己的六维结构与阶段
3. 陪跑支持：基于测评结果匹配 SOP 沟通策略

**系统支撑**：
- pro 测评：`data/seed/quiz_pro_v1.json`、`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- SOP 匹配：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 路径 3：复测 → 演进 → 长期陪跑

**阶段**：
1. 复测：多次测评形成行为演进记录
2. 演进分析：基于多次测评分析行为变化
3. 长期陪跑：基于行为演进提供长期陪跑支持

**系统支撑**：
- 多次测评：`attemptTimeline`
- 行为演进：标签累积、阶段演进
- 长期陪跑：`app/api/coach/customers/[id]/route.ts`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

---

## 增长策略（非收益导向）

### 邀请制增长

**策略**：
- 通过邀请制控制增长节奏
- 每个邀请生成唯一 token（SHA256 hash 存库）
- 任何接口不返回 token 明文（除创建邀请时返回一次）

**系统支撑**：
- 邀请管理：`app/api/coach/invites/route.ts`
- Token 生成：`lib/token.ts`
- Token 验证：`lib/authz.ts`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 内容驱动增长

**策略**：
- 通过内容资产（题库、画像、SOP）驱动增长
- 内容资产存储在 `data/seed/*.json`
- 内容资产可通过 Admin 后台编辑

**系统支撑**：
- 内容资产：`data/seed/*.json`
- Admin 后台：`app/admin/*`
- 内容编辑：`app/api/admin/*`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 陪跑驱动留存

**策略**：
- 通过陪跑支持提高留存
- 基于测评结果匹配 SOP 沟通策略
- 提供实时陪跑提示区（`realtimePanel`）

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

---

## 转化触点设计（合规版）

### 触点 1：测评结果页

**位置**：`app/t/[token]/result/page.tsx`

**内容**：
- 显示测评结果（tags、stage、resultSummary）
- 显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益
- 提供结果解释链接

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 触点 2：助教陪跑页

**位置**：`app/coach/clients/[id]/page.tsx`

**内容**：
- 显示客户详情（customer + latest_attempt + attempt_timeline + coach_tags + realtime_panel）
- 显示实时陪跑提示区（`realtimePanel`）
- 显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 触点 3：复测提醒

**位置**：`app/api/coach/customers/[id]/route.ts`

**内容**：
- 基于行为演进记录提醒复测
- 提供复测链接
- 显示行为演进分析

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

---

## 合规护栏

### 不承诺收益

**护栏**：
- 所有页面显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益
- 系统不存储任何收益数据
- 系统不提供任何收益预测功能

**系统支撑**：
- 合规提示位：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）

### 不提供投资建议

**护栏**：
- 所有 SOP 输出明确标注：不构成投资建议
- 系统不提供任何投资建议功能
- 系统不提供任何买卖建议功能

**系统支撑**：
- SOP 输出：`lib/sop-matcher.ts`
- 合规边界：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`

### 不预测交易结果

**护栏**：
- 系统不预测交易结果
- 系统不预测收益或回报
- 系统不预测胜率或成功率

**系统支撑**：
- 系统不存储任何收益数据
- 系统不提供任何收益预测功能

---

## 关联实现/数据位置

- **测评打分**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **邀请管理**：`app/api/coach/invites/route.ts`
- **内容资产**：`data/seed/*.json`
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
