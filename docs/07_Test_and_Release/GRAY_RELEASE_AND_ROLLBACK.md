# GRAY_RELEASE_AND_ROLLBACK

## 目的

定义灰度上线与回滚策略：代码发布、DB 迁移、seed、只读门禁与复验。

## 适用范围

- v1 灰度上线

## 非目标

- 不覆盖平台级故障应急（见 `../08_Deployment_and_Ops/INCIDENT_RESPONSE.md`）

## 目录 / TODO

- [ ] 灰度策略（环境/流量/账号白名单）
- [ ] 发布前 gate（migrate/seed/smoke）
- [ ] 回滚策略（代码/DB/内容资产）
- [ ] 变更记录与复验流程

## 关联实现/数据位置

- 生产 gate：`scripts/smoke-prod-gate.ts`
- seed：`prisma/seed.prod.ts`
- v1 门禁复验：`scripts/smoke-v1-readonly.ts`
- 复验记录：`v1close.md`

