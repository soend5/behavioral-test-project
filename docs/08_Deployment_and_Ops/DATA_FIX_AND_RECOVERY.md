# DATA_FIX_AND_RECOVERY

## 目的

定义数据修复与恢复指南：如何定位问题、执行修复、验证一致性并记录审计。

## 适用范围

- 生产数据问题（误操作/约束冲突/资产导入异常）

## 非目标

- 不作为迁移脚本替代品

## 目录 / TODO

- [ ] 常见数据问题类型与定位方法
- [ ] 修复前检查（备份/影响面）
- [ ] 修复执行（SQL/Prisma 脚本）
- [ ] 修复后验证（smoke/UAT）
- [ ] 审计记录与复盘

## 关联实现/数据位置

- 数据模型：`prisma/schema.prisma`
- 审计：`lib/audit.ts`
- 生产 gate：`scripts/smoke-prod-gate.ts`

