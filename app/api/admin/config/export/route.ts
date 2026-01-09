/**
 * GET /api/admin/config/export - 导出配置数据
 * 
 * Query params:
 * - type: "sop" | "script" | "training" | "all"
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): ApiFail {
  return { ok: false, error: { code, message } };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(fail("UNAUTHORIZED", "需要管理员权限"), { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") || "all";

  try {
    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.id,
      version: "2.2",
    };

    if (type === "sop" || type === "all") {
      const sops = await prisma.sopDefinition.findMany({
        include: { rules: true },
      });
      exportData.sops = sops.map(s => ({
        sopId: s.sopId,
        sopName: s.sopName,
        sopStage: s.sopStage,
        status: s.status,
        priority: s.priority,
        stateSummary: s.stateSummary,
        coreGoal: s.coreGoal,
        strategyList: s.strategyListJson ? JSON.parse(s.strategyListJson) : [],
        forbiddenList: s.forbiddenListJson ? JSON.parse(s.forbiddenListJson) : [],
        notes: s.notes,
        rules: s.rules.map(r => ({
          ruleId: r.ruleId,
          requiredStage: r.requiredStage,
          requiredTags: r.requiredTagsJson ? JSON.parse(r.requiredTagsJson) : [],
          excludedTags: r.excludedTagsJson ? JSON.parse(r.excludedTagsJson) : [],
          confidence: r.confidence,
          status: r.status,
        })),
      }));
    }

    if (type === "script" || type === "all") {
      const scripts = await prisma.scriptTemplate.findMany();
      exportData.scripts = scripts.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        triggerStage: s.triggerStage,
        triggerArchetype: s.triggerArchetype,
        triggerTags: s.triggerTagsJson ? JSON.parse(s.triggerTagsJson) : [],
        content: s.content,
        variables: s.variablesJson ? JSON.parse(s.variablesJson) : [],
        status: s.status,
        sopId: s.sopId,
      }));
    }

    if (type === "training" || type === "all") {
      const plans = await prisma.trainingPlan.findMany({
        include: { tasks: true },
      });
      exportData.trainingPlans = plans.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        durationDays: p.durationDays,
        status: p.status,
        tasks: p.tasks.map(t => ({
          id: t.id,
          dayNo: t.dayNo,
          orderNo: t.orderNo,
          type: t.type,
          title: t.title,
          description: t.description,
          content: t.contentJson ? JSON.parse(t.contentJson) : null,
          estimatedMinutes: t.estimatedMinutes,
        })),
      }));
    }

    return NextResponse.json(ok(exportData));
  } catch (error) {
    console.error("Config export error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), { status: 500 });
  }
}
