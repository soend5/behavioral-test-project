# UAT_CHECKLIST

## 目的

提供可执行的 UAT 验收清单，按“流程 + 结果可解释 + 合规红线校验”验收。

## 适用范围

- v1 灰度上线前

## 非目标

- 不替代自动化 smoke（见 `scripts/`）

## 目录 / TODO

- [ ] 未登录访问保护（/admin、/coach）
- [ ] Coach 客户/邀请/测评闭环（创建、查看、状态机）
- [ ] Client 测评闭环（resolve/start/answer/submit/result）
- [ ] 越权/并发/重复提交场景
- [ ] 合规提示位检查（落地页/结果页/陪跑提示区）

## 关联实现/数据位置

- 入口页面：`app/`
- API：`app/api/`
- 合规提示位：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`

