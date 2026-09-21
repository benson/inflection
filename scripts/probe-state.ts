import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import {
  buildRequest,
  conditionsFor,
  fromSeed,
  parseResponse,
  SHARED_API,
} from "../src/engine";
import { validateRequest } from "../worker/index";

type Case = {
  id: string;
  title: string;
  contextKind: string;
  wordings: string[];
  state: string;
  sources: string[];
};
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Provide cases.json and a fresh output.json path.");
const inputText = await readFile(input, "utf8");
const cases: Case[] = JSON.parse(inputText);
const arms = ["empty", "nonempty-control", "relevant"] as const;
const controlState = "Study identifier: context-check-2026-09-21.";
const repeats = 3;
// Rotate arm order each repeat and topic order each round. Both wordings see
// exactly the same state. No question, answer label, or answer order changes.
const schedule = Array.from({ length: repeats }, (_, round) =>
  cases.flatMap((_, offset) => {
    const topic = cases[(offset + round) % cases.length];
    return arms.map((_, armOffset) => {
      const arm = arms[(armOffset + round) % arms.length];
      const experiment = fromSeed({ ...topic, category: "State experiment" });
      experiment.context =
        arm === "empty"
          ? ""
          : arm === "nonempty-control"
            ? controlState
            : topic.state;
      const request = buildRequest(experiment);
      validateRequest(request);
      return { caseId: topic.id, repeat: round + 1, arm, experiment, request };
    });
  }),
).flat();
const report = {
  startedAt: new Date().toISOString(),
  inputSha256: createHash("sha256").update(inputText).digest("hex"),
  endpoint: `${SHARED_API}/decisions`,
  controlState,
  repeats,
  cases,
  schedule: schedule.map(({ experiment, ...entry }) => entry),
  runs: [] as object[],
};
// Store the complete plan before inference; never overwrite an earlier run.
await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
let resolvedModel: string | undefined;
for (const entry of schedule) {
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
  const { experiment, ...metadata } = entry;
  report.runs.push({
    ...metadata,
    startedAt,
    status: response.status,
    response: raw,
  });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
  if (!response.ok)
    throw new Error(
      `HTTP ${response.status}; probe stopped without retry. See ${output}.`,
    );
  const parsed = parseResponse(raw, conditionsFor(experiment));
  resolvedModel ??= parsed.model;
  if (parsed.model !== resolvedModel)
    throw new Error("Resolved model changed; probe stopped.");
  console.log(
    JSON.stringify({
      caseId: entry.caseId,
      repeat: entry.repeat,
      arm: entry.arm,
      yes: Object.values(parsed.answers).map(
        (a) => Math.round(a.probabilities.yes * 1000) / 10,
      ),
      model: parsed.model,
    }),
  );
}
