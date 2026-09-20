import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRequest,
  conditionsFor,
  evaluate,
  findMatchingRun,
  fromSeed,
  maxWordingSwing,
  meanProb,
  parseResponse,
  validateExperiment,
  winners,
  wordDiff,
  SHARED_API,
} from "../src/engine";
import { seeds } from "../src/seeds";
import { findRecordedRun, recordedRun } from "../src/recorded";
import prompts from "../research/2026-09-20/final-confirm-prompts.json";
import { isDraft, isExperiment } from "../src/storage";

const firstRecording = () => recordedRun(seeds[0].id)!;

test("every seed bundles three validated responses to its exact confirmed request", () => {
  assert.deepEqual(seeds, prompts);
  for (const seed of seeds) {
    const run = recordedRun(seed.id);
    assert.ok(run, seed.id);
    const prompt = prompts.find((p) => p.id === seed.id)!;
    assert.equal(seed.question, prompt.question);
    assert.deepEqual(seed.variants, prompt.variants);
    assert.deepEqual(run.request, buildRequest(fromSeed(seed)));
    assert.deepEqual(run.conditions, conditionsFor(fromSeed(seed)));
    assert.equal(run.responses.length, 3);
    assert.equal(run.sample, true);
    for (const response of run.responses) {
      assert.deepEqual(
        parseResponse({ ...response, id: response.requestId }, run.conditions),
        response,
      );
    }
  }
  assert.equal(recordedRun("unknown"), null);
  assert.equal(recordedRun("toString"), null);
});

test("recordings restore only unchanged requests and framing, without entering history matching", () => {
  for (const seed of seeds) {
    const experiment = fromSeed(seed);
    const recorded = recordedRun(seed.id)!;
    assert.deepEqual(findRecordedRun(experiment), recorded);
    experiment.original += " Really?";
    assert.equal(findRecordedRun(experiment), null);
    experiment.original = seed.question;
    assert.deepEqual(findRecordedRun(experiment), recorded);
    experiment.variants[0].kind = "framing";
    assert.equal(findRecordedRun(experiment), null);
    assert.equal(findMatchingRun(recorded.experiment, [recorded]), null);
  }
});

test("unfinished drafts survive reload without becoming runnable experiments", () => {
  const draft = fromSeed(seeds[0]);
  draft.original = "";
  draft.options[0].label = "";
  assert.equal(isDraft(draft), true);
  assert.equal(isExperiment(draft), false);
  assert.equal(isDraft({ original: "missing structure" }), false);
});

test("returning to unchanged inputs restores the latest real comparison, including after serialization", () => {
  const older = { ...firstRecording(), sample: false, id: "older" };
  const latest = { ...structuredClone(older), id: "latest" };
  const unrelated = structuredClone(latest);
  unrelated.experiment.original = "A different question?";
  unrelated.request = buildRequest(unrelated.experiment);
  const history = JSON.parse(JSON.stringify([unrelated, latest, older]));
  const renamed = {
    ...latest.experiment,
    title: "A new title",
    id: "saved-copy",
  };
  assert.equal(findMatchingRun(renamed, history)?.id, "latest");
  assert.equal(findMatchingRun(latest.experiment, [firstRecording()]), null);
});

test("changed experiment inputs cannot borrow results from an earlier version", () => {
  const run = { ...firstRecording(), sample: false };
  const changes: Array<(e: typeof run.experiment) => void> = [
    (e) => {
      e.original += " Really?";
    },
    (e) => {
      e.variants[0].text += " Really?";
    },
    (e) => {
      e.options[0].label = "Probably yes";
    },
    (e) => {
      e.options.reverse();
    },
    (e) => {
      e.context = "Consider only one country.";
    },
    (e) => {
      e.expanded = true;
    },
    (e) => {
      e.reversed = true;
    },
    (e) => {
      e.variants[0].kind = "framing";
    },
    (e) => {
      e.original = "";
    },
  ];
  for (const change of changes) {
    const changed = structuredClone(run.experiment);
    change(changed);
    assert.equal(findMatchingRun(changed, [run]), null);
    assert.equal(findRecordedRun(changed), null);
  }
  assert.equal(findMatchingRun(run.experiment, [run]), run);
});

test("four unique, valid examples, each with two or three different paraphrases", () => {
  assert.ok(seeds.length >= 2 && seeds.length <= 5);
  assert.equal(new Set(seeds.map((s) => s.id)).size, seeds.length);
  assert.equal(new Set(seeds.map((s) => s.question)).size, seeds.length);
  for (const s of seeds) {
    assert.equal(validateExperiment(fromSeed(s)), null, s.title);
    assert.ok(s.variants.length >= 2 && s.variants.length <= 3, s.title);
    assert.equal(
      new Set([s.question, ...s.variants]).size,
      s.variants.length + 1,
      s.title,
    );
    assert.ok(fromSeed(s).variants.every((v) => v.kind === "paraphrase"));
  }
  assert.deepEqual(
    seeds.map((s) => s.id),
    ["four-day-week", "self-driving-safety", "remote-work", "wealth-tax"],
  );
});
test("all wordings preserve exact instructions and shared option IDs; controls vary just one factor", () => {
  const e = fromSeed({
    ...seeds[0],
    question: "Who should regulate self-driving cars?",
    variants: [
      "Who should set rules for self-driving cars?",
      "Who should oversee autonomous car regulation?",
    ],
    options: [
      "National government",
      "Local government",
      "Industry",
      "No regulator",
    ],
  });
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
  assert.equal(conditionsFor(e).length, 3);
  e.options[1].label = "YES";
  assert.match(validateExperiment(e)!, /different labels/);
  e.options[1].label = "";
  assert.match(validateExperiment(e)!, /every answer/);
});
test("model responses reject missing, NaN, malformed, non-normalized and contradictory answers", () => {
  const run = firstRecording(),
    conditions = run.conditions;
  assert.equal(
    parseResponse(run.responses[0], conditions).answers.original.choice,
    "no",
  );
  for (const mutate of [
    (r: any) => delete r.answers.v1,
    (r: any) => (r.answers.v1.probabilities.yes = NaN),
    (r: any) => (r.answers.v1.probabilities.yes = 2),
    (r: any) => (r.answers.v1.probabilities.yes = 0.9),
    (r: any) => (r.answers.v1.probabilities.third = 0),
    (r: any) => (r.answers.v1.choice = "no"),
  ]) {
    const bad = structuredClone(run.responses[0]);
    mutate(bad);
    assert.throws(() => parseResponse(bad, conditions));
  }
});
test("percentage-point swing excludes controls and changed framing, and ties stay ties", () => {
  const run = firstRecording();
  assert.ok(Math.abs(maxWordingSwing(run) - 0.4533333333333333) < 1e-9);
  run.conditions[2].kind = "framing";
  assert.ok(Math.abs(maxWordingSwing(run) - 0.4366666666666667) < 1e-9);
  for (const response of run.responses)
    response.answers.original.probabilities = { yes: 0.5, no: 0.5 };
  assert.deepEqual(winners(run, "original"), ["yes", "no"]);
});
test("means average probabilities across repetitions, not just winning labels", () => {
  const run = firstRecording();
  assert.ok(
    Math.abs(meanProb(run, "original", "yes") - (0.43 + 0.44 + 0.39) / 3) <
      1e-9,
  );
});
test("word diff highlights substitutions and negation, and bounds long inputs", () => {
  const diff = wordDiff("Should this be legal?", "Should this be illegal?");
  assert.ok(diff.some((d) => d.type === "removed" && d.text === "legal?"));
  assert.ok(diff.some((d) => d.type === "added" && d.text === "illegal?"));
  assert.equal(wordDiff("a ".repeat(600), "b ".repeat(600)).length, 1);
});
test("shared transport preserves probabilities without browser credentials", async () => {
  const originalFetch = globalThis.fetch,
    calls: { url: unknown; body: any }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init!.body as string) });
    assert.equal(
      (init!.headers as Record<string, string>).Authorization,
      undefined,
    );
    return new Response(
      JSON.stringify({
        ...firstRecording().responses[0],
        model: "typesafe/jev-1.13-20260917",
        usage: { input_tokens: 600, cost: 0.0000252 },
      }),
      { status: 200 },
    );
  };
  try {
    const run = await evaluate(
      fromSeed(seeds[0]),
      3,
      new AbortController().signal,
      () => {},
    );
    assert.equal(calls.length, 3);
    assert.ok(calls.every((c) => c.url === `${SHARED_API}/decisions`));
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
  globalThis.fetch = async () =>
    Response.json(
      { error: "The shared Jev budget has been used up." },
      { status: 402 },
    );
  try {
    await assert.rejects(
      evaluate(fromSeed(seeds[0]), 1, new AbortController().signal, () => {}),
      /shared Jev budget/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
