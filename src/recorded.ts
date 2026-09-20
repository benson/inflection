import recordings from "./recorded.json";
import { buildRequest, conditionsFor } from "./engine";
import type { Experiment, Run } from "./types";

const runs = recordings as Record<string, Run>;

export function recordedRun(seedId: string): Run | null {
  return Object.hasOwn(runs, seedId) ? structuredClone(runs[seedId]) : null;
}

export function findRecordedRun(experiment: Experiment): Run | null {
  try {
    const request = JSON.stringify(buildRequest(experiment));
    const conditions = conditionsFor(experiment);
    const run = Object.values(runs).find(
      (run) =>
        JSON.stringify(run.request) === request &&
        run.conditions.length === conditions.length &&
        run.conditions.every((c, i) => c.id === conditions[i].id),
    );
    return run ? structuredClone(run) : null;
  } catch {
    return null;
  }
}
