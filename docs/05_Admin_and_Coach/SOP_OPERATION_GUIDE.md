# SOP_OPERATION_GUIDE

## 目的

定义 SOP 的运营与维护流程：如何新增/调整规则、如何灰度与回滚。

## 适用范围

- admin 配置 SOP
- coach 使用 SOP 建议

## 非目标

- 不包含具体 SOP 内容（内容可在数据库/资产中维护）

## 目录 / TODO

- [ ] SOP 数据结构与配置入口
- [ ] 修改流程（评审/灰度/回滚）
- [ ] 版本策略（v1 只读/新版本演进）
- [ ] 验证方法（smoke/UAT）

## 关联实现/数据位置

- admin SOP API：`app/api/admin/sop/*`
- SOP 匹配实现：`lib/sop-matcher.ts`
- 数据模型：`prisma/schema.prisma`

