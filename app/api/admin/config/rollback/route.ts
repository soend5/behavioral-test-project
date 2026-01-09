/**
 * POST /api/admin/config/rollback - 回滚配置到指定版本
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): ApiFail {
  return { ok: false, error: { code, message } };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  try {
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(fail("MISSING_VERSION_ID", "缺少 versionId"), { status: 400 });
    }

    // 获取版本记录
    const version = await prisma.configVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      return NextResponse.json(fail("VERSION_NOT_FOUND", "版本不存在"), { status: 404 });
    }

    const data = JSON.parse(version.dataJson);

    // 根据配置类型执行回滚
    if (version.configType === "sop") {
      await prisma.sopDefinition.update({
        where: { sopId: version.configId },
        data: {
          sopName: data.sopName,
          sopStage: data.sopStage,
          status: data.status,
          priority: data.priority,
          stateSummary: data.stateSummary,
          coreGoal: data.coreGoal,
          strategyListJson: data.strategyListJson,
          forbiddenListJson: data.forbiddenListJson,
          notes: data.notes,
        },
      });
    } else if (version.configType === "script") {
      await prisma.scriptTemplate.update({
        where: { id: version.configId },
        data: {
          name: data.name,
          category: data.category,
          triggerStage: data.triggerStage,
          triggerArchetype: data.triggerArchetype,
          triggerTagsJson: data.triggerTagsJson,
          content: data.content,
          variablesJson: data.variablesJson,
          status: data.status,
          sopId: data.sopId,
        },
      });
    } else if (version.configType === "training") {
      await prisma.trainingPlan.update({
        where: { id: version.configId },
        data: {
          name: data.name,
          description: data.description,
          durationDays: data.durationDays,
          status: data.status,
        },
      });
    }

    // 记录新版本
    const latestVersion = await prisma.configVersion.findFirst({
      where: { configType: version.configType, configId: version.configId },
      orderBy: { version: "desc" },
    });

    await prisma.configVersion.create({
      data: {
        configType: version.configType,
        configId: version.configId,
        version: (latestVersion?.version || 0) + 1,
        dataJson: version.dataJson,
        changedBy: session.user.id,
        changeNote: `回滚到版本 ${version.version}`,
      },
    });

    await writeAudit(
      prisma,
      session.user.id,
      "config.rollback",
      version.configType,
      version.configId,
      { fromVersion: version.version }
    );

    return NextResponse.json(ok({ success: true, message: `已回滚到版本 ${version.version}` }));
  } catch (error) {
    console.error("Config rollback error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}
