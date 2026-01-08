# Implementation Plan: 隐藏助教端题库版本选择器

## Overview

本实现计划描述如何修改 Coach 端新建邀请页面，隐藏 quizVersion 输入框，让系统自动使用管理后台配置的默认值。

## Tasks

- [x] 1. 修改 NewInviteClient 组件
  - [x] 1.1 移除 quizVersion 输入框和相关状态
    - 移除 `quizVersion` state 和 `setQuizVersion`
    - 移除 `quizVersionTouchedRef` ref
    - 保留 `defaultQuizVersion` state（用于展示）
    - 移除表单中的 quizVersion 输入框 JSX
    - 修改 `createInvite` 函数，不传 `quizVersion` 参数
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 更新创建成功后的展示区
    - 确保 `created.quizVersion` 在结果展示区正确显示
    - 添加说明文字："使用系统默认题库版本"
    - _Requirements: 1.3_

- [x] 2. Checkpoint - 验证修改
  - 启动开发服务器，访问 `/coach/invites/new`
  - 确认 quizVersion 输入框已移除
  - 确认 version 选择器仍然存在
  - 创建测试邀请，确认使用默认 quizVersion
  - 确认创建成功后显示实际使用的 quizVersion

## Notes

- 本次修改仅涉及前端 UI 组件，后端 API 无需修改
- 后端已实现自动使用默认值的逻辑（当 quizVersion 为空时）
- 测试可通过手动验收完成，无需新增自动化测试
