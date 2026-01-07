/**
 * 生产环境种子数据（幂等，可重复运行）
 *
 * 强门禁（避免误连生产库在本地执行）：
 * 1) 仅允许在 GitHub Actions（GITHUB_ACTIONS=true）或显式 ALLOW_PROD_SEED=true 时运行
 * 2) 必须提供 SEED_ADMIN_PASSWORD（强密码）
 * 3) 使用 Postgres advisory lock，避免并发写库
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedContentAssets } from "./seed-content";

function envTruthy(name: string): boolean {
  const value = process.env[name];
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(String(value).trim().toLowerCase());
}

function isCommonWeakPassword(password: string): boolean {
  const p = password.trim().toLowerCase();
  const weak = new Set([
    "admin",
    "admin123",
    "coach",
    "coach123",
    "password",
    "password123",
    "123456",
    "12345678",
    "111111",
    "000000",
    "qwerty",
    "letmein",
    "welcome",
    "changeme",
  ]);
  if (weak.has(p)) return true;
  if (/^(admin|coach)\d+$/i.test(password)) return true;
  if (/^\d+$/.test(password)) return true;
  if (/^(.)\1+$/.test(password)) return true;
  return false;
}

function assertStrongPassword(password: string, label: string) {
  const trimmed = password.trim();
  if (trimmed.length < 12) {
    throw new Error(`${label} too weak: length must be >= 12`);
  }
  if (isCommonWeakPassword(trimmed)) {
    throw new Error(`${label} too weak: matches common weak password patterns`);
  }
}

function assertProdSeedAllowed() {
  const allow = envTruthy("GITHUB_ACTIONS") || envTruthy("ALLOW_PROD_SEED");
  if (!allow) {
    throw new Error(
      "Refusing to run seed:prod. Allowed only in CI (GITHUB_ACTIONS=true) or with ALLOW_PROD_SEED=true."
    );
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("Missing SEED_ADMIN_PASSWORD (required for seed:prod)");
  }
  assertStrongPassword(adminPassword, "SEED_ADMIN_PASSWORD");

  if (!process.env.DIRECT_URL) {
    throw new Error("Missing DIRECT_URL (required for seed:prod to avoid pooler issues)");
  }

  const coachPassword = process.env.SEED_COACH_PASSWORD;
  if (coachPassword) {
    assertStrongPassword(coachPassword, "SEED_COACH_PASSWORD");
  }
}

async function main() {
  console.log("开始填充生产环境种子数据...");

  // Hard gates before touching the DB
  assertProdSeedAllowed();

  // Prisma Client 运行时只读 DATABASE_URL；生产 seed 建议使用直连 DIRECT_URL
  if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(
      async (tx) => {
      // 防并发：transaction-level advisory lock（避免 Prisma pool 下 session lock 泄漏）
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('seed_prod_lock'))`;

      // 1) 创建 admin 账号（幂等）
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

      const existingAdmin = await tx.user.findUnique({
        where: { username: adminUsername },
      });

      if (!existingAdmin) {
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        await tx.user.create({
          data: {
            username: adminUsername,
            passwordHash: adminPasswordHash,
            role: "admin",
            status: "active",
          },
        });
        console.log(`? 创建 admin 账号: ${adminUsername}`);
      } else {
        console.log(`??  admin 账号已存在: ${adminUsername}`);
      }

      // 2) 可选：创建 coach 账号（幂等，必须显式提供强密码）
      const coachUsername = process.env.COACH_USERNAME || "coach1";
      const coachPassword = process.env.SEED_COACH_PASSWORD;

      const existingCoach = await tx.user.findUnique({
        where: { username: coachUsername },
      });

      if (!existingCoach) {
        if (!coachPassword) {
          console.log(
            "??  未提供 SEED_COACH_PASSWORD，跳过创建默认 coach 账号（可在 Admin 后台创建 coach）"
          );
        } else {
          const coachPasswordHash = await bcrypt.hash(coachPassword, 10);
          await tx.user.create({
            data: {
              username: coachUsername,
              passwordHash: coachPasswordHash,
              role: "coach",
              status: "active",
            },
          });
          console.log(`? 创建 coach 账号: ${coachUsername}`);
        }
      } else {
        console.log(`??  coach 账号已存在: ${coachUsername}`);
      }

      // 3) 创建默认 coaching_stage（幂等）
      const defaultStages = [
        {
          stageId: "pre",
          stageName: "前期阶段",
          stageDesc: "第一段认知建立期",
          uiColor: "#FF5733",
          allowActions: JSON.stringify(["建立信任", "了解需求"]),
          forbidActions: JSON.stringify(["过度推销", "承诺收益"]),
        },
        {
          stageId: "mid",
          stageName: "中期阶段",
          stageDesc: "需求确认与方案沟通期",
          uiColor: "#33C3F0",
          allowActions: JSON.stringify(["提供方案", "解答疑问"]),
          forbidActions: JSON.stringify(["催促决策", "夸大收益"]),
        },
        {
          stageId: "post",
          stageName: "后期阶段",
          stageDesc: "决策与跟进期",
          uiColor: "#28A745",
          allowActions: JSON.stringify(["跟进进度", "提供支持"]),
          forbidActions: JSON.stringify(["频繁打扰", "施加压力"]),
        },
      ];

      for (const stage of defaultStages) {
        const existing = await tx.coachingStage.findUnique({
          where: { stageId: stage.stageId },
        });

        if (!existing) {
          await tx.coachingStage.create({ data: stage });
          console.log(`? 创建 coaching_stage: ${stage.stageId}`);
        } else {
          console.log(`??  coaching_stage 已存在: ${stage.stageId}`);
        }
      }

      // 4) 填充内容资产（题库/画像/内训/方法论）——幂等导入
      await seedContentAssets(tx);

      console.log("? 生产环境种子数据填充完成");
      },
      {
        maxWait: 60_000,
        timeout: 300_000,
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("seed:prod failed:", e);
  process.exit(1);
});
