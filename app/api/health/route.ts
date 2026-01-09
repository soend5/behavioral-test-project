/**
 * GET /api/health
 * 
 * 健康检查端点
 * - 用于监控应用状态
 * - 检查数据库连接
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: "connected",
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
