# CUSTOMER_SUPPORT_FAQ

## 目的

客户支持与 FAQ：围绕结果解读边界、投诉处理、服务条款（如涉及付费）。

## 适用范围

- 客服与助教对外答复

## 非目标

- 不提供买卖建议或收益承诺

## 目录 / TODO

- [ ] 结果是什么/不是什么（合规口径）
- [ ] 邀请失效/无法提交/无结果等常见问题
- [ ] 投诉处理流程与升级机制
- [ ] 退款/服务条款（如适用）

## 关联实现/数据位置

- invite resolve：`app/api/public/invite/resolve/route.ts`
- result：`app/api/public/attempt/result/route.ts`
- 合规提示位：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`

