# CONTENT_COMPLIANCE_CHECKLIST

## 目的

提供内容合规审查清单：禁用词、暗示收益、个股/点位、投顾话术风险等。

## 适用范围

- 页面文案（Client/Coach/Admin）
- 内容资产（seed JSON）
- SOP/话术

## 非目标

- 不替代正式合规评审

## 目录 / TODO

- [ ] 禁用词与高风险表达
- [ ] 结果页解释边界（画像/建议，不涉及买卖）
- [ ] 陪跑话术与 SOP 边界
- [ ] 内容资产审核与回滚

## 关联实现/数据位置

- 合规提示位：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`
- 内容资产：`data/seed/*.json`

