# 代码审计报告

**项目**: 助教营销工具平台 (behavioral-test-project)  
**审计日期**: 2026-01-09  
**审计范围**: 全栈代码审计、安全检查、性能优化、业务逻辑验证  
**最后更新**: 2026-01-09 (CSRF 保护 + SOP 匹配已启用)

---

## 一、已修复的问题

### 1. TypeScript 类型错误 ✅
- **问题**: `lib/authz.ts` 中 `InviteWithRelations` 类型定义不完整，导致 `name` 和 `wechatQrcode` 字段无法访问
- **修复**: 更新类型定义，添加缺失的字段选择

### 2. ESLint 错误 ✅
- **问题**: `app/t/[token]/result/page.tsx` 中存在未转义的引号和使用 `<img>` 标签
- **修复**: 使用 HTML 实体转义引号，替换为 Next.js `<Image>` 组件

### 3. 重复的 API 响应工具 ✅
- **问题**: `lib/api-response.ts` 和 `lib/apiResponse.ts` 功能重复
- **修复**: 删除未使用的 `lib/api-response.ts`

### 4. 缺少安全头 ✅
- **问题**: `next.config.js` 未配置安全响应头
- **修复**: 添加 X-XSS-Protection、X-Frame-Options、X-Content-Type-Options 等安全头

### 5. 缺少健康检查端点 ✅
- **问题**: 无法监控应用和数据库状态
- **修复**: 添加 `/api/health` 端点

### 6. Prisma 客户端初始化 ✅
- **问题**: 缺少环境变量验证和日志配置
- **修复**: 添加必要环境变量检查和开发环境日志

### 7. 硬编码默认密码 ✅
- **问题**: `prisma/seed.ts` 中使用硬编码默认密码
- **修复**: 移除默认值，强制要求环境变量，添加密码长度验证

### 8. 缺少速率限制 ✅
- **问题**: 公开 API 端点无速率限制
- **修复**: 添加 `lib/rate-limit.ts` 速率限制工具，应用于 `/api/attempt/start` 和 `/api/attempt/submit`

### 9. 登录失败未记录审计日志 ✅
- **问题**: 登录失败不记录，无法检测暴力破解
- **修复**: 在 `lib/auth.ts` 中添加登录失败日志记录

### 10. 邀请过期逻辑为 "best-effort" ✅
- **问题**: 过期检查可能静默失败
- **修复**: 改为强制更新数据库状态，提取为 `checkAndHandleInviteExpiry` 函数

### 11. N+1 查询问题 ✅
- **问题**: 客户列表查询存在 N+1 问题
- **修复**: 使用 `_count` 聚合和 `select` 优化查询

### 12. 系统用户缺失 ✅
- **问题**: 审计日志需要系统用户记录非用户操作
- **修复**: 在 seed 中添加 `system` 用户（不可登录）

### 13. CSRF 保护 ✅ (新修复)
- **问题**: 管理后台和助教后台缺少 CSRF 保护
- **修复**: 
  - 创建 `lib/csrf.ts` 实现双重提交 Cookie 模式
  - 创建 `lib/csrf-client.ts` 提供客户端 CSRF fetch 工具
  - 更新 `middleware.ts` 对 `/api/admin/` 和 `/api/coach/` 路由进行 CSRF 验证
  - 更新所有 admin/coach 前端组件使用 `csrfFetch` 发送 POST/PATCH/DELETE 请求

### 14. SOP 匹配功能启用 ✅ (新修复)
- **问题**: `matchedSopId` 字段始终为 null，匹配逻辑未启用
- **修复**: 
  - 更新 `lib/sop-matcher.ts` 支持事务客户端 (DbClient 类型)
  - 在 `app/api/attempt/submit/route.ts` 中调用 `matchSOP()` 并存储 `matchedSopId`

### 15. SOP 规则管理界面 ✅ (新修复)
- **问题**: SOP 规则只能通过 seed 初始化，无法在线管理
- **修复**: 
  - 重构 `app/admin/sop/page.tsx` 为完整的 SOP 管理界面
  - 支持 SOP Definition 的创建、编辑、删除
  - 支持 SOP Rule 的创建、编辑、删除
  - 支持按 SOP 筛选规则
  - 所有操作使用 CSRF 保护

---

## 二、待处理项目（建议后续迭代）

### 安全相关
1. **生产环境速率限制**: 当前使用内存存储，生产环境建议使用 Redis
2. **密码策略增强**: 可考虑添加密码复杂度要求

### 性能相关
1. **游标分页**: 大数据量场景下，偏移分页性能较差
2. **数据库索引**: 为 `Attempt` 表添加 `@@index([customerId, submittedAt])` 复合索引

### 功能相关
1. **测评超时**: Attempt 无过期时间，可能产生僵尸记录

---

## 三、业务逻辑验证

### 已验证功能 ✅
1. **用户认证**: NextAuth + Credentials Provider，支持 admin/coach 角色
2. **权限控制**: 统一的 RBAC 门禁层 (`lib/authz.ts`)
3. **邀请流程**: token 生成 → hash 存储 → 状态机转换
4. **测评流程**: start → answer → submit，支持幂等性
5. **评分系统**: fast/pro 两种版本，支持画像投票和维度评分
6. **审计日志**: 关键操作均有记录（包括登录失败）
7. **CSRF 保护**: 双重提交 Cookie 模式，保护所有管理 API
8. **SOP 匹配**: 根据 stage 和 tags 自动匹配推荐 SOP
9. **SOP 管理界面**: 完整的 SOP Definition 和 Rule 管理功能

---

## 四、代码质量

### 优点 ✅
- 清晰的目录结构和模块划分
- 统一的错误码和 API 响应格式
- 完善的 Zod 输入验证
- 事务处理保证数据一致性
- 良好的 TypeScript 类型覆盖
- CSRF 保护覆盖所有管理 API

### 改进建议
1. 添加单元测试和集成测试
2. 实现结构化日志 (Winston/Pino)
3. 添加 API 文档 (OpenAPI/Swagger)
4. 考虑添加软删除支持

---

## 五、部署检查清单

- [x] 移除硬编码默认密码
- [x] 添加速率限制
- [x] 添加安全响应头
- [x] 添加健康检查端点
- [x] 添加 CSRF 保护
- [x] 启用 SOP 匹配功能
- [ ] 设置强密码环境变量 (ADMIN_PASSWORD, COACH_PASSWORD)
- [ ] 配置生产数据库连接池
- [ ] 启用 HTTPS
- [ ] 配置 CDN 和缓存策略
- [ ] 设置监控和告警
- [ ] 配置日志收集
- [ ] 执行数据库迁移 (`prisma migrate deploy`)
- [ ] 运行种子数据 (`npm run db:seed`)

---

## 六、本次修复文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `lib/authz.ts` | 修改 | 修复类型定义，改进过期检查逻辑 |
| `lib/auth.ts` | 修改 | 添加登录失败审计日志 |
| `lib/rate-limit.ts` | 新增 | 速率限制工具 |
| `lib/csrf.ts` | 新增 | CSRF 保护服务端实现 |
| `lib/csrf-client.ts` | 新增 | CSRF 保护客户端工具 |
| `lib/sop-matcher.ts` | 修改 | 支持事务客户端 |
| `lib/prisma.ts` | 修改 | 添加环境变量验证 |
| `lib/api-response.ts` | 删除 | 移除重复文件 |
| `middleware.ts` | 修改 | 添加 CSRF 验证中间件 |
| `app/api/health/route.ts` | 新增 | 健康检查端点 |
| `app/api/attempt/start/route.ts` | 修改 | 添加速率限制 |
| `app/api/attempt/submit/route.ts` | 修改 | 添加速率限制，启用 SOP 匹配 |
| `app/api/admin/coaches/route.ts` | 修改 | 添加用户名正则验证 |
| `app/api/coach/customers/route.ts` | 修改 | 优化 N+1 查询 |
| `app/t/[token]/result/page.tsx` | 修改 | 修复 ESLint 错误 |
| `next.config.js` | 修改 | 添加安全头和图片配置 |
| `prisma/seed.ts` | 修改 | 移除默认密码，添加系统用户 |
| `app/coach/dashboard/page.tsx` | 修改 | 使用 csrfFetch |
| `app/coach/invites/page.tsx` | 修改 | 使用 csrfFetch |
| `app/coach/invites/new/NewInviteClient.tsx` | 修改 | 使用 csrfFetch |
| `app/coach/clients/[id]/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/coaches/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/quiz/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/questions/QuestionsClient.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/options/OptionsClient.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/archetypes/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/methodology/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/training-handbook/page.tsx` | 修改 | 使用 csrfFetch |
| `app/admin/sop/page.tsx` | 重构 | 完整的 SOP 管理界面 |

---

## 七、CSRF 保护实现说明

### 实现方式
采用双重提交 Cookie 模式 (Double Submit Cookie Pattern)：
1. 服务端生成随机 CSRF token 并设置到 cookie（httpOnly=false，允许 JS 读取）
2. 客户端在请求头 `x-csrf-token` 中携带相同的 token
3. 服务端验证 cookie 和 header 中的 token 是否一致

### 保护范围
- `/api/admin/*` - 所有管理后台 API
- `/api/coach/*` - 所有助教后台 API

### 豁免路径
- `/api/auth/*` - NextAuth 有自己的 CSRF 保护
- `/api/attempt/*` - 公开测评 API，使用 token 验证
- `/api/public/*` - 公开 API
- `/api/health` - 健康检查

### 客户端使用
```typescript
import { csrfFetch } from "@/lib/csrf-client";

// 自动携带 CSRF token
const res = await csrfFetch("/api/coach/customers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ... }),
});
```

---

## 八、总结

本次审计共发现并修复 15 项问题，涵盖安全、性能、代码质量等方面。项目现已具备：
- 完善的 CSRF 保护（双重提交 Cookie 模式）
- 完善的速率限制保护
- 强制密码策略
- 登录失败审计追踪
- 优化的数据库查询
- 安全响应头配置
- SOP 匹配功能已启用
- 完整的 SOP 管理界面

建议后续迭代关注生产级速率限制（Redis）、测评超时处理。
