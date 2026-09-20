export type Option = { id: string; label: string };
export type Wording = {
  id: string;
  text: string;
};
export type Experiment = {
  id: string;
  title: string;
  category: string;
  mode: "binary" | "multiple";
  wordings: Wording[];
  options: Option[];
  context: string;
};
export type Seed = {
  id: string;
  title: string;
  category: string;
  wordings: string[];
  options?: string[];
};
export type Condition = {
  id: string;
  text: string;
  label: string;
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
  source: "local" | "recorded" | "shared";
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
