---
doc_id: 09_Operations_and_Growth/LONG_TERM_CUSTOMER_CONTEXT
title: 客户长期行为上下文使用说明
version: v1.0.0
status: draft
last_updated: 2026-01-08
owner: ops
---

# 客户长期行为上下文使用说明

## 定位

定义：**如何利用客户长期行为上下文，优化陪跑策略，提高陪跑效果**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](../../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 长期行为上下文

### 行为演进记录

**内容**：
- 多次测评形成行为演进记录（`attemptTimeline`）
- 标签累积（系统标签 + 助教标签）
- 阶段演进（pre → mid → post）

**系统支撑**：
- 多次测评：`attemptTimeline`
- 标签累积：`tagsJson`、`coachTags`
- 阶段演进：`stage`

**价值**：
- 行为演进记录是独特的
- 行为演进记录是稀缺的
- 行为演进记录是可持续的

### 长期行为模式

**内容**：
- 基于多次测评识别长期行为模式
- 基于标签累积识别行为特征
- 基于阶段演进识别行为趋势

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 行为演进：`attemptTimeline`
- 数据模型：`prisma/schema.prisma`（Attempt 表）

**价值**：
- 长期行为模式是独特的
- 长期行为模式是稀缺的
- 长期行为模式是可持续的

### 非结果导向上下文

**内容**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率数据

**系统支撑**：
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）
- 系统不提供任何收益统计功能

**价值**：
- 非结果导向上下文是独特的
- 非结果导向上下文是稀缺的
- 非结果导向上下文是可持续的

---

## 长期上下文使用

### 陪跑策略优化

**使用场景**：
- 基于长期行为上下文优化 SOP 匹配策略
- 基于长期行为模式优化沟通策略
- 基于长期行为趋势优化陪跑节奏

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 沟通策略优化

**使用场景**：
- 基于长期行为上下文优化沟通话术
- 基于长期行为模式优化沟通重点
- 基于长期行为趋势优化沟通节奏

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 内容资产优化

**使用场景**：
- 基于长期行为上下文优化题库内容
- 基于长期行为模式优化画像内容
- 基于长期行为趋势优化 SOP 内容

**系统支撑**：
- 内容资产：`data/seed/*.json`
- Admin 后台：`app/admin/*`
- 内容编辑：`app/api/admin/*`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

---

## 长期上下文保护

### 数据安全

**保护机制**：
- Token 只存 hash（SHA256）到数据库
- 任何接口不返回 token 明文（除创建邀请时返回一次）
- Token 验证通过 `lib/authz.ts::requireInviteByToken`

**系统支撑**：
- Token 生成：`lib/token.ts`
- Token 验证：`lib/authz.ts`
- 邀请管理：`app/api/coach/invites/route.ts`

### 权限边界

**保护机制**：
- 客户数据归属创建该客户的助教（`customer.coachId`）
- 助教只能查看自己名下客户（`lib/authz.ts::requireCoachOwnsCustomer`）
- Admin 可访问所有资源（用于审计与配置）

**系统支撑**：
- 权限验证：`lib/authz.ts`
- 数据模型：`prisma/schema.prisma`（Customer 表）

### 审计日志

**保护机制**：
- 所有关键操作写入 `audit_log`
- Admin 可通过 `/admin/audit` 查看
- 操作记录包含 `actorUserId`、`action`、`targetType`、`targetId`、`metaJson`

**系统支撑**：
- 审计日志：`lib/audit.ts`
- 审计查看：`app/api/admin/audit/route.ts`
- 数据模型：`prisma/schema.prisma`（AuditLog 表）

---

## 合规边界

### 不涉及收益数据

**边界**：
- 长期行为上下文不涉及收益数据
- 陪跑策略优化不涉及收益数据
- 沟通策略优化不涉及收益数据

**系统支撑**：
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）
- 系统不提供任何收益统计功能

### 不涉及交易结果

**边界**：
- 长期行为上下文不涉及交易结果
- 陪跑策略优化不涉及交易结果
- 沟通策略优化不涉及交易结果

**系统支撑**：
- 系统不存储任何交易结果数据
- 系统不提供任何交易结果统计功能

### 不涉及成功率统计

**边界**：
- 长期行为上下文不涉及成功率统计
- 陪跑策略优化不涉及成功率统计
- 沟通策略优化不涉及成功率统计

**系统支撑**：
- 系统不存储任何成功率数据
- 系统不提供任何成功率统计功能

---

## 关联实现/数据位置

- **数据模型**：`prisma/schema.prisma`（Customer、Invite、Attempt、CoachTag、AuditLog）
- **测评打分**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **权限验证**：`lib/authz.ts`
- **审计日志**：`lib/audit.ts`
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
