---
doc_id: 01_Project/COOPERATION_SCENARIOS
title: 合作场景与价值说明
version: v1.0.0
status: active
last_updated: 2026-01-08
owner: product
---

# 合作场景与价值说明

## 定位

用于解释：**这个系统可以如何被不同类型的合作方使用**。

**合规边界**：本系统为行为结构测评与陪跑辅助，不提供投资建议；详见 [`PRODUCT_BOUNDARY_AND_COMPLIANCE.md`](./PRODUCT_BOUNDARY_AND_COMPLIANCE.md)。

---

## 可合作的对象类型

### 投教机构

**合作场景**：
- 为投教机构提供行为结构测评能力
- 为投教机构提供陪跑支持能力
- 为投教机构提供数据资产管理能力

**系统支撑**：
- fast/pro 测评：`lib/scoring.ts`
- 助教后台：`app/coach/*`
- 数据资产：Attempt、tags、stage、SOP 命中

### 券商 / 期货公司投教部门

**合作场景**：
- 为投教部门提供行为结构测评工具
- 为投教部门提供标准化陪跑支持
- 为投教部门提供合规的行为分析能力

**系统支撑**：
- 邀请制：`app/api/coach/invites/route.ts`
- 权限边界：`lib/authz.ts`
- 审计日志：`lib/audit.ts`

### 交易社区 / 学习平台

**合作场景**：
- 为交易社区提供行为结构测评服务
- 为学习平台提供标准化测评工具
- 为社区提供合规的行为分析能力

**系统支撑**：
- 测评系统：fast/pro 测评
- 结果输出：行为结构画像、执行稳定度、六维结构分数、阶段判定
- 合规边界：不提供投资建议

### 内容与陪跑团队

**合作场景**：
- 为内容团队提供行为结构测评工具
- 为陪跑团队提供标准化陪跑支持
- 为团队提供数据资产管理能力

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 行为演进记录：`attemptTimeline`

---

## 合作价值（非商业承诺）

### 帮助理解用户

**价值**：
- 通过测评识别用户行为结构（6 种 archetype）
- 识别用户执行稳定度（fast 测评）
- 识别用户六维结构分数（pro 测评）
- 识别用户阶段（pre/mid/post，pro 测评）

**系统支撑**：
- 测评打分：`lib/scoring.ts`
- 结果输出：`resultSummaryJson`
- 行为演进：`attemptTimeline`

### 帮助规范交付

**价值**：
- 通过 SOP 匹配提供标准化沟通策略
- 通过实时陪跑提示区提供标准化陪跑支持
- 通过权限边界确保数据安全

**系统支撑**：
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`
- 权限验证：`lib/authz.ts`

### 帮助降低沟通与合规风险

**价值**：
- 通过合规边界确保不提供投资建议
- 通过审计日志确保操作可追溯
- 通过权限边界确保数据安全

**系统支撑**：
- 合规边界：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
- 审计日志：`lib/audit.ts`
- 权限验证：`lib/authz.ts`

---

## 典型合作模式（不涉及定价）

### 测评工具合作

**合作内容**：
- 提供 fast/pro 测评工具
- 提供测评结果输出
- 提供测评数据管理

**系统支撑**：
- fast 测评：`data/seed/quiz_fast_v1.json`、`lib/scoring.ts`
- pro 测评：`data/seed/quiz_pro_v1.json`、`lib/scoring.ts`
- 结果输出：`resultSummaryJson`

### 助教体系合作

**合作内容**：
- 提供助教后台（轻 CRM + SOP 实时面板）
- 提供 SOP 匹配引擎
- 提供实时陪跑提示区

**系统支撑**：
- 助教后台：`app/coach/*`
- SOP 匹配引擎：`lib/sop-matcher.ts`
- 实时陪跑提示区：`app/api/coach/customers/[id]/route.ts`

### 内容与训练体系共建

**合作内容**：
- 提供内容资产管理能力
- 提供 SOP 配置能力
- 提供训练体系支持

**系统支撑**：
- 内容资产：`data/seed/*.json`
- SOP 配置：`app/api/admin/sop/*`
- 训练体系：`data/seed/training_handbook_v1.json`

---

## 系统在合作中的边界

### 不输出交易建议

**边界**：
- 不提供投资建议
- 不提供买卖建议
- 不提供标的推荐

**系统支撑**：
- 系统不存储任何收益数据
- 系统不提供任何交易建议功能

### 不参与具体操作

**边界**：
- 不参与具体交易操作
- 不参与具体投资决策
- 不参与具体执行过程

**系统支撑**：
- 系统只提供行为结构测评与陪跑支持
- 系统不提供任何交易操作功能

### 不对结果负责

**边界**：
- 不对交易结果负责
- 不对投资收益负责
- 不对执行效果负责

**系统支撑**：
- 系统不存储任何收益数据
- 系统不提供任何结果承诺功能

---

## 为什么这种合作是"低风险"的

### 邀请制

**安全机制**：
- 每个邀请生成唯一 token（SHA256 hash 存库）
- 任何接口不返回 token 明文（除创建邀请时返回一次）
- Token 验证通过 `lib/authz.ts::requireInviteByToken`

**系统支撑**：
- Token 生成：`lib/token.ts`
- Token 验证：`lib/authz.ts`
- 邀请管理：`app/api/coach/invites/route.ts`

### 行为导向

**安全机制**：
- 系统只关注行为结构，不关注交易结果
- 系统不存储任何收益数据
- 系统不提供任何收益预测功能

**系统支撑**：
- 测评输出：行为结构画像、执行稳定度、六维结构分数、阶段判定
- 数据模型：`prisma/schema.prisma`（Attempt 表不包含收益字段）

### 全流程可审计

**安全机制**：
- 所有关键操作写入 `audit_log`
- Admin 可通过 `/admin/audit` 查看
- 操作记录包含 `actorUserId`、`action`、`targetType`、`targetId`、`metaJson`

**系统支撑**：
- 审计日志：`lib/audit.ts`
- 审计查看：`app/api/admin/audit/route.ts`
- 数据模型：`prisma/schema.prisma`（AuditLog 表）

---

## 关联实现/数据位置

- **测评打分**：`lib/scoring.ts`
- **SOP 匹配**：`lib/sop-matcher.ts`
- **权限验证**：`lib/authz.ts`
- **审计日志**：`lib/audit.ts`
- **数据模型**：`prisma/schema.prisma`
- **合规边界**：`docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md`
