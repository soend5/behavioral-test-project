# DATA_FLOW

## 目的

描述端到端数据流：从 coach 创建邀请到 client 提交测评、生成结果，再到 coach 查看陪跑提示的流转。

## 适用范围

- v1（fast/pro）

## 非目标

- 不覆盖所有异常场景（异常详见测试/门禁文档）

## 目录 / TODO

- [ ] Coach：customer → invite（token）
- [ ] Client：resolve → start → quiz → answer → submit
- [ ] Result：public result/resolved
- [ ] Coach：客户详情页拉取 attempt 时间线与 realtime panel
- [ ] 审计：关键写操作 audit_log

## 关联实现/数据位置

- invite：`app/api/coach/invites/route.ts`
- client：`app/api/public/invite/resolve/route.ts`、`app/api/attempt/*`、`app/api/public/attempt/result/route.ts`
- coach：`app/api/coach/customers/*`
- 审计：`lib/audit.ts`

