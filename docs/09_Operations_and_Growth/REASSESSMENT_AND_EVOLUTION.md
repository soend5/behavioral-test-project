---
doc_id: 09_Operations_and_Growth/REASSESSMENT_AND_EVOLUTION
title: 复测机制与行为演进使用指南
version: v1.0.0
status: draft
last_updated: 2026-01-08
owner: ops
---

# 复测机制与行为演进使用指南

## 定位

定义：**如何通过复测机制与行为演进记录，帮助客户理解自己的行为变化，优化陪跑策略**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](../../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 复测机制

### 复测触发

**触发条件**：
- 客户主动申请复测
- 助教建议复测
- 系统自动提醒复测（基于行为演进记录）

**系统支撑**：
- 邀请管理：`app/api/coach/invites/route.ts`
- 客户详情：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 复测流程

**流程**：
1. 创建复测邀请（fast 或 pro）
2. 客户完成复测
3. 系统生成复测结果
4. 系统更新行为演进记录

**系统支撑**：
- 邀请创建：`app/api/coach/invites/route.ts`
- 测评打分：`lib/scoring.ts`
- 行为演进：`attemptTimeline`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 复测结果

**结果内容**：
- 复测结果（tags、stage、resultSummary）
- 行为演进对比（与上次测评对比）
- 行为变化分析（标签变化、阶段变化）

**系统支撑**：
- 结果输出：`resultSummaryJson`
- 行为演进：`attemptTimeline`
- 结果展示：`app/t/[token]/result/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

---

## 行为演进分析

### 标签变化分析

**分析内容**：
- 系统标签变化（`image:*`、`stability:*`、`phase:*`）
- 助教标签变化（`coach:*`）
- 标签累积情况

**系统支撑**：
- 标签系统：`tagsJson`、`coachTags`
- 行为演进：`attemptTimeline`
- 数据模型：`prisma/schema.prisma`（Attempt、CoachTag 表）

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 阶段演进分析

**分析内容**：
- 阶段变化（pre → mid → post）
- 阶段演进速度
- 阶段演进趋势

**系统支撑**：
- 阶段判断：`stage`（pre/mid/post）
- 行为演进：`attemptTimeline`
- 数据模型：`prisma/schema.prisma`（Attempt 表）

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 结构变化分析

**分析内容**：
- 六维结构分数变化（pro 测评）
- 主画像变化（fast/pro 测评）
- 稳定度变化（fast 测评）

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- 行为演进：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

---

## 陪跑策略优化

### 基于行为演进的 SOP 匹配优化

**优化内容**：
- 基于行为演进调整 SOP 匹配策略
- 基于阶段演进调整沟通策略
- 基于标签变化调整陪跑节奏

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 基于行为演进的沟通策略优化

**优化内容**：
- 基于行为演进调整沟通话术
- 基于阶段演进调整沟通节奏
- 基于标签变化调整沟通重点

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 基于行为演进的陪跑节奏优化

**优化内容**：
- 基于行为演进调整陪跑频率
- 基于阶段演进调整陪跑重点
- 基于标签变化调整陪跑策略

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

---

## 合规边界

### 不涉及收益数据

**边界**：
- 行为演进分析不涉及收益数据
- 陪跑策略优化不涉及收益数据
- 复测机制不涉及收益数据

**系统支撑**：
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）
- 系统不提供任何收益统计功能

### 不涉及交易结果

**边界**：
- 行为演进分析不涉及交易结果
- 陪跑策略优化不涉及交易结果
- 复测机制不涉及交易结果

**系统支撑**：
- 系统不存储任何交易结果数据
- 系统不提供任何交易结果统计功能

### 不涉及成功率统计

**边界**：
- 行为演进分析不涉及成功率统计
- 陪跑策略优化不涉及成功率统计
- 复测机制不涉及成功率统计

**系统支撑**：
- 系统不存储任何成功率数据
- 系统不提供任何成功率统计功能

---

## 关联实现/数据位置

- **数据模型**：`prisma/schema.prisma`（Customer、Invite、Attempt、CoachTag）
- **测评打分**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **行为演进**：`attemptTimeline`
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
