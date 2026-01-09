/**
 * v1.6: 话术模板管理 API (Admin)
 * GET  - 获取话术列表
 * POST - 创建话术
 * 
 * 门禁：requireAdmin()
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const CreateScriptSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  triggerStage: z.enum(["pre", "mid", "post"]).nullable().optional(),
  triggerArchetype: z.string().nullable().optional(),
  triggerTags: z.array(z.string()).nullable().optional(),
  content: z.string().min(1).max(2000),
  variables: z.array(z.string()).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "active";

    const scripts = await prisma.scriptTemplate.findMany({
      where: {
        ...(status && { status }),
        ...(category && { category }),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return ok({
      scripts: scripts.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        triggerStage: s.triggerStage,
        triggerArchetype: s.triggerArchetype,
        triggerTags: s.triggerTagsJson ? JSON.parse(s.triggerTagsJson) : [],
        content: s.content,
        variables: s.variablesJson ? JSON.parse(s.variablesJson) : [],
        status: s.status,
        usageCount: s.usageCount,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("GET /api/admin/scripts error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = CreateScriptSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { name, category, triggerStage, triggerArchetype, triggerTags, content, variables } = parsed.data;

    const script = await prisma.scriptTemplate.create({
      data: {
        name,
        category,
        triggerStage: triggerStage ?? null,
        triggerArchetype: triggerArchetype ?? null,
        triggerTagsJson: triggerTags ? JSON.stringify(triggerTags) : null,
        content,
        variablesJson: variables ? JSON.stringify(variables) : null,
      },
    });

    await writeAudit(prisma, session.user.id, "script.create", "ScriptTemplate", script.id, { name, category });

    return ok({
      script: {
        id: script.id,
        name: script.name,
        category: script.category,
        triggerStage: script.triggerStage,
        triggerArchetype: script.triggerArchetype,
        triggerTags: script.triggerTagsJson ? JSON.parse(script.triggerTagsJson) : [],
        content: script.content,
        variables: script.variablesJson ? JSON.parse(script.variablesJson) : [],
        status: script.status,
        usageCount: script.usageCount,
        createdAt: script.createdAt.toISOString(),
        updatedAt: script.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("POST /api/admin/scripts error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
