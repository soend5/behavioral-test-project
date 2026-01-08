# QUIZ_CONTENT_GUIDE

## 目的

说明题库内容（Quiz/Question/Option）的维护方式、字段规范与版本策略。

## 适用范围

- v1 题库（默认只读）
- 新 quizVersion 的创建与演进

## 非目标

- 不在本文写评分规则（见 `../03_Architecture/SCORING_AND_TAGS_SPEC.md`）

## 目录 / TODO

- [ ] 字段规范：stableId / orderNo / status
- [ ] v1 只读策略（为何只读、如何发布新版本）
- [ ] 题库更新流程（创建新 quizVersion）
- [ ] 导入/校验/回滚策略

## 关联实现/数据位置

- 内容资产：`data/seed/quiz_fast_v1.json`、`data/seed/quiz_pro_v1.json`
- 导入：`prisma/seed-content.ts`
- v1 只读门禁：`app/api/admin/questions/route.ts`、`app/api/admin/options/route.ts`

