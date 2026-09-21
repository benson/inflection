# Does nonempty state reduce wording flips?

## Results

Useful context reduced the probability gap in all five selected pairs. It removed the winning-answer flip in three pairs, while the animals/meat and wealth-tax pairs still flipped in every repeat. All five pairs still flipped in every repeat with the nonempty control. Having text in `state` was not sufficient to remove the flips in this test.

**Scope correction after Benson's review:** The relevant-state arm changes the information or task, not merely the API field being populated. Coordinates and dates supply the essential missing facts, leaving a narrower comparison; definitions and scenarios narrow the original questions. The resulting improvement cannot establish that an empty `state` caused the original failures, that the original questions were invalid, or that Jev answers those original questions reliably without help. Inflection's original question-answering probe includes the ability to supply the needed knowledge. This follow-up measures sensitivity to added information and assumptions. It does not isolate a parameter-placement effect.

The nonempty control is the closest arm here to a test of merely populating `state`; it removed none of the five flips. A [separate placement experiment](placement.md) now moves the exact same question from `instructions` into `state`, with the same fixed instruction in both arms and no new facts. All five pairs still have opposite winners on their mean probabilities in both placements; see that report for the full results and repeat-level exceptions.

All 45 planned requests completed successfully (90 decisions), using the same resolved model, `typesafe/jev-1.13-20260917`, beginning at 2026-09-21 20:20:27 UTC. Provider-reported total cost was $0.00075852. A post-run audit verified the complete planned schedule, three observations per case/arm, unchanged question/option payloads across states, one model version, and the case-file hash. No inference was rerun after inspecting results.

The following are mean **Yes probabilities**, wording 1 / wording 2. Three repeats per cell; these probabilities are not a factual truth rating.

| Pair | Empty state | Nonempty control | Relevant state | Flips with relevant state |
| --- | ---: | ---: | ---: | ---: |
| Religion & terrorism | 4.0% / 80.0% | 5.3% / 61.7% | 89.7% / 96.3% | 0/3 |
| Animals / meat | 31.3% / 79.3% | 45.7% / 85.0% | 45.7% / 62.3% | 3/3 |
| Wealth tax | 84.0% / 7.7% | 78.3% / 8.7% | 61.7% / 14.3% | 3/3 |
| Reno / Los Angeles | 30.3% / 70.7% | 37.7% / 73.0% | 99.3% / 98.0% | 0/3 |
| Cubs / Ottomans | 11.0% / 58.0% | 17.0% / 74.3% | 79.0% / 99.7% | 0/3 |

The absolute gap between the mean Yes probabilities, in percentage points:

| Pair | Empty state | Nonempty control | Relevant state |
| --- | ---: | ---: | ---: |
| Religion & terrorism | 76.0 | 56.3 | 6.7 |
| Animals / meat | 48.0 | 39.3 | 16.7 |
| Wealth tax | 76.3 | 69.7 | 47.3 |
| Reno / Los Angeles | 40.3 | 35.3 | 1.3 |
| Cubs / Ottomans | 47.0 | 57.3 | 20.7 |

**Interpretation:** The coordinates and dates brought both wordings onto the correct winning answer for the two factual cases, although Cubs/Ottomans still had a 20.7-point gap. Jev therefore successfully answered the east/west comparison with the coordinates provided in this test; that observation does not reveal its internal reasoning mechanism. The religion context supplied scope and definitions, not measured attack counts, so its greater consistency does not validate its substantive answer. The meat and wealth scenarios narrowed the question but did not eliminate wording sensitivity. The control also moved probabilities, sometimes worsening the gap, so adding text itself can influence the model.

The observed improvement is conditional on the added facts and assumptions. It does not show that the original empty-state evaluation was a misuse of Jev, or that nonempty state guarantees reliable judgments. TypeSafe separately recommends relevant context and documents poor numerical precision, difficulty with indirection, and degraded accuracy from irrelevant detail; that guidance should not be confused with an experimental proof from these five cases.

- [Complete plan, exact state passages, requests, and raw responses](state-results.json)
- [Computed means, observed ranges, gaps, and flip counts](state-summary.json)
- [Standalone case definitions](state-cases.json)

## Plan recorded before inference

Compare five previously selected wording pairs under three states, with three fresh repetitions of every condition:

1. **Empty:** `state: ""`.
2. **Nonempty control:** `Study identifier: context-check-2026-09-21.` This supplies text but no relevant evidence; it is one control string, not a claim that arbitrary text is behaviorally neutral.
3. **Relevant:** the fixed, topic-specific passage in [state-cases.json](state-cases.json).

Both wordings use exactly the same state in each request. Prompt wording, Yes/No labels, option order, and model alias stay fixed. Arm order rotates over the three repeats to reduce confounding by execution order. The runner saves the entire schedule and a hash of the case file before inference, records raw responses as they arrive, and stops on errors or model changes. No automatic retry or selective rerun is planned.

This is 45 requests and 90 decisions. The three older pairs are religion and terrorism, animals/meat, and wealth tax. Reno/Los Angeles and Cubs/Ottomans are factual examples from the current app. All were selected for prior flips, so this is a targeted follow-up, not a representative benchmark.

**Different kinds of context must not be conflated.** The factual cases receive coordinates or dates, without the answer explicitly stated. The other three receive definitions or hypothetical scenarios, which narrow previously ambiguous questions. They do not receive empirical terrorism counts or an authoritative moral/policy answer. Consistency is measurable in every case; correctness is assessable only for the two factual cases here.

The main measurement is the absolute difference between the two wordings' mean Yes probabilities, in percentage points. Also report the mean probabilities themselves, observed min–max ranges, and the number of individual repeats in which the two wordings have opposite unique winners. A 50/50 tie is not a flip. Three repeats measure observed variation, not a confidence interval.

Relevant context can also influence the meaning or frame of a question. A reduced gap does not demonstrate calibrated probabilities, general robustness, or that any nonempty `state` is sufficient. The selected geographic/date questions also exercise weaknesses TypeSafe explicitly documents; they are diagnostic examples, not a recommended production use of Jev for arithmetic.

## Sources for factual context

- [US Census 2026 Nevada places](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_gaz_place_32.txt): Reno city, GEOID 3260600, representative latitude 39.549097 and longitude -119.849907.
- [US Census 2026 California places](https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_gaz_place_06.txt): Los Angeles city, GEOID 0644000, representative latitude 34.019394 and longitude -118.410825. These are Census representative points, not assertions about a particular downtown landmark.
- [Chicago Cubs franchise timeline](https://www.mlb.com/cubs/history/timeline): the 2016 championship followed the 1908 title.
- [Library of Congress Ottoman reference guide](https://guides.loc.gov/ottoman-turkish/reference): the empire ended in 1922 with the elimination of the sultan's title.
- [TypeSafe State documentation](https://docs.typesafe.ai/concepts/state) and [Jev's documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

## Reproduce

```sh
node --import tsx scripts/probe-state.ts research/2026-09-21/state-cases.json output/fresh-state-probe.json
```

Create the output directory first. The existing shared capped budget is used; no client key is needed. The original app's examples and recordings are not changed by this research.

## Workspace recovery note

This study starts from clean commit `ec17422`, whose current application uses numbered `wordings` and `w1`/`w2` request IDs. Recent task retrieval omitted the intervening UI/factual-example work visible in Git history. This experiment preserves that current application and uses a separate runner compatible with its request validator. The task-history persistence issue remains deferred in complaint `20260921T201731Z-fdfab987`.
