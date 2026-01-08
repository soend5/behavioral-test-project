/**
 * Smoke Test: 页面冒烟检查
 * 验证关键页面输出存在（不需要真实浏览器，不要求 Playwright）
 */

type TestResult = {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  reason: string;
  details?: string;
};

function env(name: string, required = false): string | undefined {
  const v = process.env[name];
  if (required && !v) {
    console.error(`❌ 错误: ${name} 环境变量未设置（必填）`);
    process.exit(1);
  }
  return v;
}

async function fetchPage(url: string): Promise<{ status: number; text: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "smoke-test/1.0",
      },
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (error) {
    throw new Error(`请求失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkContains(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

async function testResultPage(baseUrl: string, token: string): Promise<TestResult> {
  const url = `${baseUrl}/t/${encodeURIComponent(token)}/result`;
  try {
    const { status, text } = await fetchPage(url);
    if (status !== 200) {
      return {
        name: `结果页 (${url})`,
        status: "FAIL",
        reason: `HTTP 状态码 ${status}，期望 200`,
      };
    }
    // 检查是否包含 CTA 关键词
    const ctaKeywords = ["联系助教", "联系", "助教", "下一步", "建议"];
    if (checkContains(text, ctaKeywords)) {
      return {
        name: `结果页 (${url})`,
        status: "PASS",
        reason: "响应 200，且包含 CTA 关键词",
      };
    }
    return {
      name: `结果页 (${url})`,
      status: "FAIL",
      reason: "响应 200，但未找到 CTA 关键词（联系助教/联系/助教/下一步/建议）",
      details: `页面内容预览: ${text.substring(0, 200)}...`,
    };
  } catch (error) {
    return {
      name: `结果页 (${url})`,
      status: "FAIL",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testInvitePage(baseUrl: string, token: string): Promise<TestResult> {
  const url = `${baseUrl}/t/${encodeURIComponent(token)}`;
  try {
    const { status, text } = await fetchPage(url);
    if (status !== 200) {
      return {
        name: `邀请页 (${url})`,
        status: "FAIL",
        reason: `HTTP 状态码 ${status}，期望 200`,
      };
    }
    // 检查是否包含状态词或 CTA
    const statusKeywords = ["已完成", "已失效", "已过期", "完成", "失效", "过期"];
    const ctaKeywords = ["联系助教", "联系", "助教", "开始测评", "开始"];
    if (checkContains(text, [...statusKeywords, ...ctaKeywords])) {
      return {
        name: `邀请页 (${url})`,
        status: "PASS",
        reason: "响应 200，且包含状态词或 CTA 关键词",
      };
    }
    return {
      name: `邀请页 (${url})`,
      status: "FAIL",
      reason: "响应 200，但未找到状态词（已完成/已失效/已过期）或 CTA 关键词",
      details: `页面内容预览: ${text.substring(0, 200)}...`,
    };
  } catch (error) {
    return {
      name: `邀请页 (${url})`,
      status: "FAIL",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testCoachPage(baseUrl: string, coachUrl: string): Promise<TestResult> {
  const url = coachUrl.startsWith("http") ? coachUrl : `${baseUrl}${coachUrl}`;
  try {
    const { status, text } = await fetchPage(url);
    if (status !== 200) {
      // 如果是 401/403，说明需要登录，这是预期的
      if (status === 401 || status === 403) {
        return {
          name: `Coach 页 (${url})`,
          status: "SKIP",
          reason: `HTTP 状态码 ${status}，需要登录鉴权（跳过）`,
        };
      }
      return {
        name: `Coach 页 (${url})`,
        status: "FAIL",
        reason: `HTTP 状态码 ${status}，期望 200`,
      };
    }
    // 检查是否包含阶段词
    const stageKeywords = ["解释", "反思", "执行", "陪跑阶段"];
    if (checkContains(text, stageKeywords)) {
      return {
        name: `Coach 页 (${url})`,
        status: "PASS",
        reason: "响应 200，且包含阶段词（解释/反思/执行）",
      };
    }
    return {
      name: `Coach 页 (${url})`,
      status: "FAIL",
      reason: "响应 200，但未找到阶段词（解释/反思/执行/陪跑阶段）",
      details: `页面内容预览: ${text.substring(0, 200)}...`,
    };
  } catch (error) {
    return {
      name: `Coach 页 (${url})`,
      status: "FAIL",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("=== Smoke Test: 页面冒烟检查 ===\n");

  const baseUrl = env("BASE_URL", true);
  if (!baseUrl) {
    console.error("❌ BASE_URL 环境变量未设置（必填）");
    process.exit(1);
  }

  const testToken = env("TEST_TOKEN");
  const testCoachUrl = env("TEST_COACH_URL");

  const results: TestResult[] = [];

  // 测试 1: 结果页
  if (testToken) {
    console.log(`测试结果页: /t/${testToken}/result`);
    const result = await testResultPage(baseUrl, testToken);
    results.push(result);
  } else {
    results.push({
      name: "结果页 (/t/[token]/result)",
      status: "SKIP",
      reason: "因缺少环境变量 TEST_TOKEN 跳过",
    });
    console.log("⚠️  跳过结果页测试（TEST_TOKEN 未设置）");
  }

  // 测试 2: 邀请页
  if (testToken) {
    console.log(`测试邀请页: /t/${testToken}`);
    const result = await testInvitePage(baseUrl, testToken);
    results.push(result);
  } else {
    results.push({
      name: "邀请页 (/t/[token])",
      status: "SKIP",
      reason: "因缺少环境变量 TEST_TOKEN 跳过",
    });
    console.log("⚠️  跳过邀请页测试（TEST_TOKEN 未设置）");
  }

  // 测试 3: Coach 页
  if (testCoachUrl) {
    console.log(`测试 Coach 页: ${testCoachUrl}`);
    const result = await testCoachPage(baseUrl, testCoachUrl);
    results.push(result);
  } else {
    results.push({
      name: "Coach 页",
      status: "SKIP",
      reason: "因缺少环境变量 TEST_COACH_URL 跳过",
    });
    console.log("⚠️  跳过 Coach 页测试（TEST_COACH_URL 未设置）");
  }

  // 输出结果
  console.log("\n=== 测试结果 ===");
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const result of results) {
    const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️ ";
    console.log(`${icon} ${result.name}: ${result.status}`);
    console.log(`   原因: ${result.reason}`);
    if (result.details) {
      console.log(`   详情: ${result.details}`);
    }

    if (result.status === "PASS") passCount++;
    else if (result.status === "FAIL") failCount++;
    else skipCount++;
  }

  console.log(`\n总计: PASS=${passCount}, FAIL=${failCount}, SKIP=${skipCount}`);

  if (failCount > 0) {
    console.log("\n❌ 部分测试失败，请检查上述输出");
    process.exit(1);
  } else if (passCount === 0 && skipCount > 0) {
    console.log("\n⚠️  所有测试均跳过，请设置必要的环境变量");
    process.exit(0);
  } else {
    console.log("\n✅ 所有测试通过！");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("❌ 脚本执行失败:", error);
  process.exit(1);
});
