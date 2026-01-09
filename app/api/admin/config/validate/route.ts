import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { validateAllConfigs } from "@/lib/config-validator";

/**
 * GET /api/admin/config/validate
 * 执行全量配置验证，检测冲突
 */
export async function GET() {
  try {
    await requireAdmin();

    const result = await validateAllConfigs(prisma);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Config validation failed:", error);
    return NextResponse.json(
      { error: "配置验证失败" },
      { status: 500 }
    );
  }
}
