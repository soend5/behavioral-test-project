import { readFile } from "node:fs/promises";
import path from "node:path";

type StepResult = {
  name: string;
  ok: boolean;
  details: Record<string, unknown>;
};

function fail(message: string): never {
  throw new Error(message);
}

function printHeader(title: string) {
  console.log(`\n== ${title} ==`);
}

async function main() {
  printHeader("smoke:v1-readonly (deprecated)");
  console.log(
    "Info: v1 题库只读门禁已撤销，本脚本仅做静态检查以防止旧门禁残留。"
  );

  const files = [
    "app/api/admin/questions/route.ts",
    "app/api/admin/questions/[id]/route.ts",
    "app/api/admin/options/route.ts",
    "app/api/admin/options/[id]/route.ts",
  ];

  const re = /quizVersion\s*===\s*["']v1["']/;
  const results: StepResult[] = [];

  for (const file of files) {
    const abs = path.join(process.cwd(), file);
    let content: string;
    try {
      content = await readFile(abs, "utf8");
    } catch {
      results.push({
        name: `file exists: ${file}`,
        ok: false,
        details: { file, error: "not found" },
      });
      continue;
    }

    const hasReadonlyGuard = re.test(content);
    results.push({
      name: `no v1 readonly guard: ${file}`,
      ok: !hasReadonlyGuard,
      details: { file, hasReadonlyGuard },
    });
  }

  const allOk = results.every((r) => r.ok);
  console.log(`\nsmoke:v1-readonly ${allOk ? "PASSED" : "FAILED"}`);
  for (const r of results) console.log(`- ${r.ok ? "PASS" : "FAIL"} ${r.name}`);

  console.log("\nDETAILS_JSON_BEGIN");
  console.log(JSON.stringify({ results }, null, 2));
  console.log("DETAILS_JSON_END");

  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("smoke:v1-readonly crashed:", err);
  process.exit(1);
});

