/**
 * GET /api/admin/settings
 * PATCH /api/admin/settings
 *
 * 门禁：
 * - requireAdmin()
 *
 * 当前包含：
 * - 助教创建邀请时的默认 quizVersion（全局）
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const INVITE_DEFAULT_QUIZ_VERSION_KEY = "invite_default_quiz_version";

const PatchSchema = z.object({
  inviteDefaultQuizVersion: z.string().min(1),
});

export async function GET() {
  try {
    await requireAdmin();

    let row: { value: string } | null = null;
    try {
      row = await prisma.systemSetting.findUnique({
        where: { key: INVITE_DEFAULT_QUIZ_VERSION_KEY },
        select: { value: true },
      });
    } catch (e) {
      // Backward-compatible: allow reading defaults even if the migration hasn't been applied yet.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
        row = null;
      } else {
        throw e;
      }
    }

    const quizVersions = await prisma.quiz.findMany({
      select: { quizVersion: true },
    });
    const availableQuizVersions = Array.from(
      new Set(quizVersions.map((q) => q.quizVersion).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));

    return ok({
      inviteDefaultQuizVersion: row?.value || "v1",
      availableQuizVersions,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Get admin settings error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.BAD_REQUEST, "请求体必须为 JSON");
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.VALIDATION_ERROR, "参数格式错误");
    }

    const inviteDefaultQuizVersion = parsed.data.inviteDefaultQuizVersion.trim();
    if (!inviteDefaultQuizVersion) {
      return fail(ErrorCode.VALIDATION_ERROR, "inviteDefaultQuizVersion 不能为空");
    }

    const [fastQuiz, proQuiz] = await Promise.all([
      prisma.quiz.findUnique({
        where: {
          quizVersion_version: { quizVersion: inviteDefaultQuizVersion, version: "fast" },
        },
        select: { status: true },
      }),
      prisma.quiz.findUnique({
        where: {
          quizVersion_version: { quizVersion: inviteDefaultQuizVersion, version: "pro" },
        },
        select: { status: true },
      }),
    ]);

    if (!fastQuiz || !proQuiz) {
      return fail(
        ErrorCode.VALIDATION_ERROR,
        "默认 quizVersion 必须同时存在 fast 与 pro 两套题库"
      );
    }
    if (fastQuiz.status !== "active" || proQuiz.status !== "active") {
      return fail(
        ErrorCode.VALIDATION_ERROR,
        "默认 quizVersion 对应题库必须为 active（已停用的题库不能作为默认）"
      );
    }

    let updated: { key: string; value: string; updatedAt: Date };
    try {
      updated = await prisma.systemSetting.upsert({
        where: { key: INVITE_DEFAULT_QUIZ_VERSION_KEY },
        update: { value: inviteDefaultQuizVersion },
        create: { key: INVITE_DEFAULT_QUIZ_VERSION_KEY, value: inviteDefaultQuizVersion },
        select: { key: true, value: true, updatedAt: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
        return fail(
          ErrorCode.INTERNAL_ERROR,
          "系统设置表未初始化，请先执行 Prisma migrate deploy"
        );
      }
      throw e;
    }

    await writeAudit(
      prisma,
      session.user.id,
      "admin.update_system_setting",
      "system_setting",
      updated.key,
      { value: updated.value }
    );

    return ok({
      inviteDefaultQuizVersion: updated.value,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message === ErrorCode.UNAUTHORIZED || error.message === ErrorCode.FORBIDDEN) {
      return fail(error.message, "未登录或权限不足");
    }
    console.error("Patch admin settings error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}
