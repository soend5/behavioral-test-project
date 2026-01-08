# ASSESSMENT_FAST

## 目的

定义 fast 版测评（v1）的题库结构、计分与结果输出（面向快速完成与可解释性）。

## 适用范围

- `quizVersion=v1` 且 `version=fast`

## 非目标

- 不扩展到 pro 版细节（见 `ASSESSMENT_PRO.md`）

## 目录 / TODO

- [ ] 题目清单与维度映射
- [ ] 选项 scorePayload 结构
- [ ] 计分规则与分档
- [ ] 输出字段（resultSummary）定义
- [ ] 反作弊/一致性提示（如有）

## 关联实现/数据位置

- 题库：`data/seed/quiz_fast_v1.json`
- 评分：`lib/scoring.ts`
- 提交与结果接口：`app/api/attempt/submit/route.ts`、`app/api/public/attempt/result/route.ts`

