# GitHub Environments：production 配置指南（DB Deploy）

本项目将“数据库发布（migrate + seed）”从 Vercel Build 中解耦，改为 **GitHub Actions + GitHub Environments(生产环境保护)** 执行。

目标：
- 只有 main 合并后才会触发 DB Deploy
- DB Deploy 需要审批（required reviewers）
- secrets 仅对 production 环境可见（environment secrets）

## 1) 创建 production Environment

路径：GitHub 仓库 → `Settings` → `Environments` → `New environment`

- Name：`production`

## 2) 开启 required reviewers（强烈建议）

在 `production` environment 配置页：
- `Required reviewers`：至少选择 1 人

效果：
- `db-deploy.yml` 因为声明了 `environment: production`，执行前会进入待审批状态
- 审批通过后才会执行 migrate/seed（避免误伤生产库）

## 3) 配置 environment secrets（必须）

在 `production` environment → `Environment secrets` 添加：

- `DATABASE_URL`
  - 推荐填写 Supabase **pooler** 连接（给 App 运行时）
- `DIRECT_URL`
  - 必须填写 Supabase **直连** 连接（给 migrate/seed/smoke 使用）
- `SEED_ADMIN_PASSWORD`
  - 生产 seed 用的 admin 初始密码（强密码，>=12）

可选：
- `SEED_COACH_PASSWORD`
  - 如需在 seed:prod 同时创建默认 coach 账号，则设置（强密码，>=12）

## 4) 为什么用 environment secrets（而不是 repo secrets）

- **权限更可控**：仅对 `production` 环境生效，不影响其他 workflow / 分支
- **审批更安全**：required reviewers 可以把“写生产库”的动作纳入人工审批
- **审计更清晰**：谁批准、何时批准、跑了哪次 DB Deploy，一目了然

## 5) 相关 workflow

- 数据库发布流水线：`.github/workflows/db-deploy.yml`
  - 触发：push/merge 到 `main`（也支持手动 `workflow_dispatch`）
  - 顺序：`npm ci` → `content:validate` → `db:migrate:deploy` → `seed:prod` → `smoke:prod-gate`

