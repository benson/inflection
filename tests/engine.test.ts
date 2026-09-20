import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRequest,
  conditionsFor,
  evaluate,
  findMatchingRun,
  fromSeed,
  maxWordingSwing,
  answerTally,
  majorityWinner,
  tallyText,
  meanProb,
  parseResponse,
  validateExperiment,
  winners,
  wordDiff,
  SHARED_API,
} from "../src/engine";
import { seeds } from "../src/seeds";
import { findRecordedRun, recordedRun } from "../src/recorded";
import factPrompts from "../research/2026-09-20/facts-confirm-prompts.json";
import factConfirm from "../research/2026-09-20/facts-confirm.json";
import religionPrompts from "../research/2026-09-20/religion-confirm-prompts.json";
import religionConfirm from "../research/2026-09-20/religion-confirm.json";
import { isDraft, isExperiment } from "../src/storage";

const prompts = [
  ...factPrompts.filter((prompt) => prompt.id !== "sharks-trees"),
  ...religionPrompts,
];
const confirmedRuns = [...factConfirm.runs, ...religionConfirm.runs];
const firstRecording = () => recordedRun(seeds[0].id)!;

test("every seed bundles three validated responses to its exact confirmed request", () => {
  assert.deepEqual(
    seeds,
    prompts.map(({ question, variants, ...p }) => ({
      ...p,
      wordings: [question, ...variants],
    })),
  );
  for (const seed of seeds) {
    const run = recordedRun(seed.id);
    assert.ok(run, seed.id);
    const prompt = prompts.find((p) => p.id === seed.id)!;
    assert.deepEqual(seed.wordings, [prompt.question, ...prompt.variants]);
    assert.deepEqual(run.request, buildRequest(fromSeed(seed)));
    assert.deepEqual(run.conditions, conditionsFor(fromSeed(seed)));
    assert.equal(run.responses.length, 3);
    assert.equal(run.source, "recorded");
    const repeats = confirmedRuns
      .filter((repeat) => repeat.id === seed.id)
      .sort((a, b) => a.repeat - b.repeat);
    assert.deepEqual(
      repeats.map((repeat) => repeat.repeat),
      [1, 2, 3],
    );
    for (const repeat of repeats) {
      assert.deepEqual(
        Object.values(repeat.request.questions),
        Object.values(buildRequest(fromSeed(seed)).questions),
      );
      assert.deepEqual(
        parseResponse(
          {
            ...repeat.response,
            answers: Object.fromEntries(
              Object.keys(repeat.request.questions).map((id, i) => [
                `w${i + 1}`,
                (repeat.response.answers as Record<string, unknown>)[id],
              ]),
            ),
          },
          run.conditions,
        ),
        run.responses[repeat.repeat - 1],
      );
    }
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

test("recordings restore only unchanged requests, without entering history matching", () => {
  for (const seed of seeds) {
    const experiment = fromSeed(seed);
    const recorded = recordedRun(seed.id)!;
    assert.deepEqual(findRecordedRun(experiment), recorded);
    experiment.wordings[0].text += " Really?";
    assert.equal(findRecordedRun(experiment), null);
    experiment.wordings[0].text = seed.wordings[0];
    assert.deepEqual(findRecordedRun(experiment), recorded);
    assert.equal(findMatchingRun(recorded.experiment, [recorded]), null);
  }
});

test("unfinished drafts survive reload without becoming runnable experiments", () => {
  const draft = fromSeed(seeds[0]);
  draft.wordings[0].text = "";
  draft.options[0].label = "";
  assert.equal(isDraft(draft), true);
  assert.equal(isExperiment(draft), false);
  assert.equal(isDraft({ wordings: "missing structure" }), false);
});

test("returning to unchanged inputs restores the latest real comparison, including after serialization", () => {
  const older = { ...firstRecording(), source: "local" as const, id: "older" };
  const latest = { ...structuredClone(older), id: "latest" };
  const unrelated = structuredClone(latest);
  unrelated.experiment.wordings[0].text = "A different question?";
  unrelated.request = buildRequest(unrelated.experiment);
  const history = JSON.parse(JSON.stringify([unrelated, latest, older]));
  const renamed = {
    ...latest.experiment,
    title: "A new title",
    id: "renamed-copy",
  };
  assert.equal(findMatchingRun(renamed, history)?.id, "latest");
  assert.equal(findMatchingRun(latest.experiment, [firstRecording()]), null);
});

test("changed experiment inputs cannot borrow results from an earlier version", () => {
  const run = { ...firstRecording(), source: "local" as const };
  const changes: Array<(e: typeof run.experiment) => void> = [
    (e) => {
      e.wordings[0].text += " Really?";
    },
    (e) => {
      e.wordings[1].text += " Really?";
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
      e.wordings.forEach((w) => (w.text = ""));
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

test("five unique, valid examples, each with three or four different wordings", () => {
  assert.ok(seeds.length >= 2 && seeds.length <= 5);
  assert.equal(new Set(seeds.map((s) => s.id)).size, seeds.length);
  assert.equal(new Set(seeds.map((s) => s.wordings[0])).size, seeds.length);
  for (const s of seeds) {
    assert.equal(validateExperiment(fromSeed(s)), null, s.title);
    assert.ok(s.wordings.length >= 3 && s.wordings.length <= 4, s.title);
    assert.equal(new Set(s.wordings).size, s.wordings.length, s.title);
    assert.ok(fromSeed(s).wordings.every((w, i) => w.id === `w${i + 1}`));
  }
  assert.deepEqual(
    seeds.map((s) => s.id),
    [
      "reno-los-angeles",
      "cubs-ottomans",
      "maine-africa",
      "self-driving-safety",
      "religion-terrorism",
    ],
  );
});
test("all wordings preserve exact instructions and shared option IDs", () => {
  const e = fromSeed({
    ...seeds[0],
    wordings: [
      "Who should regulate self-driving cars?",
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
  e.context = "A hypothetical country.";
  const req = buildRequest(e);
  assert.equal(req.model, "typesafe/jev-1.13");
  assert.equal(req.state, e.context);
  assert.equal(Object.keys(req.questions).length, 3);
  assert.equal(req.questions.w1.instructions, e.wordings[0].text);
  assert.equal(req.questions.w2.instructions, e.wordings[1].text);
  assert.deepEqual(req.questions.w1.criteria, req.questions.w2.criteria);
});
test("empty wording drafts are omitted, duplicate labels and blank answers cannot run", () => {
  const e = fromSeed(seeds[0]);
  e.wordings[2].text = "  ";
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
    parseResponse(run.responses[0], conditions).answers.w1.choice,
    "no",
  );
  for (const mutate of [
    (r: any) => delete r.answers.w2,
    (r: any) => (r.answers.w2.probabilities.yes = NaN),
    (r: any) => (r.answers.w2.probabilities.yes = 2),
    (r: any) => (r.answers.w2.probabilities.yes = 0.9),
    (r: any) => (r.answers.w2.probabilities.third = 0),
    (r: any) => (r.answers.w2.choice = "no"),
  ]) {
    const bad = structuredClone(run.responses[0]);
    mutate(bad);
    assert.throws(() => parseResponse(bad, conditions));
  }
});
test("swing uses every wording and answer tallies count ties once", () => {
  const run = firstRecording();
  assert.ok(Math.abs(maxWordingSwing(run) - 0.6566666666666666) < 1e-9);
  assert.equal(tallyText(run), "yes 1 · no 3");
  assert.equal(majorityWinner(run), "no");
  for (const response of run.responses)
    response.answers.w1.probabilities = { yes: 0.5, no: 0.5 };
  assert.deepEqual(winners(run, "w1"), ["yes", "no"]);
  assert.equal(tallyText(run), "yes 1 · no 2 · tie 1");
  assert.equal(
    answerTally(run).reduce((n, a) => n + a.count, 0),
    run.conditions.length,
  );
  for (const response of run.responses)
    response.answers.w2.probabilities = { yes: 0.1, no: 0.9 };
  assert.equal(tallyText(run), "yes 0 · no 3 · tie 1");
  for (const response of run.responses)
    response.answers.w3.probabilities = { yes: 0.5, no: 0.5 };
  assert.equal(majorityWinner(run), null);
});
test("means average probabilities across repetitions, not just winning labels", () => {
  const run = firstRecording();
  assert.ok(
    Math.abs(meanProb(run, "w1", "yes") - (0.37 + 0.32 + 0.31) / 3) < 1e-9,
  );
});
test("word diff highlights substitutions and negation, and bounds long inputs", () => {
  const diff = wordDiff("Should this be legal?", "Should this be illegal?");
  assert.ok(diff.some((d) => d.type === "removed" && d.text === "legal?"));
  assert.ok(diff.some((d) => d.type === "added" && d.text === "illegal?"));
  assert.equal(wordDiff("a ".repeat(600), "b ".repeat(600)).length, 1);
});
test("shared transport preserves probabilities without browser credentials", async () => {
  const previousFetch = globalThis.fetch,
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
    assert.equal(run.source, "local");
    assert.ok(!JSON.stringify(run).includes("fake-test-key"));
    assert.equal(run.responses[0].usage?.input_tokens, 600);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
test("a rejected or unpaid request surfaces an error instead of synthetic output", async () => {
  const previousFetch = globalThis.fetch;
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
    globalThis.fetch = previousFetch;
  }
});
