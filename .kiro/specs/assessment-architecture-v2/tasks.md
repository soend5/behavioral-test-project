# Implementation Plan: 测评架构升级 v2

## Overview

本实施计划分为三个阶段：Phase 1 优化现有 v1 架构引入4维度体系，Phase 2 开发 v2 完整版（情境权重），Phase 3 开发 v3 定制版（16细分画像+前后对比）。

## Tasks

### Phase 1: v1 架构优化（当前迭代）

- [ ] 1. 创建4维度评分核心模块
  - [ ] 1.1 创建 `lib/dimension-scoring.ts` 定义4维度类型和接口
    - 定义 DimensionAxis, DimensionPole, DimensionScores 类型
    - 实现 calculateDimensionScores 函数
    - 实现 getDimensionPoles 函数
    - _Requirements: 2.1, 2.2_
  - [ ]* 1.2 编写维度评分属性测试
    - **Property 1: 评分确定性**
    - **Validates: Requirements 1.2, 1.3**
  - [ ] 1.3 创建 `lib/archetype-mapping.ts` 实现画像映射
    - 定义6主画像与4维度的映射规则
    - 实现 mapToPrimaryArchetype 函数
    - _Requirements: 3.1_
  - [ ]* 1.4 编写画像映射属性测试
    - **Property 2: 维度映射一致性**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 2. 更新题目数据结构
  - [ ] 2.1 更新 `data/seed/quiz_fast_v1.json` 添加4维度得分
    - 为每个选项添加 dimension_delta (info, judge, drive, exec)
    - 保持向后兼容，保留原有 archetype_vote 和 dimension_delta
    - _Requirements: 2.1_
  - [ ] 2.2 更新 `lib/scoring.ts` 支持新维度计算
    - 添加4维度得分计算逻辑
    - 保持原有6维度计算作为兼容
    - _Requirements: 2.2, 2.3_

- [ ] 3. 更新标签显示系统
  - [ ] 3.1 更新 `lib/tag-display.ts` 添加4维度标签显示
    - 添加 dim:I, dim:O, dim:D, dim:P, dim:R, dim:E, dim:S, dim:F 标签定义
    - 添加维度标签的中文解释
    - _Requirements: 2.3, 3.2_
  - [ ] 3.2 更新结果页显示4维度信息
    - 在 `app/t/[token]/result/page.tsx` 添加维度可视化
    - 显示用户在4维度上的倾向
    - _Requirements: 3.2, 1.4, 1.5_

- [ ] 4. Checkpoint - Phase 1 验证
  - 确保所有测试通过，ask the user if questions arise.

### Phase 2: v2 完整版开发（下一迭代）

- [ ] 5. 数据库扩展
  - [ ] 5.1 创建 Prisma migration 添加新字段
    - Attempt 表添加 assessmentVersion, dimensionScoresJson, contextScoresJson, driftAnalysisJson
    - 创建 AssessmentAccess 表
    - _Requirements: 9.3, 10.1_
  - [ ] 5.2 更新 Prisma schema 和生成客户端
    - _Requirements: 9.3_

- [ ] 6. 设计 v2 题库
  - [ ] 6.1 创建 `data/seed/quiz_v2.json` 18题完整版题库
    - 每个情境状态（normal/volatile/pressure）各6题
    - 每题标记 context 字段
    - _Requirements: 4.1, 4.2_

- [ ] 7. 实现情境权重计算
  - [ ] 7.1 扩展 `lib/dimension-scoring.ts` 添加情境计算
    - 实现 calculateContextScores 函数
    - 按情境分组计算维度得分
    - _Requirements: 4.3_
  - [ ]* 7.2 编写情境漂移属性测试
    - **Property 3: 情境漂移计算**
    - **Validates: Requirements 4.3, 5.2**
  - [ ] 7.3 扩展 `lib/archetype-mapping.ts` 添加漂移分析
    - 实现 calculateDrift 函数
    - 生成漂移描述文案
    - _Requirements: 4.4, 4.5_

- [ ] 8. 开发 v2 结果页
  - [ ] 8.1 创建 v2 结果页组件
    - 显示三状态雷达图/条形图
    - 高亮漂移最大的维度
    - 显示漂移描述
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 8.2 更新助教端显示漂移分析
    - 在客户详情页添加状态漂移分析模块
    - _Requirements: 5.4_

- [ ] 9. 实现版本升级入口
  - [ ] 9.1 在 v1 结果页添加升级入口
    - 显示"升级到完整版"按钮
    - 低稳定度时强调升级建议
    - _Requirements: 9.1, 1.6_
  - [ ] 9.2 实现版本升级 API
    - 保留历史测评记录
    - 创建新版本邀请
    - _Requirements: 9.2_
  - [ ]* 9.3 编写历史记录保留属性测试
    - **Property 6: 历史记录保留**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 10. Checkpoint - Phase 2 验证
  - 确保所有测试通过，ask the user if questions arise.

### Phase 3: v3 定制版开发（长期规划）

- [ ] 11. 16细分画像体系
  - [ ] 11.1 创建 SubArchetype 数据模型
    - 添加 Prisma migration
    - 创建种子数据结构
    - _Requirements: 8.1_
  - [ ] 11.2 创建 `data/seed/sub_archetypes_v1.json` 16细分画像内容
    - 为每种细分画像定义名称、描述、特征、风险、建议
    - _Requirements: 8.1_
  - [ ] 11.3 实现细分画像映射
    - 扩展 `lib/archetype-mapping.ts` 添加 mapToSubArchetype 函数
    - _Requirements: 6.2_
  - [ ]* 11.4 编写细分画像映射属性测试
    - **Property 4: 细分画像映射**
    - **Validates: Requirements 6.2**

- [ ] 12. 设计 v3 题库
  - [ ] 12.1 创建 `data/seed/quiz_v3.json` 24-36题深度版题库
    - 覆盖所有4维度的深度场景
    - _Requirements: 6.1_

- [ ] 13. 实现前后测对比
  - [ ] 13.1 创建 `lib/result-generator.ts` 对比模块
    - 实现 compareAttempts 函数
    - 计算维度变化和显著性
    - _Requirements: 6.5, 7.3_
  - [ ]* 13.2 编写前后测对比属性测试
    - **Property 5: 前后测对比计算**
    - **Validates: Requirements 6.5, 7.3, 7.4**
  - [ ] 13.3 开发对比页面
    - 创建 `app/t/[token]/compare/page.tsx`
    - 显示画像变化、维度趋势、变化解读
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 14. 开发 v3 结果页
  - [ ] 14.1 创建 v3 深度报告页面
    - 显示主画像 + 细分画像代码
    - 显示详细解读报告
    - _Requirements: 6.3, 6.4_
  - [ ] 14.2 集成前后测对比入口
    - 显示历史测评列表
    - 支持选择对比
    - _Requirements: 7.1_

- [ ] 15. 实现访问控制
  - [ ] 15.1 创建访问控制 API
    - 实现版本权限检查
    - 实现权限授予/撤销
    - _Requirements: 10.1_
  - [ ]* 15.2 编写访问控制属性测试
    - **Property 7: 版本访问控制**
    - **Validates: Requirements 10.1**
  - [ ] 15.3 开发 Admin 访问策略配置页面
    - 支持配置各版本访问策略
    - _Requirements: 10.5_
  - [ ] 15.4 更新助教端显示所有版本测评
    - 在客户详情页显示所有版本测评记录
    - _Requirements: 9.4_

- [ ] 16. Admin 画像管理
  - [ ] 16.1 开发 Admin 细分画像管理页面
    - 查看16细分画像内容
    - 支持内容编辑
    - _Requirements: 8.2_
  - [ ] 16.2 实现种子数据导入功能
    - 支持通过 JSON 导入画像内容
    - _Requirements: 8.3_

- [ ] 17. Final Checkpoint - Phase 3 验证
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Phase 1 是当前迭代重点，Phase 2/3 为后续规划
