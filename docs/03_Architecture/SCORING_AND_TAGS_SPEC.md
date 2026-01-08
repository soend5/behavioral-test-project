# SCORING_AND_TAGS_SPEC

## 目的

定义评分与标签体系：输入答案 → 维度分数/标签/阶段/结果摘要的计算规范。

## 适用范围

- `version=fast|pro` 的提交与结果生成

## 非目标

- 不讨论 UI 展示（结果页另文档）

## 目录 / TODO

- [ ] scorePayload 结构（Option）
- [ ] 维度聚合与归一化（如有）
- [ ] 标签生成逻辑（tags）
- [ ] resultSummary 输出字段约定
- [ ] 幂等与并发提交的结果一致性要求

## 关联实现/数据位置

- 评分实现：`lib/scoring.ts`
- 题库：`data/seed/quiz_fast_v1.json`、`data/seed/quiz_pro_v1.json`
- 提交接口：`app/api/attempt/submit/route.ts`

