import { PrismaClient, Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

type DbClient = PrismaClient | Prisma.TransactionClient;

type ArchetypeKey =
  | "rule_executor"
  | "emotion_driven"
  | "experience_reliant"
  | "opportunity_seeker"
  | "defensive_observer"
  | "impulsive_reactor";

type DimensionKey =
  | "rule_dependence"
  | "emotion_involvement"
  | "experience_reliance"
  | "opportunity_sensitivity"
  | "risk_defense"
  | "action_consistency";

type ScorePayload = {
  archetype_vote: ArchetypeKey;
  dimension_delta: Record<DimensionKey, 0 | 1 | 2>;
  tags: string[];
};

type QuizOptionSeed = {
  id: "A" | "B" | "C" | "D";
  text_cn: string;
  score_payload: ScorePayload;
};

type QuizQuestionSeed = {
  id: string;
  prompt_cn: string;
  options: QuizOptionSeed[];
};

type QuizFastSeed = {
  slug: string;
  version: string;
  title_cn: string;
  questions: QuizQuestionSeed[];
};

type QuizProSeed = {
  slug: string;
  version: string;
  title_cn: string;
  dimensions: Array<{
    key: DimensionKey;
    title_cn: string;
    questions: QuizQuestionSeed[];
  }>;
};

type ArchetypesSeed = {
  version: string;
  status: string;
  items: Array<{
    key: ArchetypeKey;
    title_cn: string;
    one_liner_cn: string;
    traits_cn: string[];
    risks_cn: string[];
    coach_guidance_cn: string[];
  }>;
};

type TrainingHandbookSeed = {
  version: string;
  status: string;
  days: Array<{
    day: number;
    title_cn: string;
    goal_cn: string;
    sections: Array<{ title_cn: string; bullets_cn: string[] }>;
    do_dont_cn: { do: string[]; dont: string[] };
  }>;
};

type MethodologySeed = {
  version: string;
  status: string;
  sections: Array<{
    slug: string;
    title_cn: string;
    content_markdown: string;
  }>;
};

async function readSeedJson<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", "seed", filename);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function optionIdToOrderNo(optionId: string): number {
  const map: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
  const orderNo = map[optionId];
  if (!orderNo) {
    throw new Error(`Invalid option id: ${optionId}`);
  }
  return orderNo;
}

export async function seedContentAssets(prisma: DbClient) {
  console.log("Seeding content assets from data/seed/*.json ...");

  const fast = await readSeedJson<QuizFastSeed>("quiz_fast_v1.json");
  const pro = await readSeedJson<QuizProSeed>("quiz_pro_v1.json");
  const archetypes = await readSeedJson<ArchetypesSeed>("archetypes_v1.json");
  const training = await readSeedJson<TrainingHandbookSeed>(
    "training_handbook_v1.json"
  );
  const methodology = await readSeedJson<MethodologySeed>("methodology_v1.json");

  await seedQuiz(prisma, {
    quizVersion: fast.version,
    version: "fast",
    title: fast.title_cn,
    questions: fast.questions,
  });

  const proQuestions = pro.dimensions.flatMap((d) => d.questions);
  await seedQuiz(prisma, {
    quizVersion: pro.version,
    version: "pro",
    title: pro.title_cn,
    questions: proQuestions,
  });

  await seedArchetypes(prisma, archetypes);
  await seedTrainingHandbook(prisma, training);
  await seedMethodology(prisma, methodology);

  console.log("✅ Content assets seed done.");
}

async function seedQuiz(
  prisma: DbClient,
  input: {
    quizVersion: string;
    version: "fast" | "pro";
    title: string;
    questions: QuizQuestionSeed[];
  }
) {
  const { quizVersion, version } = input;

  const quiz =
    (await prisma.quiz.findUnique({
      where: { quizVersion_version: { quizVersion, version } },
    })) ??
    (await prisma.quiz.create({
      data: {
        quizVersion,
        version,
        title: input.title,
        status: "active",
      },
    }));

  let createdQuestions = 0;
  let createdOptions = 0;

  for (const [questionIndex, q] of input.questions.entries()) {
    const orderNo = questionIndex + 1;
    const stableId = q.id;

    const existingQuestion =
      (await prisma.question.findFirst({
        where: {
          quizId: quiz.id,
          OR: [{ stableId }, { orderNo }],
        },
      })) ??
      null;

    const question =
      existingQuestion ??
      (await prisma.question.create({
        data: {
          quizId: quiz.id,
          stableId,
          orderNo,
          stem: q.prompt_cn,
          status: "active",
        },
      }));

    if (!existingQuestion) createdQuestions += 1;

    for (const opt of q.options) {
      const optOrderNo = optionIdToOrderNo(opt.id);
      const optStableId = opt.id;

      const existingOption = await prisma.option.findFirst({
        where: {
          questionId: question.id,
          OR: [{ stableId: optStableId }, { orderNo: optOrderNo }],
        },
        select: { id: true },
      });

      if (existingOption) continue;

      await prisma.option.create({
        data: {
          questionId: question.id,
          stableId: optStableId,
          orderNo: optOrderNo,
          text: opt.text_cn,
          scorePayloadJson: JSON.stringify(opt.score_payload),
        },
      });
      createdOptions += 1;
    }
  }

  console.log(
    `- quiz ${quizVersion}/${version}: +${createdQuestions} questions, +${createdOptions} options`
  );
}

async function seedArchetypes(prisma: DbClient, data: ArchetypesSeed) {
  let created = 0;
  for (const item of data.items) {
    const exists = await prisma.archetype.findUnique({
      where: {
        key_version: {
          key: item.key,
          version: data.version,
        },
      },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.archetype.create({
      data: {
        key: item.key,
        titleCn: item.title_cn,
        oneLinerCn: item.one_liner_cn,
        traitsCn: item.traits_cn,
        risksCn: item.risks_cn,
        coachGuidanceCn: item.coach_guidance_cn,
        version: data.version,
        status: data.status,
      },
    });
    created += 1;
  }
  console.log(`- archetypes ${data.version}: +${created}`);
}

async function seedTrainingHandbook(prisma: DbClient, data: TrainingHandbookSeed) {
  let handbook = await prisma.trainingHandbook.findUnique({
    where: { version: data.version },
  });

  if (!handbook) {
    handbook = await prisma.trainingHandbook.create({
      data: { version: data.version, status: data.status },
    });
    console.log(`- training_handbook ${data.version}: created`);
  }

  let createdDays = 0;
  let createdSections = 0;

  for (const day of data.days) {
    const existingDay =
      (await prisma.trainingDay.findUnique({
        where: { handbookId_dayNo: { handbookId: handbook.id, dayNo: day.day } },
      })) ??
      null;

    const dayRow =
      existingDay ??
      (await prisma.trainingDay.create({
        data: {
          handbookId: handbook.id,
          dayNo: day.day,
          titleCn: day.title_cn,
          goalCn: day.goal_cn,
          doListCn: day.do_dont_cn.do,
          dontListCn: day.do_dont_cn.dont,
        },
      }));

    if (!existingDay) createdDays += 1;

    for (const [sectionIndex, section] of day.sections.entries()) {
      const orderNo = sectionIndex + 1;
      const exists = await prisma.trainingSection.findUnique({
        where: { dayId_orderNo: { dayId: dayRow.id, orderNo } },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.trainingSection.create({
        data: {
          dayId: dayRow.id,
          orderNo,
          titleCn: section.title_cn,
          bulletsCn: section.bullets_cn,
        },
      });
      createdSections += 1;
    }
  }

  console.log(
    `- training_handbook ${data.version}: +${createdDays} days, +${createdSections} sections`
  );
}

async function seedMethodology(prisma: DbClient, data: MethodologySeed) {
  let doc = await prisma.methodologyDoc.findUnique({
    where: { version: data.version },
  });

  if (!doc) {
    doc = await prisma.methodologyDoc.create({
      data: { version: data.version, status: data.status },
    });
    console.log(`- methodology_doc ${data.version}: created`);
  }

  let created = 0;
  for (const [index, section] of data.sections.entries()) {
    const orderNo = index + 1;
    const exists = await prisma.methodologySection.findUnique({
      where: { docId_slug: { docId: doc.id, slug: section.slug } },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.methodologySection.create({
      data: {
        docId: doc.id,
        slug: section.slug,
        titleCn: section.title_cn,
        contentMarkdown: section.content_markdown,
        orderNo,
      },
    });
    created += 1;
  }

  console.log(`- methodology ${data.version}: +${created} sections`);
}
