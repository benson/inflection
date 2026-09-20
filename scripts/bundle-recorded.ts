import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import {
  buildRequest,
  conditionsFor,
  fromSeed,
  parseResponse,
} from "../src/engine";
import { seeds } from "../src/seeds";
import type { DecisionRequest, Run, Seed } from "../src/types";

const research = new URL("../research/2026-09-20/", import.meta.url);
const prompts: Seed[] = JSON.parse(
  await readFile(new URL("tiered-confirm-prompts.json", research), "utf8"),
);
const report: {
  repeats: number;
  answerOrder: string;
  runs: {
    id: string;
    repeat: number;
    startedAt: string;
    status: number;
    request: DecisionRequest;
    response: unknown;
  }[];
} = JSON.parse(
  await readFile(new URL("tiered-confirm.json", research), "utf8"),
);

assert.equal(report.repeats, 3, "Expected three confirmation repeats");
assert.equal(report.answerOrder, "normal", "Expected Yes/No answer order");
assert.equal(prompts.length, seeds.length, "Every confirmed topic must ship");
assert.equal(
  report.runs.length,
  seeds.length * 3,
  "Unexpected recording count",
);

const bundled: Record<string, Run> = {};
for (const seed of seeds) {
  const prompt = prompts.find((p) => p.title === seed.title);
  assert.ok(prompt, `Missing confirmation prompts for ${seed.id}`);
  assert.equal(seed.question, prompt.question, `${seed.id}: original changed`);
  assert.deepEqual(
    seed.variants,
    prompt.variants,
    `${seed.id}: variants changed`,
  );
  const experiment = fromSeed(seed);
  const conditions = conditionsFor(experiment);
  const request = buildRequest(experiment);
  const repeats = report.runs
    .filter((run) => run.id === prompt.id)
    .sort((a, b) => a.repeat - b.repeat);
  assert.deepEqual(
    repeats.map((run) => run.repeat),
    [1, 2, 3],
    `${seed.id}: missing repeats`,
  );
  const responses = repeats.map((run) => {
    const label = `${seed.id}, repeat ${run.repeat}`;
    assert.equal(run.status, 200, `${label}: failed response`);
    // JSON comparison also checks criterion order, which affects the request.
    assert.equal(
      JSON.stringify(run.request),
      JSON.stringify(request),
      `${label}: request differs from seed`,
    );
    const response = parseResponse(run.response, conditions);
    assert.equal(
      response.model,
      "typesafe/jev-1.13-20260917",
      `${label}: unexpected model`,
    );
    assert.ok(response.requestId, `${label}: missing request ID`);
    assert.ok(
      Number.isFinite(Date.parse(run.startedAt)),
      `${label}: invalid timestamp`,
    );
    return response;
  });
  bundled[seed.id] = {
    id: `recorded-${seed.id}`,
    createdAt: repeats[0].startedAt,
    sample: true,
    experiment,
    conditions,
    request,
    durationMs: 0,
    responses,
  };
}

await writeFile(
  new URL("../src/recorded.json", import.meta.url),
  JSON.stringify(bundled, null, 2) + "\n",
);
console.log(
  `Bundled ${seeds.length} recorded comparisons, three responses each.`,
);
