# QUIZ_CONTENT_GUIDE

## 目的

说明题库内容（Quiz/Question/Option）的维护方式、字段规范与版本策略。

## 适用范围

- 所有版本题库（可编辑、可删除；删除需确认）
- 新 quizVersion 的创建与演进

## 题库编辑权限

**Admin 权限**：
- 可编辑所有版本题库（Quiz/Question/Option）
- 可删除题库（删除前需确认，避免误操作）
- 可创建新 quizVersion

**版本保护**：
- 被 invite/attempt 使用的题库，修改 quizVersion/version 时会有警告
- 建议：已上线版本避免破坏式修改，通过创建新 quizVersion 演进

## 非目标

- 不在本文写评分规则（见 `../03_Architecture/SCORING_AND_TAGS_SPEC.md`）

## 目录 / TODO

- [ ] 字段规范：stableId / orderNo / status
- [ ] 版本策略（已被使用版本避免破坏式修改；如何发布新版本）
- [ ] 题库更新流程（创建新 quizVersion）
- [ ] 导入/校验/回滚策略

## 关联实现/数据位置

- 内容资产：`data/seed/quiz_fast_v1.json`、`data/seed/quiz_pro_v1.json`
- 导入：`prisma/seed-content.ts`
- 版本保护（被 invite/attempt 使用时禁止修改 quizVersion/version）：`app/api/admin/quiz/[id]/route.ts`

