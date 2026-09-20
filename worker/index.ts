import { MODEL, ENDPOINT } from "../src/engine";
import type { DecisionRequest } from "../src/types";

export type Env = {
  OPENROUTER_API_KEY?: string;
  REQUEST_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
};
const origins = new Set([
  "https://bensonperry.com",
  "http://127.0.0.1:5197",
  "http://localhost:5197",
]);
const MAX_BYTES = 128_000;

function json(
  data: unknown,
  status: number,
  origin: string,
  extra: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

export function validateRequest(value: unknown): DecisionRequest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid comparison.");
  const input = value as DecisionRequest;
  if (input.model !== MODEL) throw new Error("Only Jev 1.13 is available.");
  if (typeof input.state !== "string" || input.state.length > 12000)
    throw new Error("Shared context is too long.");
  if (
    !input.questions ||
    typeof input.questions !== "object" ||
    Array.isArray(input.questions)
  )
    throw new Error("Add a question.");
  const entries = Object.entries(input.questions);
  if (entries.length < 2 || entries.length > 8)
    throw new Error("Compare between two and eight wordings.");
  const questions: DecisionRequest["questions"] = Object.create(null);
  let characters = input.state.length;
  for (const [id, q] of entries) {
    if (!/^w[1-8]$/.test(id))
      throw new Error("Invalid question identifier.");
    if (
      !q ||
      q.type !== "choice" ||
      typeof q.instructions !== "string" ||
      !q.instructions.trim() ||
      q.instructions.length > 3000
    )
      throw new Error("Each wording must be 1–3,000 characters.");
    if (
      !q.criteria ||
      typeof q.criteria !== "object" ||
      Array.isArray(q.criteria)
    )
      throw new Error("Add answer options.");
    const options = Object.entries(q.criteria);
    if (options.length < 2 || options.length > 10)
      throw new Error("Each question needs 2–10 options.");
    const criteria: Record<string, string> = Object.create(null);
    characters += q.instructions.length;
    for (const [key, label] of options) {
      if (
        !/^[a-z][a-z0-9_]{0,60}$/.test(key) ||
        ["__proto__", "constructor", "prototype"].includes(key)
      )
        throw new Error("Invalid answer identifier.");
      if (typeof label !== "string" || !label.trim() || label.length > 300)
        throw new Error("Each answer label must be 1–300 characters.");
      criteria[key] = label;
      characters += label.length;
    }
    questions[id] = { type: "choice", instructions: q.instructions, criteria };
  }
  if (characters > 60000)
    throw new Error(
      "This comparison is too large. Shorten the context or wordings.",
    );
  // Rebuild from the accepted fields. Never forward model overrides, tool calls,
  // routing options, arbitrary endpoints, or client credentials.
  return { model: MODEL, state: input.state, questions };
}

async function readBody(request: Request) {
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("Comparison exceeds 128 KB.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing comparison.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Comparison exceeds 128 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    // This is a public, budget-capped service. Origin checks are a browser
    // boundary, not authentication; per-IP throttling and the key cap are separate.
    if (!origins.has(origin))
      return Response.json({ error: "Origin not allowed." }, { status: 403 });
    if (!["/status", "/decisions"].includes(url.pathname))
      return json({ error: "Not found." }, 404, origin);
    if (request.method === "OPTIONS") return json({}, 200, origin);
    if (url.pathname === "/status" && request.method === "GET")
      return json(
        { ready: Boolean(env.OPENROUTER_API_KEY), model: MODEL },
        200,
        origin,
      );
    if (url.pathname !== "/decisions" || request.method !== "POST")
      return json({ error: "Method not allowed." }, 405, origin);
    if (!env.OPENROUTER_API_KEY)
      return json(
        { error: "Shared Jev access is being connected." },
        503,
        origin,
      );
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip || !env.REQUEST_LIMITER)
      return json(
        { error: "Request protection is unavailable. Try again shortly." },
        503,
        origin,
      );
    const allowed = await env.REQUEST_LIMITER.limit({
      key: `inflection:${ip}`,
    });
    if (!allowed.success)
      return json(
        { error: "Too many comparisons. Try again in a minute." },
        429,
        origin,
        { "Retry-After": "60" },
      );
    if (
      !request.headers
        .get("Content-Type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return json({ error: "Send a JSON comparison." }, 415, origin);
    let body: DecisionRequest;
    try {
      body = validateRequest(await readBody(request));
    } catch (error) {
      return json(
        {
          error:
            error instanceof SyntaxError
              ? "Invalid JSON comparison."
              : error instanceof Error
                ? error.message
                : "Invalid comparison.",
        },
        400,
        origin,
      );
    }
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Inflection",
          "HTTP-Referer": "https://bensonperry.com/inflection/",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(40000)]),
      });
      if (!response.ok) {
        const messages: Record<number, string> = {
          401: "Shared Jev access needs its key updated.",
          402: "The shared Jev budget has been used up. Try again after it is topped up.",
          403: "OpenRouter declined this request or the shared key reached its limit.",
          429: "Jev is rate limiting requests. Try again in a minute.",
          529: "Jev is busy. Try again shortly.",
        };
        return json(
          {
            error:
              messages[response.status] ??
              "Jev could not complete this comparison. Try again shortly.",
          },
          response.status >= 400 && response.status <= 599
            ? response.status
            : 502,
          origin,
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      if (!data.answers || typeof data.model !== "string")
        return json(
          { error: "Jev returned an incomplete comparison." },
          502,
          origin,
        );
      return json(
        {
          id: data.id,
          model: data.model,
          answers: data.answers,
          usage: data.usage,
        },
        200,
        origin,
      );
    } catch {
      return json(
        { error: "Jev did not respond in time. Try again shortly." },
        504,
        origin,
      );
    }
  },
};
