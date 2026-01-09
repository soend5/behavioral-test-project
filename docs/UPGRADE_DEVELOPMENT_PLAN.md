# 升级版本开发计划

> 基于《深度体验测评报告》制定
> 版本：v2.0 升级计划
> 日期：2026-01-09
> 排除范围：付费模块（后续单独规划）

---

## 一、版本规划总览

| 版本 | 周期 | 主题 | 核心目标 |
|------|------|------|----------|
| v1.5 | 1-2周 | Quick Wins | 提升转化率+完成率 |
| v1.6 | 2-3周 | 助教效能 | 话术库+跟进记录 |
| v1.7 | 2-3周 | 数据驱动 | 看板+埋点+分层 |
| v1.8 | 3-4周 | 训练闭环 | 训练模块+复测机制 |

**总周期：8-12周**

---

## 二、v1.5 Quick Wins（1-2周）

### 目标
- 测评完成率 +15%
- 结果页→联系助教率 +30%
- 移动端体验优化

### 任务清单

#### 2.1 落地页优化
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 价值主张文案优化 | P0 | 0.5d | 产品 |
| 首屏结构调整 | P0 | 1d | 前端 |
| 合规提示位置调整 | P1 | 0.5d | 前端 |

**具体改动：**

```tsx
// app/t/[token]/page.tsx 改动点

// 1. 标题优化
- <h1>欢迎参加测评</h1>
+ <h1>3分钟，看清你炒股时最容易在哪一步乱动</h1>

// 2. 副标题增加价值感
- <p>请确认邀请信息后开始测评。</p>
+ <p>完成测评后，你的专属助教会帮你解读结果</p>

// 3. 合规提示移至底部，措辞简化
- 顶部黄色提示框
+ 底部灰色小字："本测评帮你看清操作习惯，不涉及投资建议"
```

#### 2.2 测评页优化
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 进度条组件 | P0 | 1d | 前端 |
| 预估剩余时间 | P1 | 0.5d | 前端 |
| 选项点击区域扩大 | P1 | 0.5d | 前端 |
| 选中状态反馈优化 | P2 | 0.5d | 前端 |

**具体改动：**

```tsx
// app/t/[token]/quiz/page.tsx 新增组件

// 进度条组件
function ProgressBar({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  const estimatedMinutes = Math.ceil((total - current) * 0.3); // 每题约20秒
  
  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>已完成 {current}/{total} 题</span>
        <span>预计还需 {estimatedMinutes} 分钟</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// 选项样式优化（增大点击区域）
- className="flex items-center gap-2"
+ className="flex items-center gap-3 p-4 border rounded-lg hover:bg-blue-50 
+            cursor-pointer transition-colors min-h-[60px]"
```

#### 2.3 结果页重构
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 首屏结构重构 | P0 | 2d | 前端 |
| 核心洞察卡片 | P0 | 1d | 前端 |
| CTA按钮优化 | P0 | 0.5d | 前端 |
| 详细报告折叠 | P1 | 1d | 前端 |

**新结构设计：**

```tsx
// app/t/[token]/result/page.tsx 重构

// 首屏（Above the fold）
<section className="min-h-[80vh] flex flex-col justify-center">
  {/* 画像标题 */}
  <h1 className="text-3xl font-bold mb-2">
    你是「{archetype.titleCn}」
  </h1>
  
  {/* 一句话描述 */}
  <p className="text-xl text-gray-600 mb-6">
    "{archetype.oneLinerCn}"
  </p>
  
  {/* 核心洞察（最多2个） */}
  <div className="space-y-3 mb-8">
    {highlights.slice(0, 2).map(h => (
      <div key={h.tag} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="font-medium">{h.labelCn}</div>
        <div className="text-sm text-gray-600">{h.explanationCn}</div>
      </div>
    ))}
  </div>
  
  {/* 强CTA */}
  <div className="space-y-3">
    <p className="text-gray-600">想知道怎么用好这个特点？</p>
    <button className="w-full py-4 bg-blue-600 text-white rounded-lg text-lg font-medium">
      联系助教 {coach.name} 获取解读
    </button>
    {coach.wechatQrcode && (
      <div className="text-center">
        <Image src={coach.wechatQrcode} alt="微信二维码" width={120} height={120} />
      </div>
    )}
  </div>
</section>

{/* 详细报告（折叠） */}
<details className="mt-8">
  <summary className="cursor-pointer text-blue-600">查看详细报告 ▼</summary>
  {/* 原有的维度、标签等内容 */}
</details>
```

#### 2.4 文案优化清单
| 位置 | 原文案 | 新文案 |
|------|--------|--------|
| 落地页标题 | 欢迎参加测评 | 3分钟，看清你炒股时最容易在哪一步乱动 |
| 落地页副标题 | 请确认邀请信息后开始测评 | 完成测评后，你的专属助教会帮你解读结果 |
| 测评页标题 | 测评题目 | 快速测评 |
| 结果页标题 | 测评结果概览 | 你的操作习惯画像 |
| 合规提示 | 本测评及结果用于生成行为结构画像与沟通建议参考，不构成投资顾问服务或任何买卖建议，不承诺收益。 | 本测评帮你看清操作习惯，不涉及投资建议 |

### v1.5 验收标准
- [ ] 落地页→开始测评率 ≥70%（当前估计~65%）
- [ ] 测评完成率 ≥75%（当前估计~60%）
- [ ] 结果页→联系助教率 ≥25%（当前估计~15%）
- [ ] 移动端完成率与PC端差距 <10%

---

## 三、v1.6 助教效能（2-3周）

### 目标
- 助教沟通效率 +50%
- 话术使用率 ≥50%
- 跟进记录覆盖率 ≥80%

### 任务清单

#### 3.1 话术库系统
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 话术数据模型设计 | P0 | 0.5d | 后端 |
| 话术CRUD API | P0 | 1.5d | 后端 |
| 话术管理页面（Admin） | P1 | 2d | 前端 |
| 话术面板组件（Coach） | P0 | 2d | 前端 |
| 话术变量替换 | P1 | 1d | 后端 |

**数据模型：**

```prisma
// prisma/schema.prisma 新增

model ScriptTemplate {
  id          String   @id @default(cuid())
  name        String                          // "首次沟通-规则执行型"
  category    String                          // "首次沟通" / "跟进" / "转化"
  triggerStage    String?                     // "pre" / "mid" / "post"
  triggerArchetype String?                    // "rule_executor" 等
  triggerTags     String?  @map("trigger_tags_json")  // JSON array
  content     String   @db.Text               // 话术内容
  variables   String?  @map("variables_json") // JSON array ["customerName"]
  status      String   @default("active")
  usageCount  Int      @default(0) @map("usage_count")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([status, category])
  @@index([triggerStage, triggerArchetype])
  @@map("script_templates")
}

model ScriptUsageLog {
  id          String   @id @default(cuid())
  scriptId    String   @map("script_id")
  coachId     String   @map("coach_id")
  customerId  String   @map("customer_id")
  usedAt      DateTime @default(now()) @map("used_at")

  @@index([coachId, usedAt])
  @@index([scriptId])
  @@map("script_usage_log")
}
```

**API设计：**

```typescript
// app/api/admin/scripts/route.ts
GET  /api/admin/scripts              // 列表
POST /api/admin/scripts              // 创建
PATCH /api/admin/scripts/[id]        // 更新
DELETE /api/admin/scripts/[id]       // 删除

// app/api/coach/scripts/route.ts
GET /api/coach/scripts?customerId=xxx  // 获取匹配的话术（基于客户标签）
POST /api/coach/scripts/[id]/use       // 记录使用
```

**话术面板UI：**

```tsx
// app/coach/clients/[id]/_components/ScriptPanel.tsx

function ScriptPanel({ customerId, archetype, stage, tags }) {
  const [scripts, setScripts] = useState([]);
  const [copied, setCopied] = useState<string | null>(null);

  // 获取匹配的话术
  useEffect(() => {
    fetch(`/api/coach/scripts?customerId=${customerId}`)
      .then(res => res.json())
      .then(data => setScripts(data.scripts));
  }, [customerId]);

  async function copyScript(script) {
    // 变量替换
    const content = renderScript(script.content, { customerName, archetype });
    await navigator.clipboard.writeText(content);
    setCopied(script.id);
    
    // 记录使用
    await fetch(`/api/coach/scripts/${script.id}/use`, {
      method: 'POST',
      body: JSON.stringify({ customerId })
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">💬 推荐话术</h3>
      <div className="space-y-3">
        {scripts.map(script => (
          <div key={script.id} className="border rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium">{script.name}</span>
              <button
                onClick={() => copyScript(script)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
              >
                {copied === script.id ? '已复制 ✓' : '复制'}
              </button>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">{script.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 跟进记录系统
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 跟进记录数据模型 | P0 | 0.5d | 后端 |
| 跟进记录CRUD API | P0 | 1d | 后端 |
| 跟进记录组件 | P0 | 1.5d | 前端 |
| 跟进提醒逻辑 | P2 | 1d | 后端 |

**数据模型：**

```prisma
// prisma/schema.prisma 新增

model FollowUpLog {
  id          String   @id @default(cuid())
  customerId  String   @map("customer_id")
  coachId     String   @map("coach_id")
  type        String                          // "call" / "wechat" / "note"
  content     String   @db.Text
  nextAction  String?  @map("next_action")    // 下一步行动
  nextDate    DateTime? @map("next_date")     // 下次跟进日期
  createdAt   DateTime @default(now()) @map("created_at")

  customer    Customer @relation(fields: [customerId], references: [id])
  coach       User     @relation(fields: [coachId], references: [id])

  @@index([customerId, createdAt])
  @@index([coachId, nextDate])
  @@map("follow_up_logs")
}
```

**跟进记录UI：**

```tsx
// app/coach/clients/[id]/_components/FollowUpSection.tsx

function FollowUpSection({ customerId }) {
  const [logs, setLogs] = useState([]);
  const [newLog, setNewLog] = useState({ type: 'wechat', content: '', nextAction: '', nextDate: '' });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">📝 跟进记录</h3>
      
      {/* 新增记录 */}
      <div className="border rounded p-3 mb-4 bg-gray-50">
        <div className="flex gap-2 mb-2">
          {['wechat', 'call', 'note'].map(type => (
            <button
              key={type}
              onClick={() => setNewLog(p => ({ ...p, type }))}
              className={`px-3 py-1 rounded text-sm ${
                newLog.type === type ? 'bg-blue-600 text-white' : 'bg-white border'
              }`}
            >
              {type === 'wechat' ? '微信' : type === 'call' ? '电话' : '备注'}
            </button>
          ))}
        </div>
        <textarea
          value={newLog.content}
          onChange={e => setNewLog(p => ({ ...p, content: e.target.value }))}
          placeholder="记录沟通内容..."
          className="w-full border rounded p-2 text-sm h-20 mb-2"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={newLog.nextAction}
            onChange={e => setNewLog(p => ({ ...p, nextAction: e.target.value }))}
            placeholder="下一步行动"
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={newLog.nextDate}
            onChange={e => setNewLog(p => ({ ...p, nextDate: e.target.value }))}
            className="border rounded px-2 py-1 text-sm"
          />
          <button className="px-4 py-1 bg-blue-600 text-white rounded text-sm">
            保存
          </button>
        </div>
      </div>

      {/* 历史记录 */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="border-l-2 border-blue-200 pl-3 py-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{log.type === 'wechat' ? '微信' : log.type === 'call' ? '电话' : '备注'}</span>
              <span>{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm mt-1">{log.content}</p>
            {log.nextAction && (
              <p className="text-xs text-blue-600 mt-1">→ {log.nextAction}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 3.3 客户详情页重构
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 页面布局重构 | P0 | 1.5d | 前端 |
| Tab切换组件 | P1 | 0.5d | 前端 |
| 关键信息置顶 | P0 | 0.5d | 前端 |

**新布局设计：**

```
┌─────────────────────────────────────────────────────────────────┐
│ 客户详情页                                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 关键信息卡片（置顶）                                          │ │
│ │ 昵称: xxx | 画像: 规则执行型 | 阶段: pre | 最近测评: 2天前    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌───────────────────────────┐ ┌───────────────────────────────┐ │
│ │ 左侧：主内容区             │ │ 右侧：工具区                   │ │
│ │                           │ │                               │ │
│ │ [测评结果] [跟进记录] [时间线]│ │ 实时陪跑提示                  │ │
│ │                           │ │ ─────────────────             │ │
│ │ Tab内容区域                │ │ 阶段: 解释期                   │ │
│ │                           │ │ 目标: 建立信任                 │ │
│ │                           │ │ 策略: ...                     │ │
│ │                           │ │                               │ │
│ │                           │ │ 推荐话术                       │ │
│ │                           │ │ ─────────────────             │ │
│ │                           │ │ [话术1] [复制]                 │ │
│ │                           │ │ [话术2] [复制]                 │ │
│ │                           │ │                               │ │
│ │                           │ │ 标签管理                       │ │
│ │                           │ │ ─────────────────             │ │
│ │                           │ │ [标签列表]                     │ │
│ └───────────────────────────┘ └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### v1.6 验收标准
- [ ] 话术库包含 ≥20 条模板（覆盖6画像×3阶段）
- [ ] 助教话术使用率 ≥50%
- [ ] 跟进记录覆盖率 ≥80%（每客户至少1条）
- [ ] 客户详情页加载时间 <2s

---

## 四、v1.7 数据驱动（2-3周）

### 目标
- 建立核心指标看板
- 完善埋点体系
- 支持客户分层筛选

### 任务清单

#### 4.1 埋点系统
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 埋点事件定义 | P0 | 0.5d | 产品 |
| 前端埋点SDK | P0 | 1d | 前端 |
| 埋点数据存储 | P0 | 1d | 后端 |
| 埋点数据API | P1 | 1d | 后端 |

**埋点事件清单：**

```typescript
// lib/tracking.ts

export const TRACKING_EVENTS = {
  // 落地页
  LANDING_PAGE_VIEW: 'landing_page_view',
  LANDING_START_CLICK: 'landing_start_click',
  
  // 测评页
  QUIZ_START: 'quiz_start',
  QUIZ_ANSWER: 'quiz_answer',
  QUIZ_SUBMIT: 'quiz_submit',
  QUIZ_ABANDON: 'quiz_abandon',
  
  // 结果页
  RESULT_PAGE_VIEW: 'result_page_view',
  RESULT_DETAIL_EXPAND: 'result_detail_expand',
  RESULT_CONTACT_CLICK: 'result_contact_click',
  RESULT_QR_SCAN: 'result_qr_scan',
  
  // 助教端
  COACH_CUSTOMER_VIEW: 'coach_customer_view',
  COACH_SCRIPT_COPY: 'coach_script_copy',
  COACH_FOLLOWUP_CREATE: 'coach_followup_create',
  COACH_TAG_ADD: 'coach_tag_add',
} as const;

// 埋点函数
export function track(event: string, properties?: Record<string, any>) {
  // 发送到后端
  fetch('/api/tracking', {
    method: 'POST',
    body: JSON.stringify({
      event,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      userId: getUserId(),
    }),
  }).catch(() => {}); // 静默失败
}
```

#### 4.2 数据看板
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 看板数据聚合API | P0 | 2d | 后端 |
| Admin看板页面 | P0 | 2d | 前端 |
| Coach个人看板 | P1 | 1d | 前端 |
| 定时聚合任务 | P2 | 1d | 后端 |

**Admin看板设计：**

```tsx
// app/admin/dashboard/page.tsx

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="今日测评" value={stats.todayAttempts} trend={+15} />
        <MetricCard title="完成率" value={`${stats.completionRate}%`} trend={+3} />
        <MetricCard title="联系率" value={`${stats.contactRate}%`} trend={-2} />
        <MetricCard title="活跃助教" value={stats.activeCoaches} />
      </div>

      {/* 漏斗图 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">转化漏斗（近7天）</h3>
        <FunnelChart data={[
          { stage: '邀请发送', count: 100, rate: 100 },
          { stage: '落地页访问', count: 85, rate: 85 },
          { stage: '开始测评', count: 68, rate: 68 },
          { stage: '完成测评', count: 53, rate: 53 },
          { stage: '联系助教', count: 12, rate: 12 },
        ]} />
      </div>

      {/* 画像分布 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">画像分布</h3>
          <PieChart data={stats.archetypeDistribution} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">阶段分布</h3>
          <PieChart data={stats.stageDistribution} />
        </div>
      </div>

      {/* 助教排行 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">助教效能排行</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">助教</th>
              <th className="py-2">客户数</th>
              <th className="py-2">完成测评</th>
              <th className="py-2">跟进记录</th>
              <th className="py-2">话术使用</th>
            </tr>
          </thead>
          <tbody>
            {stats.coachRanking.map(coach => (
              <tr key={coach.id} className="border-b">
                <td className="py-2">{coach.name}</td>
                <td className="py-2">{coach.customerCount}</td>
                <td className="py-2">{coach.completedAttempts}</td>
                <td className="py-2">{coach.followUpCount}</td>
                <td className="py-2">{coach.scriptUsageCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### 4.3 客户分层
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 分层规则配置 | P0 | 1d | 后端 |
| 分层标签自动打标 | P0 | 1d | 后端 |
| 客户列表筛选 | P0 | 1d | 前端 |
| 分层统计 | P1 | 0.5d | 后端 |

**分层规则：**

```typescript
// lib/customer-segment.ts

export const SEGMENT_RULES = {
  high_potential: {
    name: '高潜力',
    color: 'gold',
    rules: [
      { field: 'latestAttempt.version', operator: 'eq', value: 'pro' },
      { field: 'stability', operator: 'eq', value: 'high' },
    ],
    logic: 'AND',
  },
  needs_attention: {
    name: '需关注',
    color: 'red',
    rules: [
      { field: 'archetype', operator: 'eq', value: 'impulsive_reactor' },
      { field: 'stability', operator: 'eq', value: 'low' },
    ],
    logic: 'OR',
  },
  inactive: {
    name: '沉默',
    color: 'gray',
    rules: [
      { field: 'lastActivityDays', operator: 'gt', value: 14 },
    ],
    logic: 'AND',
  },
};

// 自动打标函数
export function calculateSegment(customer: CustomerWithAttempt): string[] {
  const segments: string[] = [];
  for (const [key, rule] of Object.entries(SEGMENT_RULES)) {
    if (matchRule(customer, rule)) {
      segments.push(key);
    }
  }
  return segments;
}
```

### v1.7 验收标准
- [ ] Admin看板包含核心指标（测评数、完成率、联系率）
- [ ] 漏斗数据准确率 ≥95%
- [ ] 客户分层覆盖率 100%
- [ ] 看板加载时间 <3s

---

## 五、v1.8 训练闭环（3-4周）

### 目标
- 建立7天训练模块MVP
- 复测机制上线
- 行为演进可视化

### 任务清单

#### 5.1 训练模块
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 训练计划数据模型 | P0 | 1d | 后端 |
| 训练任务CRUD API | P0 | 2d | 后端 |
| 训练计划管理（Admin） | P1 | 2d | 前端 |
| 训练任务页面（Client） | P0 | 3d | 前端 |
| 任务完成追踪 | P0 | 1d | 后端 |

**数据模型：**

```prisma
// prisma/schema.prisma 新增

model TrainingPlan {
  id          String   @id @default(cuid())
  name        String                          // "7天行为训练"
  description String?
  durationDays Int     @map("duration_days")  // 7
  status      String   @default("active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tasks       TrainingTask[]
  enrollments TrainingEnrollment[]

  @@map("training_plans")
}

model TrainingTask {
  id          String   @id @default(cuid())
  planId      String   @map("plan_id")
  dayNo       Int      @map("day_no")         // 1-7
  orderNo     Int      @map("order_no")       // 任务顺序
  type        String                          // "read" / "reflect" / "action"
  title       String
  description String   @db.Text
  contentJson String?  @map("content_json")   // 任务内容（问题/阅读材料等）
  estimatedMinutes Int @map("estimated_minutes")
  createdAt   DateTime @default(now()) @map("created_at")

  plan        TrainingPlan @relation(fields: [planId], references: [id])
  completions TaskCompletion[]

  @@unique([planId, dayNo, orderNo])
  @@map("training_tasks")
}

model TrainingEnrollment {
  id          String   @id @default(cuid())
  planId      String   @map("plan_id")
  customerId  String   @map("customer_id")
  attemptId   String?  @map("attempt_id")     // 关联的测评
  startedAt   DateTime @map("started_at")
  completedAt DateTime? @map("completed_at")
  status      String   @default("active")     // "active" / "completed" / "abandoned"

  plan        TrainingPlan @relation(fields: [planId], references: [id])
  customer    Customer @relation(fields: [customerId], references: [id])
  completions TaskCompletion[]

  @@unique([planId, customerId])
  @@index([customerId, status])
  @@map("training_enrollments")
}

model TaskCompletion {
  id           String   @id @default(cuid())
  enrollmentId String   @map("enrollment_id")
  taskId       String   @map("task_id")
  responseJson String?  @map("response_json")  // 用户回答
  completedAt  DateTime @default(now()) @map("completed_at")

  enrollment   TrainingEnrollment @relation(fields: [enrollmentId], references: [id])
  task         TrainingTask @relation(fields: [taskId], references: [id])

  @@unique([enrollmentId, taskId])
  @@map("task_completions")
}
```

**训练页面设计：**

```tsx
// app/t/[token]/training/page.tsx

export default function TrainingPage({ params }) {
  const { enrollment, tasks, completions } = useTrainingData(params.token);
  
  const currentDay = calculateCurrentDay(enrollment.startedAt);
  const todayTasks = tasks.filter(t => t.dayNo === currentDay);
  const completedTaskIds = new Set(completions.map(c => c.taskId));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 进度概览 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-xl font-bold mb-2">7天行为训练</h1>
          <div className="flex gap-1 mb-4">
            {[1,2,3,4,5,6,7].map(day => (
              <div
                key={day}
                className={`flex-1 h-2 rounded ${
                  day < currentDay ? 'bg-green-500' :
                  day === currentDay ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600">
            第 {currentDay} 天 · 今日 {todayTasks.length} 个任务
          </p>
        </div>

        {/* 今日任务 */}
        <div className="space-y-4">
          {todayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              completed={completedTaskIds.has(task.id)}
              onComplete={handleComplete}
            />
          ))}
        </div>

        {/* 完成今日任务后 */}
        {todayTasks.every(t => completedTaskIds.has(t.id)) && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
            <p className="text-green-800 font-medium">🎉 今日任务已完成！</p>
            <p className="text-sm text-green-600 mt-1">明天继续，保持节奏</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 5.2 复测机制
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 复测邀请逻辑 | P0 | 1d | 后端 |
| 复测提醒（待办） | P0 | 0.5d | 后端 |
| 复测对比分析 | P0 | 2d | 后端 |
| 对比结果页面 | P0 | 2d | 前端 |

**复测对比API：**

```typescript
// app/api/public/attempt/compare/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  // 获取当前测评和上次测评
  const currentAttempt = await getAttemptByToken(token);
  const previousAttempt = await getPreviousAttempt(currentAttempt.customerId);
  
  if (!previousAttempt) {
    return json({ ok: true, data: { hasComparison: false } });
  }

  // 计算变化
  const comparison = {
    hasComparison: true,
    current: {
      archetype: currentAttempt.archetype,
      stage: currentAttempt.stage,
      dimensions: currentAttempt.dimensions,
      date: currentAttempt.submittedAt,
    },
    previous: {
      archetype: previousAttempt.archetype,
      stage: previousAttempt.stage,
      dimensions: previousAttempt.dimensions,
      date: previousAttempt.submittedAt,
    },
    changes: calculateChanges(currentAttempt, previousAttempt),
  };

  return json({ ok: true, data: comparison });
}

function calculateChanges(current, previous) {
  const changes = [];
  
  // 画像变化
  if (current.archetype !== previous.archetype) {
    changes.push({
      type: 'archetype',
      from: previous.archetype,
      to: current.archetype,
      significance: 'high',
    });
  }
  
  // 阶段变化
  if (current.stage !== previous.stage) {
    changes.push({
      type: 'stage',
      from: previous.stage,
      to: current.stage,
      significance: 'high',
    });
  }
  
  // 维度变化（变化>10分的）
  for (const dim of DIMENSION_KEYS) {
    const diff = current.dimensions[dim] - previous.dimensions[dim];
    if (Math.abs(diff) >= 10) {
      changes.push({
        type: 'dimension',
        dimension: dim,
        from: previous.dimensions[dim],
        to: current.dimensions[dim],
        diff,
        significance: Math.abs(diff) >= 20 ? 'high' : 'medium',
      });
    }
  }
  
  return changes;
}
```

**对比结果页面：**

```tsx
// app/t/[token]/result/compare/page.tsx

function ComparisonSection({ comparison }) {
  if (!comparison.hasComparison) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600">这是你的首次测评，完成训练后可以复测对比变化</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">📊 与上次测评对比</h3>
      
      {/* 时间跨度 */}
      <p className="text-sm text-gray-600">
        上次测评：{formatDate(comparison.previous.date)}
        （{daysBetween(comparison.previous.date, comparison.current.date)} 天前）
      </p>

      {/* 变化列表 */}
      {comparison.changes.length > 0 ? (
        <div className="space-y-3">
          {comparison.changes.map((change, i) => (
            <ChangeCard key={i} change={change} />
          ))}
        </div>
      ) : (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">你的行为结构保持稳定，这是好事！</p>
        </div>
      )}

      {/* 维度对比图 */}
      <DimensionCompareChart
        current={comparison.current.dimensions}
        previous={comparison.previous.dimensions}
      />
    </div>
  );
}
```

#### 5.3 复测提醒
| 任务 | 优先级 | 工时 | 负责 |
|------|--------|------|------|
| 复测时机计算 | P0 | 0.5d | 后端 |
| 待办面板集成 | P0 | 0.5d | 前端 |
| 复测邀请一键创建 | P1 | 0.5d | 前端 |

**复测提醒逻辑：**

```typescript
// lib/retest-reminder.ts

export function shouldRemindRetest(customer: CustomerWithAttempts): {
  shouldRemind: boolean;
  reason?: string;
  daysSinceLastTest?: number;
} {
  const lastAttempt = customer.attempts[0];
  if (!lastAttempt?.submittedAt) {
    return { shouldRemind: false };
  }

  const daysSince = daysBetween(lastAttempt.submittedAt, new Date());

  // 完成训练后提醒
  const enrollment = customer.enrollments?.find(e => e.status === 'completed');
  if (enrollment && daysSince >= 7) {
    return {
      shouldRemind: true,
      reason: '已完成训练，建议复测查看变化',
      daysSinceLastTest: daysSince,
    };
  }

  // 30天定期提醒
  if (daysSince >= 30) {
    return {
      shouldRemind: true,
      reason: '距上次测评已超过30天',
      daysSinceLastTest: daysSince,
    };
  }

  return { shouldRemind: false };
}
```

### v1.8 验收标准
- [ ] 训练计划包含7天×3任务 = 21个任务
- [ ] 训练开始率 ≥30%（完成测评后）
- [ ] 训练完成率 ≥50%（开始训练后）
- [ ] 复测率 ≥20%（30天内）
- [ ] 对比报告生成成功率 100%

---

## 六、技术债务与基础设施

### 需要同步处理的技术债务

| 任务 | 版本 | 工时 | 说明 |
|------|------|------|------|
| 移动端响应式优化 | v1.5 | 1d | 全局检查+修复 |
| 错误边界处理 | v1.5 | 0.5d | 增加ErrorBoundary |
| 加载状态优化 | v1.5 | 0.5d | Skeleton组件 |
| API响应时间监控 | v1.7 | 1d | 慢查询告警 |
| 数据库索引优化 | v1.7 | 0.5d | 基于查询分析 |
| 单元测试补充 | 持续 | 每版本1d | 核心逻辑覆盖 |

### 数据库迁移计划

```bash
# v1.6 迁移
prisma migrate dev --name add_scripts_and_followup

# v1.7 迁移
prisma migrate dev --name add_tracking_events

# v1.8 迁移
prisma migrate dev --name add_training_module
```

---

## 七、团队分工建议

### 角色与职责

| 角色 | 职责 | 参与版本 |
|------|------|----------|
| 产品 | 需求定义、验收标准、文案 | 全部 |
| 前端 | 页面开发、交互优化 | 全部 |
| 后端 | API开发、数据模型、性能 | v1.6+ |
| 设计 | UI优化、可视化设计 | v1.5、v1.8 |

### 每版本工时估算

| 版本 | 产品 | 前端 | 后端 | 设计 | 总计 |
|------|------|------|------|------|------|
| v1.5 | 2d | 6d | 0d | 1d | 9d |
| v1.6 | 2d | 6d | 5d | 0d | 13d |
| v1.7 | 1d | 4d | 6d | 0d | 11d |
| v1.8 | 3d | 7d | 6d | 2d | 18d |
| **总计** | **8d** | **23d** | **17d** | **3d** | **51d** |

---

## 八、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 话术内容质量不足 | 中 | 高 | 提前准备话术模板，邀请助教参与评审 |
| 训练内容设计耗时 | 高 | 中 | 复用现有training_handbook内容 |
| 埋点数据量过大 | 中 | 中 | 设置采样率，定期清理 |
| 复测率低于预期 | 中 | 中 | 增加提醒触点，优化复测价值感 |

---

## 九、里程碑与检查点

| 日期 | 里程碑 | 检查点 |
|------|--------|--------|
| W2 | v1.5 上线 | 完成率≥75%，联系率≥25% |
| W5 | v1.6 上线 | 话术使用率≥50%，跟进覆盖率≥80% |
| W8 | v1.7 上线 | 看板可用，分层覆盖100% |
| W12 | v1.8 上线 | 训练完成率≥50%，复测率≥20% |

---

## 附录：文件变更清单

### v1.5 涉及文件
```
app/t/[token]/page.tsx          # 落地页优化
app/t/[token]/quiz/page.tsx     # 测评页优化
app/t/[token]/result/page.tsx   # 结果页重构
lib/ui-copy.ts                  # 文案更新
```

### v1.6 涉及文件
```
prisma/schema.prisma            # 新增ScriptTemplate、FollowUpLog
app/api/admin/scripts/          # 话术管理API
app/api/coach/scripts/          # 话术获取API
app/api/coach/followup/         # 跟进记录API
app/admin/scripts/page.tsx      # 话术管理页面
app/coach/clients/[id]/page.tsx # 客户详情页重构
app/coach/clients/[id]/_components/  # 新增组件
```

### v1.7 涉及文件
```
prisma/schema.prisma            # 新增TrackingEvent
lib/tracking.ts                 # 埋点SDK
lib/customer-segment.ts         # 分层逻辑
app/api/tracking/route.ts       # 埋点API
app/api/admin/dashboard/route.ts # 看板数据API
app/admin/dashboard/page.tsx    # Admin看板
app/coach/dashboard/page.tsx    # Coach看板更新
```

### v1.8 涉及文件
```
prisma/schema.prisma            # 新增Training相关表
app/api/admin/training/         # 训练管理API
app/api/public/training/        # 训练任务API
app/api/public/attempt/compare/ # 复测对比API
app/t/[token]/training/page.tsx # 训练页面
app/t/[token]/result/compare/   # 对比结果页面
lib/retest-reminder.ts          # 复测提醒逻辑
```

---

*计划制定日期：2026-01-09*
*计划版本：v1.0*
