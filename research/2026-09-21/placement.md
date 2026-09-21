# Does moving the same question into state change Jev's answer?

## Results

**Placement changed probabilities, but did not eliminate the wording flips.** In both placements, the two wordings still had opposite winners on their mean probabilities for all five pairs. The gap narrowed in four pairs and widened for Reno/Los Angeles. This isolates relocating the same information more closely than the earlier added-context study; it does not show that field placement is behaviorally neutral.

Each cell below is mean **P(Yes), wording 1 / wording 2**, using the preselected primary decision across three requests per wording and placement.

| Pair                 | Question in instructions | Question in state | Gap in instructions → state | Flips in instructions / state |
| -------------------- | -----------------------: | ----------------: | --------------------------: | ----------------------------: |
| Religion & terrorism |             5.0% / 78.7% |      2.0% / 59.0% |              73.7 → 57.0 pp |                     3/3 / 3/3 |
| Animals / meat       |            27.0% / 76.0% |     31.7% / 72.0% |              49.0 → 40.3 pp |                     3/3 / 3/3 |
| Wealth tax           |            86.0% / 11.7% |     79.3% / 19.3% |              74.3 → 60.0 pp |                     3/3 / 3/3 |
| Reno / Los Angeles   |            31.7% / 68.0% |     21.3% / 64.7% |              36.3 → 43.3 pp |                     3/3 / 3/3 |
| Cubs / Ottomans      |            14.0% / 56.3% |     23.3% / 53.0% |              42.3 → 29.7 pp |                     2/3 / 2/3 |

The Cubs exception illustrates why consistency and correctness must be separate. In state-placement repeat 2, both wordings favored No (22% and 48% Yes), so there was no flip, but both answers were wrong. With the question in instructions, repeat 3 produced a 50/50 tie for wording 2, which also does not count as a flip. These counts therefore do not mean every individual repeat gave opposite answers.

All 60 planned requests completed successfully, with 60 primary decisions and 60 duplicate diagnostics, using `typesafe/jev-1.13-20260917`. Provider-reported cost was $0.000942102. The completion audit checked the entire pre-recorded schedule, model version, valid responses, exact request reconstruction, identical information per decision across placements, and all three observations in every group. No inference was rerun after inspecting results.

The duplicate diagnostic differed from the primary by an average of 2.3 percentage points, with a maximum of 21 points. The maximum occurred on the Cubs second wording, instructions placement, repeat 3: 50% versus 71% Yes. The reported measurements consistently use `w1`, as planned. This variation is another reason to avoid treating one probability or a near-50% winner as stable; duplicate decisions are not extra independent trials.

This is evidence that moving the question into `state` is insufficient to remove these examples' wording sensitivity under this prompt format. It is not a general claim that `state` is unhelpful, a calibrated truth test for controversial questions, or a benchmark of Jev's overall capabilities. The two placements contain identical information, including the same fixed instruction; neither receives answer-bearing context.

- [Exact plan, payloads, timestamps, and raw responses](placement-results.json)
- [Means, ranges, gaps, flip counts, and duplicate diagnostics](placement-summary.json)
- [Earlier experiment that added facts or definitions](README.md)

## Plan recorded before inference

Keep the information identical. For each of the same ten question wordings, compare these two payloads:

| Field          | Question in instructions                              | Question in state      |
| -------------- | ----------------------------------------------------- | ---------------------- |
| `instructions` | `Answer the question.` followed by the exact question | `Answer the question.` |
| `state`        | Empty string                                          | The exact question     |
| `criteria`     | `yes: Yes`, `no: No`                                  | `yes: Yes`, `no: No`   |

No coordinates, dates, scope definitions, examples, or other evidence are included. Concatenating the nonempty instruction and state fields with a blank line gives byte-identical text for each decision in both conditions. The fixed instruction appears in both arms so the treatment only relocates the question; it does not add an instruction only to the state arm. This fixed instruction is new relative to the older study, so compare the fresh arms with each other rather than attributing changes from the old results solely to placement.

Each request contains just one distinct wording. Sending both distinct wordings in a shared state would expose each decision to its counterpart, introducing another difference. The existing public proxy requires at least two decisions, so each request contains identical copies under `w1` and `w2`. **`w1` is the primary measurement, selected before inference.** `w2` is retained as a diagnostic, not counted as another independent repeat or chosen according to its result. TypeSafe [documents independent evaluation of questions against shared state](https://docs.typesafe.ai/concepts/state). Unique information and rejoined text per decision stay identical; total serialized request length differs because shared state is written once while per-question instructions are written twice. This is not a claim of identical provider tokenization or internal processing.

The five pairs are religion/terrorism, animals/meat, wealth tax, Reno/Los Angeles, and Cubs/Ottomans. Three repeats of each wording and placement produce 60 requests, 60 primary decisions, and 60 duplicate diagnostics. Topic, wording, and placement order rotate. The complete schedule and source file hash are saved before inference. Stop on HTTP errors, malformed answers, or a different resolved model; no automatic retries or selective reruns.

Report mean Yes probabilities for each wording, observed ranges, the absolute difference between the wordings' means in percentage points, and the number of repeats with opposite unique winning answers. A 50/50 tie does not count as a flip. Also report the maximum and mean disagreement between the primary and duplicate probabilities. These selected examples and three repeats are a small diagnostic, not a representative accuracy benchmark or a confidence interval. Consistency on the opinion and ambiguous factual questions does not establish correctness.

## Reproduce

Use fresh output paths. The plan command only writes the schedule; the run command uses the existing shared capped budget.

```sh
node --import tsx scripts/probe-placement.ts plan research/2026-09-21/state-cases.json output/fresh-placement.json
node --import tsx scripts/probe-placement.ts run output/fresh-placement.json
node --import tsx scripts/probe-placement.ts summarize output/fresh-placement.json output/fresh-placement-summary.json
```

The source file also contains the prior study's added context. The runner explicitly extracts only each case's ID, title, and two original wordings. None of that added context enters this experiment's requests. The app's UI, examples, recordings, and production request builder are unchanged.
