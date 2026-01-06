/**
 * POST /api/coach/customers/:id/tags - 添加标签
 * DELETE /api/coach/customers/:id/tags - 删除标签
 * 
 * POST 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * DELETE 使用的门禁函数：
 * - requireCoachOwnsCustomer() (验证 ownership)
 * 
 * 校验点：
 * ✅ 必须登录
 * ✅ coach 只能为自己的客户添加/删除标签
 * ✅ 标签格式：必须以 'coach:' 开头
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachOwnsCustomer } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { ok, fail } from "@/lib/apiResponse";
import { ErrorCode } from "@/lib/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);
    const body = await request.json();
    const { tagKey } = body;

    if (!tagKey) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 tagKey 参数");
    }

    // 验证标签格式（必须以 coach: 开头）
    if (!tagKey.startsWith("coach:")) {
      return fail(ErrorCode.VALIDATION_ERROR, "标签必须以 'coach:' 开头");
    }

    // 检查标签是否已存在
    const existingTag = await prisma.coachTag.findFirst({
      where: {
        customerId,
        coachId: session.user.id,
        tagKey,
      },
    });

    if (existingTag) {
      // 幂等：如果已存在，返回现有标签
      return ok({
        tag: {
          id: existingTag.id,
          tagKey: existingTag.tagKey,
          createdAt: existingTag.createdAt,
        },
      });
    }

    // 创建标签
    const tag = await prisma.coachTag.create({
      data: {
        customerId,
        coachId: session.user.id,
        tagKey,
      },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.create_tag",
      "coach_tag",
      tag.id,
      {
        customerId,
        tagKey,
      }
    );

    return ok({
      tag: {
        id: tag.id,
        tagKey: tag.tagKey,
        customerId: tag.customerId,
        coachId: tag.coachId,
        createdAt: tag.createdAt,
      },
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Create tag error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { requireCoach } = await import("@/lib/authz");
    const session = await requireCoach();
    const customerId = params.id;

    // 使用门禁函数：验证 ownership
    await requireCoachOwnsCustomer(prisma, session.user.id, customerId);
    const searchParams = request.nextUrl.searchParams;
    const tagKey = searchParams.get("tagKey");

    if (!tagKey) {
      return fail(ErrorCode.INVALID_INPUT, "缺少 tagKey 参数");
    }

    // 查找标签
    const tag = await prisma.coachTag.findFirst({
      where: {
        customerId,
        coachId: session.user.id,
        tagKey,
      },
    });

    if (!tag) {
      return fail(ErrorCode.NOT_FOUND, "标签不存在");
    }

    // 删除标签
    await prisma.coachTag.delete({
      where: { id: tag.id },
    });

    // 写入审计日志
    await writeAudit(
      prisma,
      session.user.id,
      "coach.delete_tag",
      "coach_tag",
      tag.id,
      {
        customerId,
        tagKey,
      }
    );

    return ok({
      deleted: true,
    });
  } catch (error: any) {
    if (
      error.message === ErrorCode.UNAUTHORIZED ||
      error.message === ErrorCode.FORBIDDEN
    ) {
      return fail(error.message, "未登录或权限不足");
    }
    if (error.message === ErrorCode.CUSTOMER_NOT_FOUND) {
      return fail(error.message, "客户不存在");
    }
    console.error("Delete tag error:", error);
    return fail(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
  }
}

