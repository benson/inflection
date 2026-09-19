import type { Seed } from "./types";

// Benson's three starting questions, with two editable rewordings each.
export const seeds: Seed[] = [
  {
    id: "self-driving-safety",
    title: "Self-driving safety",
    category: "Technology",
    question: "Are self-driving cars safer than human drivers?",
    variants: [
      "Are autonomous cars safer than cars driven by humans?",
      "Are human drivers less safe than self-driving cars?",
    ],
  },
  {
    id: "us-progressivism",
    title: "U.S. progressivism",
    category: "Politics",
    question:
      "Is the United States more politically progressive than other Western countries?",
    variants: [
      "Compared with other Western countries, is the United States more politically progressive?",
      "Are other Western countries less politically progressive than the United States?",
    ],
  },
  {
    id: "religion-terrorism",
    title: "Religion & terrorism",
    category: "Religion",
    question:
      "Does Islam inspire more terrorism than other monotheistic religions?",
    variants: [
      "Compared with other monotheistic religions, does Islam inspire more terrorism?",
      "Is more terrorism inspired by Islam than by other monotheistic religions?",
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
