# Inflection

A small playground for exploring how wording changes Jev’s probability distribution. Built for Benson, using React, TypeScript, Vite, and OpenRouter’s native Decisions API.

## Run locally

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5197 and select **Run comparison**. The public app and local development use Benson’s shared, capped OpenRouter budget through a Cloudflare Worker. Visitors do not need an account or key. The credential is a Worker secret and never reaches the browser, GitHub repository, static build, or exports.

## Shared server

`worker/index.ts` proxies only Jev’s native Decisions endpoint at `https://inflection-api.bensonperry.workers.dev/decisions`. It fixes the model, validates and bounds requests, strips unknown fields, sanitizes provider errors, and allows the production and local development browser origins. Questions pass through the Worker to OpenRouter and TypeSafe. The Worker does not persist question bodies or enable observability logs.

Cloudflare throttles each IP to 20 requests per minute; a repeat consumes one request. This is a best-effort per-location rate limit, not a spending cap or authentication. The dedicated key’s OpenRouter spending limit is the budget control; keep it enabled. CORS is a browser boundary, not protection against non-browser callers.

To deploy or rotate the secret, with Cloudflare account credentials available locally:

```sh
npx wrangler deploy --config worker/wrangler.toml
# Paste a dedicated, capped OpenRouter key into .secrets/openrouter-key.txt.
node scripts/connect-key.mjs
```

The setup script checks the key’s cap and sends it to Wrangler over stdin. It never prints the key or accepts it as a CLI argument. Remove the local setup file after verifying a live comparison. `/status`, requested with an allowed Origin header, reports whether a secret is configured; it does not test provider balance or availability. Frontend publishing does not deploy the Worker.

## Explore

- 120 original policy questions in 12 categories; 96 yes/no and 24 multiple-choice, each with two editable paraphrases.
- Create your own question, use two to eight shared answers, and compare up to eight wordings.
- Word-level insertions and deletions, complete probability distributions, a common-scale dot plot, percentage-point deltas, and answer flips.
- Repeat the entire batch 1, 3, or 5 times; show mean probabilities and observed min–max ranges.
- Add original-question controls for reversed answer order and an expanded answer set (insufficient information / false premise).
- Mark substantive changes as **Changed framing**; they are excluded from the paraphrase swing statistic.
- Save questions, inspect 20 recent real comparisons, export full request/response metadata, and import exported experiments.

The initial example has explicitly labeled, invented probabilities. It is a fixed illustration, not a result from Jev. Editing or selecting any other question clears its results. There is no fake-answer fallback. Only **Run comparison** sends inference requests.

## Method

Both binary and multiple-choice questions use Jev’s `choice` primitive. This avoids confounding question wording with differences between Noul and Choice. Stable answer IDs preserve identity across order changes. Each batch sends exactly the visible question text as `instructions`, answer labels as `criteria`, and shared context as `state`. No other wording, persona, political position, or safety instruction is injected. Empty wording drafts are excluded.

The API contract was checked against [OpenRouter’s official OpenAPI specification](https://openrouter.ai/openapi.json): `POST https://openrouter.ai/api/alpha/decisions`, model `typesafe/jev-1.13`. This alpha route is distinct from chat completions. The full resolved model ID is preserved in each response. Requests timeout after 45 seconds; canceled or failed batches are not replaced with fabricated results or silently retried.

The **largest wording swing** is the maximum, across shared options, of the probability range across the original and variants marked Rewording. Expanded-answer, reversed-order, and Changed framing conditions are excluded. Flips count only a unique winning answer changing from the original to a paraphrase. Exact ties are displayed as ties. The plot follows a selected shared answer and its original baseline. Extra answers in the expanded control are shown in that row’s distribution, without inventing a measured baseline for them.

Repeated runs estimate observed variability only; min–max lines are not confidence intervals. A paraphrase is an editorial attempt, not a certified meaning-preserving transformation. Results measure this model under these questions and options; they do not establish political or moral truth. TypeSafe’s confidence scalar is retained in JSON; the interface emphasizes the full distribution.

## Question provenance

Curated September 19, 2026. News coverage informed selection of current topics; the questions are newly written policy prompts, not quoted survey questions or factual assertions. The library combines present debates with enduring controversies, mostly focused on U.S. policy. It is not a live feed and does not fetch current facts for the model.

- [The Week: issues shaping the 2026 midterms](https://theweek.com/politics/issues-that-will-determine-2026-midterms-israel-immigration-gas-trump-iran)
- [Le Monde: European debates on technology, security, and energy](https://www.lemonde.fr/en/international/article/2026/09/16/as-far-right-gains-ground-eu-commission-president-pledges-a-europe-that-protects_6757608_4.html)
- [TypeSafe’s documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [Choice documentation](https://docs.typesafe.ai/primitives/choice)

## Validation and publishing

```sh
npm test
npm run build
```

Node tests cover library integrity, controlled request construction, invalid distributions, ties, swing arithmetic, repeated runs, credential-free browser transport, and the Worker’s validation, origin checks, throttling, and secret isolation. `scripts/check-browser.js` is a Playwright CLI workflow covering actual browser interactions and a clearly mocked API response. Live inference requires the Worker’s configured key and available credits.

The relative asset base supports GitHub Pages at `bensonperry.com/inflection/`. The deploy workflow runs the focused checks before publishing `dist`. Browser state and keys are not built into that static artifact.
