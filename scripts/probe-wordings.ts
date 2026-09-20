import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import {
  buildRequest,
  conditionsFor,
  fromSeed,
  parseResponse,
  SHARED_API,
} from "../src/engine";
import type { Seed } from "../src/types";

// Uses the same visible prompts, empty context, and Yes/No options as the app.
// Example: node --import tsx scripts/probe-wordings.ts input.json output.json 3
const [input, output, repetitions = "1", order = "normal"] =
  process.argv.slice(2);
const repeats = Number(repetitions);
if (
  !input ||
  !output ||
  !Number.isInteger(repeats) ||
  repeats < 1 ||
  repeats > 5
)
  throw new Error(
    "Provide input.json output.json [repeats: 1–5] [normal|reversed].",
  );
if (!["normal", "reversed"].includes(order))
  throw new Error("Invalid answer order.");
const candidates: Seed[] = JSON.parse(await readFile(input, "utf8"));
const experiments = candidates.map(fromSeed);
for (const experiment of experiments) {
  if (order === "reversed") experiment.options.reverse();
  buildRequest(experiment);
}
const report = {
  startedAt: new Date().toISOString(),
  endpoint: `${SHARED_API}/decisions`,
  origin: "https://bensonperry.com",
  answerOrder: order,
  repeats,
  runs: [] as object[],
};
// Never overwrite a prior measurement accidentally.
await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
for (let repeat = 0; repeat < repeats; repeat++) {
  for (const experiment of experiments) {
    if (report.runs.length) await pause(3300); // Below the shared 20/minute limit.
    const request = buildRequest(experiment);
    const startedAt = new Date().toISOString();
    const response = await fetch(report.endpoint, {
      method: "POST",
      headers: { Origin: report.origin, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45000),
    });
    const raw: unknown = await response.json();
    const record = {
      id: experiment.id,
      repeat: repeat + 1,
      startedAt,
      status: response.status,
      request,
      response: raw,
    };
    report.runs.push(record);
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    if (!response.ok)
      throw new Error(`Probe stopped: HTTP ${response.status}. See ${output}.`);
    const parsed = parseResponse(raw, conditionsFor(experiment));
    const yes = Object.values(parsed.answers).map(
      (a) => Math.round(a.probabilities.yes * 1000) / 10,
    );
    console.log(
      JSON.stringify({
        id: experiment.id,
        repeat: repeat + 1,
        yes,
        model: parsed.model,
      }),
    );
  }
}
