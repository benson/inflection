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

## Fair coin and die · September 20, 2026

A fair coin and a fair six-sided die were probed as questions with a known answer (50% for heads or tails, 1/6 for six, and 5/6 for not-six), using the same wrappers as the example search. The exact wordings are in [coin-confirm-prompts.json](coin-confirm-prompts.json); means and observed ranges below use the three Yes/No repeats in [coin-confirm.json](coin-confirm.json), and the last column uses the single No/Yes repeat in [coin-reversed.json](coin-reversed.json). Requests used the native Choice primitive, empty shared context, and model `typesafe/jev-1.13-20260917`.

| Question | Mean Yes | Observed range | Reversed-order Yes |
| --- | ---: | ---: | ---: |
| If I flip a fair coin, will it land heads? | 59.0% | 58–60% | 53% |
| If I flip a fair coin, will it land tails? | 45.7% | 45–47% | 44% |
| Do you think a fair coin flip will land heads? | 41.0% | 39–42% | 39% |
| Will a fair coin come up heads when flipped? | 57.3% | 57–58% | 49% |
| If I roll a fair six-sided die, will it show a six? | 7.7% | 7–9% | 9% |
| If I roll a fair six-sided die, will it show a number other than six? | 96.0% | 96–96% | 97% |
| Do you think a fair six-sided die will show a six? | 9.7% | 9–10% | 7% |
| Will a fair six-sided die show a six when rolled? | 10.7% | 10–12% | 10% |

Heads and tails sum to about 105%, and "do you think" moves heads below 50%; the die is consistent across wordings (six about 8 to 11%, not-six 96%), so the coin is the shipped example and the die is kept as a control.

## Fact search · September 20, 2026

The criterion was questions with a correct answer: settled empirical claims and probability or logic puzzles first, then counterintuitive facts. Variants were limited to wrappers or syntactic edits with polarity preserved, so a flip on a settled fact means at least one wording has a wrong leading answer rather than merely a mirrored one. The search selected examples for wording sensitivity; it was not a representative accuracy benchmark.

The two screening tables contain every exact question and Yes probability from the single discovery pass, separate from the confirmation measurements. Each request used the native Choice primitive, empty shared context, Yes/No answer order, and model `typesafe/jev-1.13-20260917`.

Settled-set screening ([prompts](facts-settled-candidates.json), [responses](facts-settled-discovery.json)):

| Topic | Exact question | Yes |
| --- | --- | ---: |
| Monty Hall | In the Monty Hall problem, is switching doors after the host reveals a goat better than staying? | 100% |
| Monty Hall | Do you think switching doors after the host reveals a goat is better than staying in the Monty Hall problem? | 100% |
| Monty Hall | Is it true that in the Monty Hall problem, switching doors after the host reveals a goat is better than staying? | 100% |
| Monty Hall | After the host reveals a goat in the Monty Hall problem, is switching doors better than staying? | 100% |
| Monty Hall | In the Monty Hall problem, is staying worse than switching doors after the host reveals a goat? | 100% |
| Birthday problem | In a group of 23 people, is it more likely than not that two of them share a birthday? | 100% |
| Birthday problem | Do you think that in a group of 23 people it is more likely than not that two of them share a birthday? | 100% |
| Birthday problem | Is it true that in a group of 23 people, it is more likely than not that two of them share a birthday? | 100% |
| Birthday problem | Is it more likely than not that two people share a birthday in a group of 23? | 100% |
| Birthday problem | Among 23 people, is the chance that two share a birthday above 50%? | 99% |
| Gambler's fallacy | After a fair coin lands heads five times in a row, is tails more likely than heads on the next flip? | 0% |
| Gambler's fallacy | Do you think tails is more likely than heads on the next flip after a fair coin lands heads five times in a row? | 1% |
| Gambler's fallacy | Is it true that after a fair coin lands heads five times in a row, tails is more likely than heads on the next flip? | 0% |
| Gambler's fallacy | If a fair coin has landed heads five times in a row, is the next flip more likely to be tails than heads? | 0% |
| Gambler's fallacy | After five heads in a row from a fair coin, is heads less likely than tails on the next flip? | 0% |
| Base rate | A disease affects 1 in 1,000 people and a test for it is 99% accurate. If someone tests positive, are they more likely than not to have the disease? | 2% |
| Base rate | Do you think someone who tests positive on a 99% accurate test for a disease that affects 1 in 1,000 people is more likely than not to have the disease? | 4% |
| Base rate | Is it true that if a disease affects 1 in 1,000 people and a test for it is 99% accurate, someone who tests positive is more likely than not to have the disease? | 2% |
| Base rate | If someone tests positive on a 99% accurate test for a disease that affects 1 in 1,000 people, are they more likely than not to have the disease? | 4% |
| Base rate | A test for a disease is 99% accurate and the disease affects 1 in 1,000 people. Is a person who tests positive more likely than not to have it? | 3% |
| Nuclear vs coal | Has nuclear power caused fewer deaths per unit of electricity generated than coal? | 100% |
| Nuclear vs coal | Do you think nuclear power has caused fewer deaths per unit of electricity generated than coal? | 100% |
| Nuclear vs coal | Is it true that nuclear power has caused fewer deaths per unit of electricity generated than coal? | 100% |
| Nuclear vs coal | Per unit of electricity generated, has nuclear power caused fewer deaths than coal? | 100% |
| Nuclear vs coal | Has coal caused more deaths per unit of electricity generated than nuclear power? | 100% |
| Immigration & crime | In the United States, are immigrants less likely to be incarcerated than native-born citizens? | 96% |
| Immigration & crime | Do you think immigrants in the United States are less likely to be incarcerated than native-born citizens? | 96% |
| Immigration & crime | Is it true that in the United States, immigrants are less likely to be incarcerated than native-born citizens? | 96% |
| Immigration & crime | Are native-born citizens in the United States more likely to be incarcerated than immigrants? | 81% |
| Immigration & crime | Compared with native-born citizens, are immigrants in the United States less likely to be incarcerated? | 96% |
| Global poverty | Has the share of the world's population living in extreme poverty fallen over the past 30 years? | 100% |
| Global poverty | Do you think the share of the world's population living in extreme poverty has fallen over the past 30 years? | 100% |
| Global poverty | Is it true that the share of the world's population living in extreme poverty has fallen over the past 30 years? | 100% |
| Global poverty | Over the past 30 years, has the share of the world's population living in extreme poverty fallen? | 100% |
| Global poverty | Is the share of the world's population living in extreme poverty lower today than it was 30 years ago? | 100% |
| US violent crime | Is the violent crime rate in the United States lower today than it was in 1991? | 100% |
| US violent crime | Do you think the violent crime rate in the United States is lower today than it was in 1991? | 100% |
| US violent crime | Is it true that the violent crime rate in the United States is lower today than it was in 1991? | 100% |
| US violent crime | Was the violent crime rate in the United States higher in 1991 than it is today? | 100% |
| US violent crime | Compared with 1991, is the violent crime rate in the United States lower today? | 100% |
| Self-driving safety | Are self-driving cars safer than human drivers? | 39% |
| Self-driving safety | Do you think self-driving cars are safer than human drivers? | 62% |
| Self-driving safety | Is it true that self-driving cars are safer than human drivers? | 15% |
| Self-driving safety | Are human drivers less safe than self-driving cars? | 22% |
| Self-driving safety | Compared with human drivers, are self-driving cars safer? | 41% |
| GMO safety | Are approved genetically modified foods as safe to eat as conventional foods? | 99% |
| GMO safety | Do you think approved genetically modified foods are as safe to eat as conventional foods? | 99% |
| GMO safety | Is it true that approved genetically modified foods are as safe to eat as conventional foods? | 96% |
| GMO safety | Are conventional foods no safer to eat than approved genetically modified foods? | 92% |
| GMO safety | Compared with conventional foods, are approved genetically modified foods as safe to eat? | 100% |
| Organic nutrition | Is organic food more nutritious than conventionally grown food? | 3% |
| Organic nutrition | Do you think organic food is more nutritious than conventionally grown food? | 10% |
| Organic nutrition | Is it true that organic food is more nutritious than conventionally grown food? | 2% |
| Organic nutrition | Is conventionally grown food less nutritious than organic food? | 3% |
| Organic nutrition | Compared with conventionally grown food, is organic food more nutritious? | 3% |
| Sugar & hyperactivity | Does eating sugar make children hyperactive? | 0% |
| Sugar & hyperactivity | Do you think eating sugar makes children hyperactive? | 1% |
| Sugar & hyperactivity | Is it true that eating sugar makes children hyperactive? | 0% |
| Sugar & hyperactivity | Are children made hyperactive by eating sugar? | 0% |
| Sugar & hyperactivity | When children eat sugar, does it make them hyperactive? | 1% |
| Ten percent of the brain | Do humans use only 10% of their brains? | 0% |
| Ten percent of the brain | Do you think humans use only 10% of their brains? | 0% |
| Ten percent of the brain | Is it true that humans use only 10% of their brains? | 0% |
| Ten percent of the brain | Is only 10% of the human brain used? | 0% |
| Ten percent of the brain | Do people use just 10% of their brains? | 0% |
| Climate attribution | Is most of the global warming since 1950 caused by human activity? | 100% |
| Climate attribution | Do you think most of the global warming since 1950 is caused by human activity? | 100% |
| Climate attribution | Is it true that most of the global warming since 1950 is caused by human activity? | 100% |
| Climate attribution | Since 1950, has most global warming been caused by human activity? | 100% |
| Climate attribution | Is human activity the cause of most of the global warming since 1950? | 100% |
| 0.999 repeating | Is 0.999 repeating equal to 1? | 100% |
| 0.999 repeating | Do you think 0.999 repeating is equal to 1? | 100% |
| 0.999 repeating | Is it true that 0.999 repeating equals 1? | 100% |
| 0.999 repeating | Does 0.999 repeating equal 1? | 100% |
| 0.999 repeating | Is 1 equal to 0.999 repeating? | 100% |
| Great Wall from space | Is the Great Wall of China visible from space with the naked eye? | 1% |
| Great Wall from space | Do you think the Great Wall of China is visible from space with the naked eye? | 1% |
| Great Wall from space | Is it true that the Great Wall of China is visible from space with the naked eye? | 1% |
| Great Wall from space | With the naked eye, is the Great Wall of China visible from space? | 2% |
| Great Wall from space | Can the Great Wall of China be seen from space with the naked eye? | 1% |

In the settled set, 15 of 16 topics kept the same leading answer across every wording and self-driving safety was the only one to cross 50%; 12 topics stayed within 2 points, while immigration and crime spanned 15 points, GMO safety and organic nutrition each spanned 8, and self-driving safety spanned 47.

Counterintuitive-set screening ([prompts](facts-counterintuitive-candidates.json), [responses](facts-counterintuitive-discovery.json)):

| Topic | Exact question | Yes |
| --- | --- | ---: |
| Reno and Los Angeles | Is Reno, Nevada farther west than Los Angeles, California? | 36% |
| Reno and Los Angeles | Do you think Reno, Nevada is farther west than Los Angeles, California? | 35% |
| Reno and Los Angeles | Is it true that Reno, Nevada is farther west than Los Angeles, California? | 50% |
| Reno and Los Angeles | Is Los Angeles, California farther east than Reno, Nevada? | 69% |
| Reno and Los Angeles | Compared with Los Angeles, California, is Reno, Nevada farther west? | 3% |
| Closest state to Africa | Is Maine the US state closest to Africa? | 65% |
| Closest state to Africa | Do you think Maine is the US state closest to Africa? | 56% |
| Closest state to Africa | Is it true that Maine is the US state closest to Africa? | 69% |
| Closest state to Africa | Of all US states, is Maine the closest to Africa? | 66% |
| Closest state to Africa | Is the US state closest to Africa Maine? | 33% |
| Trees and stars | Are there more trees on Earth than stars in the Milky Way? | 16% |
| Trees and stars | Do you think there are more trees on Earth than stars in the Milky Way? | 11% |
| Trees and stars | Is it true that there are more trees on Earth than stars in the Milky Way? | 16% |
| Trees and stars | Are there fewer stars in the Milky Way than trees on Earth? | 9% |
| Trees and stars | Does the number of trees on Earth exceed the number of stars in the Milky Way? | 15% |
| Hippos and sharks | Do hippos kill more people each year than sharks do? | 100% |
| Hippos and sharks | Do you think hippos kill more people each year than sharks do? | 99% |
| Hippos and sharks | Is it true that hippos kill more people each year than sharks do? | 99% |
| Hippos and sharks | Do sharks kill fewer people each year than hippos do? | 93% |
| Hippos and sharks | Each year, do hippos kill more people than sharks? | 99% |
| Cubs and the Ottomans | Did the Ottoman Empire still exist the last time the Chicago Cubs won the World Series before 2016? | 7% |
| Cubs and the Ottomans | Do you think the Ottoman Empire still existed the last time the Chicago Cubs won the World Series before 2016? | 8% |
| Cubs and the Ottomans | Is it true that the Ottoman Empire still existed the last time the Chicago Cubs won the World Series before 2016? | 11% |
| Cubs and the Ottomans | The last time the Chicago Cubs won the World Series before 2016, did the Ottoman Empire still exist? | 59% |
| Cubs and the Ottomans | When the Chicago Cubs last won the World Series before 2016, was the Ottoman Empire still in existence? | 63% |
| Moderate drinking | Is moderate alcohol consumption better for heart health than not drinking at all? | 8% |
| Moderate drinking | Do you think moderate alcohol consumption is better for heart health than not drinking at all? | 5% |
| Moderate drinking | Is it true that moderate alcohol consumption is better for heart health than not drinking at all? | 6% |
| Moderate drinking | Is not drinking at all worse for heart health than moderate alcohol consumption? | 14% |
| Moderate drinking | For heart health, is moderate alcohol consumption better than not drinking at all? | 3% |
| EV lifetime emissions | Over their full lifetime, do electric cars produce less greenhouse gas than gasoline cars? | 99% |
| EV lifetime emissions | Do you think electric cars produce less greenhouse gas than gasoline cars over their full lifetime? | 100% |
| EV lifetime emissions | Is it true that over their full lifetime, electric cars produce less greenhouse gas than gasoline cars? | 99% |
| EV lifetime emissions | Do gasoline cars produce more greenhouse gas than electric cars over their full lifetime? | 99% |
| EV lifetime emissions | Compared with gasoline cars, do electric cars produce less greenhouse gas over their full lifetime? | 100% |
| Minimum wage employment | Do moderate increases in the minimum wage reduce employment? | 32% |
| Minimum wage employment | Do you think moderate increases in the minimum wage reduce employment? | 12% |
| Minimum wage employment | Is it true that moderate increases in the minimum wage reduce employment? | 42% |
| Minimum wage employment | Is employment reduced by moderate increases in the minimum wage? | 23% |
| Minimum wage employment | When the minimum wage is moderately increased, does employment fall? | 53% |
| US homicide 1960 | Is the US homicide rate higher today than it was in 1960? | 69% |
| US homicide 1960 | Do you think the US homicide rate is higher today than it was in 1960? | 67% |
| US homicide 1960 | Is it true that the US homicide rate is higher today than it was in 1960? | 68% |
| US homicide 1960 | Was the US homicide rate lower in 1960 than it is today? | 54% |
| US homicide 1960 | Compared with 1960, is the US homicide rate higher today? | 34% |
| Life expectancy Cuba | Is life expectancy in Cuba higher than in the United States? | 61% |
| Life expectancy Cuba | Do you think life expectancy in Cuba is higher than in the United States? | 54% |
| Life expectancy Cuba | Is it true that life expectancy in Cuba is higher than in the United States? | 50% |
| Life expectancy Cuba | Is life expectancy in the United States lower than in Cuba? | 49% |
| Life expectancy Cuba | Compared with the United States, is life expectancy in Cuba higher? | 49% |
| Solar vs nuclear cost | Is new utility-scale solar power cheaper per megawatt-hour than new nuclear power? | 100% |
| Solar vs nuclear cost | Do you think new utility-scale solar power is cheaper per megawatt-hour than new nuclear power? | 100% |
| Solar vs nuclear cost | Is it true that new utility-scale solar power is cheaper per megawatt-hour than new nuclear power? | 100% |
| Solar vs nuclear cost | Is new nuclear power more expensive per megawatt-hour than new utility-scale solar power? | 96% |
| Solar vs nuclear cost | Per megawatt-hour, is new utility-scale solar power cheaper than new nuclear power? | 99% |
| Cleopatra and the pyramids | Did Cleopatra live closer in time to the Moon landing than to the building of the Great Pyramid? | 97% |
| Cleopatra and the pyramids | Do you think Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid? | 99% |
| Cleopatra and the pyramids | Is it true that Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid? | 99% |
| Cleopatra and the pyramids | Was Cleopatra's lifetime closer to the Moon landing than to the building of the Great Pyramid? | 96% |
| Cleopatra and the pyramids | Is the building of the Great Pyramid further in time from Cleopatra than the Moon landing is? | 96% |
| Sharks and trees | Are sharks older than trees? | 92% |
| Sharks and trees | Do you think sharks are older than trees? | 93% |
| Sharks and trees | Is it true that sharks are older than trees? | 94% |
| Sharks and trees | Did sharks exist before trees did? | 98% |
| Sharks and trees | Are trees younger than sharks? | 56% |
| Child tax credit | Did the expanded US child tax credit in 2021 reduce child poverty? | 100% |
| Child tax credit | Do you think the expanded US child tax credit in 2021 reduced child poverty? | 100% |
| Child tax credit | Is it true that the expanded US child tax credit in 2021 reduced child poverty? | 100% |
| Child tax credit | Was child poverty reduced by the expanded US child tax credit in 2021? | 100% |
| Child tax credit | In 2021, did the expanded US child tax credit reduce child poverty? | 99% |

Confirmation uses the three Yes/No repeats in [facts-confirm.json](facts-confirm.json); the last column is the single No/Yes repeat in [facts-reversed.json](facts-reversed.json). A dash marks the original question, and edit types describe changes relative to it. Means and observed min–max ranges are calculated per exact wording; ranges are observations, not confidence intervals. The four shipped sets use these exact [confirmation prompts](facts-confirm-prompts.json), all tagged as rewordings.

| Topic | Exact question | Edit type | Mean Yes | Observed range | Reversed-order Yes |
| --- | --- | --- | ---: | ---: | ---: |
| Reno and Los Angeles | Is Reno, Nevada farther west than Los Angeles, California? | — | 33.3% | 31–37% | 33% |
| Reno and Los Angeles | Is Los Angeles, California farther east than Reno, Nevada? | comparative inversion | 68.7% | 68–69% | 66% |
| Reno and Los Angeles | Compared with Los Angeles, California, is Reno, Nevada farther west? | clause order | 3.0% | 3–3% | 5% |
| Reno and Los Angeles | Is it true that Reno, Nevada is farther west than Los Angeles, California? | wrapper | 47.0% | 41–51% | 46% |
| Cubs and the Ottomans | Did the Ottoman Empire still exist the last time the Chicago Cubs won the World Series before 2016? | — | 10.0% | 8–12% | 12% |
| Cubs and the Ottomans | The last time the Chicago Cubs won the World Series before 2016, did the Ottoman Empire still exist? | clause order | 60.0% | 57–62% | 59% |
| Cubs and the Ottomans | When the Chicago Cubs last won the World Series before 2016, was the Ottoman Empire still in existence? | clause order | 65.3% | 53–75% | 72% |
| Cubs and the Ottomans | Do you think the Ottoman Empire still existed the last time the Chicago Cubs won the World Series before 2016? | wrapper | 8.7% | 8–9% | 10% |
| Closest state to Africa | Is Maine the US state closest to Africa? | — | 61.3% | 57–64% | 68% |
| Closest state to Africa | Is the US state closest to Africa Maine? | clause order | 29.7% | 24–40% | 40% |
| Closest state to Africa | Of all US states, is Maine the closest to Africa? | clause order | 61.0% | 60–62% | 68% |
| Closest state to Africa | Do you think Maine is the US state closest to Africa? | wrapper | 57.7% | 57–58% | 64% |
| Sharks and trees | Are sharks older than trees? | — | 92.3% | 91–94% | 96% |
| Sharks and trees | Are trees younger than sharks? | comparative inversion | 59.7% | 57–63% | 65% |
| Sharks and trees | Did sharks exist before trees did? | comparative restatement | 97.7% | 97–98% | 98% |
| Sharks and trees | Is it true that sharks are older than trees? | wrapper | 95.0% | 95–95% | 95% |
| Self-driving safety | Are self-driving cars safer than human drivers? | — | 35.7% | 35–36% | 29% |
| Self-driving safety | Do you think self-driving cars are safer than human drivers? | wrapper | 61.7% | 61–63% | 60% |
| Self-driving safety | Is it true that self-driving cars are safer than human drivers? | wrapper | 14.0% | 14–14% | 13% |
| Self-driving safety | Are human drivers less safe than self-driving cars? | comparative inversion | 30.0% | 24–35% | 21% |

Sharks and trees was not shipped because nothing crossed 50%: all wordings stayed above it in every confirmation repeat and in the reversed-order control, despite a large movement on the comparative inversion.

Reno is west of Los Angeles; the Cubs' previous title was 1908 and the Ottoman Empire ended in 1922; Maine's Quoddy Head is the closest US point to Africa; self-driving safety is not settled.

The seven fact-search files:

- [Settled candidates](facts-settled-candidates.json)
- [Settled discovery responses](facts-settled-discovery.json)
- [Counterintuitive candidates](facts-counterintuitive-candidates.json)
- [Counterintuitive discovery responses](facts-counterintuitive-discovery.json)
- [Confirmation prompts](facts-confirm-prompts.json)
- [Confirmation responses](facts-confirm.json)
- [Reversed-order responses](facts-reversed.json)

## Religion example, reinstated · September 20, 2026

The active/passive religion pair was removed from the app earlier in the day for being a charged topic. It is reinstated as the last example because it is the largest confirmed swing on a syntactic edit.

| Exact question | Mean Yes | Observed range | Reversed-order Yes |
| --- | ---: | ---: | ---: |
| Does Islam inspire more terrorism than other monotheistic religions? | 4.0% | 4–4% | 2% |
| Is more terrorism inspired by Islam than by other monotheistic religions? | 82.7% | 81–84% | 71% |
| Compared with other monotheistic religions, does Islam inspire more terrorism? | 4.0% | 4–4% | 3% |

The "compared with" front-load is included as a control that barely moves.

Means and observed ranges come from the [three Yes/No confirmation repeats](religion-confirm.json) of the exact [confirmation prompts](religion-confirm-prompts.json), with empty shared context and resolved model `typesafe/jev-1.13-20260917`; reversed-order Yes comes from the [single No/Yes repeat](religion-reversed.json).
