# Design Document: 测评架构升级 v2

## Overview

本设计文档定义测评系统从 v1 到 v3 的架构升级方案，引入新的4维度体系、情境权重计算、16细分画像，以及前后测对比功能。

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      测评架构 v2                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  v1 快速版  │    │  v2 完整版  │    │  v3 定制版  │        │
│  │   9题       │    │   18题      │    │  24-36题    │        │
│  │  6主画像    │    │ 6主画像     │    │ 6主+16细分  │        │
│  │  稳定度     │    │ +情境权重   │    │ +前后对比   │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              4维度评分引擎 (New)                      │      │
│  │  I/O (信息处理) │ D/P (判断依据)                     │      │
│  │  R/E (决策驱动) │ S/F (执行风格)                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              画像映射引擎                             │      │
│  │  4维度 → 6主画像 │ 4维度 → 16细分画像               │      │
│  └─────────────────────────────────────────────────────┘      │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              结果生成引擎                             │      │
│  │  稳定度 │ 情境漂移 │ 前后对比                        │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4维度体系设计

| 维度 | 代码 | 极性A | 极性B | 说明 |
|------|------|-------|-------|------|
| 信息处理 | I/O | I (内部推演) | O (外部感应) | 决策信息来源倾向 |
| 判断依据 | D/P | D (数据结构) | P (直觉模式) | 判断方式倾向 |
| 决策驱动 | R/E | R (理性控制) | E (情绪牵引) | 决策动力来源 |
| 执行风格 | S/F | S (系统稳定) | F (灵活反应) | 执行方式倾向 |

### 6主画像与4维度映射

| 主画像 | 4维度组合 | 核心特征 |
|--------|-----------|----------|
| 规则执行型 | I+D+R+S | 内部推演、数据驱动、理性、系统化 |
| 情绪牵引型 | O+P+E+F | 外部感应、直觉、情绪、灵活 |
| 经验依赖型 | I+P+R+S | 内部推演、直觉、理性、系统化 |
| 机会捕捉型 | O+D+E+F | 外部感应、数据、情绪、灵活 |
| 防御观望型 | I+D+R+F | 内部推演、数据、理性、灵活 |
| 冲动反应型 | O+P+E+S | 外部感应、直觉、情绪、系统化 |

## Components and Interfaces

### 1. 维度评分模块 (lib/dimension-scoring.ts)

```typescript
// 4维度类型定义
type DimensionAxis = 'info' | 'judge' | 'drive' | 'exec';
type DimensionPole = {
  info: 'I' | 'O';   // Internal / Observational
  judge: 'D' | 'P';  // Data / Pattern
  drive: 'R' | 'E';  // Rational / Emotional
  exec: 'S' | 'F';   // Systematic / Flexible
};

// 维度得分 (0-100, 50为中点)
type DimensionScores = {
  info: number;   // <50 倾向I, >50 倾向O
  judge: number;  // <50 倾向D, >50 倾向P
  drive: number;  // <50 倾向R, >50 倾向E
  exec: number;   // <50 倾向S, >50 倾向F
};

// 情境状态
type ContextState = 'normal' | 'volatile' | 'pressure';

// v2 情境权重得分
type ContextScores = {
  normal: DimensionScores;
  volatile: DimensionScores;
  pressure: DimensionScores;
};

interface DimensionScoringModule {
  // 计算4维度得分
  calculateDimensionScores(answers: Answer[], options: Option[]): DimensionScores;
  
  // v2: 计算情境权重得分
  calculateContextScores(answers: Answer[], options: Option[]): ContextScores;
  
  // 获取维度极性
  getDimensionPoles(scores: DimensionScores): DimensionPole;
}
```

### 2. 画像映射模块 (lib/archetype-mapping.ts)

```typescript
// 6主画像
type PrimaryArchetype = 
  | 'rule_executor'
  | 'emotion_driven'
  | 'experience_reliant'
  | 'opportunity_seeker'
  | 'defensive_observer'
  | 'impulsive_reactor';

// 16细分画像代码
type SubArchetypeCode = 
  | 'IDRS' | 'IDRF' | 'IDES' | 'IDEF'
  | 'IPRS' | 'IPRF' | 'IPES' | 'IPEF'
  | 'ODRS' | 'ODRF' | 'ODES' | 'ODEF'
  | 'OPRS' | 'OPRF' | 'OPES' | 'OPEF';

interface ArchetypeMappingModule {
  // 4维度 → 6主画像
  mapToPrimaryArchetype(poles: DimensionPole): PrimaryArchetype;
  
  // 4维度 → 16细分画像
  mapToSubArchetype(poles: DimensionPole): SubArchetypeCode;
  
  // 计算画像漂移
  calculateDrift(contextScores: ContextScores): ArchetypeDrift;
}

// 画像漂移结果
type ArchetypeDrift = {
  primaryArchetype: PrimaryArchetype;      // 正常状态主画像
  volatileArchetype: PrimaryArchetype;     // 波动状态倾向
  pressureArchetype: PrimaryArchetype;     // 压力状态倾向
  hasDrift: boolean;                       // 是否存在漂移
  driftDescription: string;                // 漂移描述文案
  maxDriftDimension: DimensionAxis | null; // 漂移最大的维度
};
```

### 3. 结果生成模块 (lib/result-generator.ts)

```typescript
interface ResultGeneratorModule {
  // v1 结果生成
  generateV1Result(scores: DimensionScores): V1Result;
  
  // v2 结果生成
  generateV2Result(contextScores: ContextScores): V2Result;
  
  // v3 结果生成
  generateV3Result(scores: DimensionScores, history: Attempt[]): V3Result;
  
  // 前后测对比
  compareAttempts(attempt1: Attempt, attempt2: Attempt): ComparisonResult;
}

type V1Result = {
  version: 'v1';
  primaryArchetype: PrimaryArchetype;
  dimensionScores: DimensionScores;
  dimensionPoles: DimensionPole;
  stability: 'high' | 'medium' | 'low';
  tags: string[];
};

type V2Result = {
  version: 'v2';
  primaryArchetype: PrimaryArchetype;
  contextScores: ContextScores;
  drift: ArchetypeDrift;
  tags: string[];
};

type V3Result = {
  version: 'v3';
  primaryArchetype: PrimaryArchetype;
  subArchetype: SubArchetypeCode;
  dimensionScores: DimensionScores;
  detailedReport: DetailedReport;
  comparison?: ComparisonResult;
  tags: string[];
};

type ComparisonResult = {
  attempt1Id: string;
  attempt2Id: string;
  archetypeChange: {
    from: PrimaryArchetype;
    to: PrimaryArchetype;
    changed: boolean;
  };
  dimensionChanges: Record<DimensionAxis, {
    from: number;
    to: number;
    delta: number;
    significant: boolean;
  }>;
  summary: string;
  recommendations: string[];
};
```

## Data Models

### 数据库扩展 (prisma/schema.prisma)

```prisma
// 扩展 Attempt 模型
model Attempt {
  // ... 现有字段 ...
  
  // 新增字段
  assessmentVersion  String?  @map("assessment_version")  // 'v1' | 'v2' | 'v3'
  dimensionScoresJson String? @map("dimension_scores_json") // 4维度得分
  contextScoresJson   String? @map("context_scores_json")   // v2 情境得分
  subArchetype        String? @map("sub_archetype")         // v3 细分画像代码
  driftAnalysisJson   String? @map("drift_analysis_json")   // v2 漂移分析
}

// 新增 16细分画像内容表
model SubArchetype {
  id              String   @id @default(cuid())
  code            String   @unique  // 'IDRS', 'IDRF', etc.
  nameCn          String   @map("name_cn")
  oneLinerCn      String   @map("one_liner_cn")
  traitsCn        Json     @map("traits_cn")
  risksCn         Json     @map("risks_cn")
  suggestionsCn   Json     @map("suggestions_cn")
  version         String
  status          String   @default("active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([status, version])
  @@map("sub_archetypes")
}

// 新增测评版本访问控制表
model AssessmentAccess {
  id              String   @id @default(cuid())
  customerId      String   @map("customer_id")
  assessmentVersion String @map("assessment_version")  // 'v1' | 'v2' | 'v3'
  grantedAt       DateTime @default(now()) @map("granted_at")
  expiresAt       DateTime? @map("expires_at")
  grantReason     String?  @map("grant_reason")  // 'free' | 'purchase' | 'membership'
  
  customer        Customer @relation(fields: [customerId], references: [id])
  
  @@unique([customerId, assessmentVersion])
  @@index([customerId])
  @@map("assessment_access")
}
```

### 题目数据结构扩展

```json
{
  "id": "v2_01",
  "prompt_cn": "...",
  "context": "normal",  // 新增：情境标记 'normal' | 'volatile' | 'pressure'
  "options": [
    {
      "id": "A",
      "text_cn": "...",
      "score_payload": {
        "dimension_delta": {
          "info": 1,    // -2 to +2, 负数倾向I/D/R/S, 正数倾向O/P/E/F
          "judge": -1,
          "drive": 0,
          "exec": 1
        },
        "archetype_vote": "rule_executor",
        "tags": ["dim:I", "dim:D"]
      }
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 评分确定性

*For any* set of assessment answers, the scoring system SHALL produce exactly one primary archetype, one stability level (v1), and deterministic dimension scores.

**Validates: Requirements 1.2, 1.3**

### Property 2: 维度映射一致性

*For any* combination of 4-dimension scores, the system SHALL consistently map to the same primary archetype and generate corresponding dimension tags.

**Validates: Requirements 2.2, 2.3**

### Property 3: 情境漂移计算

*For any* v2 assessment with context scores, the system SHALL calculate archetype tendencies for each of 3 states (normal, volatile, pressure) and identify the dimension with maximum drift.

**Validates: Requirements 4.3, 5.2**

### Property 4: 细分画像映射

*For any* 4-dimension pole combination (I/O, D/P, R/E, S/F), the system SHALL map to exactly one of 16 sub-archetype codes.

**Validates: Requirements 6.2**

### Property 5: 前后测对比计算

*For any* two assessments from the same customer, the system SHALL calculate dimension score changes and identify significant changes (delta > threshold).

**Validates: Requirements 6.5, 7.3, 7.4**

### Property 6: 历史记录保留

*For any* customer with multiple assessment versions, all previous attempts SHALL remain accessible and queryable.

**Validates: Requirements 9.2, 9.3**

### Property 7: 版本访问控制

*For any* assessment version request, the system SHALL verify customer access rights before allowing assessment start.

**Validates: Requirements 10.1**

## Error Handling

### 评分错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 答案数量不足 | 返回部分结果 + 警告标记 |
| 无效选项ID | 跳过该答案，记录日志 |
| 维度得分计算溢出 | 限制在 0-100 范围内 |
| 画像映射失败 | 返回默认画像 + 错误标记 |

### 访问控制错误

| 错误场景 | HTTP状态码 | 错误码 |
|----------|------------|--------|
| 无权访问该版本 | 403 | ASSESSMENT_VERSION_FORBIDDEN |
| 访问权限已过期 | 403 | ASSESSMENT_ACCESS_EXPIRED |
| 版本不存在 | 400 | INVALID_ASSESSMENT_VERSION |

## Testing Strategy

### 单元测试

1. **维度评分测试**
   - 测试各种答案组合的维度得分计算
   - 测试边界值（全选同一极性）
   - 测试空答案处理

2. **画像映射测试**
   - 测试所有16种维度组合到细分画像的映射
   - 测试6主画像映射的正确性
   - 测试漂移计算逻辑

3. **结果生成测试**
   - 测试v1/v2/v3各版本结果结构
   - 测试前后测对比计算
   - 测试标签生成

### 属性测试

使用 fast-check 进行属性测试：

1. **Property 1 测试**: 生成随机答案集，验证总是产生有效的画像和稳定度
2. **Property 2 测试**: 生成随机维度得分，验证映射一致性
3. **Property 4 测试**: 枚举所有16种极性组合，验证细分画像映射完整性
4. **Property 5 测试**: 生成随机的两次测评结果，验证对比计算正确性

### 集成测试

1. 完整测评流程（从开始到结果展示）
2. 版本升级流程
3. 前后测对比流程
4. 访问控制验证

## 实施计划

### Phase 1: v1 优化（当前迭代）

1. 重构评分模块，引入4维度体系
2. 更新题目数据结构，添加维度得分
3. 优化结果页展示，显示维度信息
4. 保持向后兼容，现有数据可继续使用

### Phase 2: v2 开发（下一迭代）

1. 设计18题完整版题库（含情境标记）
2. 实现情境权重计算模块
3. 实现画像漂移分析
4. 开发v2结果页

### Phase 3: v3 开发（长期规划）

1. 设计24-36题深度版题库
2. 实现16细分画像内容体系
3. 开发前后测对比功能
4. 实现访问控制和商业分层
