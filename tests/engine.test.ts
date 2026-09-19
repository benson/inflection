import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRequest,
  conditionsFor,
  evaluate,
  fromSeed,
  maxWordingSwing,
  meanProb,
  parseResponse,
  validateExperiment,
  winners,
  wordDiff,
  ENDPOINT,
} from "../src/engine";
import { seeds, categories } from "../src/seeds";
import { sampleRun } from "../src/sample";
import { isDraft, isExperiment } from "../src/storage";

test("unfinished drafts survive reload without becoming runnable experiments", () => {
  const draft = fromSeed(seeds[0]);
  draft.original = "";
  draft.options[0].label = "";
  assert.equal(isDraft(draft), true);
  assert.equal(isExperiment(draft), false);
  assert.equal(isDraft({ original: "missing structure" }), false);
});

test("120 unique, valid questions across 12 topics, each with two different paraphrases", () => {
  assert.equal(seeds.length, 120);
  assert.equal(categories.length, 12);
  assert.equal(new Set(seeds.map((s) => s.id)).size, 120);
  assert.equal(new Set(seeds.map((s) => s.question)).size, 120);
  assert.equal(seeds.filter((s) => s.options).length, 24);
  for (const s of seeds) {
    assert.equal(validateExperiment(fromSeed(s)), null, s.title);
    assert.equal(new Set([s.question, ...s.variants]).size, 3, s.title);
  }
});
test("all wordings preserve exact instructions and shared option IDs; controls vary just one factor", () => {
  const e = fromSeed(seeds[8]);
  e.expanded = true;
  e.reversed = true;
  e.context = "A hypothetical country.";
  const req = buildRequest(e);
  assert.equal(req.model, "typesafe/jev-1.13");
  assert.equal(req.state, e.context);
  assert.equal(Object.keys(req.questions).length, 5);
  assert.equal(req.questions.original.instructions, e.original);
  assert.equal(req.questions.v1.instructions, e.variants[0].text);
  assert.deepEqual(req.questions.original.criteria, req.questions.v1.criteria);
  assert.deepEqual(
    Object.keys(req.questions.reversed.criteria),
    [...Object.keys(req.questions.original.criteria)].reverse(),
  );
  assert.equal(req.questions.expanded.instructions, e.original);
  assert.equal(Object.keys(req.questions.expanded.criteria).length, 6);
});
test("empty variants are omitted, duplicate labels and blank answers cannot run", () => {
  const e = fromSeed(seeds[0]);
  e.variants[1].text = "  ";
  assert.equal(conditionsFor(e).length, 2);
  e.options[1].label = "YES";
  assert.match(validateExperiment(e)!, /different labels/);
  e.options[1].label = "";
  assert.match(validateExperiment(e)!, /every answer/);
});
test("model responses reject missing, NaN, malformed, non-normalized and contradictory answers", () => {
  const sample = sampleRun(),
    conditions = sample.conditions;
  assert.equal(
    parseResponse(sample.responses[0], conditions).answers.original.choice,
    "yes",
  );
  for (const mutate of [
    (r: any) => delete r.answers.v1,
    (r: any) => (r.answers.v1.probabilities.yes = NaN),
    (r: any) => (r.answers.v1.probabilities.yes = 2),
    (r: any) => (r.answers.v1.probabilities.yes = 0.9),
    (r: any) => (r.answers.v1.probabilities.third = 0),
    (r: any) => (r.answers.v1.choice = "yes"),
  ]) {
    const bad = structuredClone(sample.responses[0]);
    mutate(bad);
    assert.throws(() => parseResponse(bad, conditions));
  }
});
test("percentage-point swing excludes controls and changed framing, and ties stay ties", () => {
  const run = sampleRun();
  assert.ok(Math.abs(maxWordingSwing(run) - 0.29) < 1e-9);
  run.conditions[2].kind = "framing";
  assert.ok(Math.abs(maxWordingSwing(run) - 0.15) < 1e-9);
  run.responses[0].answers.original.probabilities = { yes: 0.5, no: 0.5 };
  assert.deepEqual(winners(run, "original"), ["yes", "no"]);
});
test("means average probabilities across repetitions, not just winning labels", () => {
  const run = sampleRun();
  run.responses.push(structuredClone(run.responses[0]));
  run.responses[1].answers.original.probabilities = { yes: 0.8, no: 0.2 };
  assert.ok(Math.abs(meanProb(run, "original", "yes") - 0.69) < 1e-9);
});
test("word diff highlights substitutions and negation, and bounds long inputs", () => {
  const diff = wordDiff("Should this be legal?", "Should this be illegal?");
  assert.ok(diff.some((d) => d.type === "removed" && d.text === "legal?"));
  assert.ok(diff.some((d) => d.type === "added" && d.text === "illegal?"));
  assert.equal(wordDiff("a ".repeat(600), "b ".repeat(600)).length, 1);
});
test("OpenRouter transport uses Decisions, preserves probability output, never exports a key", async () => {
  const originalFetch = globalThis.fetch,
    calls: { url: unknown; body: any }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init!.body as string) });
    assert.equal(
      (init!.headers as Record<string, string>).Authorization,
      "Bearer fake-test-key",
    );
    return new Response(
      JSON.stringify({
        ...sampleRun().responses[0],
        model: "typesafe/jev-1.13-20260917",
        usage: { input_tokens: 600, cost: 0.0000252 },
      }),
      { status: 200 },
    );
  };
  try {
    const run = await evaluate(
      fromSeed(seeds[0]),
      "fake-test-key",
      3,
      new AbortController().signal,
      () => {},
    );
    assert.equal(calls.length, 3);
    assert.ok(calls.every((c) => c.url === ENDPOINT));
    assert.equal(run.responses.length, 3);
    assert.equal(run.sample, false);
    assert.ok(!JSON.stringify(run).includes("fake-test-key"));
    assert.equal(run.responses[0].usage?.input_tokens, 600);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("a rejected or unpaid request surfaces an error instead of synthetic output", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 402 });
  try {
    await assert.rejects(
      evaluate(
        fromSeed(seeds[0]),
        "fake-test-key",
        1,
        new AbortController().signal,
        () => {},
      ),
      /needs API credits/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
