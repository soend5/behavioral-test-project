# ASSESSMENT_PRO

## 目的

定义 pro 版测评（v1）的题库结构、计分与结果输出（面向更细颗粒画像与承接）。

## 适用范围

- `quizVersion=v1` 且 `version=pro`

## 非目标

- 不描述 fast 版细节（见 `ASSESSMENT_FAST.md`）

## 目录 / TODO

- [ ] 题库结构与维度体系
- [ ] 计分规则与标签体系
- [ ] 结果分层与解释组件
- [ ] 输出字段（resultSummary）定义

## 关联实现/数据位置

- 题库：`data/seed/quiz_pro_v1.json`
- 评分：`lib/scoring.ts`
- 提交与结果接口：`app/api/attempt/submit/route.ts`、`app/api/public/attempt/result/route.ts`

