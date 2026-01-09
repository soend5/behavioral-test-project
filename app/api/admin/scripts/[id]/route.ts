/**
 * v1.6: 话术模板管理 API (Admin) - 单个话术操作
 * PATCH  - 更新话术
 * DELETE - 删除话术
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

const UpdateScriptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  triggerStage: z.enum(["pre", "mid", "post"]).nullable().optional(),
  triggerArchetype: z.string().nullable().optional(),
  triggerTags: z.array(z.string()).nullable().optional(),
  content: z.string().min(1).max(2000).optional(),
  variables: z.array(z.string()).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sopId: z.string().nullable().optional(), // v2.0: 关联 SOP
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const existing = await prisma.scriptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "话术不存在", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(ErrorCode.INVALID_INPUT, "无效的请求体", 400);
    }

    const parsed = UpdateScriptSchema.safeParse(body);
    if (!parsed.success) {
      return fail(ErrorCode.INVALID_INPUT, parsed.error.errors[0]?.message || "参数错误", 400);
    }

    const { name, category, triggerStage, triggerArchetype, triggerTags, content, variables, status, sopId } = parsed.data;

    const script = await prisma.scriptTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(triggerStage !== undefined && { triggerStage }),
        ...(triggerArchetype !== undefined && { triggerArchetype }),
        ...(triggerTags !== undefined && { triggerTagsJson: triggerTags ? JSON.stringify(triggerTags) : null }),
        ...(content !== undefined && { content }),
        ...(variables !== undefined && { variablesJson: variables ? JSON.stringify(variables) : null }),
        ...(status !== undefined && { status }),
        ...(sopId !== undefined && { sopId }), // v2.0: 关联 SOP
      },
    });

    await writeAudit(prisma, session.user.id, "script.update", "ScriptTemplate", id, { changes: parsed.data });

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
        sopId: script.sopId, // v2.0
        usageCount: script.usageCount,
        createdAt: script.createdAt.toISOString(),
        updatedAt: script.updatedAt.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("PATCH /api/admin/scripts/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;

    const existing = await prisma.scriptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return fail(ErrorCode.NOT_FOUND, "话术不存在", 404);
    }

    // Soft delete by setting status to inactive
    await prisma.scriptTemplate.update({
      where: { id },
      data: { status: "inactive" },
    });

    await writeAudit(prisma, session.user.id, "script.delete", "ScriptTemplate", id, { name: existing.name });

    return ok({ deleted: true });
  } catch (e: any) {
    if (e?.code === ErrorCode.UNAUTHORIZED) {
      return fail(ErrorCode.UNAUTHORIZED, e.message, 401);
    }
    console.error("DELETE /api/admin/scripts/[id] error:", e);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器错误", 500);
  }
}
