import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { hashToken } from "./token";
import { authOptions } from "./auth";

/**
 * RBAC/Ownership 门禁工具
 * 
 * 最容易漏的 6 个校验点：
 * 1. Customer Ownership: customer.coachId === session.user.id
 * 2. Invite Ownership: invite.coachId === session.user.id
 * 3. Attempt Ownership: attempt.coachId === session.user.id
 * 4. Token 越权: token → invite 绑定校验
 * 5. Admin-only CRUD: role === 'admin' 校验
 * 6. Completed 禁止答题: invite.status === 'completed' 时禁止 answer/submit
 */

/**
 * 获取当前会话（必须登录）
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

/**
 * 要求特定角色（admin 或 coach）
 * admin 可以访问所有资源，coach 只能访问自己的资源
 */
export async function requireRole(role: "admin" | "coach") {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * 要求 coach 拥有指定的 customer
 * admin 可以访问所有 customer
 */
export async function requireCoachOwnsCustomer(
  coachId: string,
  customerId: string
) {
  const user = await requireAuth();
  
  // admin 可以访问所有
  if (user.role === "admin") {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new Error("NOT_FOUND");
    }
    return customer;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error("FORBIDDEN");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error("NOT_FOUND");
  }

  if (customer.coachId !== coachId) {
    throw new Error("FORBIDDEN");
  }

  return customer;
}

/**
 * 要求 coach 拥有指定的 invite
 * admin 可以访问所有 invite
 */
export async function requireCoachOwnsInvite(coachId: string, inviteId: string) {
  const user = await requireAuth();
  
  // admin 可以访问所有
  if (user.role === "admin") {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new Error("NOT_FOUND");
    }
    return invite;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error("FORBIDDEN");
  }

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new Error("NOT_FOUND");
  }

  if (invite.coachId !== coachId) {
    throw new Error("FORBIDDEN");
  }

  return invite;
}

/**
 * 要求 coach 拥有指定的 attempt
 * admin 可以访问所有 attempt
 */
export async function requireCoachOwnsAttempt(
  coachId: string,
  attemptId: string
) {
  const user = await requireAuth();
  
  // admin 可以访问所有
  if (user.role === "admin") {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      throw new Error("NOT_FOUND");
    }
    return attempt;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error("FORBIDDEN");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    throw new Error("NOT_FOUND");
  }

  if (attempt.coachId !== coachId) {
    throw new Error("FORBIDDEN");
  }

  return attempt;
}

/**
 * 通过 token 验证 invite（含状态校验）
 * 这是 client 端专用的校验函数
 * 
 * 校验点：
 * - Token 越权: token → invite 绑定校验 ✅
 * - Completed 禁止答题: invite.status === 'completed' 时禁止 answer/submit ✅
 */
export async function requireTokenInvite(token: string, allowCompleted = false) {
  if (!token) {
    throw new Error("BAD_REQUEST");
  }

  const tokenHash = hashToken(token);
  
  const invite = await prisma.invite.findFirst({
    where: { tokenHash },
    include: {
      customer: true,
      coach: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!invite) {
    throw new Error("INVITE_INVALID");
  }

  // 检查是否过期
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw new Error("INVITE_EXPIRED_OR_COMPLETED");
  }

  // 检查是否已完成或过期（除非明确允许 completed）
  if (!allowCompleted) {
    if (invite.status === "completed") {
      throw new Error("INVITE_EXPIRED_OR_COMPLETED");
    }
    if (invite.status === "expired") {
      throw new Error("INVITE_EXPIRED_OR_COMPLETED");
    }
  }

  return invite;
}

/**
 * 验证 attempt 属于指定的 invite
 */
export async function requireAttemptBelongsToInvite(
  attemptId: string,
  inviteId: string
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.inviteId !== inviteId) {
    throw new Error("FORBIDDEN");
  }

  return attempt;
}

/**
 * 验证 attempt 未提交
 */
export function requireAttemptNotSubmitted(attempt: { submittedAt: Date | null }) {
  if (attempt.submittedAt !== null) {
    throw new Error("ATTEMPT_ALREADY_SUBMITTED");
  }
}

