import type {
  Answer,
  Condition,
  DecisionRequest,
  Experiment,
  Run,
  Seed,
} from "./types";

export const MODEL = "typesafe/jev-1.13";
export const ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
export const SHARED_API = "https://inflection-api.bensonperry.workers.dev";
export const binaryOptions = (): Experiment["options"] => [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];
export const fromSeed = (seed: Seed): Experiment => ({
  id: seed.id,
  title: seed.title,
  category: seed.category,
  mode: seed.options ? "multiple" : "binary",
  original: seed.question,
  variants: seed.variants.map((text, i) => ({
    id: `v${i + 1}`,
    text,
    kind: "paraphrase",
  })),
  options: seed.options
    ? seed.options.map((label, i) => ({ id: `option_${i + 1}`, label }))
    : binaryOptions(),
  context: "",
  expanded: false,
  reversed: false,
});
export const blankExperiment = (): Experiment => ({
  id: crypto.randomUUID(),
  title: "Untitled experiment",
  category: "Your questions",
  mode: "binary",
  original: "",
  variants: [{ id: "v1", text: "", kind: "paraphrase" }],
  options: binaryOptions(),
  context: "",
  expanded: false,
  reversed: false,
});

export function validateExperiment(experiment: Experiment): string | null {
  if (!experiment.original.trim()) return "Write your original question first.";
  if (
    experiment.original.length > 3000 ||
    experiment.variants.some((v) => v.text.length > 3000)
  )
    return "Keep each wording under 3,000 characters.";
  if (experiment.context.length > 12000)
    return "Keep shared context under 12,000 characters.";
  if (experiment.variants.length > 7)
    return "Compare up to eight wordings at a time.";
  if (experiment.options.length < 2 || experiment.options.length > 8)
    return "Add between two and eight answer options.";
  if (experiment.options.some((o) => !o.label.trim() || o.label.length > 300))
    return "Give every answer a label of 1–300 characters.";
  if (
    new Set(experiment.options.map((o) => o.label.trim().toLowerCase()))
      .size !== experiment.options.length
  )
    return "Answer options must have different labels.";
  if (
    new Set(experiment.options.map((o) => o.id)).size !==
    experiment.options.length
  )
    return "Answer option identifiers must be unique.";
  if (
    experiment.options.some(
      (o) =>
        !/^[a-z][a-z0-9_]{0,60}$/.test(o.id) ||
        [
          "insufficient_information",
          "false_premise",
          "__proto__",
          "constructor",
          "prototype",
        ].includes(o.id),
    )
  )
    return "Invalid answer option identifier.";
  if (
    experiment.variants.some((v) => !/^v[a-z0-9_]{1,60}$/.test(v.id)) ||
    new Set(experiment.variants.map((v) => v.id)).size !==
      experiment.variants.length
  )
    return "Invalid wording identifier.";
  return null;
}

export function conditionsFor(experiment: Experiment): Condition[] {
  const conditions: Condition[] = [
    {
      id: "original",
      text: experiment.original.trim(),
      label: "Original",
      kind: "original",
      options: experiment.options,
    },
  ];
  for (const [index, v] of experiment.variants.entries()) {
    if (v.text.trim())
      conditions.push({
        id: v.id,
        text: v.text.trim(),
        label: `Wording ${index + 1}`,
        kind: v.kind,
        options: experiment.options,
      });
  }
  if (experiment.expanded)
    conditions.push({
      id: "expanded",
      text: experiment.original.trim(),
      label: "More answer options",
      kind: "expanded",
      options: [
        ...experiment.options,
        { id: "insufficient_information", label: "Insufficient information" },
        { id: "false_premise", label: "False premise" },
      ],
    });
  if (experiment.reversed)
    conditions.push({
      id: "reversed",
      text: experiment.original.trim(),
      label: "Reversed option order",
      kind: "reversed",
      options: [...experiment.options].reverse(),
    });
  return conditions;
}

export function buildRequest(experiment: Experiment): DecisionRequest {
  const error = validateExperiment(experiment);
  if (error) throw new Error(error);
  return {
    model: MODEL,
    state: experiment.context.trim(),
    questions: Object.fromEntries(
      conditionsFor(experiment).map((c) => [
        c.id,
        {
          type: "choice" as const,
          instructions: c.text,
          criteria: Object.fromEntries(
            c.options.map((o) => [
              o.id,
              o.id === "insufficient_information"
                ? "The available information is insufficient to select any of the substantive answers."
                : o.id === "false_premise"
                  ? "The question relies on a false premise."
                  : o.label.trim(),
            ]),
          ),
        },
      ]),
    ),
  };
}

export function parseResponse(
  data: unknown,
  conditions: Condition[],
): Run["responses"][number] {
  if (!data || typeof data !== "object")
    throw new Error("OpenRouter returned an invalid response.");
  const raw = data as Record<string, unknown>;
  if (
    typeof raw.model !== "string" ||
    !raw.answers ||
    typeof raw.answers !== "object"
  )
    throw new Error("OpenRouter did not return Jev decisions.");
  const answers: Record<string, Answer> = {};
  for (const condition of conditions) {
    const a = (raw.answers as Record<string, Answer>)[condition.id];
    const keys = condition.options.map((o) => o.id);
    if (
      !a ||
      a.type !== "choice" ||
      typeof a.probabilities !== "object" ||
      !a.probabilities ||
      !keys.includes(a.choice) ||
      !Number.isFinite(a.confidence) ||
      a.confidence < 0 ||
      a.confidence > 1
    )
      throw new Error(`Missing or invalid decision for ${condition.label}.`);
    const probabilities = keys.map((k) => a.probabilities[k]);
    if (
      Object.keys(a.probabilities).length !== keys.length ||
      probabilities.some((p) => !Number.isFinite(p) || p < 0 || p > 1) ||
      Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 0.015 ||
      a.probabilities[a.choice] + 0.001 < Math.max(...probabilities)
    )
      throw new Error(`Invalid probabilities for ${condition.label}.`);
    answers[condition.id] = {
      type: "choice",
      choice: a.choice,
      confidence: a.confidence,
      probabilities: Object.fromEntries(
        keys.map((k) => [k, a.probabilities[k]]),
      ),
    };
  }
  const usage =
    raw.usage && typeof raw.usage === "object"
      ? (raw.usage as Record<string, unknown>)
      : {};
  const numeric = (key: string) =>
    typeof usage[key] === "number" &&
    Number.isFinite(usage[key]) &&
    usage[key] >= 0
      ? (usage[key] as number)
      : undefined;
  return {
    model: raw.model,
    answers,
    requestId: typeof raw.id === "string" ? raw.id : undefined,
    usage: {
      input_tokens: numeric("input_tokens"),
      output_tokens: numeric("output_tokens"),
      cost: numeric("cost"),
    },
  };
}

export async function evaluate(
  experiment: Experiment,
  repeats: number,
  signal: AbortSignal,
  progress: (n: number) => void,
): Promise<Run> {
  if (![1, 3, 5].includes(repeats)) throw new Error("Choose 1, 3, or 5 runs.");
  const request = buildRequest(experiment);
  const conditions = conditionsFor(experiment);
  const responses: Run["responses"] = [];
  const start = performance.now();
  for (let i = 0; i < repeats; i++) {
    const response = await fetch(`${SHARED_API}/decisions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        typeof data?.error === "string" && data.error.length <= 240
          ? data.error
          : `Jev returned HTTP ${response.status}. Try again shortly.`,
      );
    }
    const parsed = parseResponse(await response.json(), conditions);
    if (responses.length && parsed.model !== responses[0].model)
      throw new Error(
        "The model version changed between repeat runs. Run the comparison again.",
      );
    responses.push(parsed);
    progress(i + 1);
  }
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sample: false,
    experiment: structuredClone(experiment),
    conditions,
    responses,
    request,
    durationMs: performance.now() - start,
  };
}

export function meanProb(
  run: Run,
  conditionId: string,
  optionId: string,
): number {
  return (
    run.responses.reduce(
      (sum, r) => sum + (r.answers[conditionId]?.probabilities[optionId] ?? 0),
      0,
    ) / run.responses.length
  );
}
export function winners(run: Run, conditionId: string): string[] {
  const condition = run.conditions.find((c) => c.id === conditionId)!;
  const top = Math.max(
    ...condition.options.map((o) => meanProb(run, conditionId, o.id)),
  );
  return condition.options
    .filter((o) => Math.abs(meanProb(run, conditionId, o.id) - top) < 0.000001)
    .map((o) => o.id);
}
export function maxWordingSwing(run: Run): number {
  const comparable = run.conditions.filter((c) =>
    ["original", "paraphrase"].includes(c.kind),
  );
  return Math.max(
    0,
    ...run.experiment.options.map((o) => {
      const ps = comparable.map((c) => meanProb(run, c.id, o.id));
      return Math.max(...ps) - Math.min(...ps);
    }),
  );
}

// LCS word diff: highlight actual edits without relying on another model.
export function wordDiff(
  before: string,
  after: string,
): { text: string; type: "same" | "added" | "removed" }[] {
  const a = before.match(/\S+\s*/g) ?? [],
    b = after.match(/\S+\s*/g) ?? [];
  if (a.length > 500 || b.length > 500) return [{ text: after, type: "added" }];
  const dp = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        a[i].trim() === b[j].trim()
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const parts: ReturnType<typeof wordDiff> = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].trim() === b[j].trim()) {
      parts.push({ text: b[j++], type: "same" });
      i++;
    } else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j]))
      parts.push({ text: b[j++], type: "added" });
    else parts.push({ text: a[i++], type: "removed" });
  }
  return parts;
}
