import test from "node:test";
import assert from "node:assert/strict";
import worker, { validateRequest, type Env } from "../worker/index";
import { buildRequest, ENDPOINT, fromSeed } from "../src/engine";
import { seeds } from "../src/seeds";
import { sampleRun } from "../src/sample";

const origin = "https://bensonperry.com";
const payload = () => buildRequest(fromSeed(seeds[0]));
const env = (allowed = true): Env => ({
  OPENROUTER_API_KEY: "server-only-fixture-secret",
  REQUEST_LIMITER: { limit: async () => ({ success: allowed }) },
});
const request = (
  body: unknown = payload(),
  headers: Record<string, string> = {},
) =>
  new Request("https://inflection-api.example/decisions", {
    method: "POST",
    headers: {
      Origin: origin,
      "CF-Connecting-IP": "192.0.2.1",
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("public proxy accepts bounded experiments and strips arbitrary routing and credentials", () => {
  const e = fromSeed(seeds[0]);
  e.expanded = true;
  e.reversed = true;
  const expected = buildRequest(e);
  const clean = validateRequest({
    ...expected,
    api_key: "bad",
    endpoint: "https://attacker.example",
    provider: { allow_fallbacks: true },
  });
  assert.equal(JSON.stringify(clean), JSON.stringify(expected));
  assert.throws(
    () => validateRequest({ ...expected, model: "expensive/other-model" }),
    /Only Jev/,
  );
  assert.throws(
    () => validateRequest({ ...expected, state: "a".repeat(12001) }),
    /context/,
  );
  assert.throws(
    () =>
      validateRequest({
        ...expected,
        questions: Object.fromEntries(
          Array.from({ length: 11 }, (_, i) => [
            `v${i}`,
            expected.questions.original,
          ]),
        ),
      }),
    /eight wordings/,
  );
  const bad = payload();
  bad.questions.original.criteria = JSON.parse(
    '{"constructor":"Yes","no":"No"}',
  );
  assert.throws(() => validateRequest(bad), /identifier/);
});

test("origin, size, type, missing secret, and throttling reject before an upstream call", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Upstream must not be called");
  };
  try {
    for (const [req, bindings, expected] of [
      [request(payload(), { Origin: "https://attacker.example" }), env(), 403],
      [request(), env(false), 429],
      [request(), { ...env(), OPENROUTER_API_KEY: undefined }, 503],
      [request(payload(), { "Content-Type": "text/plain" }), env(), 415],
      [request("a".repeat(128001)), env(), 400],
      [request("{invalid"), env(), 400],
      [request({ ...payload(), model: "other/model" }), env(), 400],
    ] as const) {
      const response = await worker.fetch(req, bindings);
      assert.equal(response.status, expected);
      assert.ok(
        !(await response.text()).includes("server-only-fixture-secret"),
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("proxy adds the server secret only upstream and sanitizes provider failures", async () => {
  const original = globalThis.fetch;
  let errorStatus = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, ENDPOINT);
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer server-only-fixture-secret",
    );
    assert.deepEqual(JSON.parse(init?.body as string), payload());
    return errorStatus
      ? Response.json(
          { error: "server-only-fixture-secret" },
          { status: errorStatus },
        )
      : Response.json({
          ...sampleRun().responses[0],
          id: "fixture",
          internal: "must-not-leak",
        });
  };
  try {
    const response = await worker.fetch(request(), env());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    const data = await response.json();
    assert.equal(data.answers.original.choice, "yes");
    assert.equal(data.internal, undefined);
    for (const status of [401, 402, 403, 429, 500]) {
      errorStatus = status;
      const rejected = await worker.fetch(request(), env());
      assert.equal(rejected.status, status);
      assert.ok(
        !(await rejected.text()).includes("server-only-fixture-secret"),
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
