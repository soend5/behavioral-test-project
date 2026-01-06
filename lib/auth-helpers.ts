import { getServerSession } from "next-auth/next";
import { prisma } from "./prisma";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function requireAuth(role?: "admin" | "coach") {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("未登录");
  }
  if (role && user.role !== role && user.role !== "admin") {
    throw new Error("权限不足");
  }
  return user;
}

export async function requireCoachAccess(coachId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("未登录");
  }
  // Admin 可以访问所有，coach 只能访问自己的
  if (user.role !== "admin" && user.id !== coachId) {
    throw new Error("无权访问此资源");
  }
  return user;
}

