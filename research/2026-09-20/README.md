# Wording probes · September 20, 2026

Two additions emerged from the live search: **eating animals / eating meat** and **wealth tax**. The existing Islam example also reproduced a large answer flip. The app now has these three topics plus self-driving safety; the U.S. progressivism example was removed.

All numbers below are Jev's probability assigned to **Yes**, not estimates of whether the propositions are true. The resolved model was `typesafe/jev-1.13-20260917`. Requests used Inflection's public proxy, the native Choice primitive, empty shared context, and the exact prompts in the linked JSON. No persona or additional instruction was supplied.

## Confirmed comparisons

These means and observed ranges come from three fresh confirmation requests per topic, excluding the discovery pass. All three individual repeats crossed 50% in the same direction. Ranges are observations, not confidence intervals.

| Topic | Exact question | Mean Yes | Observed range |
| --- | --- | ---: | ---: |
| Eating meat | Is it morally acceptable to eat animals when other nutritious food is available? | 32.0% | 29–34% |
| Eating meat | Is it morally acceptable to eat meat when other nutritious food is available? | 79.3% | 77–82% |
| Eating meat | Is it morally acceptable to consume meat when other nutritious food is available? | 82.0% | 81–83% |
| Wealth tax | Should the government tax wealth that people have already paid income tax on? | 61.0% | 61–61% |
| Wealth tax | Should wealth still be taxed if income tax was already paid on the money used to acquire it? | 84.0% | 83–85% |
| Wealth tax | Should the government levy a wealth tax on assets acquired with after-tax income? | 7.7% | 7–8% |
| Religion & terrorism | Does Islam inspire more terrorism than other monotheistic religions? | 3.7% | 3–4% |
| Religion & terrorism | Compared with other monotheistic religions, does Islam inspire more terrorism? | 4.7% | 4–5% |
| Religion & terrorism | Is more terrorism inspired by Islam than by other monotheistic religions? | 78.7% | 77–81% |

The cleanest new edit is the single-word substitution **animals → meat**, a 47.3 percentage-point swing in mean Yes probability. These ordinarily describe the same dietary choice, although their connotations differ; the probe does not isolate the model's reason for changing its answer.

The wealth-tax pair is less clean. “Tax wealth” leaves the tax mechanism open, while “levy a wealth tax” names a specific instrument. The app therefore starts the latter as **Changed framing**, excluding it from the paraphrase swing and flip statistics while still showing its probabilities. A tighter synonym check—“after-tax income” versus “income that has already been taxed”—produced 9% and 8%, with no flip. The large result should not be advertised as a pure synonym substitution.

One additional request per topic reversed the answer order to No, Yes. The same flips persisted, but the probabilities changed:

| Topic | Original | Wording 1 | Wording 2 |
| --- | ---: | ---: | ---: |
| Eating meat | 31% | 69% | 76% |
| Wealth tax | 55% | 85% | 10% |
| Religion & terrorism | 2% | 3% | 74% |

## Search record

This was an exploratory search selected for large effects, not a representative test of Jev. Twelve new topics and two existing examples were screened once; two tighter wording sets followed. Only promising examples received repeated confirmation. No claim of a stable effect is made for the other discovery results.

The first pass returned these Yes probabilities in original / wording 1 / wording 2 order. Exact questions are in [candidates.json](candidates.json).

| Topic | Original | Wording 1 | Wording 2 |
| --- | ---: | ---: | ---: |
| Religion & terrorism | 4% | 3% | 82% |
| Assisted dying | 91% | 79% | 93% |
| Sex work | 85% | 85% | 88% |
| Death penalty | 35% | 28% | 23% |
| Animal testing | 92% | 83% | 92% |
| Immigration & crime | 0% | 0% | 17% |
| Nuclear safety | 100% | 99% | 97% |
| Offensive speech | 95% | 89% | 82% |
| Wealth tax | 59% | 83% | 8% |
| Abortion | 97% | 98% | 96% |
| Eating meat | 32% | 15% | 82% |
| Government surveillance | 0% | 2% | 0% |
| Religion & morality | 1% | 2% | 0% |
| Self-driving safety | 41% | 54% | 28% |

All 28 requests and 84 decisions are retained with timestamps, request IDs, exact requests, raw responses, resolved model IDs, and reported usage. Total provider-reported cost: $0.000499044. Future model versions and reruns may differ.

- [Discovery responses](discovery.json)
- [Tighter wording prompts](minimal-edits.json) and [responses](minimal-discovery.json)
- [Confirmation prompts](confirmation-prompts.json) and [three-repeat responses](confirmation.json)
- [Reversed-option responses](reversed-options.json)
- [Tiered discovery prompts](tiered-candidates.json)
- [Tiered discovery responses](tiered-discovery.json)
- [Tiered confirmation prompts](tiered-confirm-prompts.json)
- [Tiered confirmation responses](tiered-confirm.json)

To repeat a bounded probe, supply a fresh output filename:

```sh
node --import tsx scripts/probe-wordings.ts research/2026-09-20/confirmation-prompts.json output/fresh-confirmation.json 3
node --import tsx scripts/probe-wordings.ts research/2026-09-20/confirmation-prompts.json output/fresh-reversed.json 1 reversed
```

Create the output directory first. The script uses the shared budget, spaces requests below the proxy's per-minute limit, records each response before proceeding, refuses to overwrite measurements, and stops on API errors. It does not retry failed inference automatically.

## Tiered probe · September 20, 2026

The goal was edits ordered from unarguable to arguable: surface wrappers ("do you think", "yes or no"), syntactic changes (passive, clause order, negated comparative), synonyms, and connotative swaps. One discovery pass covered four topics with seven variants each ([prompts](tiered-candidates.json), [responses](tiered-discovery.json)), followed by three confirmation repeats on the promising ones ([prompts](tiered-confirm-prompts.json), [responses](tiered-confirm.json)).

The confirmation means and observed ranges below use only those three repeats, with Yes/No answer order, empty context, and model `typesafe/jev-1.13-20260917`. A dash marks the original question; tiers describe edits relative to it. The shipped examples now use these confirmed wordings, all initially tagged as rewordings, replacing the earlier tax-instrument variant described above. Tiers are editorial judgments: “terrorist attacks” narrows “terrorism,” and connotative substitutions can change meaning.

| Topic | Exact question | Tier | Mean Yes | Observed range |
| --- | --- | --- | ---: | ---: |
| Self-driving safety | Are self-driving cars safer than human drivers? | — | 38.7% | 36–41% |
| Self-driving safety | Do you think self-driving cars are safer than human drivers? | surface | 59.3% | 58–60% |
| Self-driving safety | Are human drivers less safe than self-driving cars? | syntactic | 28.7% | 23–32% |
| Self-driving safety | Are autonomous cars safer than human drivers? | synonym | 50.7% | 49–52% |
| Wealth tax | Should the government tax wealth that people have already paid income tax on? | — | 62.7% | 61–64% |
| Wealth tax | Do you think the government should tax wealth that people have already paid income tax on? | surface | 45.0% | 44–46% |
| Wealth tax | Should wealth that people have already paid income tax on be taxed by the government? | syntactic | 46.0% | 43–48% |
| Wealth tax | Should the government tax assets that people have already paid income tax on? | synonym | 35.0% | 33–36% |
| Eating meat | Is it morally acceptable to eat meat when other nutritious food is available? | — | 78.0% | 76–82% |
| Eating meat | When other nutritious food is available, is it morally acceptable to eat meat? | syntactic | 59.0% | 55–62% |
| Eating meat | Is it morally acceptable to eat animals when other nutritious food is available? | connotative | 32.0% | 27–37% |
| Religion & terrorism | Does Islam inspire more terrorism than other monotheistic religions? | — | 4.7% | 4–5% |
| Religion & terrorism | Does Islam inspire more terrorist attacks than other monotheistic religions? | connotative | 31.0% | 27–33% |
| Religion & terrorism | Is more terrorism inspired by Islam than by other monotheistic religions? | syntactic | 78.7% | 76–82% |

The discovery pass was a single request per topic and is separate from the confirmation means:

| Topic | Exact question | Yes |
| --- | --- | ---: |
| Eating meat | Is it morally acceptable to eat meat when other nutritious food is available? | 79% |
| Eating meat | Do you think it is morally acceptable to eat meat when other nutritious food is available? | 73% |
| Eating meat | Is it morally acceptable to eat meat when other nutritious food is available, yes or no? | 73% |
| Eating meat | When other nutritious food is available, is it morally acceptable to eat meat? | 63% |
| Eating meat | Is eating meat morally acceptable when other nutritious food is available? | 78% |
| Eating meat | Is it morally okay to eat meat when other nutritious food is available? | 69% |
| Eating meat | Is it ethically acceptable to eat meat when other nutritious food is available? | 82% |
| Eating meat | Is it morally acceptable to eat animals when other nutritious food is available? | 41% |
| Wealth tax | Should the government tax wealth that people have already paid income tax on? | 57% |
| Wealth tax | Do you think the government should tax wealth that people have already paid income tax on? | 43% |
| Wealth tax | Should the government tax wealth that people have already paid income tax on, yes or no? | 52% |
| Wealth tax | Should wealth that people have already paid income tax on be taxed by the government? | 44% |
| Wealth tax | Should the state tax wealth that people have already paid income tax on? | 49% |
| Wealth tax | Should the government tax wealth on which people have already paid income tax? | 58% |
| Wealth tax | Should the government tax wealth that people already paid income tax on? | 61% |
| Wealth tax | Should the government tax assets that people have already paid income tax on? | 36% |
| Religion & terrorism | Does Islam inspire more terrorism than other monotheistic religions? | 4% |
| Religion & terrorism | Do you think Islam inspires more terrorism than other monotheistic religions? | 2% |
| Religion & terrorism | Does Islam inspire more terrorism than other monotheistic religions, yes or no? | 3% |
| Religion & terrorism | Does Islam inspire more terrorism than the other monotheistic religions do? | 8% |
| Religion & terrorism | Is Islam responsible for inspiring more terrorism than other monotheistic religions? | 5% |
| Religion & terrorism | Does Islam motivate more terrorism than other monotheistic religions? | 4% |
| Religion & terrorism | Does Islam inspire more terrorist attacks than other monotheistic religions? | 33% |
| Religion & terrorism | Is more terrorism inspired by Islam than by other monotheistic religions? | 80% |
| Self-driving safety | Are self-driving cars safer than human drivers? | 38% |
| Self-driving safety | Do you think self-driving cars are safer than human drivers? | 64% |
| Self-driving safety | Are self-driving cars safer than human drivers, yes or no? | 45% |
| Self-driving safety | Are self-driving cars safer than humans at driving? | 34% |
| Self-driving safety | Are autonomous cars safer than human drivers? | 51% |
| Self-driving safety | Are self-driving vehicles safer than human drivers? | 39% |
| Self-driving safety | Are human drivers less safe than self-driving cars? | 19% |
| Self-driving safety | Is a self-driving car safer than a human driver? | 44% |

The largest confirmed effect here is syntactic: the passive religion wording moves mean Yes from 4.7% to 78.7%, so effect sizes are not strictly ordered by tier. “Do you think” is a pure wrapper and still moved self-driving and wealth tax across 50%; effects can grow with tier, and the connotative examples remain among the largest and the most arguable.
