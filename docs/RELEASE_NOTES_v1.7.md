# v1.7 Release Notes - 数据驱动升级

发布日期：2026-01-09

## 概述

v1.7 版本聚焦于数据驱动能力建设，新增埋点系统、数据看板和客户分层功能，帮助运营团队更好地理解用户行为和优化转化漏斗。

## 新增功能

### 1. 埋点系统

#### 前端 SDK
- 新增 `lib/tracking.ts` 埋点工具库
- 支持自动会话管理（sessionId）
- 支持邀请 token 关联
- 使用 `sendBeacon` 确保页面关闭时也能发送

#### 埋点事件
- `landing_page_view` - 落地页访问
- `landing_start_click` - 点击开始测评
- `result_page_view` - 结果页访问
- `result_detail_expand` - 展开详细报告
- `result_contact_click` - 点击联系助教

#### 后端 API
- `POST /api/tracking` - 接收埋点数据（无需鉴权）

### 2. Admin 数据看板

新增 `/admin/dashboard` 页面，包含：

- 今日概览卡片（邀请数、测评数、完成率、联系率）
- 转化漏斗图（邀请→开始→完成→联系）
- 画像分布图
- 阶段分布图
- 助教效能排行榜

支持时间范围筛选（7天/14天/30天）

### 3. 客户分层系统

#### 分层规则
- `high_potential` 高潜力：完成深度测评且稳定性高
- `needs_attention` 需关注：冲动反应型或稳定性低
- `active` 活跃：7天内有互动
- `inactive` 沉默：超过14天无互动
- `new` 新客户：7天内新增

#### API
- `GET /api/admin/customers/segments` - 获取分层统计
- `POST /api/admin/customers/segments` - 重新计算所有客户分层
- `GET /api/coach/customers?segment=xxx` - 按分层筛选客户

## 数据模型变更

新增 3 个数据表：
- `tracking_events` - 埋点事件
- `daily_stats` - 每日统计快照
- `customer_segments` - 客户分层标签

## API 变更

### 新增 API
- `POST /api/tracking` - 埋点数据接收
- `GET /api/admin/dashboard/stats` - 看板统计数据
- `GET /api/admin/customers/segments` - 分层统计
- `POST /api/admin/customers/segments` - 重算分层

### 修改 API
- `GET /api/coach/customers` - 新增 `segment` 筛选参数，返回值新增 `segments` 字段

## 文件变更清单

```
prisma/schema.prisma                           # 新增数据模型
lib/tracking.ts                                # 前端埋点 SDK
lib/customer-segment.ts                        # 客户分层逻辑
app/api/tracking/route.ts                      # 埋点接收 API
app/api/admin/dashboard/stats/route.ts         # 看板统计 API
app/api/admin/customers/segments/route.ts      # 分层管理 API
app/admin/dashboard/page.tsx                   # Admin 数据看板页面
app/api/coach/customers/route.ts               # 客户列表（新增分层筛选）
app/t/[token]/page.tsx                         # 落地页（新增埋点）
app/t/[token]/result/page.tsx                  # 结果页（新增埋点）
```

## 验收标准

- [ ] Admin 看板包含核心指标（测评数、完成率、联系率）
- [ ] 漏斗数据准确率 ≥95%
- [ ] 客户分层覆盖率 100%
- [ ] 看板加载时间 <3s

## 升级步骤

1. 运行数据库迁移：
   ```bash
   npx prisma migrate deploy
   ```

2. 重新生成 Prisma Client：
   ```bash
   npx prisma generate
   ```

3. 初始化客户分层（可选）：
   ```bash
   # 调用 POST /api/admin/customers/segments 重算所有客户分层
   ```

4. 重启应用

## 使用说明

### 埋点使用
```typescript
import { track, TRACKING_EVENTS } from "@/lib/tracking";

// 发送埋点
track(TRACKING_EVENTS.LANDING_PAGE_VIEW, { version: "fast" });
```

### 分层筛选
```typescript
// 获取高潜力客户
const res = await fetch("/api/coach/customers?segment=high_potential");
```

## 后续计划

- v1.8：训练闭环（训练模块、复测机制）
