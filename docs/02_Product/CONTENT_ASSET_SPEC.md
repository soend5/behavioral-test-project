# CONTENT_ASSET_SPEC

## 目的

统一题库/画像/手册/方法论等内容资产的字段规范、版本策略与导入流程。

## 适用范围

- `data/seed/*.json` 作为内容资产源
- `seed` 导入与校验

## 非目标

- 不替代具体资产内容（内容本身在 JSON）

## 目录 / TODO

- [ ] 文件清单与用途（quiz/archetypes/handbook/methodology）
- [ ] 字段规范（stableId/orderNo/状态）
- [ ] 版本管理（quizVersion 演进、回滚策略）
- [ ] 校验规则（schema/必填/唯一性）
- [ ] 导入与幂等（seed）

## 关联实现/数据位置

- 内容资产：`data/seed/*.json`
- 导入：`prisma/seed-content.ts`
- 校验脚本：`scripts/validate-seed-content.ts`

