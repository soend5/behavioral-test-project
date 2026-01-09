# v1.6 Release Notes - 助教效能升级

发布日期：2026-01-09

## 概述

v1.6 版本聚焦于提升助教工作效率，新增话术库系统和跟进记录功能，帮助助教更高效地与客户沟通。

## 新增功能

### 1. 话术库系统

#### Admin 端
- 新增话术管理页面 `/admin/scripts`
- 支持创建、编辑、删除话术模板
- 话术分类：首次沟通、跟进、转化、复测
- 智能触发条件配置：
  - 按阶段触发（pre/mid/post）
  - 按画像触发（6种画像类型）
  - 按标签触发（支持多标签匹配）
- 变量支持：`{{customerName}}`、`{{archetype}}` 等
- 使用统计追踪

#### Coach 端
- 客户详情页新增「推荐话术」面板
- 智能推荐：根据客户阶段、画像、标签自动匹配最相关话术
- 一键复制：点击即复制话术内容（自动替换变量）
- 使用记录：自动记录话术使用情况

### 2. 跟进记录系统

- 客户详情页新增「跟进记录」面板
- 支持三种记录类型：微信、电话、备注
- 下一步行动提醒：可设置下次跟进日期和行动项
- 历史记录时间线展示

## 数据模型变更

新增 3 个数据表：
- `script_templates` - 话术模板
- `script_usage_logs` - 话术使用记录
- `follow_up_logs` - 跟进记录

## API 变更

### Admin API
- `GET /api/admin/scripts` - 获取话术列表
- `POST /api/admin/scripts` - 创建话术
- `PATCH /api/admin/scripts/[id]` - 更新话术
- `DELETE /api/admin/scripts/[id]` - 删除话术（软删除）

### Coach API
- `GET /api/coach/scripts?customerId=xxx` - 获取匹配话术
- `POST /api/coach/scripts/[id]/use` - 记录话术使用
- `GET /api/coach/followup?customerId=xxx` - 获取跟进记录
- `POST /api/coach/followup` - 创建跟进记录

## 文件变更清单

```
prisma/schema.prisma                           # 新增数据模型
app/api/admin/scripts/route.ts                 # Admin 话术 API
app/api/admin/scripts/[id]/route.ts            # Admin 话术单项 API
app/api/coach/scripts/route.ts                 # Coach 话术获取 API
app/api/coach/scripts/[id]/use/route.ts        # Coach 话术使用记录 API
app/api/coach/followup/route.ts                # Coach 跟进记录 API
app/admin/scripts/page.tsx                     # Admin 话术管理页面
app/coach/clients/[id]/page.tsx                # 客户详情页（集成新组件）
app/coach/clients/[id]/_components/ScriptPanel.tsx    # 话术面板组件
app/coach/clients/[id]/_components/FollowUpSection.tsx # 跟进记录组件
```

## 验收标准

- [ ] 话术库包含 ≥20 条模板（覆盖6画像×3阶段）
- [ ] 助教话术使用率 ≥50%
- [ ] 跟进记录覆盖率 ≥80%（每客户至少1条）
- [ ] 客户详情页加载时间 <2s

## 升级步骤

1. 运行数据库迁移（如尚未执行）：
   ```bash
   npx prisma migrate deploy
   ```

2. 重新生成 Prisma Client：
   ```bash
   npx prisma generate
   ```

3. 重启应用

## 后续计划

- v1.7：数据驱动（埋点、看板、客户分层）
- v1.8：训练闭环（训练模块、复测机制）
