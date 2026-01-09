# Release Notes v1.8 - 训练闭环

> 发布日期：2026-01-09
> 版本主题：训练模块 + 复测机制

---

## 🎯 版本目标

- 建立 7 天训练模块 MVP
- 复测机制上线
- 行为演进可视化

---

## ✨ 新功能

### 1. 训练计划系统

**Admin 端：**
- 训练计划 CRUD 管理
- 训练任务管理（按天分组）
- 支持三种任务类型：阅读、反思、行动
- 任务预计时间设置
- 报名统计查看

**客户端：**
- 训练计划报名
- 每日任务展示
- 任务完成追踪
- 进度可视化（天数进度条 + 总进度）
- 反思类任务支持文字输入
- 历史任务查看

### 2. 复测对比系统

- 自动检测是否有历史测评
- 画像变化对比
- 阶段变化对比
- 维度分数变化（≥10分显示）
- 变化显著性标记（高/中）
- 改善/下降区域汇总

### 3. 复测提醒机制

- 训练完成后 3-14 天提醒（高优先级）
- 30 天定期提醒（中优先级）
- 60 天以上激活提醒（低优先级）
- 助教待办集成

---

## 📁 新增文件

### 数据模型
```
prisma/schema.prisma
  - TrainingPlan      # 训练计划
  - TrainingTask      # 训练任务
  - TrainingEnrollment # 训练报名
  - TaskCompletion    # 任务完成记录
```

### API 端点
```
app/api/admin/training/plans/route.ts       # 计划列表/创建
app/api/admin/training/plans/[id]/route.ts  # 计划详情/更新/删除
app/api/admin/training/tasks/route.ts       # 任务列表/创建
app/api/admin/training/tasks/[id]/route.ts  # 任务详情/更新/删除
app/api/public/training/route.ts            # 客户训练进度/报名
app/api/public/training/complete/route.ts   # 任务完成
app/api/public/attempt/compare/route.ts     # 复测对比
```

### 页面
```
app/admin/training/page.tsx      # Admin 训练管理页面
app/t/[token]/training/page.tsx  # 客户训练页面
```

### 工具库
```
lib/retest-reminder.ts  # 复测提醒逻辑
```

---

## 🔧 技术实现

### 训练进度计算
```typescript
// 当前天数 = min(距开始天数 + 1, 总天数)
const currentDay = Math.min(daysSinceStart + 1, plan.durationDays);

// 总进度 = 已完成任务数 / 总任务数
const progress = Math.round((completedTasks / totalTasks) * 100);
```

### 复测变化检测
```typescript
// 维度变化阈值
const DIMENSION_CHANGE_THRESHOLD = 10; // 分

// 显著性判断
const significance = Math.abs(diff) >= 20 ? "high" : "medium";
```

### 复测提醒优先级
| 条件 | 优先级 | 原因 |
|------|--------|------|
| 训练完成后 3-14 天 | 高 | 最佳复测时机 |
| 距上次测评 30-60 天 | 中 | 定期复测 |
| 距上次测评 60+ 天 | 低 | 可能已流失 |

---

## 📊 数据库迁移

```bash
# 已执行的迁移
prisma migrate dev --name add_training_module
```

新增表：
- `training_plans` - 训练计划
- `training_tasks` - 训练任务
- `training_enrollments` - 训练报名
- `task_completions` - 任务完成记录

---

## 🎨 UI/UX 设计

### 客户训练页面
- 天数进度条（7 格，当前天高亮）
- 任务卡片（展开/收起）
- 完成状态视觉反馈（绿色背景 + ✓）
- 今日完成提示
- 训练完成庆祝动画

### Admin 训练管理
- 左右分栏布局（计划列表 + 任务管理）
- 按天分组的任务展示
- 弹窗表单（计划/任务编辑）
- 状态标签（启用/停用）

---

## ✅ 验收标准

- [ ] 训练计划包含 7 天 × 3 任务 = 21 个任务
- [ ] 训练开始率 ≥30%（完成测评后）
- [ ] 训练完成率 ≥50%（开始训练后）
- [ ] 复测率 ≥20%（30 天内）
- [ ] 对比报告生成成功率 100%

---

## 🔗 相关链接

- 客户训练入口：`/t/[token]/training`
- Admin 管理入口：`/admin/training`
- 复测对比 API：`GET /api/public/attempt/compare?token=xxx`

---

## 📝 后续优化

1. 训练内容从 training_handbook 导入
2. 训练完成后自动发送复测邀请
3. 训练进度推送通知
4. 训练效果统计看板
5. 个性化训练推荐（基于画像）
