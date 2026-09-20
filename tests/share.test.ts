import test from "node:test";
import assert from "node:assert/strict";
import { decodeShare, encodeShare } from "../src/share";
import {
  isDraft,
  isExperiment,
  readHistory,
  readStorage,
  writeStorage,
} from "../src/storage";
import { recordedRun } from "../src/recorded";
import { seeds } from "../src/seeds";
import { buildRequest, validateExperiment } from "../src/engine";

const fixture = () => recordedRun(seeds[0].id)!;
async function payloadHash(value: unknown) {
  const stream = new Blob([JSON.stringify(value)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return `#s=${Buffer.from(await new Response(stream).arrayBuffer()).toString("base64url")}`;
}

test("gzip links preserve Unicode inputs, repeated distributions, metadata, and shared provenance", async () => {
  for (const source of ["local", "recorded", "shared"] as const) {
    const run = fixture();
    run.source = source;
    const experiment = {
      ...run.experiment,
      title: "café — 日本語",
      context: "",
    };
    const encoded = await encodeShare(experiment, run);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    const decoded = await decodeShare(`#s=${encoded}`);
    assert.ok(decoded?.run);
    assert.equal(decoded.experiment.title, experiment.title);
    assert.deepEqual(decoded.experiment.wordings, experiment.wordings);
    assert.deepEqual(decoded.run.responses, run.responses);
    assert.deepEqual(decoded.run.request, run.request);
    assert.equal(decoded.run.createdAt, run.createdAt);
    assert.equal(decoded.run.source, "shared");
  }
});

test("input-only links retain option order and context without supplying results", async () => {
  const e = fixture().experiment;
  e.options = [
    { id: "a", label: "Énergie" },
    { id: "b", label: "Housing" },
    { id: "c", label: "Transit" },
  ];
  e.mode = "multiple";
  e.context = "A hypothetical city.\nCompare these priorities.";
  const decoded = await decodeShare(`#s=${await encodeShare(e, null)}`);
  assert.ok(decoded);
  assert.equal(decoded.run, null);
  assert.equal(decoded.experiment.mode, "multiple");
  assert.deepEqual(buildRequest(decoded.experiment), buildRequest(e));
});

test("sharing accepts whitespace edits that leave a measured request unchanged", async () => {
  const run = fixture();
  const experiment = structuredClone(run.experiment);
  experiment.options[0].label += " ";
  experiment.wordings[0].text += " ";
  assert.deepEqual(buildRequest(experiment), run.request);
  const decoded = await decodeShare(`#s=${await encodeShare(experiment, run)}`);
  assert.ok(decoded?.run);
  assert.deepEqual(decoded.run.responses, run.responses);
});

test("links reject malformed compression, incomplete inputs, mismatched conditions, and invalid distributions", async () => {
  for (const hash of [
    "",
    "#s=invalid",
    "#s=%",
    "#else=abc",
    `#s=${"a".repeat(2_000_000)}`,
  ])
    assert.equal(await decodeShare(hash), null);
  const run = fixture();
  const payload = {
    experiment: run.experiment,
    run: { ...run, model: run.responses[0].model },
  };
  for (const mutate of [
    (p: any) => p.experiment.wordings.pop(),
    (p: any) => (p.experiment.wordings[0].id = "w9"),
    (p: any) => (p.experiment.wordings[0].text = "x".repeat(3001)),
    (p: any) => (p.experiment.wordings = [{ id: "w1", text: "Only one?" }]),
    (p: any) => (p.experiment.title = "x".repeat(121)),
    (p: any) => (p.experiment.options[0].id = "constructor"),
    (p: any) => (p.experiment.options[0].label = "No"),
    (p: any) => (p.run.conditions[0].text = "Different question?"),
    (p: any) => p.run.conditions[0].options.reverse(),
    (p: any) => (p.run.responses[0].answers.w1.probabilities.yes = 2),
    (p: any) => delete p.run.responses[0].answers.w2,
    (p: any) => (p.run.responses = []),
    (p: any) => (p.run.responses[0].model = "different/model"),
    (p: any) => (p.run.model = "different/model"),
    (p: any) => (p.run.createdAt = "not a date"),
    (p: any) => (p.run.source = "unrecognized"),
  ]) {
    const value = structuredClone(payload);
    mutate(value);
    assert.equal(await decodeShare(await payloadHash(value)), null);
  }
  assert.equal(
    await decodeShare(await payloadHash({ padding: "x".repeat(2_000_001) })),
    null,
  );
  const changed = structuredClone(run.experiment);
  changed.wordings[0].text += " Really?";
  await assert.rejects(encodeShare(changed, run), /do not match/);
});

test("drafts require two to eight sequential IDs; runs require two nonempty wordings", () => {
  const e = fixture().experiment;
  e.wordings = [
    { id: "w1", text: "" },
    { id: "w2", text: "" },
  ];
  assert.equal(isDraft(e), true);
  assert.equal(isExperiment(e), false);
  e.wordings[0].text = "One question?";
  assert.match(validateExperiment(e)!, /at least two/);
  e.wordings[1].text = "Another question?";
  assert.equal(isExperiment(e), true);
  e.wordings.push({ id: "w3", text: "" });
  assert.deepEqual(Object.keys(buildRequest(e).questions), ["w1", "w2"]);
  e.wordings[1].id = "w8";
  assert.equal(isDraft(e), false);
});

test("v2 history ignores v1, caps local runs at 20, and discards invalid or external results", () => {
  const entries = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    },
  });
  try {
    entries.set("inflection-v1-draft", JSON.stringify(fixture().experiment));
    entries.set("inflection-v1-history", JSON.stringify([fixture()]));
    assert.equal(readStorage("draft", null), null);
    assert.deepEqual(readHistory(), []);
    const local = { ...fixture(), source: "local" as const };
    const bad = structuredClone(local);
    bad.responses[0].answers.w1.probabilities.yes = -1;
    const runs = Array.from({ length: 25 }, (_, i) => ({
      ...local,
      id: `run-${i}`,
    }));
    assert.equal(
      writeStorage("history", [
        bad,
        null,
        fixture(),
        { ...local, source: "shared" },
        ...runs,
      ]),
      true,
    );
    assert.deepEqual(
      readHistory().map((r) => r.id),
      runs.slice(0, 20).map((r) => r.id),
    );
    entries.set("inflection-v2-history", "invalid JSON");
    assert.deepEqual(readHistory(), []);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
