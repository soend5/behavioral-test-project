/**
 * 门禁层核心
 * 统一 RBAC/Ownership/Token 校验
 * 
 * 所有 API route 必须使用此工具进行校验，禁止散写校验逻辑
 */

import { getServerSession } from "next-auth";
import { PrismaClient, Prisma } from "@prisma/client";
import { hashToken } from "./token";
import { ErrorCode } from "./errors";

type Session = {
  user: {
    id: string;
    username: string;
    role: string;
  };
};

/**
 * 获取会话（可为 null）
 */
export async function getSessionOrNull(): Promise<Session | null> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return null;
  }
  return session as Session;
}

/**
 * 要求必须登录
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSessionOrNull();
  if (!session) {
    throw new Error(ErrorCode.UNAUTHORIZED);
  }
  return session;
}

/**
 * 要求特定角色（admin 或 coach）
 * admin 可以访问所有资源
 */
export async function requireRole(role: "admin" | "coach"): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== role && session.user.role !== "admin") {
    throw new Error(ErrorCode.FORBIDDEN);
  }
  return session;
}

/**
 * 要求 admin 角色
 */
export async function requireAdmin(): Promise<Session> {
  return requireRole("admin");
}

/**
 * 要求 coach 角色
 */
export async function requireCoach(): Promise<Session> {
  return requireRole("coach");
}

/**
 * 要求 coach 拥有指定的 customer
 * admin 可以访问所有 customer
 */
export async function requireCoachOwnsCustomer(
  prisma: PrismaClient,
  coachId: string,
  customerId: string
) {
  const session = await requireAuth();
  const user = session.user;

  // admin 可以访问所有
  if (user.role === "admin") {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new Error(ErrorCode.NOT_FOUND);
    }
    return customer;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error(ErrorCode.NOT_FOUND);
  }

  if (customer.coachId !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  return customer;
}

/**
 * 要求 coach 拥有指定的 invite
 * admin 可以访问所有 invite
 */
export async function requireCoachOwnsInvite(
  prisma: PrismaClient,
  coachId: string,
  inviteId: string
) {
  const session = await requireAuth();
  const user = session.user;

  // admin 可以访问所有
  if (user.role === "admin") {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new Error(ErrorCode.NOT_FOUND);
    }
    return invite;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw new Error(ErrorCode.NOT_FOUND);
  }

  if (invite.coachId !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  return invite;
}

/**
 * 要求 coach 拥有指定的 attempt
 * admin 可以访问所有 attempt
 */
export async function requireCoachOwnsAttempt(
  prisma: PrismaClient,
  coachId: string,
  attemptId: string
) {
  const session = await requireAuth();
  const user = session.user;

  // admin 可以访问所有
  if (user.role === "admin") {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      throw new Error(ErrorCode.ATTEMPT_NOT_FOUND);
    }
    return attempt;
  }

  // coach 只能访问自己的
  if (user.role !== "coach" || user.id !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    throw new Error(ErrorCode.ATTEMPT_NOT_FOUND);
  }

  if (attempt.coachId !== coachId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  return attempt;
}

type InviteWithRelations = Prisma.InviteGetPayload<{
  include: {
    customer: true;
    coach: { select: { id: true; username: true } };
  };
}>;

type InviteWithoutRelations = Prisma.InviteGetPayload<{}>;

/**
 * 通过 token 获取 invite（含状态校验）
 * @param prisma PrismaClient 实例
 * @param token 原始 token（非 hash）
 * @param options 选项
 * @param options.allowStatuses 允许的状态列表，默认 ['active', 'entered']
 * @param options.includeRelations 是否包含关联数据（customer, coach）
 */
export async function requireInviteByToken(
  prisma: PrismaClient,
  token: string,
  options: {
    allowStatuses?: string[];
    includeRelations: true;
  }
): Promise<InviteWithRelations>;
export async function requireInviteByToken(
  prisma: PrismaClient,
  token: string,
  options?: {
    allowStatuses?: string[];
    includeRelations?: false;
  }
): Promise<InviteWithoutRelations>;
export async function requireInviteByToken(
  prisma: PrismaClient,
  token: string,
  options: {
    allowStatuses?: string[];
    includeRelations?: boolean;
  } = {}
): Promise<InviteWithRelations | InviteWithoutRelations> {
  const { allowStatuses = ["active", "entered"], includeRelations = true } =
    options;

  if (!token) {
    throw new Error(ErrorCode.BAD_REQUEST);
  }

  const tokenHash = hashToken(token);

  if (includeRelations) {
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
      throw new Error(ErrorCode.INVITE_INVALID);
    }

    // 检查是否过期
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
    }

    // 检查状态是否允许
    if (!allowStatuses.includes(invite.status)) {
      throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
    }

    return invite;
  } else {
    const invite = await prisma.invite.findFirst({
      where: { tokenHash },
    });

    if (!invite) {
      throw new Error(ErrorCode.INVITE_INVALID);
    }

    // 检查是否过期
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
    }

    // 检查状态是否允许
    if (!allowStatuses.includes(invite.status)) {
      throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
    }

    return invite;
  }
}

/**
 * 获取 invite 的 attempt（用于 start 幂等性检查）
 * @param prisma PrismaClient 实例
 * @param inviteId invite ID
 * @returns attempt 或 null（如果不存在）
 */
export async function requireAttemptByInvite(
  prisma: PrismaClient,
  inviteId: string
) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      inviteId,
      submittedAt: null, // 未提交的
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  return attempt;
}

/**
 * 断言 invite 允许答题（completed/expired 直接抛错）
 */
export function assertInviteAllowsAnswer(invite: { status: string }) {
  if (invite.status === "completed" || invite.status === "expired") {
    throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
  }
}

/**
 * 断言 invite 允许提交（completed/expired 直接抛错）
 */
export function assertInviteAllowsSubmit(invite: { status: string }) {
  if (invite.status === "completed" || invite.status === "expired") {
    throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
  }
}

/**
 * 验证 attempt 属于指定的 invite
 */
export async function requireAttemptOwnership(
  prisma: PrismaClient,
  attemptId: string,
  inviteId: string
) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    throw new Error(ErrorCode.ATTEMPT_NOT_FOUND);
  }

  if (attempt.inviteId !== inviteId) {
    throw new Error(ErrorCode.FORBIDDEN);
  }

  return attempt;
}

/**
 * 断言 attempt 未提交
 */
export function assertAttemptNotSubmitted(attempt: {
  submittedAt: Date | null;
}) {
  if (attempt.submittedAt !== null) {
    throw new Error(ErrorCode.ATTEMPT_ALREADY_SUBMITTED);
  }
}

