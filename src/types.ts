export type Option = { id: string; label: string };
export type Variant = {
  id: string;
  text: string;
  kind: "paraphrase" | "framing";
};
export type Experiment = {
  id: string;
  title: string;
  category: string;
  mode: "binary" | "multiple";
  original: string;
  variants: Variant[];
  options: Option[];
  context: string;
  expanded: boolean;
  reversed: boolean;
};
export type Seed = {
  id: string;
  title: string;
  category: string;
  question: string;
  variants: [string, string];
  variantKinds?: [Variant["kind"], Variant["kind"]];
  options?: string[];
};
export type Condition = {
  id: string;
  text: string;
  label: string;
  kind: "original" | "paraphrase" | "framing" | "expanded" | "reversed";
  options: Option[];
};
export type Answer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
export type DecisionRequest = {
  model: string;
  state: string;
  questions: Record<
    string,
    { type: "choice"; instructions: string; criteria: Record<string, string> }
  >;
};
export type Run = {
  id: string;
  createdAt: string;
  sample: boolean;
  experiment: Experiment;
  conditions: Condition[];
  responses: {
    model: string;
    answers: Record<string, Answer>;
    usage?: { input_tokens?: number; output_tokens?: number; cost?: number };
    requestId?: string;
  }[];
  request: DecisionRequest;
  durationMs: number;
};
