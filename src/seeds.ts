import type { Seed } from "./types";

// Confirmed wordings from research/2026-09-20/facts-confirm-prompts.json.
export const seeds: Seed[] = [
  {
    id: "reno-los-angeles",
    title: "Reno and Los Angeles",
    category: "Geography",
    wordings: [
      "Is Reno, Nevada farther west than Los Angeles, California?",
      "Is Los Angeles, California farther east than Reno, Nevada?",
      "Compared with Los Angeles, California, is Reno, Nevada farther west?",
      "Is it true that Reno, Nevada is farther west than Los Angeles, California?",
    ],
  },
  {
    id: "cubs-ottomans",
    title: "Cubs and the Ottomans",
    category: "History",
    wordings: [
      "Did the Ottoman Empire still exist the last time the Chicago Cubs won the World Series before 2016?",
      "The last time the Chicago Cubs won the World Series before 2016, did the Ottoman Empire still exist?",
      "When the Chicago Cubs last won the World Series before 2016, was the Ottoman Empire still in existence?",
      "Do you think the Ottoman Empire still existed the last time the Chicago Cubs won the World Series before 2016?",
    ],
  },
  {
    id: "maine-africa",
    title: "Closest state to Africa",
    category: "Geography",
    wordings: [
      "Is Maine the US state closest to Africa?",
      "Is the US state closest to Africa Maine?",
      "Of all US states, is Maine the closest to Africa?",
      "Do you think Maine is the US state closest to Africa?",
    ],
  },
  {
    id: "self-driving-safety",
    title: "Self-driving safety",
    category: "Technology",
    wordings: [
      "Are self-driving cars safer than human drivers?",
      "Do you think self-driving cars are safer than human drivers?",
      "Is it true that self-driving cars are safer than human drivers?",
      "Are human drivers less safe than self-driving cars?",
    ],
  },
];

export const sources = [
  {
    title: "Jev’s documented limitations",
    publisher: "TypeSafe",
    url: "https://docs.typesafe.ai/model-jaggedness/jev-1.13",
    note: "Wording sensitivity, literal interpretation, and inconsistencies between related questions.",
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
