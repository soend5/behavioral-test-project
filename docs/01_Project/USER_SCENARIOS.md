# USER_SCENARIOS

## 目的

把典型用户与场景写清楚，形成“需求验收的叙事脚本”。

## 适用范围

- 产品设计与验收
- 运营/陪跑 SOP 制作

## 非目标

- 不替代 UAT Checklist（详见 `../07_Test_and_Release/UAT_CHECKLIST.md`）

## 目录 / TODO

- [ ] 角色画像：Client / Coach / Admin
- [ ] 典型路径 1：Coach 创建邀请 → Client 完成测评 → 查看结果
- [ ] 典型路径 2：Invite 过期/完成后的只读访问（resolve/result）
- [ ] 典型路径 3：Coach 客户详情页查看时间线与实时陪跑提示区
- [ ] 异常路径：未登录/越权/并发重复提交

## 关联实现/数据位置

- Client 页面：`app/t/[token]/`
- Coach 页面：`app/coach/`
- Admin 页面：`app/admin/`
- 门禁：`lib/authz.ts`、`middleware.ts`

