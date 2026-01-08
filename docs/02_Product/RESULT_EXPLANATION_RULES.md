# RESULT_EXPLANATION_RULES

## 目的

定义结果页解释规则：输出要“可解释、可复述、可承接 SOP”，且不触碰合规红线。

## 适用范围

- `/t/[token]/result` 结果页展示
- coach 客户详情页的陪跑提示区

## 非目标

- 不包含投顾性质内容

## 目录 / TODO

- [ ] 输出字段解释口径（每个字段如何解释）
- [ ] 用语规范（禁用词/收益暗示等）
- [ ] 结果 → SOP/话术承接规则（映射层）
- [ ] 错误/无结果/未提交场景的提示文案

## 关联实现/数据位置

- 结果结构：`lib/scoring.ts`
- 结果页：`app/t/[token]/result/page.tsx`
- 合规提示位：`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`

