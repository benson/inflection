import type { Experiment, Run } from "./types";
import { validateExperiment } from "./engine";

const PREFIX = "inflection-v1-";
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
export function isExperiment(value: unknown): value is Experiment {
  try {
    const e = value as Experiment;
    return (
      typeof e.id === "string" &&
      typeof e.title === "string" &&
      typeof e.category === "string" &&
      ["binary", "multiple"].includes(e.mode) &&
      typeof e.original === "string" &&
      typeof e.context === "string" &&
      typeof e.expanded === "boolean" &&
      typeof e.reversed === "boolean" &&
      Array.isArray(e.options) &&
      e.options.every(
        (o) => typeof o.id === "string" && typeof o.label === "string",
      ) &&
      Array.isArray(e.variants) &&
      e.variants.every(
        (v) =>
          typeof v.id === "string" &&
          typeof v.text === "string" &&
          ["paraphrase", "framing"].includes(v.kind),
      ) &&
      !validateExperiment(e)
    );
  } catch {
    return false;
  }
}
export function readSaved(): Experiment[] {
  const values = readStorage<unknown>("saved", []);
  return Array.isArray(values) ? values.filter(isExperiment).slice(0, 50) : [];
}
export function readHistory(): Run[] {
  const values = readStorage<unknown>("history", []);
  if (!Array.isArray(values)) return [];
  return values
    .filter((r): r is Run => {
      try {
        return (
          typeof r.id === "string" &&
          typeof r.createdAt === "string" &&
          typeof r.sample === "boolean" &&
          isExperiment(r.experiment) &&
          Array.isArray(r.conditions) &&
          r.conditions.length > 0 &&
          Array.isArray(r.responses) &&
          r.responses.length > 0 &&
          r.conditions.every(
            (c: Run["conditions"][number]) =>
              typeof c.id === "string" &&
              typeof c.text === "string" &&
              Array.isArray(c.options) &&
              c.options.length > 0 &&
              r.responses.every(
                (response: Run["responses"][number]) =>
                  response.answers[c.id]?.type === "choice" &&
                  c.options.every((o) =>
                    Number.isFinite(
                      response.answers[c.id]?.probabilities[o.id],
                    ),
                  ),
              ),
          )
        );
      } catch {
        return false;
      }
    })
    .slice(0, 20);
}
