# RELEASE_NOTES_TEMPLATE

## 目的

提供发布说明模板，便于每次发布记录变更与复验结论。

## 适用范围

- 灰度/生产发布

## 非目标

- 不作为技术方案文档

## 模板（TODO）

- [ ] 版本号/发布日期/负责人
- [ ] 变更摘要（功能/修复/配置）
- [ ] 数据库变更（迁移/回滚方式）
- [ ] 风险点与监控项
- [ ] 复验结果（smoke/UAT）
- [ ] 回滚方案

## 关联实现/数据位置

- DB 迁移：`prisma/migrations/`
- 生产 gate：`scripts/smoke-prod-gate.ts`

