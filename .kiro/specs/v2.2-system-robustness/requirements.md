# V2.2 系统健壮 需求文档

## 概述
本次迭代为系统健壮阶段（2周），聚焦配置版本管理、权限扩展、冲突检测、依赖可视化等功能，增强系统可维护性和扩展性。

**核心目标**：
- 配置回滚成功率 100%
- 权限体系支持 5 级
- 配置误操作率 -90%

---

## 功能模块

### 1. 配置版本管理

#### 1.1 版本记录
- **需求**: 为策略/内容配置引入版本控制
- **功能**:
  - 记录每次配置改动
  - 支持查看历史版本
  - 支持一键回滚
- **终局模型支持**: 间接支持（监控层）

#### 1.2 数据模型
```prisma
model ConfigVersion {
  id          String   @id @default(cuid())
  configType  String   @map("config_type")  // "sop" | "script" | "training"
  configId    String   @map("config_id")
  version     Int      @default(1)
  dataJson    String   @map("data_json") @db.Text
  changedBy   String   @map("changed_by")
  changeNote  String?  @map("change_note")
  createdAt   DateTime @default(now()) @map("created_at")
}
```

#### 1.3 验收标准
- [ ] ConfigVersion 表可用
- [ ] 配置修改自动记录版本
- [ ] 版本历史可查看
- [ ] 回滚功能可用

---

### 2. 配置导入导出

#### 2.1 导出功能
- **需求**: 支持配置数据批量导出
- **格式**: JSON
- **范围**: SOP、话术、训练计划

#### 2.2 导入功能
- **需求**: 支持配置数据批量导入
- **校验**: 格式校验、冲突检测

#### 2.3 验收标准
- [ ] 导出 API 可用
- [ ] 导入 API 可用
- [ ] 格式校验正常

---

### 3. 权限体系扩展

#### 3.1 角色定义
| 角色 | 权限范围 |
|------|----------|
| super_admin | 全部 |
| content_admin | 内容管理（题库/画像/内训/方法论） |
| strategy_admin | 策略管理（SOP/话术/训练） |
| coach_manager | 查看所有助教数据 + 分配客户 |
| coach | 仅自己的客户 |

#### 3.2 验收标准
- [ ] 角色定义完成
- [ ] 权限检查函数更新
- [ ] 5级权限可用

---

### 4. 配置冲突检测

#### 4.1 检测内容
- SOP规则冲突（触发条件重叠）
- 话术与SOP一致性（阶段匹配）
- 无效标签检测

#### 4.2 验收标准
- [ ] 冲突检测函数可用
- [ ] 保存时提示冲突
- [ ] 检测准确率 >90%

---

### 5. 配置依赖关系可视化

#### 5.1 功能
- 展示 SOP 策略、触发标签、话术之间的关联
- 图形化呈现依赖关系

#### 5.2 验收标准
- [ ] 依赖关系页面可访问
- [ ] 关系图正确展示

---

## 文件变更清单

```
prisma/schema.prisma                    # 修改 - 添加 ConfigVersion
app/api/admin/config/versions/route.ts  # 新建 - 版本历史 API
app/api/admin/config/rollback/route.ts  # 新建 - 回滚 API
app/api/admin/config/export/route.ts    # 新建 - 导出 API
app/api/admin/config/import/route.ts    # 新建 - 导入 API
lib/authz.ts                            # 修改 - 权限扩展
lib/config-validator.ts                 # 新建 - 冲突检测
app/admin/strategy/dependencies/page.tsx # 新建 - 依赖可视化
```

---

## 工时估算

| 任务 | 工时 | 终局模型 |
|------|------|----------|
| 配置版本管理 | 3d | 间接 |
| 配置导入导出 | 2d | 否 |
| 权限体系扩展 | 3d | 是 |
| 配置冲突检测 | 2d | 是 |
| 配置依赖可视化 | 2d | 是 |
| **总计** | **12d** | |
