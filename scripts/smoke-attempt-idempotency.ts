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
  assert(cookie.includes("next-auth.session-token="), "missing next-auth.session-token after sign-in");
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
    // sanity: server reachable
    try {
      const res = await fetch(`${baseUrl}/`, { method: "GET", redirect: "manual" });
      assert(res.status >= 200 && res.status < 500, `server not reachable: status ${res.status}`);
    } catch (e) {
      fail(`server not reachable at ${baseUrl}: ${e instanceof Error ? e.message : String(e)}`);
    }

    const adminCookie = await signIn(baseUrl, "admin", "admin123");
    const coachCookie = await signIn(baseUrl, "coach1", "coach123");

    // Create a customer under coach1
    const customerRes = await requestJson<{ customer: { id: string } }>({
      url: `${baseUrl}/api/coach/customers`,
      method: "POST",
      cookie: coachCookie,
      jsonBody: { nickname: `attempt_smoke_${Date.now()}`, phone: `13${Math.floor(Math.random() * 1e9)}` },
    });
    assert(customerRes.status === 200, `create customer failed: ${customerRes.status}`);
    const customerId = (customerRes.json as ApiOk<{ customer: { id: string } }>).data.customer.id;

    // Create invite fast/v1
    const inviteRes = await requestJson<{ invite: { id: string; token: string } }>({
      url: `${baseUrl}/api/coach/invites`,
      method: "POST",
      cookie: coachCookie,
      jsonBody: { customerId, version: "fast", quizVersion: "v1" },
    });
    assert(inviteRes.status === 200, `create invite failed: ${inviteRes.status}`);
    const token = (inviteRes.json as ApiOk<{ invite: { id: string; token: string } }>).data.invite.token;
    const inviteId = (inviteRes.json as ApiOk<{ invite: { id: string; token: string } }>).data.invite.id;

    // --- 1) attempt/start idempotency ---
    const startOnce = () =>
      requestJson<{ attemptId: string }>({
        url: `${baseUrl}/api/attempt/start`,
        method: "POST",
        jsonBody: { token },
      });

    const s1 = await startOnce();
    const s2 = await startOnce();

    const id1 = (s1.json as ApiOk<{ attemptId: string }>).data?.attemptId;
    const id2 = (s2.json as ApiOk<{ attemptId: string }>).data?.attemptId;

    const openAttempts = await prisma.attempt.findMany({
      where: { inviteId, submittedAt: null },
      select: { id: true, submittedAt: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    });

    push({
      name: "P0-3.1 attempt/start idempotent => same open attemptId and only 1 unsubmitted",
      ok: s1.status === 200 && s2.status === 200 && id1 === id2 && openAttempts.length === 1,
      details: {
        start1: { http: s1.status, body: s1.json },
        start2: { http: s2.status, body: s2.json },
        dbOpenAttempts: openAttempts,
      },
    });

    const attemptId = id1;
    assert(attemptId, "attemptId missing after start");

    // Fetch quiz and answer all
    const quizRes = await requestJson<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>({
      url: `${baseUrl}/api/quiz?token=${encodeURIComponent(token)}`,
      method: "GET",
    });
    assert(quizRes.status === 200, `quiz fetch failed: ${quizRes.status}`);
    const questions =
      (quizRes.json as ApiOk<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>).data.questions;
    assert(questions.length > 0, "quiz questions empty");

    const answersAll = questions.map((q) => ({ questionId: q.id, optionId: q.options[0].id }));
    const answerRes = await requestJson<{ saved: boolean; answeredCount: number }>({
      url: `${baseUrl}/api/attempt/answer`,
      method: "POST",
      jsonBody: { token, attemptId, answers: answersAll },
    });
    assert(answerRes.status === 200, `answer all failed: ${answerRes.status}`);

    // --- 2) attempt/submit concurrency idempotency ---
    const submitOnce = () =>
      requestJson<{ attemptId: string; submittedAt: string | null; result: unknown }>({
        url: `${baseUrl}/api/attempt/submit`,
        method: "POST",
        jsonBody: { token, attemptId },
      });

    const [sub1, sub2] = await Promise.all([submitOnce(), submitOnce()]);
    const subAt1 = (sub1.json as ApiOk<{ submittedAt: string | null }>).data?.submittedAt ?? null;
    const subAt2 = (sub2.json as ApiOk<{ submittedAt: string | null }>).data?.submittedAt ?? null;

    const dbAttempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, submittedAt: true, answersJson: true, inviteId: true },
    });
    const dbInvite = await prisma.invite.findUnique({
      where: { id: inviteId },
      select: { id: true, status: true },
    });

    const submittedAtSame =
      sub1.status === 200 &&
      sub2.status === 200 &&
      !!subAt1 &&
      !!subAt2 &&
      subAt1 === subAt2;

    push({
      name: "P0-3.2 attempt/submit concurrent idempotent => only one submittedAt and invite completed",
      ok: submittedAtSame && !!dbAttempt?.submittedAt && dbInvite?.status === "completed",
      details: {
        submit1: { http: sub1.status, body: sub1.json },
        submit2: { http: sub2.status, body: sub2.json },
        dbAttempt: {
          id: dbAttempt?.id,
          submittedAt: dbAttempt?.submittedAt?.toISOString() ?? null,
          inviteId: dbAttempt?.inviteId,
          hasAnswersJson: !!dbAttempt?.answersJson,
        },
        dbInvite,
      },
    });

    // --- 3) attempt/answer validation: inactive quiz blocks writes ---
    // Create a new invite while quiz active, start attempt, then mark quiz inactive and try answer.
    const invite2 = await requestJson<{ invite: { id: string; token: string } }>({
      url: `${baseUrl}/api/coach/invites`,
      method: "POST",
      cookie: coachCookie,
      jsonBody: { customerId, version: "fast", quizVersion: "v1" },
    });
    assert(invite2.status === 200, `create invite2 failed: ${invite2.status}`);
    const token2 = (invite2.json as ApiOk<{ invite: { id: string; token: string } }>).data.invite.token;
    const invite2Id = (invite2.json as ApiOk<{ invite: { id: string; token: string } }>).data.invite.id;

    const start2 = await requestJson<{ attemptId: string }>({
      url: `${baseUrl}/api/attempt/start`,
      method: "POST",
      jsonBody: { token: token2 },
    });
    assert(start2.status === 200, `start2 failed: ${start2.status}`);
    const attempt2Id = (start2.json as ApiOk<{ attemptId: string }>).data.attemptId;

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

    const setInactive = await requestJson({
      url: `${baseUrl}/api/admin/quiz/${fastV1.id}`,
      method: "PATCH",
      cookie: adminCookie,
      jsonBody: { status: "inactive" },
    });
    assert(setInactive.status === 200, `set quiz inactive failed: ${setInactive.status}`);

    const quiz2 = await requestJson<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>({
      url: `${baseUrl}/api/quiz?token=${encodeURIComponent(token2)}`,
      method: "GET",
    });
    // quiz should also be blocked when inactive (route checks quiz.status === active)
    const answerInactive = await requestJson({
      url: `${baseUrl}/api/attempt/answer`,
      method: "POST",
      jsonBody: {
        token: token2,
        attemptId: attempt2Id,
        answers: [{ questionId: "dummy", optionId: "dummy" }],
      },
    });

    const attempt2Db = await prisma.attempt.findUnique({
      where: { id: attempt2Id },
      select: { id: true, answersJson: true, submittedAt: true },
    });

    // restore active
    const restoreActive = await requestJson({
      url: `${baseUrl}/api/admin/quiz/${fastV1.id}`,
      method: "PATCH",
      cookie: adminCookie,
      jsonBody: { status: "active" },
    });
    assert(restoreActive.status === 200, `restore quiz active failed: ${restoreActive.status}`);

    const inactiveBlocked =
      (quiz2.status === 404 || quiz2.status === 400) &&
      (answerInactive.status === 404 || answerInactive.status === 400) &&
      !attempt2Db?.answersJson;

    push({
      name: "P0-3.3 attempt/answer validates quiz status/ownership => inactive quiz blocks writes",
      ok: inactiveBlocked,
      details: {
        invite2: { http: invite2.status, body: invite2.json },
        start2: { http: start2.status, body: start2.json },
        setInactive: { http: setInactive.status, body: setInactive.json },
        quizWhenInactive: { http: quiz2.status, body: quiz2.json },
        answerWhenInactive: { http: answerInactive.status, body: answerInactive.json },
        dbAttempt2: {
          id: attempt2Db?.id,
          hasAnswersJson: !!attempt2Db?.answersJson,
          submittedAt: attempt2Db?.submittedAt?.toISOString() ?? null,
        },
        restoreActive: { http: restoreActive.status, body: restoreActive.json },
        invite2Id,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  const allOk = results.every((r) => r.ok);
  console.log(`smoke:attempt-idempotency ${allOk ? "PASSED" : "FAILED"}`);
  for (const r of results) console.log(`- ${r.ok ? "PASS" : "FAIL"} ${r.name}`);
  console.log("\nDETAILS_JSON_BEGIN");
  console.log(JSON.stringify({ baseUrl: process.env.BASE_URL ?? "http://localhost:3000", results }, null, 2));
  console.log("DETAILS_JSON_END");
  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("smoke:attempt-idempotency crashed:", err);
  process.exit(1);
});

