import type { Seed } from "./types";

// Confirmed wordings from research/2026-09-20/tiered-confirm-prompts.json.
export const seeds: Seed[] = [
  {
    id: "self-driving-safety",
    title: "Self-driving safety",
    category: "Technology",
    question: "Are self-driving cars safer than human drivers?",
    variants: [
      "Do you think self-driving cars are safer than human drivers?",
      "Are human drivers less safe than self-driving cars?",
      "Are autonomous cars safer than human drivers?",
    ],
  },
  {
    id: "wealth-tax",
    title: "Wealth tax",
    category: "Economics",
    question:
      "Should the government tax wealth that people have already paid income tax on?",
    variants: [
      "Do you think the government should tax wealth that people have already paid income tax on?",
      "Should wealth that people have already paid income tax on be taxed by the government?",
      "Should the government tax assets that people have already paid income tax on?",
    ],
  },
  {
    id: "eating-meat",
    title: "Eating meat",
    category: "Ethics",
    question:
      "Is it morally acceptable to eat meat when other nutritious food is available?",
    variants: [
      "When other nutritious food is available, is it morally acceptable to eat meat?",
      "Is it morally acceptable to eat animals when other nutritious food is available?",
    ],
  },
];

export const sources = [
  {
    title: "Jev’s documented limitations",
    publisher: "TypeSafe",
    url: "https://docs.typesafe.ai/model-jaggedness/jev-1.13",
    note: "Framing sensitivity, literal interpretation, and inconsistencies between related questions.",
  },
  {
    title: "How Choice probabilities work",
    publisher: "TypeSafe documentation",
    url: "https://docs.typesafe.ai/primitives/choice",
    note: "A distribution over the answer options provided, with confidence derived from that distribution.",
  },
  {
    title: "OpenRouter Decisions API specification",
    publisher: "OpenRouter",
    url: "https://openrouter.ai/openapi.json",
    note: "The request and response contract used by this app: POST /api/alpha/decisions.",
  },
];
