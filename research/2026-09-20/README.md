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

## Final example search · September 20, 2026

Selection criteria were wrapper or syntactic edits only (no synonyms or connotative swaps in shipped variants), a flip or a move of at least 15 points confirmed in all three repeats, the same direction under reversed answer order, and topics that are contested without being about a religion or an ethnic group. Fourteen topics were screened once with five wrapper or syntactic variants each (`search-candidates.json`, `search-discovery.json`); six topics received three-repeat confirmation with a reversed-order control (`search-confirm-prompts.json`, `search-confirm.json`, `search-reversed.json`); four were shipped and re-measured with exactly the shipped variant sets (`final-confirm-prompts.json`, `final-confirm.json`, `final-reversed.json`). Homework was dropped because "is it right for" is arguably a different question, and eating meat because its variants are connotative. Zoos were also dropped, but the supplied data do not support "nothing crossed 50%" as the reason: "do you think" moved Yes from 46–49% to 51–54% in all three confirmation repeats, and from 44% to 54% with reversed answer order; the exclusion reason is unspecified.

The shipped table uses only the three final confirmation repeats for means and observed ranges, with Yes/No answer order, empty context, and model `typesafe/jev-1.13-20260917`. The last column is one additional request per topic with No/Yes answer order. A dash marks the original; edit labels describe changes from it. Selection was at the topic level: not every retained variant meets the 15-point-or-flip threshold. All shipped variants start as rewordings. These ranges are observations, not confidence intervals, and the search deliberately selected large effects.

| Topic | Exact question | Edit | Mean Yes | Observed range | Reversed-order Yes |
| --- | --- | --- | ---: | ---: | ---: |
| Four-day week | Is a four-day work week better for companies than a five-day week? | — | 42.0% | 39–44% | 44% |
| Four-day week | Do you think a four-day work week is better for companies than a five-day week? | wrapper | 64.0% | 63–65% | 61% |
| Four-day week | For companies, is a four-day work week better than a five-day week? | clause order | 65.7% | 65–67% | 56% |
| Four-day week | Is a five-day work week worse for companies than a four-day week? | mirror comparative | 20.3% | 19–22% | 18% |
| Self-driving safety | Are self-driving cars safer than human drivers? | — | 38.0% | 37–39% | 37% |
| Self-driving safety | Do you think self-driving cars are safer than human drivers? | wrapper | 60.3% | 56–63% | 58% |
| Self-driving safety | Is it true that self-driving cars are safer than human drivers? | wrapper | 13.3% | 12–14% | 13% |
| Self-driving safety | Are human drivers less safe than self-driving cars? | mirror comparative | 31.3% | 25–35% | 20% |
| Remote work | Are remote workers more productive than office workers? | — | 58.3% | 56–60% | 48% |
| Remote work | Is it true that remote workers are more productive than office workers? | wrapper | 25.3% | 24–27% | 20% |
| Remote work | Are office workers less productive than remote workers? | mirror comparative | 15.7% | 15–17% | 9% |
| Remote work | Compared with office workers, are remote workers more productive? | clause order | 78.3% | 76–81% | 71% |
| Wealth tax | Should the government tax wealth that people have already paid income tax on? | — | 62.0% | 60–64% | 57% |
| Wealth tax | Do you think the government should tax wealth that people have already paid income tax on? | wrapper | 45.0% | 44–46% | 44% |
| Wealth tax | Should wealth that people have already paid income tax on be taxed by the government? | passive | 43.7% | 42–46% | 41% |

The screening table includes every original and all five variants for all fourteen topics from the single discovery pass. These one-off measurements are separate from the confirmation means above. The six-topic confirmation also included self-driving safety and wealth tax from the earlier tiered probe.

| Topic | Exact question | Yes |
| --- | --- | ---: |
| Minimum wage | Should the federal minimum wage be raised to $20 an hour? | 26% |
| Minimum wage | Do you think the federal minimum wage should be raised to $20 an hour? | 25% |
| Minimum wage | Should the federal minimum wage be raised to $20 an hour, yes or no? | 29% |
| Minimum wage | Would you say the federal minimum wage should be raised to $20 an hour? | 21% |
| Minimum wage | Is raising the federal minimum wage to $20 an hour the right thing to do? | 19% |
| Minimum wage | Should $20 an hour be the new federal minimum wage? | 51% |
| Remote work | Are remote workers more productive than office workers? | 59% |
| Remote work | Do you think remote workers are more productive than office workers? | 57% |
| Remote work | Are remote workers more productive than office workers, yes or no? | 74% |
| Remote work | Is it true that remote workers are more productive than office workers? | 26% |
| Remote work | Are office workers less productive than remote workers? | 14% |
| Remote work | Compared with office workers, are remote workers more productive? | 79% |
| Free college | Should public college be free for everyone? | 33% |
| Free college | Do you think public college should be free for everyone? | 27% |
| Free college | Should public college be free for everyone, yes or no? | 35% |
| Free college | Would you say public college should be free for everyone? | 28% |
| Free college | Should everyone be able to attend public college for free? | 26% |
| Free college | Is it right for public college to be free for everyone? | 25% |
| Nuclear power | Is nuclear power the best way to cut carbon emissions? | 5% |
| Nuclear power | Do you think nuclear power is the best way to cut carbon emissions? | 26% |
| Nuclear power | Is nuclear power the best way to cut carbon emissions, yes or no? | 9% |
| Nuclear power | Is it true that nuclear power is the best way to cut carbon emissions? | 4% |
| Nuclear power | Is the best way to cut carbon emissions nuclear power? | 12% |
| Nuclear power | Would you say nuclear power is the best way to cut carbon emissions? | 15% |
| Four-day week | Is a four-day work week better for companies than a five-day week? | 43% |
| Four-day week | Do you think a four-day work week is better for companies than a five-day week? | 63% |
| Four-day week | Is a four-day work week better for companies than a five-day week, yes or no? | 58% |
| Four-day week | Is a five-day work week worse for companies than a four-day week? | 20% |
| Four-day week | Would you say a four-day work week is better for companies than a five-day week? | 56% |
| Four-day week | For companies, is a four-day work week better than a five-day week? | 64% |
| Car-free downtowns | Should cities ban private cars from their downtown areas? | 61% |
| Car-free downtowns | Do you think cities should ban private cars from their downtown areas? | 66% |
| Car-free downtowns | Should cities ban private cars from their downtown areas, yes or no? | 59% |
| Car-free downtowns | Should private cars be banned from downtown areas by cities? | 60% |
| Car-free downtowns | Would you say cities should ban private cars from their downtown areas? | 60% |
| Car-free downtowns | Is it right for cities to ban private cars from their downtown areas? | 83% |
| Homework | Should elementary schools stop assigning homework? | 42% |
| Homework | Do you think elementary schools should stop assigning homework? | 48% |
| Homework | Should elementary schools stop assigning homework, yes or no? | 47% |
| Homework | Should homework no longer be assigned by elementary schools? | 37% |
| Homework | Would you say elementary schools should stop assigning homework? | 38% |
| Homework | Is it right for elementary schools to stop assigning homework? | 58% |
| Renting vs buying | Is renting a home a better financial decision than buying one? | 30% |
| Renting vs buying | Do you think renting a home is a better financial decision than buying one? | 40% |
| Renting vs buying | Is renting a home a better financial decision than buying one, yes or no? | 30% |
| Renting vs buying | Is buying a home a worse financial decision than renting one? | 6% |
| Renting vs buying | Would you say renting a home is a better financial decision than buying one? | 34% |
| Renting vs buying | Financially, is renting a home a better decision than buying one? | 30% |
| Tipping | Should restaurants replace tipping with higher wages? | 92% |
| Tipping | Do you think restaurants should replace tipping with higher wages? | 92% |
| Tipping | Should restaurants replace tipping with higher wages, yes or no? | 91% |
| Tipping | Should tipping be replaced with higher wages by restaurants? | 91% |
| Tipping | Would you say restaurants should replace tipping with higher wages? | 89% |
| Tipping | Is it right for restaurants to replace tipping with higher wages? | 93% |
| Zoos | Is it ethical to keep animals in zoos? | 45% |
| Zoos | Do you think it is ethical to keep animals in zoos? | 57% |
| Zoos | Is it ethical to keep animals in zoos, yes or no? | 41% |
| Zoos | Is keeping animals in zoos ethical? | 38% |
| Zoos | Would you say it is ethical to keep animals in zoos? | 51% |
| Zoos | Is it true that keeping animals in zoos is ethical? | 17% |
| Death penalty deterrence | Does the death penalty deter murder? | 2% |
| Death penalty deterrence | Do you think the death penalty deters murder? | 3% |
| Death penalty deterrence | Does the death penalty deter murder, yes or no? | 3% |
| Death penalty deterrence | Is murder deterred by the death penalty? | 2% |
| Death penalty deterrence | Would you say the death penalty deters murder? | 2% |
| Death penalty deterrence | Is it true that the death penalty deters murder? | 2% |
| Mandatory voting | Should voting be mandatory? | 23% |
| Mandatory voting | Do you think voting should be mandatory? | 29% |
| Mandatory voting | Should voting be mandatory, yes or no? | 29% |
| Mandatory voting | Should citizens be required to vote? | 30% |
| Mandatory voting | Would you say voting should be mandatory? | 24% |
| Mandatory voting | Is it right for voting to be mandatory? | 32% |
| Daylight saving | Should daylight saving time be abolished? | 81% |
| Daylight saving | Do you think daylight saving time should be abolished? | 86% |
| Daylight saving | Should daylight saving time be abolished, yes or no? | 89% |
| Daylight saving | Should we abolish daylight saving time? | 78% |
| Daylight saving | Would you say daylight saving time should be abolished? | 84% |
| Daylight saving | Is it right to abolish daylight saving time? | 78% |
| Fast fashion | Is it ethical to buy fast fashion? | 1% |
| Fast fashion | Do you think it is ethical to buy fast fashion? | 1% |
| Fast fashion | Is it ethical to buy fast fashion, yes or no? | 1% |
| Fast fashion | Is buying fast fashion ethical? | 0% |
| Fast fashion | Would you say it is ethical to buy fast fashion? | 1% |
| Fast fashion | Is it true that buying fast fashion is ethical? | 0% |

Two observations from these questions and this model version, rather than general laws:

- In the six-topic confirmation, "do you think" moved four topics up in all three repeats and one down in all three. The sixth, remote work, had mixed repeat-level directions and a small mean increase (57.7% to 59.0%); five of six means therefore increased. "Is it true that" moved every confirmed topic it was tried on down (remote work, self-driving safety, and zoos). In the wider single-pass screen, death penalty deterrence was unchanged at 2%, so a decrease did not hold for every screened topic.
- Restating a comparative as its logical mirror ("are office workers less productive" for "are remote workers more productive") moved every confirmed topic it was tried on down. In `search-confirm.json`, the mean drops were 44 points for remote work, 20 for four-day week, and 8.3 for self-driving safety, giving an observed range of 8.3–44 points. In the final shipped sets, the corresponding drops were 42.7, 21.7, and 6.7 points; all three directions persisted under reversed answer order.

The eight search and confirmation files:

- [Search candidates](search-candidates.json)
- [Search discovery responses](search-discovery.json)
- [Search confirmation prompts](search-confirm-prompts.json)
- [Search confirmation responses](search-confirm.json)
- [Search reversed-order responses](search-reversed.json)
- [Final confirmation prompts](final-confirm-prompts.json)
- [Final confirmation responses](final-confirm.json)
- [Final reversed-order responses](final-reversed.json)
