# 升级计划 v2.0

> 基于《深度体验审计报告 v2.0》制定
> 日期：2026-01-09
> 核心原则：用户端移动优先，助教/Admin端Web优先+移动端展示重点

---

## 一、版本规划总览

| 版本 | 周期 | 主题 | 核心目标 |
|------|------|------|----------|
| v1.9 | 1周 | Quick Wins | 导航重组+信息分层+入口优化 |
| v2.0 | 2周 | 策略中心 | SOP+话术合并+配置预览 |
| v2.1 | 2周 | 助教效能 | 筛选器+批量操作+移动适配 |
| v2.2 | 2周 | 系统健壮 | 配置版本+权限扩展+监控 |

**总周期：7周**

---

## 二、终端适配策略

### 用户端（客户）- 移动端优先

| 页面 | 移动端优化重点 | 优先级 |
|------|----------------|--------|
| 落地页 /t/[token] | 首屏完整展示价值主张+开始按钮 | P0 |
| 测评页 /t/[token]/quiz | 大按钮+进度条+单题单屏 | P0 |
| 结果页 /t/[token]/result | 首屏：画像+核心洞察+联系助教 | P0 |
| 训练页 /t/[token]/training | 卡片式任务列表+大按钮 | P1 |

### 助教端 - Web优先，移动端展示重点

| 页面 | Web端完整功能 | 移动端精简展示 |
|------|---------------|----------------|
| 仪表盘 /coach/dashboard | 待办+客户列表+筛选 | 待办列表+快速操作 |
| 客户详情 /coach/clients/[id] | 全部信息+话术+跟进 | 关键信息卡片+一键话术 |
| 邀请管理 /coach/invites | 列表+创建+状态 | 快速创建+状态查看 |

### Admin端 - Web优先，移动端只读

| 页面 | Web端完整功能 | 移动端 |
|------|---------------|--------|
| 数据看板 | 完整图表+筛选 | 核心指标卡片 |
| 策略中心 | 完整配置 | 只读查看 |
| 内容管理 | 完整编辑 | 只读查看 |

---

## 三、v1.9 Quick Wins（1周）

### 目标
- Admin 导航完整度 100%
- 助教话术使用率 +20%
- 配置理解成本降低 50%

### 3.1 Admin 导航重组

**当前问题**：数据看板、话术库、训练计划不在导航中

**改动文件**：`app/admin/_components/AdminNav.tsx`

```tsx
// 改前
const navItems: NavItem[] = [
  { href: "/admin", label: "总览" },
  { href: "/admin/settings", label: "系统设置" },
  { href: "/admin/quiz", label: "题库" },
  { href: "/admin/sop", label: "SOP 配置" },
  { href: "/admin/archetypes", label: "画像文案" },
  { href: "/admin/training-handbook", label: "内训手册" },
  { href: "/admin/methodology", label: "方法论" },
  { href: "/admin/coaches", label: "助教账号" },
  { href: "/admin/audit", label: "审计日志" }
];

// 改后（按职责分组）
const navGroups = [
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

**工时**：0.5天

### 3.2 Admin 首页改为数据看板

**改动**：`app/admin/page.tsx` 重定向到 `/admin/dashboard`

```tsx
// app/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/dashboard");
}
```

**工时**：0.5天

### 3.3 助教端客户详情页信息分层

**当前问题**：信息平铺，关键信息被淹没

**改动文件**：`app/coach/clients/[id]/page.tsx`

**新布局（移动端适配）**：

```
┌─────────────────────────────────────────────────────────────┐
│ 📱 移动端布局（单列）                                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 关键信息卡片（固定顶部）                                  │ │
│ │ 画像：规则执行型 | 阶段：认知期 | 分层：高潜力            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💬 一键话术（置顶）                                       │ │
│ │ [推荐话术1] [复制]                                       │ │
│ │ [推荐话术2] [复制]                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 陪跑建议（精简版）                                     │ │
│ │ 目标：建立信任 | 策略：了解需求                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 快速记录                                              │ │
│ │ [微信] [电话] [备注] + 输入框                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ 更多信息（折叠）                                          │
│   - 参与者信息                                              │
│   - 测评详情                                                │
│   - 测评时间线                                              │
│   - 标签管理                                                │
└─────────────────────────────────────────────────────────────┘
```

**工时**：1.5天

### 3.4 话术面板优化

**改动文件**：`app/coach/clients/[id]/_components/ScriptPanel.tsx`

**优化点**：
1. 移到页面顶部位置
2. 增加"智能推荐"标记
3. 复制后自动记录使用日志
4. 移动端：大按钮+全宽显示

```tsx
// 移动端适配样式
<div className="bg-white rounded-lg shadow p-4 lg:p-6">
  <h3 className="font-semibold mb-3 flex items-center gap-2">
    💬 一键话术
    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
      智能推荐
    </span>
  </h3>
  
  {/* 推荐话术（移动端大按钮） */}
  {recommended.map(script => (
    <div key={script.id} className="p-3 lg:p-4 border rounded-lg mb-2 bg-blue-50">
      <div className="flex justify-between items-start gap-2">
        <span className="font-medium text-sm lg:text-base">{script.name}</span>
        <button
          onClick={() => copyScript(script)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm 
                     min-w-[80px] active:bg-blue-700"
        >
          {copied === script.id ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <p className="text-sm text-gray-600 mt-2 line-clamp-2 lg:line-clamp-3">
        {renderContent(script.content)}
      </p>
    </div>
  ))}
</div>
```

**工时**：1天

### 3.5 待办面板默认展开

**改动文件**：`app/coach/_components/TodoPanel.tsx`

```tsx
// 改前
const [expanded, setExpanded] = useState(false);

// 改后
const [expanded, setExpanded] = useState(true);
```

**工时**：0.5天

### 3.6 合规提示优化

**改动文件**：`lib/ui-copy.ts` + 相关页面

```typescript
// 改前
export const COMPLIANCE_NOTICE_CN = 
  "本测评及结果用于生成行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。";

// 改后（分场景）
export const COMPLIANCE_NOTICES = {
  coach_panel: "以下为沟通参考，请勿作为投资建议",
  result_page: "这是你的行为结构画像，用于和助教对齐下一步",
  landing_page: "本测评帮你看清操作习惯，不涉及投资建议",
};
```

**工时**：0.5天

### 3.7 SOP/话术页面文案优化

**改动文件**：
- `app/admin/sop/page.tsx`
- `app/admin/scripts/page.tsx`

| 改前 | 改后 |
|------|------|
| SOP 配置管理 | 陪跑策略配置 |
| SOP 定义 | 策略内容 |
| 匹配规则 | 触发条件 |
| 话术库管理 | 沟通话术库 |
| 触发标签 | 适用场景 |

**工时**：0.5天

### v1.9 任务清单

| 任务 | 工时 | 负责 | 验收指标 |
|------|------|------|----------|
| Admin 导航重组 | 0.5d | 前端 | 所有页面可从导航访问 |
| Admin 首页改为数据看板 | 0.5d | 前端 | 登录后直达看板 |
| 客户详情页信息分层 | 1.5d | 前端 | 关键信息首屏可见 |
| 话术面板优化 | 1d | 前端 | 话术使用率+20% |
| 待办面板默认展开 | 0.5d | 前端 | 响应时间-15% |
| 合规提示优化 | 0.5d | 前端 | 助教压力感降低 |
| SOP/话术文案优化 | 0.5d | 前端 | 理解成本降低 |
| **总计** | **5d** | | |

---

## 四、v2.0 策略中心（2周）

### 目标
- 配置入口从 4 个减少到 2 个
- 配置冲突率 -80%
- 消除 SOP Rule 和话术 triggerTags 的重复配置

### 4.1 策略中心页面

**新建文件**：`app/admin/strategy/page.tsx`

**设计理念**：
- SOP Definition 作为"策略"
- SOP Rule 作为"触发条件"
- 话术作为"执行内容"，关联到 SOP

**页面结构**：

```
┌─────────────────────────────────────────────────────────────────┐
│ 策略中心                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 策略列表（左侧）                                             │ │
│ │                                                             │ │
│ │ ▼ 认知建立期 (pre)                                          │ │
│ │   ├── 信任建立策略 [3条规则] [5条话术]                       │ │
│ │   └── 需求了解策略 [2条规则] [3条话术]                       │ │
│ │                                                             │ │
│ │ ▼ 行动推进期 (mid)                                          │ │
│ │   ├── 方案沟通策略 [2条规则] [4条话术]                       │ │
│ │   └── 疑虑解答策略 [1条规则] [2条话术]                       │ │
│ │                                                             │ │
│ │ ▼ 成果巩固期 (post)                                         │ │
│ │   └── 跟进支持策略 [2条规则] [3条话术]                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 策略详情（右侧）                                             │ │
│ │                                                             │ │
│ │ 策略名称：信任建立策略                                       │ │
│ │ 阶段：认知建立期 (pre)                                       │ │
│ │ 状态：启用                                                   │ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ 📋 策略内容                                                  │ │
│ │ 状态判断：客户处于认知建立期，需要建立信任                    │ │
│ │ 核心目标：建立信任，了解客户真实需求                          │ │
│ │ 推荐策略：建立信任、了解需求、提供价值                        │ │
│ │ 禁用行为：过度推销、承诺收益、施加压力                        │ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ 🎯 触发条件（原 SOP Rule）                                   │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 规则1：规则执行型 + 低稳定性                              │ │ │
│ │ │ 必须标签：image:rule_executor, stability:low            │ │ │
│ │ │ 排除标签：coach:high_value                              │ │ │
│ │ │ 置信度：80                                               │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │ [+ 添加触发条件]                                            │ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ 💬 关联话术                                                  │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 首次沟通-规则执行型                                       │ │ │
│ │ │ "{{customerName}}你好，看了你的测评结果..."               │ │ │
│ │ │ 使用次数：23                                              │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │ [+ 添加话术] [从话术库选择]                                  │ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ 📊 影响预览                                                  │ │
│ │ 当前配置将影响：约 156 个客户                                │ │
│ │ 画像分布：规则执行型 45%，冲动反应型 30%，其他 25%           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**工时**：5天

### 4.2 数据模型调整

**修改文件**：`prisma/schema.prisma`

```prisma
// 话术关联到 SOP（新增字段）
model ScriptTemplate {
  id               String   @id @default(cuid())
  name             String
  category         String
  sopId            String?  @map("sop_id")  // 新增：关联 SOP
  // ... 其他字段保持不变
  
  sop              SopDefinition? @relation(fields: [sopId], references: [sopId])
  
  @@index([sopId])
  @@map("script_templates")
}

model SopDefinition {
  // ... 现有字段
  
  scripts          ScriptTemplate[]  // 新增：关联话术
}
```

**工时**：1天

### 4.3 配置影响预览 API

**新建文件**：`app/api/admin/strategy/preview/route.ts`

```typescript
// GET /api/admin/strategy/preview?sopId=xxx
// 返回：该 SOP 配置会影响多少客户

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sopId = searchParams.get("sopId");
  
  // 获取 SOP 的所有规则
  const rules = await prisma.sopRule.findMany({
    where: { sopId, status: "active" },
  });
  
  // 获取所有客户的最新测评
  const customers = await prisma.customer.findMany({
    include: {
      attempts: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });
  
  // 模拟匹配
  let matchCount = 0;
  const archetypeDistribution: Record<string, number> = {};
  
  for (const customer of customers) {
    const attempt = customer.attempts[0];
    if (!attempt) continue;
    
    const tags = JSON.parse(attempt.tagsJson || "[]");
    const stage = attempt.stage;
    
    // 检查是否匹配任一规则
    for (const rule of rules) {
      if (matchRule(rule, stage, tags)) {
        matchCount++;
        // 统计画像分布
        const archetype = tags.find((t: string) => t.startsWith("image:"));
        if (archetype) {
          archetypeDistribution[archetype] = (archetypeDistribution[archetype] || 0) + 1;
        }
        break;
      }
    }
  }
  
  return json({
    ok: true,
    data: {
      matchCount,
      totalCustomers: customers.length,
      archetypeDistribution,
    },
  });
}
```

**工时**：1.5天

### 4.4 话术匹配逻辑重构

**修改文件**：`app/api/coach/scripts/route.ts`

```typescript
// 改前：话术独立匹配
// 改后：优先返回关联 SOP 的话术，再返回独立话术

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  
  // 1. 获取客户的 SOP 匹配结果
  const customer = await getCustomerWithLatestAttempt(customerId);
  const matchedSop = await matchSOP(prisma, customer.stage, customer.tags);
  
  // 2. 获取关联该 SOP 的话术
  const sopScripts = matchedSop
    ? await prisma.scriptTemplate.findMany({
        where: { sopId: matchedSop.sopId, status: "active" },
      })
    : [];
  
  // 3. 获取独立匹配的话术（作为补充）
  const independentScripts = await prisma.scriptTemplate.findMany({
    where: {
      sopId: null,
      status: "active",
      // 原有的 triggerTags 匹配逻辑
    },
  });
  
  // 4. 合并并排序
  const scripts = [
    ...sopScripts.map(s => ({ ...s, relevanceScore: 100 })),
    ...independentScripts.map(s => ({ ...s, relevanceScore: 50 })),
  ];
  
  return json({ ok: true, data: { scripts } });
}
```

**工时**：1.5天

### v2.0 任务清单

| 任务 | 工时 | 负责 | 验收指标 |
|------|------|------|----------|
| 策略中心页面开发 | 5d | 前端 | 统一入口可用 |
| 数据模型调整 | 1d | 后端 | 话术可关联 SOP |
| 配置影响预览 API | 1.5d | 后端 | 预览准确率 >95% |
| 话术匹配逻辑重构 | 1.5d | 后端 | 关联话术优先展示 |
| 原 SOP/话术页面兼容 | 1d | 前端 | 旧入口可用 |
| **总计** | **10d** | | |

---

## 五、v2.1 助教效能（2周）

### 目标
- 助教筛选效率 +50%
- 高风险用户响应率 +30%
- 移动端助教体验优化

### 5.1 客户筛选器

**修改文件**：`app/coach/dashboard/page.tsx`

**筛选维度**：
- 分层：高潜力 / 需关注 / 活跃 / 沉默 / 新客户
- 画像：6种画像类型
- 阶段：pre / mid / post
- 最近活动：7天内 / 14天内 / 30天内 / 更早

**UI设计（移动端适配）**：

```tsx
// 移动端：底部抽屉式筛选
// Web端：侧边栏筛选

function CustomerFilter({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 
                           text-white rounded-full shadow-lg flex items-center 
                           justify-center text-xl">
            🔍
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh]">
          <FilterContent />
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <div className="w-64 bg-white rounded-lg shadow p-4">
      <FilterContent />
    </div>
  );
}

function FilterContent() {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">客户分层</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {SEGMENTS.map(seg => (
            <button
              key={seg.key}
              className={`px-3 py-1.5 rounded-full text-sm ${
                selected.includes(seg.key)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {seg.name}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">画像类型</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {ARCHETYPES.map(arch => (
            <button key={arch.key} className="...">
              {arch.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* 更多筛选项 */}
    </div>
  );
}
```

**API 改动**：`app/api/coach/customers/route.ts`

```typescript
// 新增筛选参数
// GET /api/coach/customers?segment=high_potential&archetype=rule_executor&stage=pre

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment");
  const archetype = searchParams.get("archetype");
  const stage = searchParams.get("stage");
  const activityDays = searchParams.get("activityDays");
  
  // 构建查询条件
  const where: Prisma.CustomerWhereInput = {
    coachId: session.user.id,
  };
  
  if (segment) {
    where.segments = {
      some: { segment },
    };
  }
  
  // ... 其他筛选条件
}
```

**工时**：3天

### 5.2 高风险用户预警

**改动点**：
1. 客户列表：高风险用户红色边框
2. 客户详情：进入时弹出提醒
3. 待办面板：高风险用户置顶

**修改文件**：
- `app/coach/dashboard/page.tsx`
- `app/coach/clients/[id]/page.tsx`
- `app/coach/_components/TodoPanel.tsx`

```tsx
// 客户列表中的高风险标记
function CustomerRow({ customer }: { customer: Customer }) {
  const isHighRisk = customer.segments?.some(
    s => s.segment === 'needs_attention'
  );
  
  return (
    <tr className={`border-b ${isHighRisk ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          {isHighRisk && (
            <span className="text-red-500" title="需关注">⚠️</span>
          )}
          <span className="font-medium">
            {customer.nickname || customer.name || "未命名"}
          </span>
        </div>
      </td>
      {/* ... */}
    </tr>
  );
}

// 客户详情页的高风险提醒
function HighRiskAlert({ customer }: { customer: Customer }) {
  const isHighRisk = customer.segments?.some(
    s => s.segment === 'needs_attention'
  );
  
  if (!isHighRisk) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 text-red-800">
        <span className="text-xl">⚠️</span>
        <span className="font-medium">需关注客户</span>
      </div>
      <p className="text-sm text-red-700 mt-1">
        该客户为冲动反应型或稳定性较低，沟通时请注意：
      </p>
      <ul className="text-sm text-red-700 mt-2 list-disc pl-5">
        <li>避免施加压力</li>
        <li>不要催促决策</li>
        <li>保持耐心和理解</li>
      </ul>
    </div>
  );
}
```

**工时**：2天

### 5.3 批量操作

**功能**：
- 批量标记已处理
- 批量创建邀请
- 批量添加标签

**UI设计**：

```tsx
// 客户列表增加多选
function CustomerList() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  return (
    <div>
      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 bg-blue-600 text-white p-3 rounded-lg mb-4 
                      flex items-center justify-between">
          <span>已选择 {selectedIds.size} 个客户</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/20 rounded">
              批量创建邀请
            </button>
            <button className="px-3 py-1 bg-white/20 rounded">
              批量添加标签
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 bg-white/20 rounded"
            >
              取消
            </button>
          </div>
        </div>
      )}
      
      {/* 客户列表 */}
      <table>
        <thead>
          <tr>
            <th className="w-10">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(customers.map(c => c.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
            </th>
            {/* ... */}
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={(e) => {
                    const newSet = new Set(selectedIds);
                    if (e.target.checked) {
                      newSet.add(c.id);
                    } else {
                      newSet.delete(c.id);
                    }
                    setSelectedIds(newSet);
                  }}
                />
              </td>
              {/* ... */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**API**：`app/api/coach/customers/batch/route.ts`

```typescript
// POST /api/coach/customers/batch
// body: { action: 'create_invites' | 'add_tag', customerIds: string[], ... }
```

**工时**：3天

### 5.4 跟进记录模板

**修改文件**：`app/coach/clients/[id]/_components/FollowUpSection.tsx`

```tsx
const FOLLOWUP_TEMPLATES = [
  { id: 'first_contact', label: '首次沟通', content: '首次沟通，了解客户需求...' },
  { id: 'followup', label: '跟进沟通', content: '跟进上次沟通内容...' },
  { id: 'training_remind', label: '训练提醒', content: '提醒客户完成今日训练任务...' },
  { id: 'retest_invite', label: '复测邀请', content: '邀请客户进行复测...' },
];

function FollowUpSection({ customerId }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  
  return (
    <div>
      {/* 模板选择 */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
        {FOLLOWUP_TEMPLATES.map(tpl => (
          <button
            key={tpl.id}
            onClick={() => {
              setNewLog(p => ({ ...p, content: tpl.content }));
            }}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm whitespace-nowrap
                     hover:bg-gray-200 active:bg-gray-300"
          >
            {tpl.label}
          </button>
        ))}
      </div>
      
      {/* 原有的输入表单 */}
    </div>
  );
}
```

**工时**：1天

### 5.5 移动端助教体验优化

**改动点**：
1. 底部导航栏（移动端）
2. 手势操作支持
3. 关键操作大按钮

**新建文件**：`app/coach/_components/MobileNav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileNavItems = [
  { href: "/coach/dashboard", label: "客户", icon: "👥" },
  { href: "/coach/invites", label: "邀请", icon: "📨" },
  { href: "/coach/invites/new", label: "新建", icon: "➕", primary: true },
];

export function MobileNav() {
  const pathname = usePathname();
  
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t 
                  safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {mobileNavItems.map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full
                        ${item.primary 
                          ? 'bg-blue-600 text-white rounded-full w-14 h-14 -mt-4 shadow-lg' 
                          : active ? 'text-blue-600' : 'text-gray-500'
                        }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!item.primary && (
                <span className="text-xs mt-0.5">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**工时**：1天

### v2.1 任务清单

| 任务 | 工时 | 负责 | 验收指标 |
|------|------|------|----------|
| 客户筛选器 | 3d | 前端+后端 | 筛选效率+50% |
| 高风险用户预警 | 2d | 前端 | 响应率+30% |
| 批量操作 | 3d | 前端+后端 | 批量操作可用 |
| 跟进记录模板 | 1d | 前端 | 记录效率+30% |
| 移动端助教体验 | 1d | 前端 | 移动端可用性 |
| **总计** | **10d** | | |

---

## 六、v2.2 系统健壮（2周）

### 目标
- 配置回滚成功率 100%
- 新人上手时间从 3 天降到 1 天
- 配置误操作率 -90%

### 6.1 配置版本管理

**新建表**：`prisma/schema.prisma`

```prisma
model ConfigVersion {
  id          String   @id @default(cuid())
  configType  String   @map("config_type")  // "sop" | "script" | "training"
  configId    String   @map("config_id")
  version     Int      @default(1)
  dataJson    String   @map("data_json") @db.Text  // 配置快照
  changedBy   String   @map("changed_by")
  changeNote  String?  @map("change_note")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([configType, configId, version])
  @@map("config_versions")
}
```

**API**：
- `GET /api/admin/config/versions?type=sop&id=xxx` - 获取版本历史
- `POST /api/admin/config/rollback` - 回滚到指定版本

**UI**：在策略中心增加"版本历史"按钮

**工时**：3天

### 6.2 配置导入导出

**API**：
- `GET /api/admin/config/export?type=sop` - 导出 JSON
- `POST /api/admin/config/import` - 导入 JSON

**导出格式**：

```json
{
  "exportedAt": "2026-01-09T10:00:00Z",
  "version": "1.0",
  "type": "sop",
  "data": {
    "definitions": [...],
    "rules": [...],
    "scripts": [...]
  }
}
```

**工时**：2天

### 6.3 权限体系扩展

**修改文件**：`lib/rbac.ts`

```typescript
export const ROLES = {
  super_admin: {
    name: "超级管理员",
    permissions: ["*"],
  },
  content_admin: {
    name: "内容管理员",
    permissions: [
      "quiz:*",
      "archetype:*",
      "training_handbook:*",
      "methodology:*",
      "audit:read",
    ],
  },
  strategy_admin: {
    name: "策略管理员",
    permissions: [
      "sop:*",
      "script:*",
      "training_plan:*",
      "audit:read",
    ],
  },
  coach_manager: {
    name: "助教主管",
    permissions: [
      "coach:read",
      "coach:assign",
      "customer:read_all",
      "dashboard:read",
    ],
  },
  coach: {
    name: "助教",
    permissions: [
      "customer:own",
      "invite:own",
      "followup:own",
    ],
  },
};

export function hasPermission(role: string, permission: string): boolean {
  const roleConfig = ROLES[role as keyof typeof ROLES];
  if (!roleConfig) return false;
  
  if (roleConfig.permissions.includes("*")) return true;
  
  // 支持通配符匹配
  return roleConfig.permissions.some(p => {
    if (p.endsWith(":*")) {
      const prefix = p.slice(0, -2);
      return permission.startsWith(prefix + ":");
    }
    return p === permission;
  });
}
```

**数据库改动**：User 表增加 permissions 字段（可选，用于细粒度权限）

**工时**：3天

### 6.4 配置冲突检测

**新建文件**：`lib/config-validator.ts`

```typescript
interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * 检测 SOP 规则冲突
 */
export async function validateSopRules(
  prisma: PrismaClient,
  sopId: string
): Promise<ValidationResult> {
  const rules = await prisma.sopRule.findMany({
    where: { sopId, status: "active" },
  });
  
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // 检测规则重叠
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const overlap = checkRuleOverlap(rules[i], rules[j]);
      if (overlap) {
        warnings.push(
          `规则 "${rules[i].ruleId}" 和 "${rules[j].ruleId}" 存在重叠，` +
          `可能导致匹配不确定`
        );
      }
    }
  }
  
  // 检测无效标签
  for (const rule of rules) {
    const requiredTags = JSON.parse(rule.requiredTagsJson || "[]");
    for (const tag of requiredTags) {
      if (!isValidTag(tag)) {
        errors.push(`规则 "${rule.ruleId}" 包含无效标签: ${tag}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * 检测话术与 SOP 的一致性
 */
export async function validateScriptSopConsistency(
  prisma: PrismaClient,
  scriptId: string
): Promise<ValidationResult> {
  const script = await prisma.scriptTemplate.findUnique({
    where: { id: scriptId },
    include: { sop: true },
  });
  
  const warnings: string[] = [];
  
  if (script?.sop) {
    // 检查话术的 triggerStage 是否与 SOP 的 sopStage 一致
    if (script.triggerStage && script.triggerStage !== script.sop.sopStage) {
      warnings.push(
        `话术的触发阶段 (${script.triggerStage}) 与关联 SOP 的阶段 ` +
        `(${script.sop.sopStage}) 不一致`
      );
    }
  }
  
  return {
    valid: true,
    warnings,
    errors: [],
  };
}
```

**工时**：2天

### v2.2 任务清单

| 任务 | 工时 | 负责 | 验收指标 |
|------|------|------|----------|
| 配置版本管理 | 3d | 后端+前端 | 回滚成功率 100% |
| 配置导入导出 | 2d | 后端 | 导入导出可用 |
| 权限体系扩展 | 3d | 后端 | 5级权限可用 |
| 配置冲突检测 | 2d | 后端 | 冲突检测准确率 >90% |
| **总计** | **10d** | | |

---

## 七、用户端移动优化（贯穿各版本）

### 7.1 落地页移动优化

**改动文件**：`app/t/[token]/page.tsx`

```tsx
// 移动端首屏完整展示
<div className="min-h-screen flex flex-col">
  {/* 首屏内容 */}
  <div className="flex-1 flex flex-col justify-center px-4 py-8">
    <h1 className="text-2xl lg:text-3xl font-bold text-center mb-4">
      3分钟，看清你炒股时最容易在哪一步乱动
    </h1>
    
    <p className="text-gray-600 text-center mb-8">
      完成测评后，你的专属助教会帮你解读结果
    </p>
    
    {/* 助教信息卡片 */}
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-4">
        {coach.wechatQrcode && (
          <Image
            src={coach.wechatQrcode}
            alt="助教头像"
            width={60}
            height={60}
            className="rounded-full"
          />
        )}
        <div>
          <div className="font-medium">{coach.name || '专属助教'}</div>
          <div className="text-sm text-gray-500">将为你解读测评结果</div>
        </div>
      </div>
    </div>
    
    {/* 开始按钮（大按钮，移动端友好） */}
    <button
      onClick={handleStart}
      className="w-full py-4 bg-blue-600 text-white text-lg font-medium 
               rounded-xl shadow-lg active:bg-blue-700 transition-colors"
    >
      开始测评
    </button>
  </div>
  
  {/* 底部合规提示 */}
  <div className="px-4 py-3 text-center text-xs text-gray-400">
    本测评帮你看清操作习惯，不涉及投资建议
  </div>
</div>
```

### 7.2 测评页移动优化

**改动文件**：`app/t/[token]/quiz/page.tsx`

```tsx
// 单题单屏，大按钮选项
<div className="min-h-screen flex flex-col bg-gray-50">
  {/* 进度条（固定顶部） */}
  <div className="sticky top-0 bg-white shadow-sm p-4 z-10">
    <div className="flex justify-between text-sm text-gray-600 mb-2">
      <span>第 {current + 1} / {total} 题</span>
      <span>预计还需 {estimatedMinutes} 分钟</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  </div>
  
  {/* 题目内容 */}
  <div className="flex-1 flex flex-col p-4">
    <div className="flex-1 flex items-center">
      <h2 className="text-lg lg:text-xl font-medium leading-relaxed">
        {question.stem}
      </h2>
    </div>
    
    {/* 选项（大按钮） */}
    <div className="space-y-3 pb-safe">
      {question.options.map((option, index) => (
        <button
          key={option.id}
          onClick={() => handleAnswer(option.id)}
          className={`w-full p-4 text-left rounded-xl border-2 transition-all
                    ${selected === option.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white active:border-blue-300'
                    }`}
        >
          <span className="text-gray-400 mr-2">{['A', 'B', 'C', 'D'][index]}.</span>
          {option.text}
        </button>
      ))}
    </div>
  </div>
</div>
```

### 7.3 结果页移动优化

**改动文件**：`app/t/[token]/result/page.tsx`

```tsx
// 首屏：画像 + 核心洞察 + 联系助教
<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
  {/* 首屏 */}
  <div className="min-h-screen flex flex-col p-4">
    {/* 画像标题 */}
    <div className="flex-1 flex flex-col justify-center text-center">
      <div className="text-6xl mb-4">
        {ARCHETYPE_ICONS[archetype.key]}
      </div>
      <h1 className="text-2xl lg:text-3xl font-bold mb-2">
        你是「{archetype.titleCn}」
      </h1>
      <p className="text-gray-600 text-lg mb-8">
        "{archetype.oneLinerCn}"
      </p>
      
      {/* 核心洞察（最多2个） */}
      <div className="space-y-3 mb-8">
        {highlights.slice(0, 2).map(h => (
          <div
            key={h.tag}
            className="bg-white rounded-xl p-4 shadow-sm text-left"
          >
            <div className="font-medium text-blue-900">{h.labelCn}</div>
            <div className="text-sm text-gray-600 mt-1">{h.explanationCn}</div>
          </div>
        ))}
      </div>
    </div>
    
    {/* 联系助教（固定底部） */}
    <div className="space-y-3 pb-safe">
      <p className="text-center text-gray-600">
        想知道怎么用好这个特点？
      </p>
      <button
        onClick={handleContact}
        className="w-full py-4 bg-blue-600 text-white text-lg font-medium 
                 rounded-xl shadow-lg active:bg-blue-700"
      >
        联系助教 {coach.name} 获取解读
      </button>
      {coach.wechatQrcode && (
        <div className="text-center">
          <button
            onClick={() => setShowQR(true)}
            className="text-blue-600 text-sm"
          >
            扫码添加微信
          </button>
        </div>
      )}
    </div>
  </div>
  
  {/* 详细报告（滚动查看） */}
  <div className="p-4">
    <details className="bg-white rounded-xl shadow-sm">
      <summary className="p-4 cursor-pointer font-medium">
        查看详细报告 ▼
      </summary>
      <div className="p-4 border-t">
        {/* 原有的详细内容 */}
      </div>
    </details>
  </div>
</div>
```

---

## 八、里程碑与验收

| 版本 | 完成日期 | 核心验收指标 |
|------|----------|--------------|
| v1.9 | W1 | Admin导航完整度100%，话术使用率+20% |
| v2.0 | W3 | 配置入口减少50%，配置冲突率-80% |
| v2.1 | W5 | 助教筛选效率+50%，高风险响应率+30% |
| v2.2 | W7 | 配置回滚可用，权限体系完整 |

### 关键指标追踪

| 指标 | 当前值 | v1.9目标 | v2.0目标 | v2.1目标 | v2.2目标 |
|------|--------|----------|----------|----------|----------|
| Admin导航完整度 | 70% | 100% | 100% | 100% | 100% |
| 话术使用率 | 基准 | +20% | +30% | +40% | +40% |
| 配置入口数 | 4个 | 4个 | 2个 | 2个 | 2个 |
| 助教筛选效率 | 基准 | 基准 | 基准 | +50% | +50% |
| 高风险响应率 | 基准 | 基准 | 基准 | +30% | +30% |
| 配置误操作率 | 基准 | 基准 | -50% | -70% | -90% |
| 移动端测评完成率 | 基准 | +10% | +15% | +20% | +20% |

---

## 九、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 策略中心开发复杂度高 | 中 | 高 | 分阶段交付，先完成核心功能 |
| 数据迁移风险 | 低 | 高 | 充分测试，保留旧入口兼容 |
| 移动端适配工作量大 | 中 | 中 | 优先核心页面，渐进增强 |
| 权限扩展影响现有用户 | 低 | 中 | 默认保持现有权限不变 |

---

## 十、文件变更清单

### v1.9
```
app/admin/_components/AdminNav.tsx      # 导航重组
app/admin/page.tsx                      # 重定向到数据看板
app/coach/clients/[id]/page.tsx         # 信息分层
app/coach/clients/[id]/_components/ScriptPanel.tsx  # 话术优化
app/coach/_components/TodoPanel.tsx     # 默认展开
lib/ui-copy.ts                          # 合规文案
app/admin/sop/page.tsx                  # 文案优化
app/admin/scripts/page.tsx              # 文案优化
```

### v2.0
```
app/admin/strategy/page.tsx             # 新建：策略中心
app/api/admin/strategy/preview/route.ts # 新建：影响预览
prisma/schema.prisma                    # 话术关联SOP
app/api/coach/scripts/route.ts          # 匹配逻辑重构
```

### v2.1
```
app/coach/dashboard/page.tsx            # 筛选器+批量操作
app/api/coach/customers/route.ts        # 筛选API
app/api/coach/customers/batch/route.ts  # 新建：批量操作
app/coach/clients/[id]/page.tsx         # 高风险预警
app/coach/_components/MobileNav.tsx     # 新建：移动导航
```

### v2.2
```
prisma/schema.prisma                    # ConfigVersion表
app/api/admin/config/versions/route.ts  # 新建：版本历史
app/api/admin/config/rollback/route.ts  # 新建：回滚
app/api/admin/config/export/route.ts    # 新建：导出
app/api/admin/config/import/route.ts    # 新建：导入
lib/rbac.ts                             # 权限扩展
lib/config-validator.ts                 # 新建：冲突检测
```

---

*计划制定日期：2026-01-09*
*计划版本：v2.0*
*总工期：7周*
