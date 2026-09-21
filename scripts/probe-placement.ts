import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { binaryOptions, MODEL, parseResponse, SHARED_API } from "../src/engine";
import type { DecisionRequest } from "../src/types";
import { validateRequest } from "../worker/index";

type Case = { id: string; title: string; wordings: [string, string] };
type Arm = "instructions" | "state";
type Entry = {
  caseId: string;
  repeat: number;
  wording: number;
  arm: Arm;
  request: DecisionRequest;
};
type Report = {
  plannedAt: string;
  inputSha256: string;
  endpoint: string;
  scaffold: string;
  repeats: number;
  primaryDecision: "w1";
  duplicateDecision: "w2";
  method: string;
  expectedResolvedModel: string;
  cases: Case[];
  schedule: Entry[];
  runs: (Entry & { startedAt: string; status: number; response: unknown })[];
};
const scaffold = "Answer the question.";
const arms: Arm[] = ["instructions", "state"];
const repeats = 3;

function requestFor(question: string, arm: Arm): DecisionRequest {
  return validateRequest({
    model: MODEL,
    state: arm === "state" ? question : "",
    questions: Object.fromEntries(
      ["w1", "w2"].map((id) => [
        id,
        {
          type: "choice",
          instructions:
            arm === "instructions" ? `${scaffold}\n\n${question}` : scaffold,
          criteria: { yes: "Yes", no: "No" },
        },
      ]),
    ),
  });
}

function auditPlan(report: Report) {
  assert.equal(report.scaffold, scaffold);
  assert.equal(report.repeats, repeats);
  assert.equal(report.primaryDecision, "w1");
  assert.equal(report.duplicateDecision, "w2");
  assert.equal(report.endpoint, `${SHARED_API}/decisions`);
  assert.equal(report.schedule.length, report.cases.length * 2 * 2 * repeats);
  const seen = new Set<string>();
  for (const entry of report.schedule) {
    const topic = report.cases.find((c) => c.id === entry.caseId);
    assert(topic);
    assert([1, 2].includes(entry.wording));
    assert([1, 2, 3].includes(entry.repeat));
    assert(arms.includes(entry.arm));
    const question = topic.wordings[entry.wording - 1];
    assert.equal(
      JSON.stringify(entry.request),
      JSON.stringify(requestFor(question, entry.arm)),
    );
    for (const q of Object.values(entry.request.questions)) {
      // Rejoining the fields must recover exactly the same text per decision.
      assert.equal(
        [q.instructions, entry.request.state].filter(Boolean).join("\n\n"),
        `${scaffold}\n\n${question}`,
      );
    }
    const key = [entry.caseId, entry.wording, entry.arm, entry.repeat].join(
      ":",
    );
    assert(!seen.has(key));
    seen.add(key);
  }
}

function parseRun(run: Report["runs"][number]) {
  assert.equal(run.status, 200);
  return parseResponse(
    run.response,
    ["w1", "w2"].map((id) => ({
      id,
      label: id,
      text: run.request.questions[id].instructions,
      options: binaryOptions(),
    })),
  );
}

const [mode, input, output] = process.argv.slice(2);
assert(
  input,
  "Usage: probe-placement.ts plan|run|summarize input.json [output.json]",
);
if (mode === "plan") {
  assert(output);
  const inputText = await readFile(input, "utf8");
  // Deliberately discard every prior context, definition, fact, and source.
  const cases: Case[] = JSON.parse(inputText).map((c: Case) => ({
    id: c.id,
    title: c.title,
    wordings: c.wordings,
  }));
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  assert(cases.every((c) => c.wordings.length === 2));
  const schedule = Array.from({ length: repeats }, (_, round) =>
    cases.flatMap((_, offset) => {
      const topic = cases[(offset + round) % cases.length];
      return [0, 1].flatMap((wordingOffset) => {
        const wordingIndex = (wordingOffset + round) % 2;
        return arms.map((_, armOffset) => {
          const arm = arms[(armOffset + round + offset + wordingIndex) % 2];
          return {
            caseId: topic.id,
            repeat: round + 1,
            wording: wordingIndex + 1,
            arm,
            request: requestFor(topic.wordings[wordingIndex], arm),
          };
        });
      });
    }),
  ).flat();
  const report: Report = {
    plannedAt: new Date().toISOString(),
    inputSha256: createHash("sha256").update(inputText).digest("hex"),
    endpoint: `${SHARED_API}/decisions`,
    scaffold,
    repeats,
    primaryDecision: "w1",
    duplicateDecision: "w2",
    method:
      "One target wording per request. The shared proxy requires two decisions, so w1 and w2 are identical duplicates in both arms. Only w1 is the preselected primary measurement; w2 is a diagnostic and never an extra independent repeat. Per decision, the exact same question plus fixed scaffold is redistributed across instructions and state. No additional facts or assumptions. Distinct wordings are sent separately so neither can enter the other's shared state. Raw request length differs because state is shared, but unique information and rejoined text per decision are identical. Rotate topic, wording, and arm order; no selective retries.",
    expectedResolvedModel: "typesafe/jev-1.13-20260917",
    cases,
    schedule,
    runs: [],
  };
  auditPlan(report);
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(
    `Saved and audited ${schedule.length} planned requests before inference.`,
  );
} else if (mode === "run") {
  const report: Report = JSON.parse(await readFile(input, "utf8"));
  auditPlan(report);
  assert.equal(
    report.runs.length,
    0,
    "Never retry or overwrite an attempted study.",
  );
  for (const entry of report.schedule) {
    if (report.runs.length) await pause(3300);
    const startedAt = new Date().toISOString();
    const response = await fetch(report.endpoint, {
      method: "POST",
      headers: {
        Origin: "https://bensonperry.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry.request),
      signal: AbortSignal.timeout(45000),
    });
    const raw: unknown = await response.json();
    const run = { ...entry, startedAt, status: response.status, response: raw };
    report.runs.push(run);
    await writeFile(input, JSON.stringify(report, null, 2) + "\n");
    const parsed = parseRun(run);
    assert.equal(
      parsed.model,
      report.expectedResolvedModel,
      "Model changed; stopped.",
    );
    console.log(
      JSON.stringify({
        completed: report.runs.length,
        caseId: entry.caseId,
        repeat: entry.repeat,
        wording: entry.wording,
        arm: entry.arm,
        primaryYes: parsed.answers.w1.probabilities.yes,
        duplicateYes: parsed.answers.w2.probabilities.yes,
      }),
    );
  }
} else if (mode === "summarize") {
  assert(output);
  const report: Report = JSON.parse(await readFile(input, "utf8"));
  auditPlan(report);
  assert.equal(report.runs.length, report.schedule.length);
  const observations = report.runs.map((run, index) => {
    const { startedAt, status, response, ...entry } = run;
    assert.deepEqual(entry, report.schedule[index]);
    const parsed = parseRun(run);
    assert.equal(parsed.model, report.expectedResolvedModel);
    return {
      caseId: run.caseId,
      wording: run.wording,
      arm: run.arm,
      repeat: run.repeat,
      yes: parsed.answers.w1.probabilities.yes,
      duplicateYes: parsed.answers.w2.probabilities.yes,
      cost: parsed.usage?.cost,
    };
  });
  const mean = (values: number[]) =>
    values.reduce((a, b) => a + b, 0) / values.length;
  const winner = (p: number) => (p === 0.5 ? "tie" : p > 0.5 ? "yes" : "no");
  const summary = {
    requests: observations.length,
    primaryDecisions: observations.length,
    diagnosticDecisions: observations.length,
    model: report.expectedResolvedModel,
    cost: observations.every((o) => o.cost !== undefined)
      ? observations.reduce((total, o) => total + o.cost!, 0)
      : null,
    duplicateMaxAbsoluteDifference: Math.max(
      ...observations.map((o) => Math.abs(o.yes - o.duplicateYes)),
    ),
    duplicateMeanAbsoluteDifference: mean(
      observations.map((o) => Math.abs(o.yes - o.duplicateYes)),
    ),
    cases: report.cases.map((topic) => ({
      ...topic,
      arms: Object.fromEntries(
        arms.map((arm) => {
          const wordings = [1, 2].map((wording) => {
            const values = observations
              .filter(
                (o) =>
                  o.caseId === topic.id &&
                  o.arm === arm &&
                  o.wording === wording,
              )
              .sort((a, b) => a.repeat - b.repeat)
              .map((o) => o.yes);
            assert.equal(values.length, repeats);
            return {
              wording,
              values,
              mean: mean(values),
              min: Math.min(...values),
              max: Math.max(...values),
            };
          });
          const flips = Array.from({ length: repeats }, (_, i) => {
            const [a, b] = wordings.map((w) => winner(w.values[i]));
            return a !== "tie" && b !== "tie" && a !== b;
          });
          return [
            arm,
            {
              wordings,
              gapPercentagePoints:
                Math.abs(wordings[0].mean - wordings[1].mean) * 100,
              flipCount: flips.filter(Boolean).length,
              repeats,
            },
          ];
        }),
      ),
    })),
  };
  await writeFile(output, JSON.stringify(summary, null, 2) + "\n", {
    flag: "wx",
  });
  console.log(JSON.stringify(summary, null, 2));
} else {
  throw new Error("Expected plan, run, or summarize.");
}
