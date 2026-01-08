# RUNBOOK

## 目的

提供运行手册：告警、日志、常见故障处理、应急预案与手工修复流程。

## 适用范围

- 生产环境运维

## 非目标

- 不替代平台官方运维文档

## 目录 / TODO

- [ ] 关键依赖与健康检查（DB/应用/鉴权）
- [ ] 日志与排障（Next.js/Vercel/Supabase）
- [ ] 数据修复与补单流程（与审计联动）
- [ ] 常见故障处理（登录失败、DB 连接、seed 失败）

## 关联实现/数据位置

- 部署说明：`DEPLOY_PROD.md`
- DB Deploy：`260107.md`
- 审计：`lib/audit.ts`、`app/api/admin/audit/*`

