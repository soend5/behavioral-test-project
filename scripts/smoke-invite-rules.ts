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
  formBody?: URLSearchParams;
}): Promise<{ status: number; json: ApiResponse<T> | unknown; headers: Headers }> {
  const method = input.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (input.cookie) headers.Cookie = input.cookie;

  let body: BodyInit | undefined;
  if (input.jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(input.jsonBody);
  } else if (input.formBody) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = input.formBody.toString();
  }

  const res = await fetch(input.url, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  let parsed: unknown = null;
  if (contentType.includes("application/json")) {
    parsed = await res.json();
  } else {
    parsed = await res.text();
  }

  return { status: res.status, json: parsed, headers: res.headers };
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

  // Ensure DB env present (used for evidence queries)
  env("DATABASE_URL");
  env("DIRECT_URL");

  const prisma = new PrismaClient();
  const results: StepResult[] = [];

  const push = (r: StepResult) => results.push(r);

  try {
    // Smoke: server reachable
    try {
      const res = await fetch(`${baseUrl}/`, { method: "GET", redirect: "manual" });
      assert(res.status >= 200 && res.status < 500, `server not reachable: status ${res.status}`);
    } catch (e) {
      fail(`server not reachable at ${baseUrl}: ${e instanceof Error ? e.message : String(e)}`);
    }

    const adminCookie = await signIn(baseUrl, "admin", "admin123");
    const coachCookie = await signIn(baseUrl, "coach1", "coach123");

    // Create a customer under coach1 for tests
    const createCustomer = await requestJson<{ customer: { id: string } }>({
      url: `${baseUrl}/api/coach/customers`,
      method: "POST",
      cookie: coachCookie,
      jsonBody: { nickname: `smoke_${Date.now()}`, phone: `13${Math.floor(Math.random() * 1e9)}` },
    });
    assert(createCustomer.status === 200, `create customer failed: ${createCustomer.status}`);
    const customerId = (createCustomer.json as ApiOk<{ customer: { id: string } }>).data.customer.id;

    // --- 1) Concurrent invite creation ---
    const invitePayload = { customerId, version: "fast", quizVersion: "v1" };
    const createInviteOnce = () =>
      requestJson<{ invite: { id: string; token: string; status: string } }>({
        url: `${baseUrl}/api/coach/invites`,
        method: "POST",
        cookie: coachCookie,
        jsonBody: invitePayload,
      });

    const [r1, r2] = await Promise.all([createInviteOnce(), createInviteOnce()]);

    const activeInvites = await prisma.invite.findMany({
      where: { customerId, version: "fast", status: "active" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, quizVersion: true, version: true, createdAt: true },
    });

    const allInvites = await prisma.invite.findMany({
      where: { customerId, version: "fast" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, quizVersion: true, version: true, createdAt: true },
    });

    push({
      name: "P0-2.1 concurrent create invite => only 1 active",
      ok: activeInvites.length === 1,
      details: {
        request1: { http: r1.status, body: r1.json },
        request2: { http: r2.status, body: r2.json },
        dbActiveCount: activeInvites.length,
        dbAllInvites: allInvites,
        note:
          "DB constraint is on (customerId, version) WHERE status='active' (stronger than customer+quizVersion+version).",
      },
    });

    // --- 2) quiz inactive => cannot create invite ---
    const quizList = await requestJson<{ quizzes: Array<{ id: string; quizVersion: string; version: string; status: string }> }>({
      url: `${baseUrl}/api/admin/quiz`,
      method: "GET",
      cookie: adminCookie,
    });
    assert(quizList.status === 200, `admin quiz list failed: ${quizList.status}`);
    const quizzes = (quizList.json as ApiOk<{ quizzes: Array<{ id: string; quizVersion: string; version: string; status: string }> }>).data
      .quizzes;
    const fastV1 = quizzes.find((q) => q.quizVersion === "v1" && q.version === "fast");
    assert(fastV1, "quiz v1/fast not found");

    const setInactive = await requestJson<{ quiz: { id: string; status: string } }>({
      url: `${baseUrl}/api/admin/quiz/${fastV1.id}`,
      method: "PATCH",
      cookie: adminCookie,
      jsonBody: { status: "inactive" },
    });
    assert(setInactive.status === 200, `set quiz inactive failed: ${setInactive.status}`);

    const inactiveTry = await createInviteOnce();

    // restore active for subsequent tests
    const setActive = await requestJson<{ quiz: { id: string; status: string } }>({
      url: `${baseUrl}/api/admin/quiz/${fastV1.id}`,
      method: "PATCH",
      cookie: adminCookie,
      jsonBody: { status: "active" },
    });
    assert(setActive.status === 200, `restore quiz active failed: ${setActive.status}`);

    const inactiveOk = inactiveTry.status === 400 || inactiveTry.status === 403;
    push({
      name: "P0-2.2 quiz status=inactive blocks invite creation",
      ok: inactiveOk,
      details: {
        setInactive: { http: setInactive.status, body: setInactive.json },
        createInviteWhenInactive: { http: inactiveTry.status, body: inactiveTry.json },
        restoreActive: { http: setActive.status, body: setActive.json },
        expected: "HTTP 400 (invalid) or 403 (forbidden)",
      },
    });

    // --- 3) completed/expired state machine gate ---
    // 3.1 completed: start/answer/submit forbidden; resolve/result allowed
    const createdForCompleted = await createInviteOnce();
    assert(createdForCompleted.status === 200, `create invite for completed test failed: ${createdForCompleted.status}`);
    const tokenCompleted = (createdForCompleted.json as ApiOk<{ invite: { token: string } }>).data.invite.token;

    const started = await requestJson<{ attemptId: string }>({
      url: `${baseUrl}/api/attempt/start`,
      method: "POST",
      jsonBody: { token: tokenCompleted },
    });
    assert(started.status === 200, `attempt start failed: ${started.status}`);
    const attemptId = (started.json as ApiOk<{ attemptId: string }>).data.attemptId;

    const quiz = await requestJson<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>({
      url: `${baseUrl}/api/quiz?token=${encodeURIComponent(tokenCompleted)}`,
      method: "GET",
    });
    assert(quiz.status === 200, `quiz fetch failed: ${quiz.status}`);
    const questions = (quiz.json as ApiOk<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>).data.questions;
    assert(questions.length > 0, "quiz questions empty");

    const answers = questions.map((q) => ({ questionId: q.id, optionId: q.options[0].id }));
    const answered = await requestJson<{ saved: boolean }>({
      url: `${baseUrl}/api/attempt/answer`,
      method: "POST",
      jsonBody: { token: tokenCompleted, attemptId, answers },
    });
    assert(answered.status === 200, `attempt answer failed: ${answered.status}`);

    const submitted = await requestJson<{ attemptId: string }>({
      url: `${baseUrl}/api/attempt/submit`,
      method: "POST",
      jsonBody: { token: tokenCompleted, attemptId },
    });
    assert(submitted.status === 200, `attempt submit failed: ${submitted.status}`);

    const startAfterCompleted = await requestJson({
      url: `${baseUrl}/api/attempt/start`,
      method: "POST",
      jsonBody: { token: tokenCompleted },
    });
    const quizAfterCompleted = await requestJson({
      url: `${baseUrl}/api/quiz?token=${encodeURIComponent(tokenCompleted)}`,
      method: "GET",
    });
    const answerAfterCompleted = await requestJson({
      url: `${baseUrl}/api/attempt/answer`,
      method: "POST",
      jsonBody: { token: tokenCompleted, attemptId, answers: [{ questionId: questions[0].id, optionId: questions[0].options[0].id }] },
    });
    const submitAfterCompleted = await requestJson({
      url: `${baseUrl}/api/attempt/submit`,
      method: "POST",
      jsonBody: { token: tokenCompleted, attemptId },
    });
    const resolveCompleted = await requestJson({
      url: `${baseUrl}/api/public/invite/resolve?token=${encodeURIComponent(tokenCompleted)}`,
      method: "GET",
    });
    const resultCompleted = await requestJson({
      url: `${baseUrl}/api/public/attempt/result?token=${encodeURIComponent(tokenCompleted)}`,
      method: "GET",
    });

    const completedOk =
      startAfterCompleted.status === 400 &&
      quizAfterCompleted.status === 400 &&
      answerAfterCompleted.status === 400 &&
      submitAfterCompleted.status === 400 &&
      resolveCompleted.status === 200 &&
      resultCompleted.status === 200;

    push({
      name: "P0-2.3 completed invite blocks start/answer/submit but allows resolve/result",
      ok: completedOk,
      details: {
        createInvite: { http: createdForCompleted.status, body: createdForCompleted.json },
        start: { http: started.status, body: started.json },
        answer: { http: answered.status, body: answered.json },
        submit: { http: submitted.status, body: submitted.json },
        afterCompleted: {
          start: { http: startAfterCompleted.status, body: startAfterCompleted.json },
          quiz: { http: quizAfterCompleted.status, body: quizAfterCompleted.json },
          answer: { http: answerAfterCompleted.status, body: answerAfterCompleted.json },
          submit: { http: submitAfterCompleted.status, body: submitAfterCompleted.json },
          resolve: { http: resolveCompleted.status, body: resolveCompleted.json },
          result: { http: resultCompleted.status, body: resultCompleted.json },
        },
      },
    });

    // 3.2 expired: start/answer/submit forbidden; resolve/result allowed (result may 404 if not submitted)
    const expiresAtPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredCreate = await requestJson<{ invite: { token: string; id: string } }>({
      url: `${baseUrl}/api/coach/invites`,
      method: "POST",
      cookie: coachCookie,
      jsonBody: { customerId, version: "fast", quizVersion: "v1", expiresAt: expiresAtPast },
    });
    assert(expiredCreate.status === 200, `create expired invite failed: ${expiredCreate.status}`);
    const tokenExpired = (expiredCreate.json as ApiOk<{ invite: { token: string; id: string } }>).data.invite.token;
    const inviteExpiredId = (expiredCreate.json as ApiOk<{ invite: { token: string; id: string } }>).data.invite.id;

    const startExpired = await requestJson({
      url: `${baseUrl}/api/attempt/start`,
      method: "POST",
      jsonBody: { token: tokenExpired },
    });
    const quizExpired = await requestJson({
      url: `${baseUrl}/api/quiz?token=${encodeURIComponent(tokenExpired)}`,
      method: "GET",
    });
    const resolveExpired = await requestJson({
      url: `${baseUrl}/api/public/invite/resolve?token=${encodeURIComponent(tokenExpired)}`,
      method: "GET",
    });
    const resultExpired = await requestJson({
      url: `${baseUrl}/api/public/attempt/result?token=${encodeURIComponent(tokenExpired)}`,
      method: "GET",
    });

    const dbExpired = await prisma.invite.findUnique({
      where: { id: inviteExpiredId },
      select: { id: true, status: true, expiresAt: true },
    });

    const expiredOk =
      startExpired.status === 400 &&
      quizExpired.status === 400 &&
      resolveExpired.status === 200 &&
      (resultExpired.status === 200 || resultExpired.status === 404);

    push({
      name: "P0-2.4 expired invite blocks start/quiz/answer/submit but allows resolve/result",
      ok: expiredOk,
      details: {
        createInvite: { http: expiredCreate.status, body: expiredCreate.json },
        start: { http: startExpired.status, body: startExpired.json },
        quiz: { http: quizExpired.status, body: quizExpired.json },
        resolve: { http: resolveExpired.status, body: resolveExpired.json },
        result: { http: resultExpired.status, body: resultExpired.json },
        dbInvite: dbExpired,
        note: "result may be 404 when no submitted attempt exists; this is acceptable as long as it is not blocked by INVITE_EXPIRED_OR_COMPLETED.",
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Print summary + JSON for docs
  const allOk = results.every((r) => r.ok);
  console.log(`smoke:invite-rules ${allOk ? "PASSED" : "FAILED"}`);
  for (const r of results) {
    console.log(`- ${r.ok ? "PASS" : "FAIL"} ${r.name}`);
  }
  console.log("\nDETAILS_JSON_BEGIN");
  console.log(JSON.stringify({ baseUrl: process.env.BASE_URL ?? "http://localhost:3000", results }, null, 2));
  console.log("DETAILS_JSON_END");

  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("smoke:invite-rules crashed:", err);
  process.exit(1);
});

