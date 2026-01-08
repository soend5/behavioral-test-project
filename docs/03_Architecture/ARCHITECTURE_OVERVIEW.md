# ARCHITECTURE_OVERVIEW

## 目的

给出系统整体架构视图：端/服务/API/数据与内容资产的边界与职责。

## 适用范围

- Next.js App Router（页面 + Route Handlers）
- Prisma/Postgres 数据层

## 非目标

- 不写到组件级别的实现细节

## 目录 / TODO

- [ ] 分层与模块划分（app/lib/prisma/data/scripts）
- [ ] 关键依赖（NextAuth/Prisma/Postgres）
- [ ] 安全边界（RBAC/Token/Ownership）
- [ ] 内容资产导入与只读策略（v1）

## 关联实现/数据位置

- Next.js：`app/`
- API：`app/api/`
- Auth：`lib/auth.ts`、`lib/authz.ts`、`middleware.ts`
- DB：`prisma/schema.prisma`
- 内容资产：`data/seed/*.json`、`prisma/seed-content.ts`

