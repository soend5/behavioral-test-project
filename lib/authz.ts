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
import { authOptions } from "./auth";

type DbClient = PrismaClient | Prisma.TransactionClient;

type Session = {
  user: {
    id: string;
    username: string;
    role: string;
  };
};

// ============================================
// 5级角色体系
// ============================================

/**
 * 角色定义
 * super_admin: 全部权限
 * content_admin: 内容管理（题库/画像/内训/方法论）
 * strategy_admin: 策略管理（SOP/话术/训练）
 * coach_manager: 查看所有助教数据 + 分配客户
 * coach: 仅自己的客户
 */
export type RoleType = 
  | "super_admin" 
  | "content_admin" 
  | "strategy_admin" 
  | "coach_manager" 
  | "coach"
  | "admin";  // 兼容旧角色

/**
 * 权限定义
 */
export type Permission = 
  // 内容管理
  | "content:read"
  | "content:write"
  | "questions:manage"
  | "archetypes:manage"
  | "training:manage"
  | "methodology:manage"
  // 策略管理
  | "strategy:read"
  | "strategy:write"
  | "sop:manage"
  | "scripts:manage"
  | "tags:manage"
  // 客户管理
  | "customers:read_all"
  | "customers:read_own"
  | "customers:assign"
  | "customers:write"
  // 系统管理
  | "config:manage"
  | "users:manage"
  | "system:admin";

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  super_admin: [
    "content:read", "content:write", "questions:manage", "archetypes:manage",
    "training:manage", "methodology:manage", "strategy:read", "strategy:write",
    "sop:manage", "scripts:manage", "tags:manage", "customers:read_all",
    "customers:read_own", "customers:assign", "customers:write",
    "config:manage", "users:manage", "system:admin"
  ],
  content_admin: [
    "content:read", "content:write", "questions:manage", "archetypes:manage",
    "training:manage", "methodology:manage", "strategy:read"
  ],
  strategy_admin: [
    "strategy:read", "strategy:write", "sop:manage", "scripts:manage",
    "tags:manage", "content:read"
  ],
  coach_manager: [
    "customers:read_all", "customers:assign", "customers:write",
    "content:read", "strategy:read"
  ],
  coach: [
    "customers:read_own", "customers:write", "content:read", "strategy:read"
  ],
  // 兼容旧 admin 角色 = super_admin
  admin: [
    "content:read", "content:write", "questions:manage", "archetypes:manage",
    "training:manage", "methodology:manage", "strategy:read", "strategy:write",
    "sop:manage", "scripts:manage", "tags:manage", "customers:read_all",
    "customers:read_own", "customers:assign", "customers:write",
    "config:manage", "users:manage", "system:admin"
  ]
};

/**
 * 角色层级（数字越大权限越高）
 */
const ROLE_HIERARCHY: Record<RoleType, number> = {
  coach: 1,
  coach_manager: 2,
  strategy_admin: 3,
  content_admin: 3,
  admin: 5,
  super_admin: 5
};

/**
 * 检查角色是否拥有指定权限
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as RoleType];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * 检查角色是否拥有所有指定权限
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * 检查角色是否拥有任一指定权限
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as RoleType] || [];
}

/**
 * 检查角色层级是否足够
 */
export function hasRoleLevel(role: string, minLevel: number): boolean {
  const level = ROLE_HIERARCHY[role as RoleType];
  return level !== undefined && level >= minLevel;
}

/**
 * 是否为管理员级别（content_admin, strategy_admin, admin, super_admin）
 */
export function isAdminLevel(role: string): boolean {
  return hasRoleLevel(role, 3);
}

/**
 * 要求特定权限
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, permission)) {
    throw new Error(ErrorCode.FORBIDDEN);
  }
  return session;
}

/**
 * 要求所有指定权限
 */
export async function requireAllPermissions(permissions: Permission[]): Promise<Session> {
  const session = await requireAuth();
  if (!hasAllPermissions(session.user.role, permissions)) {
    throw new Error(ErrorCode.FORBIDDEN);
  }
  return session;
}

/**
 * 要求任一指定权限
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<Session> {
  const session = await requireAuth();
  if (!hasAnyPermission(session.user.role, permissions)) {
    throw new Error(ErrorCode.FORBIDDEN);
  }
  return session;
}

/**
 * 获取会话（可为 null）
 */
export async function getSessionOrNull(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
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
  prisma: DbClient,
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
      throw new Error(ErrorCode.CUSTOMER_NOT_FOUND);
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
    throw new Error(ErrorCode.CUSTOMER_NOT_FOUND);
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
  prisma: DbClient,
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
      throw new Error(ErrorCode.INVITE_NOT_FOUND);
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
    throw new Error(ErrorCode.INVITE_NOT_FOUND);
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
  prisma: DbClient,
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
    coach: { select: { id: true; username: true; name: true; wechatQrcode: true } };
  };
}>;

type InviteWithoutRelations = Prisma.InviteGetPayload<{}>;

/**
 * 检查并处理邀请过期状态
 * 强制更新数据库状态，确保过期邀请不可用
 */
async function checkAndHandleInviteExpiry<T extends { id: string; status: string; expiresAt: Date | null }>(
  prisma: DbClient,
  invite: T,
  allowStatuses: string[]
): Promise<T> {
  // 检查是否过期
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    const allowExpired = allowStatuses.includes("expired");
    
    // expiresAt 到期时，强制将状态落库为 expired
    if (invite.status !== "expired" && invite.status !== "completed") {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
      // 更新内存中的状态
      invite.status = "expired";
    }

    // allowStatuses 包含 expired（例如 resolve/result）时允许只读访问
    if (!allowExpired) {
      throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
    }
  }

  // 检查状态是否允许
  if (!allowStatuses.includes(invite.status)) {
    throw new Error(ErrorCode.INVITE_EXPIRED_OR_COMPLETED);
  }

  return invite;
}

/**
 * 通过 token 获取 invite（含状态校验）
 * @param prisma PrismaClient 实例
 * @param token 原始 token（非 hash）
 * @param options 选项
 * @param options.allowStatuses 允许的状态列表，默认 ['active', 'entered']
 * @param options.includeRelations 是否包含关联数据（customer, coach）
 */
export async function requireInviteByToken(
  prisma: DbClient,
  token: string,
  options: {
    allowStatuses?: string[];
    includeRelations: true;
  }
): Promise<InviteWithRelations>;
export async function requireInviteByToken(
  prisma: DbClient,
  token: string,
  options?: {
    allowStatuses?: string[];
    includeRelations?: false;
  }
): Promise<InviteWithoutRelations>;
export async function requireInviteByToken(
  prisma: DbClient,
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
            name: true,
            wechatQrcode: true,
          },
        },
      },
    });

    if (!invite) {
      throw new Error(ErrorCode.INVITE_INVALID);
    }

    return checkAndHandleInviteExpiry(prisma, invite, allowStatuses);
  } else {
    const invite = await prisma.invite.findFirst({
      where: { tokenHash },
    });

    if (!invite) {
      throw new Error(ErrorCode.INVITE_INVALID);
    }

    return checkAndHandleInviteExpiry(prisma, invite, allowStatuses);
  }
}

/**
 * 获取 invite 的 attempt（用于 start 幂等性检查）
 * @param prisma PrismaClient 实例
 * @param inviteId invite ID
 * @returns attempt 或 null（如果不存在）
 */
export async function requireAttemptByInvite(
  prisma: DbClient,
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
  prisma: DbClient,
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
