# Design Document: 隐藏助教端题库版本选择器

## Overview

本设计文档描述如何简化助教端创建邀请的流程，通过隐藏 quizVersion 输入框，让系统自动使用管理后台配置的默认值。这是一个纯前端 UI 调整，后端 API 已经支持自动使用默认值的逻辑。

## Architecture

### 现有架构（无需修改）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Console  │────▶│  Admin API      │────▶│  SystemSetting  │
│  /admin/settings│     │  /api/admin/    │     │  (PostgreSQL)   │
└─────────────────┘     │  settings       │     └─────────────────┘
                        └─────────────────┘              │
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Coach Console  │────▶│  Coach API      │◀─────────────┘
│  /coach/invites │     │  /api/coach/    │     读取默认值
│  /new           │     │  invites        │
└─────────────────┘     └─────────────────┘
```

### 数据流

1. Admin 在 `/admin/settings` 配置默认 quizVersion
2. Coach 在 `/coach/invites/new` 创建邀请（不再显示 quizVersion 输入框）
3. Coach API 自动从 SystemSetting 读取默认 quizVersion
4. 邀请创建成功后，UI 显示实际使用的 quizVersion

## Components and Interfaces

### 需要修改的组件

#### 1. NewInviteClient.tsx

**文件路径**: `app/coach/invites/new/NewInviteClient.tsx`

**修改内容**:
- 移除 quizVersion 输入框及相关状态
- 移除 `quizVersionTouchedRef` 引用
- 保留 `defaultQuizVersion` 状态用于展示
- 创建邀请时不传 quizVersion 参数（让 API 自动使用默认值）
- 在创建成功后的结果展示区显示实际使用的 quizVersion

### 无需修改的组件

#### 1. Coach Invites API (`/api/coach/invites`)

已实现自动使用默认值的逻辑：
```typescript
let resolvedQuizVersion = typeof quizVersion === "string" ? quizVersion.trim() : "";
if (!resolvedQuizVersion) {
  const row = await prisma.systemSetting.findUnique({
    where: { key: "invite_default_quiz_version" },
  });
  resolvedQuizVersion = row?.value || "v1";
}
```

#### 2. Admin Settings API (`/api/admin/settings`)

已实现完整的 GET/PATCH 功能。

#### 3. Admin Settings Page (`/admin/settings/page.tsx`)

已实现完整的设置界面。

## Data Models

### SystemSetting（已存在）

```prisma
model SystemSetting {
  key       String   @id
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**关键配置项**:
- `key`: `invite_default_quiz_version`
- `value`: 默认题库版本（如 "v1"）

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 邀请创建使用配置的默认 quizVersion

*For any* 配置的默认 quizVersion 值和任意选择的 version（fast/pro），当 Coach 创建邀请时不传 quizVersion 参数，创建的邀请应该使用 SystemSetting 中配置的默认 quizVersion。

**Validates: Requirements 1.2**

### Property 2: 测评类型正确传递

*For any* 选择的测评类型（fast 或 pro），创建的邀请应该使用所选的 version 值。

**Validates: Requirements 2.3**

### Property 3: 默认值验证（Admin 端）

*For any* quizVersion 值，如果该值不同时存在 active 状态的 fast 和 pro 题库，Admin 保存设置时应该返回错误并拒绝保存。

**Validates: Requirements 3.3, 3.4**

## Error Handling

### 前端错误处理

| 场景 | 处理方式 |
|------|----------|
| 加载默认值失败 | 静默忽略，API 会使用兜底值 "v1" |
| 创建邀请失败 | 显示错误信息，保留表单状态 |
| 题库不存在或已停用 | 显示 API 返回的错误信息 |

### 后端错误处理（已实现）

| 场景 | 错误码 | 错误信息 |
|------|--------|----------|
| 题库不存在 | NOT_FOUND | 题库不存在 |
| 题库已停用 | VALIDATION_ERROR | 题库已停用（inactive），禁止创建新邀请 |
| SystemSetting 表不存在 | - | 兜底使用 "v1" |

## Testing Strategy

### 单元测试

由于本次修改主要是 UI 层面的简化，且后端逻辑已经完整实现并测试，测试重点在于：

1. **UI 组件测试**（可选）
   - 验证 quizVersion 输入框不存在
   - 验证 version 选择器存在且包含正确选项
   - 验证创建成功后显示 quizVersion

2. **集成测试**（已有）
   - 现有的 smoke test 已覆盖邀请创建流程

### 属性测试

本次修改不需要新增属性测试，因为：
- 后端 API 逻辑未变更
- 现有测试已覆盖默认值使用逻辑
- UI 变更通过手动验证即可确认

### 手动验收测试

1. 访问 `/coach/invites/new`，确认不显示 quizVersion 输入框
2. 选择客户和测评类型，创建邀请
3. 确认创建成功后显示实际使用的 quizVersion
4. 在 Admin 后台修改默认 quizVersion
5. 重复步骤 2-3，确认使用新的默认值
