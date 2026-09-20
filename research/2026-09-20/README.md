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

To repeat a bounded probe, supply a fresh output filename:

```sh
node --import tsx scripts/probe-wordings.ts research/2026-09-20/confirmation-prompts.json output/fresh-confirmation.json 3
node --import tsx scripts/probe-wordings.ts research/2026-09-20/confirmation-prompts.json output/fresh-reversed.json 1 reversed
```

Create the output directory first. The script uses the shared budget, spaces requests below the proxy's per-minute limit, records each response before proceeding, refuses to overwrite measurements, and stops on API errors. It does not retry failed inference automatically.
