import type { Experiment, Run } from "./types";
import {
  buildRequest,
  conditionsFor,
  parseResponse,
  validateExperiment,
} from "./engine";

const PREFIX = "inflection-v2-";
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function isDraft(value: unknown): value is Experiment {
  try {
    const e = value as Experiment;
    return (
      typeof e.id === "string" &&
      typeof e.title === "string" &&
      e.title.length <= 120 &&
      typeof e.category === "string" &&
      ["binary", "multiple"].includes(e.mode) &&
      typeof e.context === "string" &&
      e.context.length <= 12000 &&
      Array.isArray(e.options) &&
      e.options.length >= 2 &&
      e.options.length <= 8 &&
      e.options.every(
        (o) =>
          typeof o.id === "string" &&
          typeof o.label === "string" &&
          o.label.length <= 300,
      ) &&
      Array.isArray(e.wordings) &&
      e.wordings.length >= 2 &&
      e.wordings.length <= 8 &&
      e.wordings.every(
        (w, i) =>
          w.id === `w${i + 1}` &&
          typeof w.text === "string" &&
          w.text.length <= 3000,
      )
    );
  } catch {
    return false;
  }
}
export function isExperiment(value: unknown): value is Experiment {
  return isDraft(value) && !validateExperiment(value);
}

// Use the same distribution validator for links and browser history as live runs.
export function parseRun(value: unknown, experiment: Experiment): Run {
  const r = value as Run;
  if (
    !isExperiment(experiment) ||
    !r ||
    !["local", "recorded", "shared"].includes(r.source) ||
    typeof r.createdAt !== "string" ||
    !Number.isFinite(Date.parse(r.createdAt)) ||
    !Array.isArray(r.responses) ||
    ![1, 3, 5].includes(r.responses.length)
  )
    throw new Error("Invalid comparison.");
  const conditions = conditionsFor(experiment);
  if (
    !Array.isArray(r.conditions) ||
    r.conditions.length !== conditions.length ||
    !r.conditions.every(
      (c, i) =>
        c.id === conditions[i].id &&
        c.text === conditions[i].text &&
        c.label === conditions[i].label &&
        Array.isArray(c.options) &&
        c.options.length === conditions[i].options.length &&
        c.options.every(
          (o, j) =>
            o.id === conditions[i].options[j].id &&
            typeof o.label === "string" &&
            o.label.trim() === conditions[i].options[j].label.trim(),
        ),
    )
  )
    throw new Error("The results do not match these wordings.");
  const responses = r.responses.map((response) =>
    parseResponse(response, conditions),
  );
  if (responses.some((response) => response.model !== responses[0].model))
    throw new Error("Inconsistent model versions.");
  return {
    id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
    createdAt: r.createdAt,
    source: r.source,
    experiment,
    conditions,
    responses,
    request: buildRequest(experiment),
    durationMs:
      Number.isFinite(r.durationMs) && r.durationMs >= 0 ? r.durationMs : 0,
  };
}
export function readHistory(): Run[] {
  const values = readStorage<unknown>("history", []);
  if (!Array.isArray(values)) return [];
  return values
    .flatMap((r) => {
      try {
        return r.source === "local" ? [parseRun(r, r.experiment)] : [];
      } catch {
        return [];
      }
    })
    .slice(0, 20);
}
