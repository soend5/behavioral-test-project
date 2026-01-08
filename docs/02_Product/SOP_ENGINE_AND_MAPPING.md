# SOP_ENGINE_AND_MAPPING

## 目的

说明 SOP 引擎与映射策略：画像/阶段 → 助教话术/陪跑策略的可配置规则。

## 适用范围

- SOP 定义与匹配（admin 配置、coach 使用）

## 非目标

- 不定义具体话术内容（话术资产另行维护）

## 目录 / TODO

- [ ] 数据结构：SopDefinition/SopRule/SopStageMap/CoachingStage
- [ ] 匹配规则：输入（tags/stage）→ 输出（策略/禁忌/目标）
- [ ] 默认策略与兜底
- [ ] 版本策略（v1 只读/新版本演进）

## 关联实现/数据位置

- 匹配实现：`lib/sop-matcher.ts`
- 数据模型：`prisma/schema.prisma`
- admin 配置接口：`app/api/admin/sop/*`

