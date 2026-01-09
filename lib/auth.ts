import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// 登录失败日志记录（不阻塞主流程）
async function logFailedLogin(username: string, reason: string) {
  try {
    // 使用系统用户 ID 或 null 记录失败登录
    await prisma.auditLog.create({
      data: {
        actorUserId: "system", // 特殊标识，表示系统记录
        action: "auth.login_failed",
        targetType: "user",
        targetId: null,
        metaJson: JSON.stringify({
          username,
          reason,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (e) {
    // 静默失败，不影响登录流程
    console.error("Failed to log login failure:", e);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          await logFailedLogin(credentials.username, "user_not_found");
          return null;
        }

        if (user.status !== "active") {
          await logFailedLogin(credentials.username, "user_inactive");
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          await logFailedLogin(credentials.username, "invalid_password");
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/coach/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

