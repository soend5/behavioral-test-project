---
doc_id: 09_Operations_and_Growth/DATA_ASSET_STRATEGY
title: 交易行为数据资产与长期价值说明
version: v1.0.0
status: draft
last_updated: 2026-01-08
owner: ops
---

# 交易行为数据资产与长期价值说明

## 定位

定义：**系统积累的行为数据资产是什么，为什么有价值，如何保护与使用**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](../../01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 数据资产类型

### 行为结构数据

**数据类型**：
- 行为结构画像（6 种 archetype）
- 执行稳定度（fast 测评）
- 六维结构分数（pro 测评）
- 阶段判定（pre/mid/post，pro 测评）

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- 数据模型：`prisma/schema.prisma`（Attempt 表）

**价值**：
- 行为结构数据是独特的
- 行为结构数据是稀缺的
- 行为结构数据是可持续的

### 演进数据

**数据类型**：
- 多次测评形成行为演进记录（`attemptTimeline`）
- 标签累积（系统标签 + 助教标签）
- 阶段演进（pre → mid → post）

**系统支撑**：
- 多次测评：`attemptTimeline`
- 标签累积：`tagsJson`、`coachTags`
- 阶段演进：`stage`

**价值**：
- 演进数据是独特的
- 演进数据是稀缺的
- 演进数据是可持续的

### 非结果导向数据

**数据类型**：
- 不存储任何收益数据
- 不存储任何交易结果
- 不存储任何成功率数据

**系统支撑**：
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）
- 系统不提供任何收益统计功能

**价值**：
- 非结果导向数据是独特的
- 非结果导向数据是稀缺的
- 非结果导向数据是可持续的

---

## 数据资产的价值

### 时间价值

**价值来源**：
- 行为数据具有时间价值
- 多次测评形成行为演进记录（`attemptTimeline`）
- 长期行为数据可以揭示行为模式变化

**系统支撑**：
- 多次测评：`attemptTimeline`
- 行为演进：标签累积、阶段演进
- 数据模型：`prisma/schema.prisma`（Attempt 表）

**为什么有价值**：
- 行为数据是稀缺的
- 行为数据是独特的
- 行为数据是可持续的

### 独特性

**价值来源**：
- 行为结构数据是独特的
- 演进数据是独特的
- 非结果导向数据是独特的

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 行为演进：`attemptTimeline`
- 数据模型：`prisma/schema.prisma`

**为什么有价值**：
- 行为数据是独特的
- 行为数据是稀缺的
- 行为数据是可持续的

### 可持续性

**价值来源**：
- 行为数据是可持续的
- 不依赖市场行情
- 不依赖预测

**系统支撑**：
- 系统不存储任何收益数据
- 系统不提供任何收益预测功能
- 系统只提供行为结构测评与陪跑支持

**为什么有价值**：
- 不依赖市场行情，不受市场波动影响
- 不依赖预测，不受预测准确性影响
- 不踩监管红线，合规风险更低

---

## 数据资产保护

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

## 数据资产使用

### 行为结构分析

**使用场景**：
- 基于行为结构数据进行分析
- 基于演进数据进行趋势分析
- 基于阶段演进进行模式识别

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 行为演进：`attemptTimeline`
- 数据模型：`prisma/schema.prisma`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

### 陪跑策略优化

**使用场景**：
- 基于行为结构数据优化 SOP 匹配策略
- 基于演进数据优化陪跑节奏
- 基于阶段演进优化沟通策略

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
- 基于行为结构数据优化题库内容
- 基于演进数据优化画像内容
- 基于阶段演进优化 SOP 内容

**系统支撑**：
- 内容资产：`data/seed/*.json`
- Admin 后台：`app/admin/*`
- 内容编辑：`app/api/admin/*`

**合规边界**：
- 不涉及收益数据
- 不涉及交易结果
- 不涉及成功率统计

---

## 关联实现/数据位置

- **数据模型**：`prisma/schema.prisma`（Customer、Invite、Attempt、CoachTag、SopDefinition、SopRule、AuditLog）
- **测评打分**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **权限验证**：`lib/authz.ts`
- **审计日志**：`lib/audit.ts`
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
