import "dotenv/config";

import { PrismaClient } from "@prisma/client";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type StepResult = {
  name: string;
  ok: boolean;
  details: Record<string, unknown>;
};

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) fail(`${name} is required`);
  return v;
}

class CookieJar {
  private jar = new Map<string, string>();

  absorbFromResponse(res: Response) {
    const anyHeaders = res.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const setCookies =
      anyHeaders.getSetCookie?.() ??
      (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
    for (const raw of setCookies) {
      const first = raw.split(";")[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1);
      if (!name) continue;
      this.jar.set(name, value);
    }
  }

  headerValue(): string {
    return Array.from(this.jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

async function requestJson<T>(input: {
  url: string;
  method?: string;
  cookie?: string;
  jsonBody?: unknown;
}): Promise<{ status: number; json: ApiResponse<T> | unknown }> {
  const method = input.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.cookie) headers.Cookie = input.cookie;

  let body: BodyInit | undefined;
  if (input.jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(input.jsonBody);
  }

  const res = await fetch(input.url, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const parsed: unknown = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  return { status: res.status, json: parsed };
}

async function signIn(baseUrl: string, username: string, password: string) {
  const jar = new CookieJar();

  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "manual",
    cache: "no-store",
  });
  jar.absorbFromResponse(csrfRes);
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
  assert(csrfJson.csrfToken, "csrfToken missing from /api/auth/csrf");

  const body = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    username,
    password,
    callbackUrl: `${baseUrl}/`,
  });

  const cbRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.headerValue(),
    },
    body: body.toString(),
    redirect: "manual",
    cache: "no-store",
  });
  jar.absorbFromResponse(cbRes);

  const cookie = jar.headerValue();
  assert(
    cookie.includes("next-auth.session-token="),
    "missing next-auth.session-token after sign-in"
  );
  return cookie;
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  env("DATABASE_URL");
  env("DIRECT_URL");

  const prisma = new PrismaClient();
  const results: StepResult[] = [];
  const push = (r: StepResult) => results.push(r);

  try {
    const adminCookie = await signIn(baseUrl, "admin", "admin123");

    const quizList = await requestJson<{ quizzes: Array<{ id: string; quizVersion: string; version: string }> }>({
      url: `${baseUrl}/api/admin/quiz`,
      method: "GET",
      cookie: adminCookie,
    });
    assert(quizList.status === 200, `admin quiz list failed: ${quizList.status}`);
    const quizzes =
      (quizList.json as ApiOk<{ quizzes: Array<{ id: string; quizVersion: string; version: string }> }>).data.quizzes;
    const fastV1 = quizzes.find((q) => q.quizVersion === "v1" && q.version === "fast");
    assert(fastV1, "quiz v1/fast not found");

    const questionCountBefore = await prisma.question.count({
      where: { quizId: fastV1.id },
    });

    const createQuestion = await requestJson({
      url: `${baseUrl}/api/admin/questions`,
      method: "POST",
      cookie: adminCookie,
      jsonBody: { quizId: fastV1.id, orderNo: 9999, stem: "SMOKE should be rejected", status: "active" },
    });

    const questionCountAfter = await prisma.question.count({
      where: { quizId: fastV1.id },
    });

    const qRejected =
      createQuestion.status === 400 &&
      typeof createQuestion.json === "object" &&
      !!createQuestion.json &&
      "ok" in createQuestion.json &&
      (createQuestion.json as any).ok === false &&
      (createQuestion.json as any).error?.code === "VALIDATION_ERROR";

    push({
      name: "P0-4.2 v1 readonly: POST /api/admin/questions hard-rejects (no DB writes)",
      ok: qRejected && questionCountAfter === questionCountBefore,
      details: {
        quizId: fastV1.id,
        beforeCount: questionCountBefore,
        afterCount: questionCountAfter,
        response: { http: createQuestion.status, body: createQuestion.json },
        codeLocation: "app/api/admin/questions/route.ts",
      },
    });

    const oneQuestion = await prisma.question.findFirst({
      where: { quizId: fastV1.id },
      select: { id: true },
    });
    assert(oneQuestion, "no v1 questions found to test option creation");

    const optionCountBefore = await prisma.option.count({
      where: { questionId: oneQuestion.id },
    });

    const createOption = await requestJson({
      url: `${baseUrl}/api/admin/options`,
      method: "POST",
      cookie: adminCookie,
      jsonBody: { questionId: oneQuestion.id, orderNo: 9999, text: "SMOKE option should be rejected" },
    });

    const optionCountAfter = await prisma.option.count({
      where: { questionId: oneQuestion.id },
    });

    const oRejected =
      createOption.status === 400 &&
      typeof createOption.json === "object" &&
      !!createOption.json &&
      "ok" in createOption.json &&
      (createOption.json as any).ok === false &&
      (createOption.json as any).error?.code === "VALIDATION_ERROR";

    push({
      name: "P0-4.2 v1 readonly: POST /api/admin/options hard-rejects (no DB writes)",
      ok: oRejected && optionCountAfter === optionCountBefore,
      details: {
        questionId: oneQuestion.id,
        beforeCount: optionCountBefore,
        afterCount: optionCountAfter,
        response: { http: createOption.status, body: createOption.json },
        codeLocation: "app/api/admin/options/route.ts",
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  const allOk = results.every((r) => r.ok);
  console.log(`smoke:v1-readonly ${allOk ? "PASSED" : "FAILED"}`);
  for (const r of results) console.log(`- ${r.ok ? "PASS" : "FAIL"} ${r.name}`);
  console.log("\nDETAILS_JSON_BEGIN");
  console.log(JSON.stringify({ baseUrl: process.env.BASE_URL ?? "http://localhost:3000", results }, null, 2));
  console.log("DETAILS_JSON_END");
  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("smoke:v1-readonly crashed:", err);
  process.exit(1);
});

