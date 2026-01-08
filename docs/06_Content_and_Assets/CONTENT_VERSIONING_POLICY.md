# CONTENT_VERSIONING_POLICY

## 目的

定义内容资产版本策略：如何从 v1 演进到 v2，如何灰度、回滚与保证幂等导入。

## 适用范围

- quiz/archetypes/handbook/methodology

## 非目标

- 不替代发布流程（见 `../07_Test_and_Release/GRAY_RELEASE_AND_ROLLBACK.md`）

## 目录 / TODO

- [ ] 版本维度：`quizVersion` 与 `version(fast/pro)`
- [ ] 稳定标识：stableId/orderNo 的约束与维护
- [ ] 只读策略：已上线版本不可破坏式修改
- [ ] seed 幂等与校验（重复执行不重复插入）
- [ ] 回滚策略（新版本出问题如何回退）

## 关联实现/数据位置

- 内容资产：`data/seed/*.json`
- 导入：`prisma/seed-content.ts`
- 校验：`scripts/validate-seed-content.ts`
- 幂等快照：`scripts/db-snapshot-v1.ts`

