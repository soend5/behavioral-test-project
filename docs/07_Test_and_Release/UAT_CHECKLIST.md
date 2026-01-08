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

---

## V1.1 页面冒烟检查

### 自动化检查（推荐）

使用 `smoke:pages` 脚本进行页面冒烟检查：

**运行方式**：
```bash
BASE_URL=http://localhost:3000 TEST_TOKEN=your_token npm run smoke:pages
```

**环境变量说明**：
- `BASE_URL`（必填）：应用基础 URL，例如 `http://localhost:3000` 或 `https://your-domain.com`
- `TEST_TOKEN`（可选）：用于测试 `/t/[token]` 和 `/t/[token]/result` 的 token
- `TEST_COACH_URL`（可选）：用于测试 coach 相关页面的 URL，例如 `/coach/clients/[id]` 或完整 URL

**检查项**：
1. **结果页** (`/t/[token]/result`)：
   - 响应 200
   - 页面包含 CTA 关键词（"联系助教"、"联系"、"助教"、"下一步"、"建议" 任一即可）

2. **邀请页** (`/t/[token]`)：
   - 响应 200
   - 页面包含状态词（"已完成"、"已失效"、"已过期"、"完成"、"失效"、"过期"）或 CTA 关键词

3. **Coach 页**（如提供 `TEST_COACH_URL`）：
   - 响应 200（如需要登录鉴权则跳过）
   - 页面包含阶段词（"解释"、"反思"、"执行"、"陪跑阶段" 任一即可）

**输出格式**：
- ✅ PASS：测试通过
- ❌ FAIL：测试失败（会显示原因）
- ⏭️ SKIP：测试跳过（因缺少环境变量或需要鉴权）

**示例输出**：
```
=== Smoke Test: 页面冒烟检查 ===

测试结果页: /t/your_token/result
测试邀请页: /t/your_token
⚠️  跳过 Coach 页测试（TEST_COACH_URL 未设置）

=== 测试结果 ===
✅ 结果页 (/t/your_token/result): PASS
   原因: 响应 200，且包含 CTA 关键词
✅ 邀请页 (/t/your_token): PASS
   原因: 响应 200，且包含状态词或 CTA 关键词
⏭️ Coach 页: SKIP
   原因: 因缺少环境变量 TEST_COACH_URL 跳过

总计: PASS=2, FAIL=0, SKIP=1

✅ 所有测试通过！
```

### 人工检查（兜底方案）

如果无法运行自动化脚本，请按以下清单进行人工检查：

1. **Token invite valid → 完成测评 → result 页显示三段式**：
   - [ ] 访问 `/t/[valid_token]/result`
   - [ ] 页面显示三段式：摘要/行为点/CTA
   - [ ] CTA 包含"联系助教"或等价提示

2. **Invite expired/completed → 状态页显示中文状态 + CTA**：
   - [ ] 访问 `/t/[expired_or_completed_token]`
   - [ ] 页面显示中文状态词（"已完成"、"已失效"、"已过期" 等）
   - [ ] 页面包含 CTA（"联系助教"、"重新获取邀请链接" 等）

3. **Coach 端结果页按 Q→A→Hint 纵向阅读，且无 system tag 直出，realtime_panel 显示阶段词**：
   - [ ] 访问 `/coach/clients/[id]`
   - [ ] 页面按 Q→A→Hint 纵向阅读
   - [ ] 无 system tag 直出（如 `image:*`、`stability:*` 等）
   - [ ] realtime_panel 显示阶段词（"解释"、"反思"、"执行" 之一）

## 关联实现/数据位置

- 入口页面：`app/`
- API：`app/api/`
- 合规提示位：`app/t/[token]/page.tsx`、`app/t/[token]/result/page.tsx`、`app/coach/clients/[id]/page.tsx`

