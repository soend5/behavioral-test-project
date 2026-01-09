/**
 * v1.7: 埋点数据接收 API
 * POST - 接收埋点事件
 * 
 * 无需鉴权，支持客户端和服务端调用
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TrackingSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.any()).nullable().optional(),
  sessionId: z.string().nullable().optional(),
  inviteToken: z.string().nullable().optional(),
  timestamp: z.string().optional(),
  url: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    
    // 支持 sendBeacon 的 text/plain 格式
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("text/plain")) {
      const text = await request.text();
      body = JSON.parse(text);
    } else {
      body = await request.json();
    }

    const parsed = TrackingSchema.safeParse(body);
    if (!parsed.success) {
      // 静默失败，不返回错误
      return new Response(null, { status: 204 });
    }

    const { event, properties, sessionId, inviteToken } = parsed.data;

    // 获取 IP 和 User-Agent
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    // 异步写入数据库，不阻塞响应
    prisma.trackingEvent
      .create({
        data: {
          event,
          sessionId: sessionId || null,
          inviteToken: inviteToken || null,
          propertiesJson: properties ? JSON.stringify(properties) : null,
          userAgent,
          ipAddress,
        },
      })
      .catch((err) => {
        console.error("Failed to save tracking event:", err);
      });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Tracking API error:", err);
    return new Response(null, { status: 204 });
  }
}
