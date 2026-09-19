import { buildRequest, conditionsFor, fromSeed } from "./engine";
import { seeds } from "./seeds";
import type { Run } from "./types";

// Deliberately synthetic, fixed UI example. Never represented as model output,
// and never reused to answer a custom question or an edited seed.
export function sampleRun(): Run {
  const experiment = fromSeed(seeds[0]);
  const values = [0.58, 0.43, 0.72];
  return {
    id: "illustrative-example",
    createdAt: "2026-09-19T12:00:00Z",
    sample: true,
    experiment,
    conditions: conditionsFor(experiment),
    request: buildRequest(experiment),
    durationMs: 0,
    responses: [
      {
        model: "Illustrative data — not a Jev response",
        answers: Object.fromEntries(
          conditionsFor(experiment).map((c, i) => [
            c.id,
            {
              type: "choice",
              choice: values[i] > 0.5 ? "yes" : "no",
              confidence: 0,
              probabilities: { yes: values[i], no: 1 - values[i] },
            },
          ]),
        ),
      },
    ],
  };
}
