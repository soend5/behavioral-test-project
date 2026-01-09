# Requirements Document

## Introduction

本文档记录对测评画像结构的审计结果，对比产品规划文档与当前实现的差异，并明确后续优化方向。

## Glossary

- **Archetype（画像）**: 基于测评结果识别的用户行为类型分类
- **Dimension（维度）**: 用于评估用户行为特征的量化指标
- **Tag（标签）**: 系统生成或助教手动添加的客户特征标记
- **SOP**: 标准操作流程，基于标签匹配推荐的陪跑策略

## 审计背景

用户询问当前测评结构是否符合"6个主画像+16个细分画像深度报告"的结构。经审计发现：

### 产品规划文档分析

`docs/产品实现路径规划.html` 是早期 ChatGPT 对话记录，包含多个设计迭代：
1. **早期方案**：基于4维度（I/O, D/P, R/E, S/F）的16种MBTI式画像
2. **最终方案**：简化为6种主画像 + 6维度行为评分

### 当前实现状态

| 组件 | 规划 | 实现 | 状态 |
|------|------|------|------|
| 主画像 | 6种 | 6种 | ✅ 完整 |
| 细分画像 | 16种（早期方案） | 未实现 | ⚠️ 设计已简化 |
| 行为维度 | 6维度 | 6维度×3级 | ✅ 完整 |
| 深度报告 | 画像+维度+建议 | 画像+维度+特征 | ✅ 基本完整 |

## Requirements

### Requirement 1: 画像结构文档化

**User Story:** As a 产品经理, I want 明确的画像结构文档, so that 团队对产品设计有统一理解。

#### Acceptance Criteria

1. THE Documentation_System SHALL 记录当前6种主画像的完整定义
2. THE Documentation_System SHALL 说明6维度行为评分的计算逻辑
3. THE Documentation_System SHALL 解释为何从16画像简化为6画像的设计决策

### Requirement 2: 结果页深度报告完善

**User Story:** As a 测评用户, I want 更详细的行为分析报告, so that 我能更好地理解自己的行为模式。

#### Acceptance Criteria

1. WHEN 用户查看结果页 THEN THE Result_Page SHALL 显示主画像名称和一句话描述
2. WHEN 用户查看结果页 THEN THE Result_Page SHALL 显示最显著的2个行为维度
3. WHEN 用户展开详细报告 THEN THE Result_Page SHALL 显示所有6个维度的评分
4. WHEN 用户展开详细报告 THEN THE Result_Page SHALL 显示画像的行为特征列表

### Requirement 3: 助教端画像信息展示

**User Story:** As a 助教, I want 在客户详情页看到完整的画像分析, so that 我能更好地制定陪跑策略。

#### Acceptance Criteria

1. WHEN 助教查看客户详情 THEN THE Coach_Panel SHALL 显示客户的主画像
2. WHEN 助教查看客户详情 THEN THE Coach_Panel SHALL 显示客户的行为维度评分
3. WHEN 助教查看客户详情 THEN THE Coach_Panel SHALL 显示基于画像的陪跑建议

### Requirement 4: 画像内容资产维护

**User Story:** As a 管理员, I want 能够管理画像内容, so that 我能根据业务需求调整画像描述。

#### Acceptance Criteria

1. THE Admin_Panel SHALL 提供画像内容的查看功能
2. THE Admin_Panel SHALL 显示每种画像的标题、描述、特征、风险、指导建议
3. IF 画像内容需要更新 THEN THE Admin_Panel SHALL 支持通过种子数据重新导入

## 审计结论

### 符合项

1. ✅ 6种主画像已完整实现（`data/seed/archetypes_v1.json`）
2. ✅ 6维度行为评分已实现（`lib/scoring.ts`）
3. ✅ 结果页展示画像和维度信息（`app/t/[token]/result/page.tsx`）
4. ✅ 助教端可查看客户画像标签

### 差异说明

"16个细分画像"是早期设计探索，最终产品采用了更简洁的"6主画像+6维度"结构：
- 6种主画像提供清晰的用户分类
- 6维度×3级（高/中/低）提供18种行为特征组合
- 实际上通过维度组合可以表达比16种更丰富的用户特征

### 建议

1. **无需新增16细分画像**：当前结构已满足业务需求
2. **可优化深度报告**：增加更多维度解释和个性化建议
3. **文档同步**：更新产品文档，明确当前设计决策

## 关联实现/数据位置

- 画像定义：`data/seed/archetypes_v1.json`
- 画像显示：`lib/tag-display.ts`
- 评分计算：`lib/scoring.ts`
- 结果页：`app/t/[token]/result/page.tsx`
- 数据模型：`prisma/schema.prisma` (Archetype model)
