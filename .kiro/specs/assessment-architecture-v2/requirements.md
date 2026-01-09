# Requirements Document

## Introduction

本文档定义测评架构的三阶段演进规划，从当前 v1（快速版）逐步升级到 v2（完整版）和 v3（高端定制版），建立更精准、更有商业价值的测评体系。

## Glossary

- **主画像（Primary Archetype）**: 6种核心行为类型分类
- **细分画像（Sub-Archetype）**: 16种基于4维度组合的深度画像
- **情境权重（Context Weight）**: 不同状态下（正常/波动/压力）的行为倾向权重
- **稳定度（Stability）**: 回答集中程度，反映画像信号清晰度
- **画像漂移（Archetype Drift）**: 压力状态下从主画像滑向其他画像的倾向

## 版本演进概览

| 版本 | 题量 | 画像体系 | 核心特性 | 目标用户 |
|------|------|----------|----------|----------|
| v1 | 9题 | 6主画像 | 稳定度提示 | 所有用户（快速筛选） |
| v2 | 18题 | 6主画像+情境权重 | 状态漂移分析 | 付费用户（深度分析） |
| v3 | 24-36题 | 6主画像+16细分画像 | 前后对比、定制报告 | 高端用户（年度会员） |

---

## Requirements

### Requirement 1: v1 快速版测评（当前版本优化）

**User Story:** As a 新用户, I want 快速完成测评并获得清晰的画像结果, so that 我能初步了解自己的行为模式并与助教建立联系。

#### Acceptance Criteria

1. THE Assessment_System SHALL 提供9道题目的快速测评
2. WHEN 用户完成测评 THEN THE System SHALL 识别出1个主画像（6选1）
3. WHEN 用户完成测评 THEN THE System SHALL 计算稳定度（高/中/低）
4. THE Result_Page SHALL 显示主画像名称、一句话描述、核心特征
5. THE Result_Page SHALL 显示稳定度提示（回答集中度）
6. IF 稳定度为低 THEN THE Result_Page SHALL 提示"建议完成完整版测评获得更准确结果"

### Requirement 2: v1 维度重新设计

**User Story:** As a 产品设计师, I want 更科学的测评维度, so that 测评结果更准确且易于向用户解释。

#### Acceptance Criteria

1. THE Assessment_System SHALL 基于以下4个核心维度设计题目：
   - **信息处理**：内部推演(I) vs 外部感应(O)
   - **判断依据**：数据结构(D) vs 直觉模式(P)
   - **决策驱动**：理性控制(R) vs 情绪牵引(E)
   - **执行风格**：系统稳定(S) vs 灵活反应(F)
2. THE Scoring_System SHALL 将4维度得分映射到6主画像
3. THE Tag_System SHALL 生成维度标签（如 `dim:I`, `dim:D`, `dim:R`, `dim:S`）

### Requirement 3: 6主画像与4维度映射

**User Story:** As a 助教, I want 理解画像与维度的关系, so that 我能更好地向客户解释测评结果。

#### Acceptance Criteria

1. THE System SHALL 定义6主画像与4维度的映射关系：
   - **规则执行型**: I+D+R+S（内部推演、数据驱动、理性、系统化）
   - **情绪牵引型**: O+P+E+F（外部感应、直觉、情绪、灵活）
   - **经验依赖型**: I+P+R+S（内部推演、直觉、理性、系统化）
   - **机会捕捉型**: O+D+E+F（外部感应、数据、情绪、灵活）
   - **防御观望型**: I+D+R+F（内部推演、数据、理性、灵活）
   - **冲动反应型**: O+P+E+S（外部感应、直觉、情绪、系统化）
2. THE Result_Page SHALL 显示用户在4维度上的倾向
3. THE Coach_Panel SHALL 显示维度解释帮助助教理解客户

### Requirement 4: v2 完整版测评（情境权重）

**User Story:** As a 付费用户, I want 了解我在不同状态下的行为变化, so that 我能更好地管理自己的决策模式。

#### Acceptance Criteria

1. THE Assessment_System SHALL 提供18道题目的完整测评
2. THE Question_Design SHALL 覆盖3种情境状态：
   - **正常状态**：日常决策场景
   - **波动状态**：市场/环境变化场景
   - **压力状态**：高压/紧急决策场景
3. WHEN 用户完成测评 THEN THE System SHALL 计算每种状态下的画像倾向
4. THE Result_Page SHALL 显示"画像漂移"分析：
   - 主画像（正常状态）
   - 波动状态倾向
   - 压力状态倾向
5. IF 存在画像漂移 THEN THE Result_Page SHALL 显示类似"你平时像规则执行型，但在压力下容易滑向情绪牵引型"的描述

### Requirement 5: v2 状态漂移可视化

**User Story:** As a 用户, I want 直观地看到我在不同状态下的行为变化, so that 我能识别自己的风险点。

#### Acceptance Criteria

1. THE Result_Page SHALL 显示三状态雷达图或条形图
2. THE Result_Page SHALL 高亮显示漂移最大的维度
3. THE Result_Page SHALL 提供针对漂移的改善建议
4. THE Coach_Panel SHALL 显示客户的状态漂移分析供助教参考

### Requirement 6: v3 高端定制版（16细分画像）

**User Story:** As a 高端用户/年度会员, I want 获得最详细的行为分析报告, so that 我能深入了解自己并获得定制化指导。

#### Acceptance Criteria

1. THE Assessment_System SHALL 提供24-36道题目的深度测评
2. THE System SHALL 基于4维度组合生成16种细分画像：
   - IDRS, IDRF, IDES, IDEF
   - IPRS, IPRF, IPES, IPEF
   - ODRS, ODRF, ODES, ODEF
   - OPRS, OPRF, OPES, OPEF
3. THE Result_Page SHALL 显示主画像 + 细分画像代码
4. THE Result_Page SHALL 提供细分画像的详细解读报告
5. THE System SHALL 支持前后测对比功能

### Requirement 7: v3 前后测对比

**User Story:** As a 长期用户, I want 对比多次测评结果, so that 我能看到自己的行为变化和成长。

#### Acceptance Criteria

1. WHEN 用户有多次测评记录 THEN THE System SHALL 支持选择两次测评进行对比
2. THE Compare_Page SHALL 显示两次测评的画像变化
3. THE Compare_Page SHALL 显示各维度得分变化趋势
4. THE Compare_Page SHALL 高亮显示显著变化的维度
5. THE Compare_Page SHALL 提供变化解读和建议

### Requirement 8: 16细分画像内容体系

**User Story:** As a 内容运营, I want 完整的16细分画像内容库, so that 系统能为每种画像提供专业的解读。

#### Acceptance Criteria

1. THE Content_System SHALL 为每种细分画像定义：
   - 画像代码（如 IDRS）
   - 画像名称（中文易记名）
   - 一句话描述
   - 核心特征（3-5条）
   - 潜在风险（2-3条）
   - 改善建议（2-3条）
2. THE Admin_Panel SHALL 支持查看和管理16细分画像内容
3. THE System SHALL 支持通过种子数据导入画像内容

### Requirement 9: 版本升级路径

**User Story:** As a 用户, I want 能够从快速版升级到完整版, so that 我能获得更深入的分析。

#### Acceptance Criteria

1. THE Result_Page SHALL 在v1结果页显示"升级到完整版"入口
2. WHEN 用户升级测评版本 THEN THE System SHALL 保留历史测评记录
3. THE System SHALL 支持同一客户拥有多个版本的测评记录
4. THE Coach_Panel SHALL 显示客户的所有测评版本和结果

### Requirement 10: 商业价值分层

**User Story:** As a 运营人员, I want 测评版本与商业产品对应, so that 能支撑不同价位的服务。

#### Acceptance Criteria

1. THE System SHALL 支持按版本控制测评访问权限
2. v1 快速版 SHALL 对所有用户免费开放
3. v2 完整版 SHALL 支持付费解锁或会员权益
4. v3 定制版 SHALL 仅对高端用户/年度会员开放
5. THE Admin_Panel SHALL 支持配置各版本的访问策略

---

## 实施优先级

### Phase 1: v1 优化（当前迭代）
- 重新设计4维度题目结构
- 优化6主画像与维度映射
- 完善结果页展示

### Phase 2: v2 开发（下一迭代）
- 设计18题完整版题库
- 实现情境权重计算
- 开发状态漂移分析

### Phase 3: v3 开发（长期规划）
- 设计24-36题深度版题库
- 实现16细分画像体系
- 开发前后测对比功能

---

## 关联实现/数据位置

- 当前题库：`data/seed/quiz_fast_v1.json`, `data/seed/quiz_pro_v1.json`
- 画像定义：`data/seed/archetypes_v1.json`
- 评分逻辑：`lib/scoring.ts`
- 标签显示：`lib/tag-display.ts`
- 结果页：`app/t/[token]/result/page.tsx`
- 数据模型：`prisma/schema.prisma`
