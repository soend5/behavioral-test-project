import "dotenv/config";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type CheckResult = { ok: true } | { ok: false; message: string };

function envTruthy(name: string): boolean {
  const v = process.env[name];
  if (!v) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(v).trim().toLowerCase());
}

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function printHeader(title: string) {
  console.log(`\n== ${title} ==`);
}

function printOk(label: string) {
  console.log(`PASS ${label}`);
}

function printFail(label: string, message: string) {
  console.log(`FAIL ${label}: ${message}`);
}

async function listLocalMigrationNames(): Promise<string[]> {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  let entries: string[];
  try {
    entries = await readdir(migrationsDir);
  } catch {
    return [];
  }

  const names: string[] = [];
  for (const entry of entries) {
    const full = path.join(migrationsDir, entry);
    try {
      const s = await stat(full);
      if (s.isDirectory()) names.push(entry);
    } catch {
      // ignore
    }
  }
  names.sort();
  return names;
}

async function checkMigrationsApplied(prisma: PrismaClient): Promise<CheckResult> {
  const local = await listLocalMigrationNames();
  if (local.length === 0) {
    return { ok: false, message: "no local migrations found under prisma/migrations" };
  }

  type Row = {
    migration_name: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  };

  let rows: Row[];
  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
    `;
  } catch (e) {
    return {
      ok: false,
      message:
        "failed to query _prisma_migrations (is the DB initialized and migrations applied?)",
    };
  }

  const applied = new Set(
    rows
      .filter((r) => r.finished_at !== null && r.rolled_back_at === null)
      .map((r) => r.migration_name)
  );

  const rolledBack = rows.filter((r) => r.rolled_back_at !== null).map((r) => r.migration_name);
  if (rolledBack.length > 0) {
    return { ok: false, message: `rolled back migrations detected: ${rolledBack.join(", ")}` };
  }

  const notFinished = rows
    .filter((r) => r.finished_at === null && r.rolled_back_at === null)
    .map((r) => r.migration_name);
  if (notFinished.length > 0) {
    return { ok: false, message: `incomplete migrations detected: ${notFinished.join(", ")}` };
  }

  const missing = local.filter((name) => !applied.has(name));
  if (missing.length > 0) {
    return { ok: false, message: `missing migrations: ${missing.join(", ")}` };
  }

  return { ok: true };
}

async function checkSeedStatus(prisma: PrismaClient): Promise<CheckResult> {
  const version = "v1";

  const [fastQuiz, proQuiz] = await Promise.all([
    prisma.quiz.findUnique({
      where: { quizVersion_version: { quizVersion: version, version: "fast" } },
      select: { id: true },
    }),
    prisma.quiz.findUnique({
      where: { quizVersion_version: { quizVersion: version, version: "pro" } },
      select: { id: true },
    }),
  ]);

  if (!fastQuiz) return { ok: false, message: "missing quiz v1/fast" };
  if (!proQuiz) return { ok: false, message: "missing quiz v1/pro" };

  const [
    fastQuestionCount,
    fastOptionCount,
    proQuestionCount,
    proOptionCount,
    archetypeCount,
    trainingDayCount,
    trainingSectionCount,
    methodologySectionCount,
    sopDefinitionCount,
  ] = await Promise.all([
    prisma.question.count({ where: { quizId: fastQuiz.id } }),
    prisma.option.count({ where: { question: { quizId: fastQuiz.id } } }),
    prisma.question.count({ where: { quizId: proQuiz.id } }),
    prisma.option.count({ where: { question: { quizId: proQuiz.id } } }),
    prisma.archetype.count({ where: { version } }),
    prisma.trainingDay.count({ where: { handbook: { version } } }),
    prisma.trainingSection.count({ where: { day: { handbook: { version } } } }),
    prisma.methodologySection.count({ where: { doc: { version } } }),
    prisma.sopDefinition.count(),
  ]);

  const problems: string[] = [];
  if (fastQuestionCount < 9 || fastOptionCount < 9 * 4) {
    problems.push(`quiz v1/fast expected >=9Q & >=36O, got ${fastQuestionCount}Q/${fastOptionCount}O`);
  }
  if (proQuestionCount < 18 || proOptionCount < 18 * 4) {
    problems.push(`quiz v1/pro expected >=18Q & >=72O, got ${proQuestionCount}Q/${proOptionCount}O`);
  }
  if (archetypeCount < 6) {
    problems.push(`archetypes v1 expected >=6, got ${archetypeCount}`);
  }
  if (trainingDayCount < 7 || trainingSectionCount <= 0) {
    problems.push(
      `training handbook v1 expected >=7 days & >0 sections, got ${trainingDayCount} days/${trainingSectionCount} sections`
    );
  }
  if (methodologySectionCount <= 0) {
    problems.push(`methodology v1 expected >0 sections, got ${methodologySectionCount}`);
  }
  if (sopDefinitionCount <= 0) {
    problems.push(`sop_definition expected >0, got ${sopDefinitionCount}`);
  }

  if (problems.length > 0) {
    return { ok: false, message: problems.join("; ") };
  }

  return { ok: true };
}

async function main() {
  printHeader("smoke:prod-gate (read-only)");

  assert(process.env.DATABASE_URL, "DATABASE_URL is required");

  // 对 CI/生产建议：用 DIRECT_URL 直连跑 smoke，避免 pooler 限制/歧义
  if (process.env.DIRECT_URL && !envTruthy("USE_POOLER")) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log("Info: DATABASE_URL overridden by DIRECT_URL for this smoke gate run.");
  }

  const prisma = new PrismaClient();
  try {
    const checks: Array<[string, () => Promise<CheckResult>]> = [
      ["migrations applied", () => checkMigrationsApplied(prisma)],
      ["seed status (v1)", () => checkSeedStatus(prisma)],
    ];

    let allOk = true;
    for (const [label, fn] of checks) {
      try {
        const r = await fn();
        if (r.ok) {
          printOk(label);
        } else {
          allOk = false;
          printFail(label, r.message);
        }
      } catch (e) {
        allOk = false;
        printFail(label, e instanceof Error ? e.message : String(e));
      }
    }

    if (!allOk) {
      console.error("\nsmoke:prod-gate FAILED");
      process.exitCode = 1;
      return;
    }

    console.log("\nsmoke:prod-gate PASSED");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("smoke:prod-gate crashed:", err);
  process.exit(1);
});
