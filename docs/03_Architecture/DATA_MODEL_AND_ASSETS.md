# DATA_MODEL_AND_ASSETS

## 目的

汇总核心数据模型与内容资产结构，作为接口/实现/运营的共同参照。

## 适用范围

- Prisma 数据模型
- v1 内容资产（seed）

## 非目标

- 不包含所有字段的逐行解释（以 schema 为准）

## 目录 / TODO

- [ ] 核心表：User/Customer/Invite/Attempt/AuditLog
- [ ] 内容资产表：Quiz/Question/Option/Archetype/Handbook/Methodology
- [ ] SOP 相关表：SopDefinition/SopRule/SopStageMap/CoachingStage
- [ ] stableId/orderNo/版本策略

## 关联实现/数据位置

- 数据模型：`prisma/schema.prisma`
- 内容资产：`data/seed/*.json`
- 导入：`prisma/seed-content.ts`

