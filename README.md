# 助教营销工具

助教（销售陪跑）营销工具 MVP - 生产环境可灰度上线版本

## 技术栈

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL) 作为唯一数据库
- Prisma ORM
- NextAuth (Credentials Provider) 做会话登录
- Tailwind CSS

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

```bash
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

说明：
- `DATABASE_URL`：线上可用 Supabase pooler（pgbouncer）
- `DIRECT_URL`：给 `migrate/seed` 使用，必须直连

## 安装依赖

```bash
npm install
```

## 数据库迁移

```bash
# 生成 Prisma Client
npm run db:generate

# 运行迁移
npm run db:migrate

# 填充种子数据
npm run db:seed

# 校验内容资产（不连 DB）
npm run content:validate
```

## 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
app/
  ├── page.tsx              # 首页（营销说明）
  ├── t/[token]/            # 客户测评端
  ├── coach/                # 助教后台
  └── admin/                # 总后台
prisma/
  ├── schema.prisma         # 数据模型
  ├── seed.ts               # 本地/开发种子（幂等）
  ├── seed.prod.ts          # 生产种子（幂等，禁止默认口令）
  └── seed-content.ts       # 内容资产导入（data/seed/*.json）
lib/
  ├── prisma.ts             # Prisma Client
  └── auth.ts               # NextAuth 配置
data/
  └── seed/                 # 内容资产 JSON（quiz / archetypes / handbook / methodology）
scripts/
  └── validate-seed-content.ts # 内容资产自检脚本
```

## 生产灰度部署最小步骤

### 1. 准备 Supabase Production Project

1. 在 [Supabase Dashboard](https://app.supabase.com/) 创建生产项目
2. 获取数据库连接字符串（Settings → Database → Connection string）
3. 记录 Project URL 和 Database Password

### 2. 配置环境变量

在部署平台（如 Vercel）设置：

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
NEXTAUTH_SECRET="[生成32字符随机字符串]"
NEXTAUTH_URL="https://your-domain.com"
```

生成 NEXTAUTH_SECRET：
```bash
openssl rand -base64 32
```

### 3. 部署代码

推送到代码仓库，触发自动部署。

### 4. 运行数据库迁移

生产环境 migrate/seed 建议与 Vercel Build 解耦，使用 GitHub Actions 数据库发布流水线（`.github/workflows/db-deploy.yml`）。

Vercel Build Command：
```bash
npm run db:generate && npm run build
```

或手动运行：
```bash
npm run db:migrate:deploy
```

### 5. 运行种子数据（仅首次）

```bash
ALLOW_PROD_SEED=true DIRECT_URL="postgresql://..." SEED_ADMIN_PASSWORD="..." npm run seed:prod
```

### 6. 配置域名

1. 在部署平台添加自定义域名
2. 更新 `NEXTAUTH_URL` 环境变量
3. 重新部署

### 7. 灰度 Smoke Test

- [ ] 访问首页验证
- [ ] 测试 admin/coach 登录
- [ ] 验证数据库连接
- [ ] 检查日志无错误

详细部署指南请查看 [docs/DEPLOY_PROD.md](./docs/DEPLOY_PROD.md)

---

## 开发进度

- [x] Step 1: 初始化 Next.js + TS + Prisma + NextAuth，创建路由骨架
- [x] Step 2: Prisma schema + migration + seed
- [x] Step 3: 实现登录与 RBAC
- [x] Step 4: 实现客户档案 CRUD
- [x] Step 5: 实现邀请链接生成/失效/状态流转
- [x] Step 6: 实现测评端
- [x] Step 7: 实现结果页
- [x] Step 8: 实现 SOP 配置 CRUD + SOP 匹配引擎
- [x] Step 9: audit_log 最小实现
- [x] Step 10: Smoke test + README 完整
