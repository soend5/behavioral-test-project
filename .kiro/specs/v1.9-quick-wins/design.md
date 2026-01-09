# V1.9 Quick Wins 设计文档

## 1. Admin 导航重组

### 1.1 组件结构

```tsx
// app/admin/_components/AdminNav.tsx

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon?: string }[];
};

const navGroups: NavGroup[] = [
  {
    label: "运营",
    items: [
      { href: "/admin/dashboard", label: "📊 数据看板" },
    ]
  },
  {
    label: "策略",
    items: [
      { href: "/admin/sop", label: "🎯 SOP配置" },
      { href: "/admin/scripts", label: "💬 话术库" },
      { href: "/admin/training", label: "📅 训练计划" },
    ]
  },
  {
    label: "内容",
    items: [
      { href: "/admin/quiz", label: "📝 题库" },
      { href: "/admin/archetypes", label: "👤 画像文案" },
      { href: "/admin/training-handbook", label: "📚 内训手册" },
      { href: "/admin/methodology", label: "📖 方法论" },
    ]
  },
  {
    label: "管理",
    items: [
      { href: "/admin/coaches", label: "👥 助教账号" },
      { href: "/admin/settings", label: "⚙️ 系统设置" },
      { href: "/admin/audit", label: "📋 审计日志" },
    ]
  },
];
```

### 1.2 UI 设计

- 分组标签使用灰色小字
- 分组内项目水平排列
- 分组之间用分隔符区分
- 移动端：垂直堆叠，分组折叠

---

## 2. Admin 首页重定向

### 2.1 实现方式

```tsx
// app/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/dashboard");
}
```

### 2.2 注意事项
- 使用 Next.js 服务端重定向，无客户端闪烁
- 保持 SEO 友好（301 重定向）

---

## 3. 客户详情页信息分层

### 3.1 新布局结构

```
┌─────────────────────────────────────────────────────────────┐
│ 客户详情                                          [返回]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 关键信息卡片                                         │ │
│ │ ┌───────────┬───────────┬───────────┐                  │ │
│ │ │ 画像类型   │ 陪跑阶段   │ 分层标签   │                  │ │
│ │ │ 规则执行型 │ 认知建立期 │ 高潜力     │                  │ │
│ │ └───────────┴───────────┴───────────┘                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💬 智能推荐话术                              [展开全部]  │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ "您好，根据您的测评结果..."           [复制]        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 陪跑建议（精简版）                                    │ │
│ │ • 当前重点：建立信任，了解需求                          │ │
│ │ • 下一步：引导完成训练任务                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✏️ 快速记录                                [添加记录]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ 更多信息（默认折叠）                                      │
│   - 测评详情                                                │
│   - 历史记录                                                │
│   - 完整陪跑建议                                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 组件拆分

```tsx
// 新增/修改组件
app/coach/clients/[id]/_components/
  ├── KeyInfoCard.tsx        # 关键信息卡片（新增）
  ├── ScriptPanel.tsx        # 话术面板（修改）
  ├── CoachingTips.tsx       # 陪跑建议精简版（新增）
  ├── QuickNote.tsx          # 快速记录（新增）
  └── MoreInfoSection.tsx    # 更多信息折叠区（新增）
```

### 3.3 关键信息卡片设计

```tsx
// KeyInfoCard.tsx
interface KeyInfoCardProps {
  archetype: string;      // 画像类型
  stage: 'pre' | 'mid' | 'post';  // 陪跑阶段
  segment: string;        // 分层标签
}

const STAGE_LABELS = {
  pre: { label: '认知建立期', color: 'blue' },
  mid: { label: '行动推进期', color: 'orange' },
  post: { label: '成果巩固期', color: 'green' },
};
```

---

## 4. 话术面板优化

### 4.1 位置调整
- 从页面底部移到关键信息卡片下方
- 添加"智能推荐"标识徽章

### 4.2 使用日志记录

```tsx
// 复制话术时调用
async function logScriptUsage(scriptId: string, customerId: string) {
  await fetch('/api/coach/scripts/log', {
    method: 'POST',
    body: JSON.stringify({ scriptId, customerId, action: 'copy' })
  });
}
```

### 4.3 移动端适配
- 按钮高度 >= 44px
- 全宽显示
- 复制按钮明显

---

## 5. 待办面板默认展开

### 5.1 状态修改

```tsx
// app/coach/_components/TodoPanel.tsx
const [expanded, setExpanded] = useState(true); // 改为 true
```

### 5.2 可选：状态持久化

```tsx
// 使用 localStorage 记住用户偏好
useEffect(() => {
  const saved = localStorage.getItem('todoPanelExpanded');
  if (saved !== null) {
    setExpanded(saved === 'true');
  }
}, []);
```

---

## 6. 合规提示措辞

### 6.1 文案配置

```typescript
// lib/ui-copy.ts
export const COMPLIANCE_NOTICES = {
  coach_panel: "以下为沟通参考，请勿作为投资建议",
  result_page: "这是你的行为结构画像，用于和助教对齐下一步",
  landing_page: "本测评帮你看清操作习惯，不涉及投资建议",
};
```

### 6.2 使用方式

```tsx
import { COMPLIANCE_NOTICES } from '@/lib/ui-copy';

// 在组件中使用
<p className="text-sm text-gray-500">{COMPLIANCE_NOTICES.coach_panel}</p>
```

---

## 7. SOP/话术页面文案

### 7.1 SOP 页面

```tsx
// app/admin/sop/page.tsx
// 标题改为
<h1>陪跑策略配置</h1>

// "匹配规则" 改为 "触发条件"
```

### 7.2 话术页面

```tsx
// app/admin/scripts/page.tsx
// 标题改为
<h1>沟通话术库</h1>

// "触发标签" 改为 "适用场景"
```

---

## 技术注意事项

### 响应式设计
- 使用 Tailwind CSS 断点：`sm:`, `md:`, `lg:`
- 移动端优先设计

### 性能考虑
- 折叠区域使用懒加载
- 话术面板数据预加载

### 可访问性
- 所有按钮有明确的 aria-label
- 折叠区域使用正确的 ARIA 属性
- 颜色对比度符合 WCAG 2.1 AA 标准
