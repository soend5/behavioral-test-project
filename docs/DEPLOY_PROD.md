# 生产环境灰度部署指南

本文档说明如何将项目部署到生产环境（以 Vercel 为例，但适用于任何支持 Next.js 的平台）。

> 更新（2026-01-07）：数据库迁移/seed 已与 Vercel Build 解耦，改由 GitHub Actions 的 DB Deploy 流水线执行（带 production environment 审批与并发保护）。
> - 详见：`docs/260107.md`、`docs/GITHUB_ENV_PRODUCTION.md`
> - Vercel 只负责应用发布，不在 Vercel Build 阶段执行 migrate/seed。

---

## 一、Supabase Production Project 准备

### 1. 创建 Supabase Production Project

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 创建新项目（或使用现有项目）
3. 记录以下信息：
   - Project URL    https://your-project.supabase.co
   - Database Password（首次创建时设置 [YOUR-PASSWORD]）
   - Connection String（在 Settings → Database → Connection string 中）

### 2. 获取数据库连接字符串

在 Supabase Dashboard：
- 进入 **Settings** → **Database**
- 找到 **Connection string** → **URI**
- 格式：`postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1`
- 复制完整的连接字符串
postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

### 3. 配置数据库连接池（推荐）

生产环境建议使用连接池：
- Supabase 提供 **Connection Pooling**（端口 6543）
- 连接字符串格式：`postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1`

---

## 二、环境变量配置

### 必需环境变量

在部署平台（如 Vercel）设置以下环境变量：

```bash
# Database（Supabase Production）
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# NextAuth（生产环境）
NEXTAUTH_SECRET="[生成一个强随机字符串，至少32字符]"
NEXTAUTH_URL="https://your-domain.com"

# 可选：Supabase（如果使用 Supabase 其他功能）
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```

### 生成 NEXTAUTH_SECRET

```bash
# 使用 openssl
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 生产环境种子数据变量（GitHub Actions / 手工解锁）

生产 seed 由 GitHub Actions 执行（推荐），需要配置：

```bash
SEED_ADMIN_PASSWORD="[强密码，>=12]"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
# 可选：如需在 seed:prod 同时创建默认 coach 账号
SEED_COACH_PASSWORD="[强密码，>=12]"
```

**重要**：`seed:prod` 仅允许在 GitHub Actions（`GITHUB_ACTIONS=true`）或显式 `ALLOW_PROD_SEED=true` 时运行；且必须提供 `SEED_ADMIN_PASSWORD`（强密码）。

---

## 三、数据库迁移

### 1. 本地准备迁移

```bash
# 确保本地有最新的迁移文件
git pull

# 生成 Prisma Client
npm run db:generate
```

### 2. 部署迁移（生产环境）

生产环境 migrate 由 GitHub Actions 的 DB Deploy 流水线执行（不在 Vercel Build 阶段执行）：

```bash
# Vercel Build Command（只 build，不执行 migrate/seed）
npm run db:generate && npm run build
```

或者使用 Vercel 的 **Post-Deploy Hook** 或 **Build Command**：

```json
{
  "buildCommand": "npm run db:generate && npm run build"
}
```

### 3. 手动运行迁移（如果需要）

如果平台不支持在构建时运行迁移，可以手动运行：

```bash
# 设置生产环境变量
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# 运行迁移
npm run db:migrate:deploy
```

---

## 四、生产环境种子数据

### 首次部署运行

**仅首次部署时运行**，后续部署无需运行（幂等性保证）：

```bash
# 设置环境变量
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."
export SEED_ADMIN_PASSWORD="[强密码，>=12]"
# 可选：如需在 seed:prod 同时创建默认 coach 账号
export SEED_COACH_PASSWORD="[强密码，>=12]"
# 仅本地手工：解锁开关（CI/GitHub Actions 不需要）
export ALLOW_PROD_SEED=true

# 运行生产种子数据
npm run seed:prod
```

### 种子数据内容

- ✅ 创建 admin 账号（如果不存在）
- ✅ 创建 coach 账号（如果不存在）
- ✅ 创建 quiz v1 骨架（fast/pro，如果不存在）
- ✅ 创建默认 coaching_stage（pre/mid/post，如果不存在）

### 幂等性保证

- 所有操作都先检查是否存在
- 如果已存在，跳过创建
- 可安全重复运行

---

## 五、域名配置

### 1. 设置自定义域名

在 Vercel（或其他平台）：
1. 进入项目设置 → **Domains**
2. 添加自定义域名（如 `app.yourdomain.com`）
3. 按照提示配置 DNS 记录

### 2. 更新 NEXTAUTH_URL

在环境变量中设置：

```bash
NEXTAUTH_URL="https://app.yourdomain.com"
```

**⚠️ 重要**：必须与实际的访问域名一致，否则 NextAuth 会报错。

### 3. 验证域名

```bash
# 访问首页
curl https://app.yourdomain.com

# 应该返回 200 OK
```

---

## 六、NextAuth 生产环境注意事项

### 1. NEXTAUTH_SECRET

- ✅ 必须设置（至少 32 字符的随机字符串）
- ✅ 生产环境必须使用强随机值
- ❌ 不要使用开发环境的 secret
- ❌ 不要提交到代码仓库

### 2. NEXTAUTH_URL

- ✅ 必须与实际的访问域名一致
- ✅ 包含协议（https://）
- ✅ 不包含尾部斜杠
- 示例：`https://app.yourdomain.com`

### 3. Cookie 安全设置（生产环境）

NextAuth 在生产环境会自动：
- 使用 `Secure` flag（仅 HTTPS）
- 使用 `SameSite=Lax`
- 使用 `HttpOnly` flag

### 4. 会话存储

- 默认使用 JWT（存储在 cookie 中）
- 无需额外配置 Redis 或数据库会话存储（除非需要）

---

## 七、灰度部署策略

### 1. 使用 Vercel Preview Deployments

1. 创建新分支（如 `staging`）
2. 推送到 GitHub
3. Vercel 自动创建 Preview Deployment
4. 在 Preview 环境测试
5. 合并到 `main` 分支，自动部署到生产

### 2. 使用环境变量区分环境

```bash
# Staging 环境
NEXTAUTH_URL="https://staging.yourdomain.com"
DATABASE_URL="postgresql://staging-db..."

# Production 环境
NEXTAUTH_URL="https://app.yourdomain.com"
DATABASE_URL="postgresql://prod-db..."
```

### 3. 数据库迁移策略

- ✅ Staging 环境先测试迁移
- ✅ 确认无问题后再在生产环境运行
- ✅ 使用 `prisma migrate deploy`（不创建新迁移，只应用现有迁移）

---

## 八、灰度 Smoke Test

### 1. 部署后立即验证

```bash
# 1. 检查首页
curl https://app.yourdomain.com
# 预期: 200 OK，返回营销说明页面

# 2. 检查健康状态（如果有健康检查端点）
curl https://app.yourdomain.com/api/health
# 预期: 200 OK

# 3. 检查数据库连接
# 通过访问需要数据库的页面验证
curl https://app.yourdomain.com/admin/login
# 预期: 200 OK，不报数据库连接错误
```

### 2. 功能验证清单

#### Client 端
- [ ] 首页可访问（无测评入口）
- [ ] 无效 token 返回正确错误
- [ ] 有效 token 可解析邀请信息

#### Coach 端
- [ ] 登录页面可访问
- [ ] 使用 coach 账号可登录
- [ ] 登录后可访问 dashboard
- [ ] 可创建客户
- [ ] 可创建邀请链接
- [ ] 可查看客户详情（含 realtime_panel）

#### Admin 端
- [ ] 登录页面可访问
- [ ] 使用 admin 账号可登录
- [ ] 登录后可访问 admin 页面
- [ ] 可查看题库列表
- [ ] 可创建/修改题库
- [ ] 可查看 SOP 配置
- [ ] 可查看审计日志

### 3. 数据库验证

```bash
# 使用 Prisma Studio（本地连接生产数据库，仅用于验证）
DATABASE_URL="postgresql://prod-db..." npx prisma studio

# 或直接查询数据库
# 检查表是否存在
# 检查种子数据是否已创建
```

### 4. 性能检查

- [ ] 页面加载时间 < 2s
- [ ] API 响应时间 < 500ms
- [ ] 数据库查询正常
- [ ] 无内存泄漏

---

## 九、部署平台特定配置

### Vercel

#### Build Command
```bash
npm run db:generate && npm run migrate:deploy && npm run build
```

#### Install Command
```bash
npm install
```

#### Output Directory
```
.next
```

#### Environment Variables
在 Vercel Dashboard → Settings → Environment Variables 中设置所有必需变量。

#### Post-Deploy Hook（可选）
如果需要部署后运行种子数据（仅首次）：

```bash
# 在 Vercel 的 Post-Deploy Hook 中
npm run seed:prod
```

**注意**：建议手动运行种子数据，而不是在每次部署时运行。

### 其他平台（Netlify、Railway、Render 等）

配置类似，主要区别：
- Build Command 需要包含 `npm run migrate:deploy`
- 环境变量设置方式可能不同
- 数据库连接字符串格式可能不同

---

## 十、常见问题

### 1. 数据库连接失败

**症状**：部署后页面报数据库连接错误

**解决**：
- 检查 `DATABASE_URL` 是否正确
- 检查 Supabase 防火墙设置（允许部署平台的 IP）
- 检查连接池配置（使用端口 6543）

### 2. NextAuth 登录失败

**症状**：登录后立即退出或报错

**解决**：
- 检查 `NEXTAUTH_URL` 是否与访问域名一致
- 检查 `NEXTAUTH_SECRET` 是否设置
- 检查 Cookie 设置（生产环境必须 HTTPS）

### 3. 迁移失败

**症状**：构建时迁移报错

**解决**：
- 检查数据库连接字符串
- 检查迁移文件是否完整
- 手动运行迁移：`npm run migrate:deploy`

### 4. 种子数据重复创建

**症状**：运行 seed:prod 后报唯一约束错误

**解决**：
- 种子数据脚本是幂等的，可安全重复运行
- 如果报错，检查数据库约束是否正确

---

## 十一、回滚策略

### 1. 代码回滚

在 Vercel：
1. 进入 Deployments
2. 找到上一个稳定版本
3. 点击 "..." → "Promote to Production"

### 2. 数据库回滚

**⚠️ 警告**：数据库回滚需要谨慎！

```bash
# 查看迁移历史
npx prisma migrate status

# 回滚到指定迁移（需要手动操作）
# 建议：在 Supabase Dashboard 手动执行 SQL
```

### 3. 环境变量回滚

在部署平台的环境变量设置中恢复之前的值。

---

## 十二、监控与日志

### 1. Vercel Analytics

- 启用 Vercel Analytics 监控页面性能
- 查看错误日志和性能指标

### 2. Supabase Logs

- 在 Supabase Dashboard 查看数据库日志
- 监控查询性能和错误

### 3. 应用日志

- Next.js 生产环境日志输出到平台日志系统
- 检查错误和警告

---

## 十三、安全检查清单

- [ ] 所有环境变量已设置（不包含默认值）
- [ ] `NEXTAUTH_SECRET` 是强随机值
- [ ] `ADMIN_PASSWORD` 和 `COACH_PASSWORD` 已修改为强密码
- [ ] 数据库连接使用连接池（端口 6543）
- [ ] HTTPS 已启用
- [ ] 域名 DNS 配置正确
- [ ] 防火墙规则已配置（Supabase）
- [ ] 审计日志功能正常
- [ ] RBAC 权限校验正常

---

## 十四、首次部署完整流程

1. **准备 Supabase Production Project**
   - 创建项目
   - 获取连接字符串
   - 配置防火墙

2. **配置环境变量**
   - 在部署平台设置所有必需变量
   - 生成 `NEXTAUTH_SECRET`
   - 设置 `NEXTAUTH_URL`

3. **部署代码**
   - 推送代码到仓库
   - 触发部署
   - 等待构建完成

4. **运行数据库迁移**
   - 构建时自动运行（如果配置了）
   - 或手动运行：`npm run migrate:deploy`

5. **运行种子数据（仅首次）**
   - 手动运行：`npm run seed:prod`
   - 验证账号创建成功

6. **配置域名**
   - 添加自定义域名
   - 更新 `NEXTAUTH_URL`
   - 重新部署

7. **灰度 Smoke Test**
   - 验证所有功能
   - 检查日志
   - 确认无错误

8. **修改默认密码**
   - 登录 admin 后台
   - 修改 admin 和 coach 密码

9. **配置题库和 SOP**
   - 在 admin 后台创建题库
   - 配置 SOP 规则

---

## 十五、后续部署流程

1. **开发新功能**
   - 在本地开发
   - 创建数据库迁移（如需要）
   - 测试通过

2. **推送到 Staging**
   - 推送到 `staging` 分支
   - 在 Preview 环境测试
   - 验证迁移

3. **部署到生产**
   - 合并到 `main` 分支
   - 自动触发生产部署
   - 迁移自动运行

4. **验证**
   - 运行 Smoke Test
   - 检查日志
   - 确认功能正常

---

## 十六、紧急情况处理

### 数据库连接中断

1. 检查 Supabase 服务状态
2. 检查防火墙设置
3. 检查连接字符串
4. 联系 Supabase 支持

### 应用崩溃

1. 查看部署平台日志
2. 检查环境变量
3. 回滚到上一个稳定版本
4. 修复问题后重新部署

### 数据丢失

1. 检查 Supabase 备份
2. 恢复备份（如需要）
3. 检查审计日志定位问题

---

## 总结

生产环境部署的关键点：
1. ✅ 正确配置环境变量
2. ✅ 使用强密码和随机 secret
3. ✅ 正确设置域名和 NEXTAUTH_URL
4. ✅ 数据库迁移策略
5. ✅ 种子数据幂等性
6. ✅ 灰度测试和验证
7. ✅ 监控和日志

遵循本指南，可以安全地将项目部署到生产环境。


