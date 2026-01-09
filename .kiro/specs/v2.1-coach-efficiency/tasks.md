# V2.1 助教效能 任务清单

## 任务状态说明
- [ ] 待开始
- [x] 已完成

---

## Task 1: 客户筛选器
**文件**: `app/coach/dashboard/page.tsx`, `app/api/coach/customers/route.ts`
**工时**: 3d

- [x] 1.1 创建 CustomerFilter 组件
- [x] 1.2 实现分层筛选
- [x] 1.3 实现画像筛选
- [x] 1.4 实现阶段筛选
- [x] 1.5 实现活动时间筛选
- [x] 1.6 更新 API 支持筛选参数
- [x] 1.7 移动端抽屉式筛选

---

## Task 2: 高风险用户预警
**文件**: `app/coach/dashboard/page.tsx`, `app/coach/clients/[id]/page.tsx`
**工时**: 2d

- [x] 2.1 定义高风险判定逻辑
- [x] 2.2 客户列表添加红色边框
- [x] 2.3 客户详情页添加风险提示
- [x] 2.4 待办面板高风险置顶

---

## Task 3: 批量操作功能
**文件**: `app/api/coach/customers/batch/route.ts`
**工时**: 3d

- [x] 3.1 创建批量操作 API
- [x] 3.2 实现批量添加标签
- [x] 3.3 实现批量创建跟进记录
- [x] 3.4 添加数量限制和确认
- [x] 3.5 前端批量选择 UI

---

## Task 4: 跟进记录模板
**文件**: `app/coach/clients/[id]/_components/FollowUpSection.tsx`
**工时**: 1d

- [x] 4.1 定义模板数据
- [x] 4.2 添加模板选择 UI
- [x] 4.3 选择后自动填充

---

## Task 5: 移动端助教体验
**文件**: `app/coach/_components/MobileNav.tsx`
**工时**: 1d

- [x] 5.1 创建 MobileNav 组件
- [x] 5.2 添加底部导航栏
- [x] 5.3 集成到助教页面

---

## 验收检查清单

### 筛选器
- [x] 分层筛选可用
- [x] 画像筛选可用
- [x] 阶段筛选可用
- [x] 活动时间筛选可用

### 高风险预警
- [x] 红色边框显示
- [x] 风险提示弹出
- [x] 待办置顶

### 批量操作
- [x] 批量选择可用
- [x] 批量标签可用
- [x] 数量限制生效

### 跟进模板
- [x] 模板选择可用
- [x] 自动填充正常

### 移动端
- [x] 底部导航显示
- [x] 导航切换正常
