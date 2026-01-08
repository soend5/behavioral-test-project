---
doc_id: 09_Operations_and_Growth/CONVERSION_TOUCHPOINTS
title: 转化触点与沟通节奏设计
version: v1.0.0
status: draft
last_updated: 2026-01-08
owner: ops
---

# 转化触点与沟通节奏设计

## 定位

定义：**在合规边界内，如何设计转化触点与沟通节奏，提高转化与留存**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](../../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 转化触点设计（合规版）

### 触点 1：邀请落地页

**位置**：`app/t/[token]/page.tsx`

**内容**：
- 显示邀请信息（客户名称、版本、过期时间）
- 显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益
- 提供开始测评按钮

**系统支撑**：
- 邀请解析：`app/api/public/invite/resolve/route.ts`
- Token 验证：`lib/authz.ts::requireInviteByToken`
- 合规提示位：`app/t/[token]/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 触点 2：测评结果页

**位置**：`app/t/[token]/result/page.tsx`

**内容**：
- 显示测评结果（tags、stage、resultSummary）
- 显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益
- 提供结果解释链接

**系统支撑**：
- 结果获取：`app/api/public/attempt/result/route.ts`
- 结果展示：`app/t/[token]/result/page.tsx`
- 合规提示位：`app/t/[token]/result/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 触点 3：助教陪跑页

**位置**：`app/coach/clients/[id]/page.tsx`

**内容**：
- 显示客户详情（customer + latest_attempt + attempt_timeline + coach_tags + realtime_panel）
- 显示实时陪跑提示区（`realtimePanel`）
- 显示合规提示：不构成投资顾问服务或任何买卖建议，不承诺收益

**系统支撑**：
- 客户详情：`app/api/coach/customers/[id]/route.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 合规提示位：`app/coach/clients/[id]/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

---

## 沟通节奏设计（合规版）

### 节奏 1：首次测评 → 结果解释

**阶段**：
1. 首次测评（fast 或 pro）
2. 结果解释（帮助客户理解自己的行为结构与稳定度）
3. 信任建立（通过解释建立信任，为后续陪跑做准备）

**系统支撑**：
- fast 测评：`data/seed/quiz_fast_v1.json`、`lib/scoring.ts`
- pro 测评：`data/seed/quiz_pro_v1.json`、`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- 结果展示：`app/t/[token]/result/page.tsx`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 节奏 2：陪跑支持 → 复测提醒

**阶段**：
1. 陪跑支持（基于测评结果匹配 SOP 沟通策略）
2. 行为演进分析（基于多次测评分析行为变化）
3. 复测提醒（基于行为演进提醒复测）

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不承诺收益
- 不提供投资建议
- 不预测交易结果

### 节奏 3：长期陪跑 → 行为演进

**阶段**：
1. 长期陪跑（基于行为演进提供长期陪跑支持）
2. 行为演进分析（基于多次测评分析行为变化）
3. 持续优化（基于行为演进持续优化陪跑策略）

**系统支撑**：
- 多次测评：`attemptTimeline`
- 行为演进：标签累积、阶段演进
- 长期陪跑：`app/api/coach/customers/[id]/route.ts`

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
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
