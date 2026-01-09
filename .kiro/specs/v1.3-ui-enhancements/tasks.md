# V1.3 UI/UX 增强任务清单

## Phase 1: 数据库迁移 + API 基础

### Task 1.1: User 表新增字段
- [x] 修改 `prisma/schema.prisma`，User 模型新增 `name` 和 `wechatQrcode` 字段
- [x] 执行 `npx prisma migrate dev --name add_user_profile_fields`
- [x] 验证迁移成功

### Task 1.2: 结果页 API 增强
- [x] 修改 `app/api/public/attempt/result/route.ts`
- [x] 新增返回字段: archetype, dimensions, coach
- [x] 从 Invite -> User 关联获取助教信息
- [x] 从 Archetype 表获取原型详情

---

## Phase 2: 测评结果页 UI 增强

### Task 2.1: 原型展示区域
- [x] 修改 `app/t/[token]/result/page.tsx`
- [x] 新增 Section: 原型标题 + one_liner_cn
- [x] 展示行为特征 (traitsCn)

### Task 2.2: 行为维度展示
- [x] 解析 tags 中的 6 个维度 (rule, risk, emotion, consistency, opportunity, experience)
- [x] 以卡片形式展示各维度的 high/medium/low

### Task 2.3: 一句话摘要优化
- [x] 根据原型生成更个性化的摘要文案
- [x] 替换现有通用摘要

### Task 2.4: 助教联系区域
- [x] 新增 Section: 联系助教
- [x] 显示助教名称 (如有)
- [x] 显示微信二维码图片 (如有)
- [x] 兜底显示默认联系方式

---

## Phase 3: 邀请状态页 UI 优化

### Task 3.1: 状态文案常量
- [x] 修改 `lib/ui-copy.ts`
- [x] 新增 `INVITE_STATUS_COPY` 常量
- [x] 包含 completed, expired, active, entered 状态的标题、描述、下一步

### Task 3.2: completed 状态 UI
- [x] 修改 `app/t/[token]/page.tsx`
- [x] 使用新文案
- [x] 优化按钮布局和样式
- [x] 添加成功图标

### Task 3.3: expired 状态 UI
- [x] 使用新文案
- [x] 显示助教信息
- [x] 添加过期图标

---

## Phase 4: 助教工作台通知

### Task 4.1: 待办 API
- [x] 新建 `app/api/coach/todos/route.ts`
- [x] 查询新完成的测评 (submittedAt 在最近 24h 内)
- [x] 查询进行中的测评 (status = entered)
- [x] 查询即将过期的邀请 (expiresAt 在未来 24h 内)
- [x] 返回待办列表和汇总数据

### Task 4.2: 待办面板组件
- [x] 新建 `app/coach/_components/TodoPanel.tsx`
- [x] 显示待办汇总数字
- [x] 分类展示各类待办
- [x] 支持快捷操作链接

### Task 4.3: 集成到工作台
- [x] 修改 `app/coach/dashboard/page.tsx`
- [x] 在页面顶部添加 TodoPanel
- [x] 实现 60 秒轮询刷新

---

## Phase 5: 管理后台设置整合

### Task 5.1: 题库页面添加默认版本配置
- [x] 修改 `app/admin/quiz/page.tsx`
- [x] 在页面顶部添加默认版本配置区域
- [x] 复用 `/api/admin/settings` API
- [x] 实现保存功能
- [x] 在题库列表中标记默认版本

### Task 5.2: 设置页面调整
- [x] 修改 `app/admin/settings/page.tsx`
- [x] 改为只读展示 + 跳转链接

---

## 验收检查

### 功能验收
- [x] 结果页正确显示原型信息
- [x] 结果页正确显示 6 个维度
- [x] 结果页正确显示助教二维码 (如有配置)
- [x] 邀请状态页文案友好、清晰
- [x] 助教工作台显示待办数量
- [x] 管理后台题库页面可配置默认版本

### 合规检查
- [ ] 全文搜索无收益暗示词
- [ ] 全文搜索无买卖建议词
- [x] 文案保持"陪跑"定位

### 技术检查
- [x] TypeScript 无类型错误
- [ ] 页面无控制台错误
- [ ] API 返回格式正确

---

## 当前进度

- [x] 需求分析
- [x] 设计文档
- [x] Phase 1: 数据库迁移 + API 基础
- [x] Phase 2: 测评结果页 UI 增强
- [x] Phase 3: 邀请状态页 UI 优化
- [x] Phase 4: 助教工作台通知
- [x] Phase 5: 管理后台设置整合

---

## 文件变更清单

### 新增文件
- `app/api/coach/todos/route.ts` - 待办 API
- `app/coach/_components/TodoPanel.tsx` - 待办面板组件
- `.kiro/specs/v1.3-ui-enhancements/requirements.md` - 需求文档
- `.kiro/specs/v1.3-ui-enhancements/design.md` - 设计文档
- `.kiro/specs/v1.3-ui-enhancements/tasks.md` - 任务清单

### 修改文件
- `prisma/schema.prisma` - User 表新增 name, wechatQrcode 字段
- `app/api/public/attempt/result/route.ts` - 返回 archetype, dimensions, coach
- `app/api/public/invite/resolve/route.ts` - 返回 coach.name
- `app/t/[token]/result/page.tsx` - 结果页 UI 增强
- `app/t/[token]/page.tsx` - 邀请状态页 UI 优化
- `app/coach/dashboard/page.tsx` - 添加待办面板
- `app/admin/quiz/page.tsx` - 添加默认版本配置
- `app/admin/settings/page.tsx` - 简化为只读展示
- `lib/ui-copy.ts` - 新增状态文案常量

### 数据库迁移
- `prisma/migrations/20260109034618_add_user_profile_fields/migration.sql`
