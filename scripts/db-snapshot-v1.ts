import "dotenv/config";

import { PrismaClient } from "@prisma/client";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function main() {
  env("DATABASE_URL");

  const prisma = new PrismaClient();
  try {
    const version = "v1";
    const [fastQuiz, proQuiz] = await Promise.all([
      prisma.quiz.findUnique({
        where: { quizVersion_version: { quizVersion: version, version: "fast" } },
        select: { id: true, quizVersion: true, version: true, status: true },
      }),
      prisma.quiz.findUnique({
        where: { quizVersion_version: { quizVersion: version, version: "pro" } },
        select: { id: true, quizVersion: true, version: true, status: true },
      }),
    ]);

    const counts: Record<string, unknown> = {
      quizzes: { fast: fastQuiz, pro: proQuiz },
    };

    if (fastQuiz) {
      const [qCount, oCount] = await Promise.all([
        prisma.question.count({ where: { quizId: fastQuiz.id } }),
        prisma.option.count({ where: { question: { quizId: fastQuiz.id } } }),
      ]);
      counts.fast = { questionCount: qCount, optionCount: oCount };
    }

    if (proQuiz) {
      const [qCount, oCount] = await Promise.all([
        prisma.question.count({ where: { quizId: proQuiz.id } }),
        prisma.option.count({ where: { question: { quizId: proQuiz.id } } }),
      ]);
      counts.pro = { questionCount: qCount, optionCount: oCount };
    }

    const [archetypeCount, trainingDayCount, trainingSectionCount, methodologySectionCount] =
      await Promise.all([
        prisma.archetype.count({ where: { version } }),
        prisma.trainingDay.count({ where: { handbook: { version } } }),
        prisma.trainingSection.count({ where: { day: { handbook: { version } } } }),
        prisma.methodologySection.count({ where: { doc: { version } } }),
      ]);
    counts.contentAssets = {
      archetypeCount,
      trainingDayCount,
      trainingSectionCount,
      methodologySectionCount,
    };

    // Duplicate checks (should be empty due to unique constraints)
    const dupQuestionOrderNo = fastQuiz
      ? await prisma.question.groupBy({
          by: ["quizId", "orderNo"],
          where: { quizId: fastQuiz.id },
          _count: { _all: true },
          having: { quizId: { _count: { gt: 1 } } },
        })
      : [];
    const dupQuestionStableId = fastQuiz
      ? await prisma.question.groupBy({
          by: ["quizId", "stableId"],
          where: { quizId: fastQuiz.id },
          _count: { _all: true },
          having: { quizId: { _count: { gt: 1 } } },
        })
      : [];

    const dupOptionOrderNo = fastQuiz
      ? await prisma.option.groupBy({
          by: ["questionId", "orderNo"],
          where: { question: { quizId: fastQuiz.id } },
          _count: { _all: true },
          having: { questionId: { _count: { gt: 1 } } },
        })
      : [];
    const dupOptionStableId = fastQuiz
      ? await prisma.option.groupBy({
          by: ["questionId", "stableId"],
          where: { question: { quizId: fastQuiz.id } },
          _count: { _all: true },
          having: { questionId: { _count: { gt: 1 } } },
        })
      : [];

    const out = {
      at: new Date().toISOString(),
      counts,
      duplicates: {
        questionOrderNo: dupQuestionOrderNo,
        questionStableId: dupQuestionStableId,
        optionOrderNo: dupOptionOrderNo,
        optionStableId: dupOptionStableId,
      },
    };

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("db-snapshot-v1 failed:", e);
  process.exit(1);
});
