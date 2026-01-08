# SOP_MATCHER_SPEC

## 目的

说明 SOP 匹配引擎：如何根据画像/阶段/标签返回陪跑建议与禁忌清单。

## 适用范围

- coach 客户详情页 realtime panel
- admin SOP 配置

## 非目标

- 不写具体话术（内容资产另行管理）

## 目录 / TODO

- [ ] 输入：tags / stage / version
- [ ] 规则：匹配优先级、默认/兜底
- [ ] 输出：strategyList/forbiddenList/coreGoal/stateSummary
- [ ] 可配置项与数据结构

## 关联实现/数据位置

- 匹配实现：`lib/sop-matcher.ts`
- 数据模型：`prisma/schema.prisma`
- admin SOP API：`app/api/admin/sop/*`

