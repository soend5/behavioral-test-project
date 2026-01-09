# V1.3 UI/UX 增强设计文档

## 1. 测评结果页增强

### 1.1 数据流设计

```
API: /api/public/attempt/result
├── 现有返回: attempt { id, version, submittedAt, tags, stage, resultSummary }
└── 新增返回:
    ├── archetype: { key, titleCn, oneLinerCn, selfRecognitionCn[] }
    ├── dimensions: { rule, risk, emotion, consistency, opportunity, experience }
    └── coach: { name, wechatQrcode } (从 Invite -> User 关联获取)
```

### 1.2 UI 组件结构

```
ResultPage
├── Section A: 一句话摘要 (增强版)
│   ├── 原型标题 + 图标
│   ├── one_liner_cn
│   └── 1-2 条 self_recognition_cn
├── Section B: 行为维度雷达/列表
│   └── 6 个维度的 high/medium/low 展示
├── Section C: 显著行为特征 (现有)
├── Section D: 下一步建议 (现有)
└── Section E: 联系助教 (新增)
    ├── 助教名称
    ├── 微信二维码图片 (如有)
    └── 默认联系方式 (兜底)
```

### 1.3 API 修改

文件: `app/api/public/attempt/result/route.ts`

```typescript
// 新增返回字段
type ResultData = {
  attempt: {
    // ... 现有字段
  };
  archetype: {
    key: string;
    titleCn: string;
    oneLinerCn: string;
    selfRecognitionCn: string[];
  } | null;
  dimensions: Record<string, 'high' | 'medium' | 'low'>;
  coach: {
    name: string | null;
    wechatQrcode: string | null;
  };
};
```

---

## 2. 邀请状态页 V1.3 UI

### 2.1 状态卡片设计

#### completed 状态
```
┌─────────────────────────────────────┐
│  ✓ 测评已完成                        │
│                                     │
│  恭喜你完成了本次测评！               │
│  你的回答已经生成了一份行为节奏快照。   │
│                                     │
│  [查看结果概览]  [联系助教]           │
└─────────────────────────────────────┘
```

#### expired 状态
```
┌─────────────────────────────────────┐
│  ⏰ 邀请已过期                        │
│                                     │
│  这个邀请链接已经超过有效期。          │
│  如需重新测评，请联系你的助教获取新链接。│
│                                     │
│  助教: {coachName}                   │
└─────────────────────────────────────┘
```

### 2.2 文案常量

文件: `lib/ui-copy.ts` 新增

```typescript
export const INVITE_STATUS_COPY = {
  completed: {
    title: '测评已完成',
    description: '恭喜你完成了本次测评！你的回答已经生成了一份行为节奏快照。',
    nextStep: '下一步：查看结果，或联系助教获取更具体的陪跑建议。',
  },
  expired: {
    title: '邀请已过期',
    description: '这个邀请链接已经超过有效期。',
    nextStep: '如需重新测评，请联系你的助教获取新的邀请链接。',
  },
  // ... 其他状态
};
```

---

## 3. 助教工作台通知

### 3.1 待办数据结构

```typescript
type TodoItem = {
  type: 'new_completion' | 'in_progress' | 'expiring_soon';
  priority: number; // 1=高, 2=中, 3=低
  customerId: string;
  customerName: string;
  inviteId: string;
  timestamp: string;
  actionUrl: string;
};
```

### 3.2 API 设计

新增 API: `GET /api/coach/todos`

```typescript
// 返回
{
  ok: true,
  data: {
    todos: TodoItem[];
    summary: {
      newCompletions: number;
      inProgress: number;
      expiringSoon: number;
    };
  }
}
```

### 3.3 轮询机制

- 页面加载时获取一次
- 每 60 秒轮询一次（可配置）
- 新完成的测评显示小红点/数字徽章

### 3.4 UI 组件

```
CoachDashboard
├── TodoPanel (新增)
│   ├── Summary: "3 个待处理"
│   ├── NewCompletions: 新完成的测评列表
│   ├── InProgress: 进行中的测评
│   └── ExpiringSoon: 即将过期的邀请
└── CustomerList (现有)
```

---

## 4. 管理后台设置整合

### 4.1 页面调整

#### `/admin/quiz` 页面新增
- 在页面顶部或底部添加"默认题库版本"配置区域
- 复用现有 `/api/admin/settings` API

#### `/admin/settings` 页面调整
- 移除题库版本配置
- 或改为只读展示 + 跳转链接

### 4.2 UI 布局

```
AdminQuizPage
├── Header: 题库管理
├── DefaultVersionConfig (新增)
│   ├── 当前默认版本: v1
│   ├── 可选版本下拉
│   └── 保存按钮
├── CreateQuizForm (现有)
└── QuizTable (现有)
```

---

## 5. 数据库迁移

### 5.1 Prisma Schema 变更

```prisma
model User {
  id            String   @id @default(cuid())
  role          String
  username      String   @unique
  passwordHash  String   @map("password_hash")
  status        String   @default("active")
  name          String?  // 新增: 显示名称
  wechatQrcode  String?  @map("wechat_qrcode") // 新增: 微信二维码 URL
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  // ... 关系
}
```

### 5.2 迁移命令

```bash
npx prisma migrate dev --name add_user_profile_fields
```

---

## 6. 文件变更清单

### 新增文件
- `app/api/coach/todos/route.ts` - 待办 API
- `app/coach/_components/TodoPanel.tsx` - 待办面板组件

### 修改文件
- `prisma/schema.prisma` - User 表新增字段
- `app/api/public/attempt/result/route.ts` - 返回更多数据
- `app/t/[token]/result/page.tsx` - 结果页 UI 增强
- `app/t/[token]/page.tsx` - 邀请状态页 UI 优化
- `app/coach/dashboard/page.tsx` - 添加待办面板
- `app/admin/quiz/page.tsx` - 添加默认版本配置
- `app/admin/settings/page.tsx` - 移除/简化题库配置
- `lib/ui-copy.ts` - 新增状态文案常量

---

## 7. 实现顺序

1. **Phase 1**: 数据库迁移 + API 修改
2. **Phase 2**: 结果页 UI 增强
3. **Phase 3**: 邀请状态页 UI 优化
4. **Phase 4**: 助教待办面板
5. **Phase 5**: 管理后台设置整合
