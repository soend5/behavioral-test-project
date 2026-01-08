# DOCS_REORG_REPORT

> 生成时间：2026-01-07  
> 目标：按既定结构重排 `docs/`，对现有文档归类移动（尽量 `git mv`），为缺失文档创建占位骨架，并更新仓库内引用路径（仅更新路径，不改语义）。

---

## 1) 搬迁计划表（源 → 目标）

| 源路径 | 目标路径 | 说明 |
|---|---|---|
| `docs/交易行为结构测评系统.md` | `docs/01_Project/交易行为结构测评系统.md` | 项目/共识文档 |
| `docs/API_SPEC.md` | `docs/04_API_and_Security/API_SPEC.md` | API 规范 |
| `docs/RBAC_SPEC.md` | `docs/04_API_and_Security/RBAC_SPEC.md` | RBAC 规范 |
| `docs/ADMIN_V1_IMPLEMENTATION.md` | `docs/04_API_and_Security/ADMIN_V1_IMPLEMENTATION.md` | 实现总结（按 API/安全归类） |
| `docs/COACH_API_IMPLEMENTATION.md` | `docs/04_API_and_Security/COACH_API_IMPLEMENTATION.md` | 实现总结（按 API/安全归类） |
| `docs/CLIENT_API_ACCEPTANCE.md` | `docs/07_Test_and_Release/CLIENT_API_ACCEPTANCE.md` | 验收文档 |
| `docs/SMOKE_TEST_AUTHZ.md` | `docs/07_Test_and_Release/SMOKE_TEST_AUTHZ.md` | 门禁 smoke |
| `docs/v1close.md` | `docs/07_Test_and_Release/v1close.md` | v1 闸门复验结果 |
| `docs/DEPLOY_PROD.md` | `docs/08_Deployment_and_Ops/DEPLOY_PROD.md` | 生产部署 |
| `docs/GITHUB_ENV_PRODUCTION.md` | `docs/08_Deployment_and_Ops/GITHUB_ENV_PRODUCTION.md` | GitHub Env |
| `docs/260107.md` | `docs/08_Deployment_and_Ops/260107.md` | DB Deploy 流水线 |
| `docs/debug260106.md` | `docs/99_Archive/debug260106.md` | debug 归档 |
| `docs/debug_v2.md` | `docs/99_Archive/debug_v2.md` | debug 归档 |
| `docs/allprompt_v1.md` | `docs/99_Archive/allprompt_v1.md` | prompt 归档 |
| `docs/itisme.md` | `docs/99_Archive/itisme.md` | 交接/历史归档 |
| `docs/logs_53713469896.zip` | `docs/99_Archive/logs_53713469896.zip` | 历史归档 |

---

## 2) 目录树（当前）

```text
docs/
  01_Project/
    PRODUCT_BOUNDARY_AND_COMPLIANCE.md
    PROJECT_OVERVIEW.md
    SCOPE_FREEZE.md
    USER_SCENARIOS.md
    交易行为结构测评系统.md
  02_Product/
    ASSESSMENT_DESIGN.md
    ASSESSMENT_FAST.md
    ASSESSMENT_PRO.md
    CONTENT_ASSET_SPEC.md
    PRD_OVERVIEW.md
    RESULT_EXPLANATION_RULES.md
    SOP_ENGINE_AND_MAPPING.md
  03_Architecture/
    ARCHITECTURE_OVERVIEW.md
    DATA_FLOW.md
    DATA_MODEL_AND_ASSETS.md
    FRONTEND_ROUTES_AND_PAGES.md
    SCORING_AND_TAGS_SPEC.md
    SOP_MATCHER_SPEC.md
  04_API_and_Security/
    ADMIN_V1_IMPLEMENTATION.md
    API_SPEC.md
    AUTHZ_AND_GUARDS.md
    COACH_API_IMPLEMENTATION.md
    RBAC_SPEC.md
    TOKEN_AND_IDEMPOTENCY.md
  05_Admin_and_Coach/
    COACH_PLAYBOOK.md
    PRD_ADMIN_CONSOLE.md
    PRD_COACH_CONSOLE.md
    SOP_OPERATION_GUIDE.md
  06_Content_and_Assets/
    ARCHETYPES_GUIDE.md
    CONTENT_VERSIONING_POLICY.md
    METHODOLOGY_GUIDE.md
    QUIZ_CONTENT_GUIDE.md
    TRAINING_HANDBOOK_GUIDE.md
  07_Test_and_Release/
    CLIENT_API_ACCEPTANCE.md
    CONTENT_COMPLIANCE_CHECKLIST.md
    GRAY_RELEASE_AND_ROLLBACK.md
    RELEASE_NOTES_TEMPLATE.md
    SMOKE_TEST_AUTHZ.md
    TEST_PLAN.md
    UAT_CHECKLIST.md
    v1close.md
  08_Deployment_and_Ops/
    260107.md
    DATA_FIX_AND_RECOVERY.md
    DEPLOY_PROD.md
    GITHUB_ENV_PRODUCTION.md
    INCIDENT_RESPONSE.md
    RUNBOOK.md
  09_Operations_and_Growth/
    COACH_TRAINING_MATERIALS.md
    CUSTOMER_SUPPORT_FAQ.md
    METRICS_AND_TRACKING_PLAN.md
    OPS_COLD_START_PLAN.md
    SOP_ITERATION_MECHANISM.md
  99_Archive/
    allprompt_v1.md
    debug_v2.md
    debug260106.md
    historical_notes.md
    itisme.md
    logs_53713469896.zip
  00_README.md
```

---

## 3) 变更文件列表（git status）

```text
## main...origin/main
 M README.md
 M data/seed/archetypes_v1.json
 M data/seed/methodology_v1.json
R  docs/交易行为结构测评系统.md -> docs/01_Project/交易行为结构测评系统.md
R  docs/ADMIN_V1_IMPLEMENTATION.md -> docs/04_API_and_Security/ADMIN_V1_IMPLEMENTATION.md
R  docs/API_SPEC.md -> docs/04_API_and_Security/API_SPEC.md
R  docs/COACH_API_IMPLEMENTATION.md -> docs/04_API_and_Security/COACH_API_IMPLEMENTATION.md
R  docs/RBAC_SPEC.md -> docs/04_API_and_Security/RBAC_SPEC.md
R  docs/CLIENT_API_ACCEPTANCE.md -> docs/07_Test_and_Release/CLIENT_API_ACCEPTANCE.md
R  docs/SMOKE_TEST_AUTHZ.md -> docs/07_Test_and_Release/SMOKE_TEST_AUTHZ.md
R  docs/v1close.md -> docs/07_Test_and_Release/v1close.md
RM docs/260107.md -> docs/08_Deployment_and_Ops/260107.md
RM docs/DEPLOY_PROD.md -> docs/08_Deployment_and_Ops/DEPLOY_PROD.md
R  docs/GITHUB_ENV_PRODUCTION.md -> docs/08_Deployment_and_Ops/GITHUB_ENV_PRODUCTION.md
RM docs/allprompt_v1.md -> docs/99_Archive/allprompt_v1.md
RM docs/debug260106.md -> docs/99_Archive/debug260106.md
RM docs/debug_v2.md -> docs/99_Archive/debug_v2.md
RM docs/itisme.md -> docs/99_Archive/itisme.md
R  docs/logs_53713469896.zip -> docs/99_Archive/logs_53713469896.zip
?? docs/00_README.md
?? docs/01_Project/PRODUCT_BOUNDARY_AND_COMPLIANCE.md
?? docs/01_Project/PROJECT_OVERVIEW.md
?? docs/01_Project/SCOPE_FREEZE.md
?? docs/01_Project/USER_SCENARIOS.md
?? docs/02_Product/
?? docs/03_Architecture/
?? docs/04_API_and_Security/AUTHZ_AND_GUARDS.md
?? docs/04_API_and_Security/TOKEN_AND_IDEMPOTENCY.md
?? docs/05_Admin_and_Coach/
?? docs/06_Content_and_Assets/
?? docs/07_Test_and_Release/CONTENT_COMPLIANCE_CHECKLIST.md
?? docs/07_Test_and_Release/GRAY_RELEASE_AND_ROLLBACK.md
?? docs/07_Test_and_Release/RELEASE_NOTES_TEMPLATE.md
?? docs/07_Test_and_Release/TEST_PLAN.md
?? docs/07_Test_and_Release/UAT_CHECKLIST.md
?? docs/08_Deployment_and_Ops/DATA_FIX_AND_RECOVERY.md
?? docs/08_Deployment_and_Ops/INCIDENT_RESPONSE.md
?? docs/08_Deployment_and_Ops/RUNBOOK.md
?? docs/09_Operations_and_Growth/
?? docs/99_Archive/historical_notes.md
```

备注：`data/seed/archetypes_v1.json`、`data/seed/methodology_v1.json` 当前为本地未提交改动（不属于本次文档重排范围）。

---

## 4) 关键引用更新点（grep 摘要）

### 4.1 README
- `README.md`：`./docs/DEPLOY_PROD.md` → `./docs/08_Deployment_and_Ops/DEPLOY_PROD.md`

### 4.2 部署文档互相引用
- `docs/08_Deployment_and_Ops/DEPLOY_PROD.md`：`docs/260107.md`、`docs/GITHUB_ENV_PRODUCTION.md` → 新路径
- `docs/08_Deployment_and_Ops/260107.md`：同上

### 4.3 全局旧路径检查（无残留）

```text
OK: no refs -> docs/DEPLOY_PROD.md
OK: no refs -> docs/260107.md
OK: no refs -> docs/GITHUB_ENV_PRODUCTION.md
OK: no refs -> docs/API_SPEC.md
OK: no refs -> docs/RBAC_SPEC.md
OK: no refs -> docs/CLIENT_API_ACCEPTANCE.md
OK: no refs -> docs/SMOKE_TEST_AUTHZ.md
OK: no refs -> docs/COACH_API_IMPLEMENTATION.md
OK: no refs -> docs/ADMIN_V1_IMPLEMENTATION.md
OK: no refs -> docs/debug260106.md
OK: no refs -> docs/debug_v2.md
OK: no refs -> docs/allprompt_v1.md
OK: no refs -> docs/itisme.md
OK: no refs -> docs/v1close.md
```

