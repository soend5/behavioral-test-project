# Requirements Document

## Introduction

本需求旨在简化助教端创建邀请的流程。根据产品决策，助教创建邀请时不再需要手动选择题库版本（quizVersion），系统将自动使用管理后台配置的默认值。助教仍可选择测评类型（fast 或 pro）。

## Glossary

- **Coach**: 助教，负责管理客户档案和创建测评邀请
- **Admin**: 管理员，负责系统配置和题库管理
- **quizVersion**: 题库版本标识（如 v1、v2），决定使用哪套题目
- **version**: 测评类型，fast（快速测评，9题）或 pro（专业测评，18题）
- **SystemSetting**: 系统设置表，存储全局配置项
- **Invite**: 邀请记录，包含 token、客户、测评类型、题库版本等信息

## Requirements

### Requirement 1: 隐藏助教端题库版本选择器

**User Story:** As a 助教, I want 创建邀请时自动使用系统默认题库版本, so that 我可以更快速地完成邀请创建，无需关心版本细节。

#### Acceptance Criteria

1. WHEN 助教访问新建邀请页面, THE Coach_Invite_Form SHALL 不显示 quizVersion 输入框
2. WHEN 助教提交邀请创建请求, THE Coach_Invite_API SHALL 自动使用 SystemSetting 中配置的默认 quizVersion
3. WHEN 邀请创建成功, THE Coach_Invite_Form SHALL 在结果展示区显示实际使用的 quizVersion（仅供确认）
4. IF SystemSetting 中未配置默认 quizVersion, THEN THE Coach_Invite_API SHALL 使用 "v1" 作为兜底默认值

### Requirement 2: 保留测评类型选择

**User Story:** As a 助教, I want 仍然可以选择 fast 或 pro 测评类型, so that 我可以根据客户情况选择合适的测评深度。

#### Acceptance Criteria

1. WHEN 助教访问新建邀请页面, THE Coach_Invite_Form SHALL 显示测评类型下拉选择器
2. THE Coach_Invite_Form SHALL 提供 "快速测评（fast）" 和 "专业测评（pro）" 两个选项
3. WHEN 助教选择测评类型, THE Coach_Invite_API SHALL 使用所选类型创建邀请

### Requirement 3: 管理后台默认版本配置（已实现）

**User Story:** As a 管理员, I want 在系统设置中配置默认题库版本, so that 所有助教创建的邀请都使用统一的题库版本。

#### Acceptance Criteria

1. THE Admin_Settings_Page SHALL 显示当前默认 quizVersion 配置
2. THE Admin_Settings_Page SHALL 提供可用 quizVersion 列表供选择
3. WHEN 管理员保存设置, THE Admin_Settings_API SHALL 验证所选 quizVersion 同时存在 active 状态的 fast 和 pro 题库
4. IF 验证失败, THEN THE Admin_Settings_API SHALL 返回错误信息并拒绝保存
