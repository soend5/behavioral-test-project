/**
 * 生产环境种子数据
 * 幂等性：可重复运行，不会重复创建数据
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("开始填充种子数据...");

  // 1. 创建 admin 账号（幂等）
  const adminUsername = "admin";
  let admin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!admin) {
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    admin = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "active",
      },
    });
    console.log(`✅ 创建 admin 账号: ${adminUsername}`);
  } else {
    console.log(`ℹ️  admin 账号已存在: ${adminUsername}`);
  }

  // 2. 创建 coach 账号（幂等）
  const coachUsername = "coach1";
  let coach = await prisma.user.findUnique({
    where: { username: coachUsername },
  });

  if (!coach) {
    const coachPassword = process.env.COACH_PASSWORD || "coach123";
    const coachPasswordHash = await bcrypt.hash(coachPassword, 10);

    coach = await prisma.user.create({
      data: {
        username: coachUsername,
        passwordHash: coachPasswordHash,
        role: "coach",
        status: "active",
      },
    });
    console.log(`✅ 创建 coach 账号: ${coachUsername}`);
  } else {
    console.log(`ℹ️  coach 账号已存在: ${coachUsername}`);
  }

  // 3. 创建 quiz v1 骨架（幂等）
  const quizVersion = "v1";

  // Fast 版本
  let fastQuiz = await prisma.quiz.findFirst({
    where: {
      quizVersion,
      version: "fast",
    },
  });

  if (!fastQuiz) {
    fastQuiz = await prisma.quiz.create({
      data: {
        quizVersion,
        version: "fast",
        title: "快速测评 v1",
        status: "active",
      },
    });
    console.log(`✅ 创建 fast quiz v1`);
  } else {
    console.log(`ℹ️  fast quiz v1 已存在`);
  }

  // Pro 版本
  let proQuiz = await prisma.quiz.findFirst({
    where: {
      quizVersion,
      version: "pro",
    },
  });

  if (!proQuiz) {
    proQuiz = await prisma.quiz.create({
      data: {
        quizVersion,
        version: "pro",
        title: "完整测评 v1",
        status: "active",
      },
    });
    console.log(`✅ 创建 pro quiz v1`);
  } else {
    console.log(`ℹ️  pro quiz v1 已存在`);
  }

  // 4. 创建默认 coaching_stage（幂等）
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
    const existing = await prisma.coachingStage.findUnique({
      where: { stageId: stage.stageId },
    });

    if (!existing) {
      await prisma.coachingStage.create({
        data: stage,
      });
      console.log(`✅ 创建 coaching_stage: ${stage.stageId}`);
    } else {
      console.log(`ℹ️  coaching_stage 已存在: ${stage.stageId}`);
    }
  }

  console.log("✅ 种子数据填充完成");
}

main()
  .catch((e) => {
    console.error("种子数据填充失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


