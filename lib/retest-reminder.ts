/**
 * v1.8: 复测提醒逻辑
 * 
 * 用于判断客户是否需要复测提醒
 */

import { prisma } from "@/lib/prisma";

interface CustomerWithAttempts {
  id: string;
  attempts: Array<{
    id: string;
    submittedAt: Date | null;
  }>;
  enrollments?: Array<{
    id: string;
    status: string;
    completedAt: Date | null;
  }>;
}

interface RetestReminderResult {
  shouldRemind: boolean;
  reason?: string;
  daysSinceLastTest?: number;
  priority?: "high" | "medium" | "low";
}

/**
 * 计算两个日期之间的天数
 */
function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(
    (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * 判断客户是否需要复测提醒
 */
export function shouldRemindRetest(
  customer: CustomerWithAttempts
): RetestReminderResult {
  // 获取最近一次已提交的测评
  const lastAttempt = customer.attempts.find((a) => a.submittedAt !== null);

  if (!lastAttempt?.submittedAt) {
    return { shouldRemind: false };
  }

  const daysSince = daysBetween(lastAttempt.submittedAt, new Date());

  // 完成训练后提醒（高优先级）
  const completedEnrollment = customer.enrollments?.find(
    (e) => e.status === "completed" && e.completedAt
  );

  if (completedEnrollment) {
    const daysSinceTraining = daysBetween(
      completedEnrollment.completedAt!,
      new Date()
    );

    // 训练完成后 3-7 天内提醒
    if (daysSinceTraining >= 3 && daysSinceTraining <= 14) {
      return {
        shouldRemind: true,
        reason: "已完成训练，建议复测查看行为变化",
        daysSinceLastTest: daysSince,
        priority: "high",
      };
    }
  }

  // 30天定期提醒（中优先级）
  if (daysSince >= 30 && daysSince < 60) {
    return {
      shouldRemind: true,
      reason: `距上次测评已 ${daysSince} 天，建议复测`,
      daysSinceLastTest: daysSince,
      priority: "medium",
    };
  }

  // 60天以上提醒（低优先级，可能已流失）
  if (daysSince >= 60) {
    return {
      shouldRemind: true,
      reason: `距上次测评已 ${daysSince} 天，可尝试激活`,
      daysSinceLastTest: daysSince,
      priority: "low",
    };
  }

  return { shouldRemind: false };
}

/**
 * 获取需要复测提醒的客户列表（用于助教待办）
 */
export async function getRetestReminders(coachId: string) {
  // 分两步查询以避免类型问题
  const customers = await prisma.customer.findMany({
    where: { coachId },
    include: {
      attempts: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  // 获取已完成训练的报名
  const enrollments = await prisma.trainingEnrollment.findMany({
    where: {
      customerId: { in: customers.map((c) => c.id) },
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
  });

  // 按客户ID分组
  const enrollmentsByCustomer = new Map<string, typeof enrollments>();
  for (const enrollment of enrollments) {
    if (!enrollmentsByCustomer.has(enrollment.customerId)) {
      enrollmentsByCustomer.set(enrollment.customerId, []);
    }
    enrollmentsByCustomer.get(enrollment.customerId)!.push(enrollment);
  }

  const reminders: Array<{
    customerId: string;
    customerName: string | null;
    reason: string;
    daysSinceLastTest: number;
    priority: "high" | "medium" | "low";
    lastAttemptId: string;
  }> = [];

  for (const customer of customers) {
    const customerEnrollments = enrollmentsByCustomer.get(customer.id) || [];
    const customerWithEnrollments: CustomerWithAttempts = {
      id: customer.id,
      attempts: customer.attempts,
      enrollments: customerEnrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        completedAt: enrollment.completedAt,
      })),
    };

    const result = shouldRemindRetest(customerWithEnrollments);
    if (result.shouldRemind && result.reason && result.daysSinceLastTest) {
      const lastAttempt = customer.attempts[0];
      reminders.push({
        customerId: customer.id,
        customerName: customer.name || customer.nickname,
        reason: result.reason,
        daysSinceLastTest: result.daysSinceLastTest,
        priority: result.priority || "medium",
        lastAttemptId: lastAttempt?.id || "",
      });
    }
  }

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  reminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return reminders;
}

/**
 * 复测提醒类型定义（用于待办面板）
 */
export interface RetestTodo {
  type: "retest";
  customerId: string;
  customerName: string | null;
  reason: string;
  daysSinceLastTest: number;
  priority: "high" | "medium" | "low";
  action: "create_invite"; // 建议操作：创建新邀请
}

/**
 * 将复测提醒转换为待办项
 */
export function toRetestTodos(
  reminders: Awaited<ReturnType<typeof getRetestReminders>>
): RetestTodo[] {
  return reminders.map((r) => ({
    type: "retest" as const,
    customerId: r.customerId,
    customerName: r.customerName,
    reason: r.reason,
    daysSinceLastTest: r.daysSinceLastTest,
    priority: r.priority,
    action: "create_invite" as const,
  }));
}
