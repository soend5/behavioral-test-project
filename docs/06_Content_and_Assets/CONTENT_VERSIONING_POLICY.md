# CONTENT_VERSIONING_POLICY

## 目的

定义内容资产版本策略：如何从 v1 演进到 v2，如何灰度、回滚与保证幂等导入。

## 适用范围

- quiz/archetypes/handbook/methodology

## 非目标

- 不替代发布流程（见 `../07_Test_and_Release/GRAY_RELEASE_AND_ROLLBACK.md`）

## 目录 / TODO

- [ ] 版本维度：`quizVersion` 与 `version(fast/pro)`
- [ ] 稳定标识：stableId/orderNo 的约束与维护
- [ ] 版本演进策略：已上线版本建议避免破坏式修改
- [ ] seed 幂等与校验（重复执行不重复插入）
- [ ] 回滚策略（新版本出问题如何回退）

## 版本演进策略

### 编辑权限

**当前策略**：
- Admin 可编辑所有版本题库（包括已上线版本）
- 删除操作需确认（避免误操作）

**建议实践**：
- 已上线版本（被 invite/attempt 使用）：避免破坏式修改
- 如需重大调整：创建新 quizVersion（如 v1 → v2）
- 小幅优化（文案调整、选项微调）：可直接编辑现有版本

### 默认版本管理

**系统设置**：
- Admin 可在系统设置中配置助教创建邀请时的默认 quizVersion
- 助教创建邀请时自动使用默认版本（不再需要手动选择）
- 灰度发布新版本时，Admin 可统一切换默认版本

## 关联实现/数据位置

- 内容资产：`data/seed/*.json`
- 导入：`prisma/seed-content.ts`
- 校验：`scripts/validate-seed-content.ts`
- 幂等快照：`scripts/db-snapshot-v1.ts`

