import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Download,
  FlaskConical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Experiment, Run } from "./types";
import {
  binaryOptions,
  blankExperiment,
  buildRequest,
  evaluate,
  findMatchingRun,
  fromSeed,
  maxWordingSwing,
  meanProb,
  validateExperiment,
  winners,
  wordDiff,
} from "./engine";
import { seeds, sources } from "./seeds";
import { sampleRun } from "./sample";
import {
  isDraft,
  isExperiment,
  readHistory,
  readSaved,
  readStorage,
  writeStorage,
} from "./storage";

const colors = [
  "#653d78",
  "#a3654a",
  "#60798e",
  "#a77b37",
  "#70815c",
  "#55827d",
  "#9b597a",
  "#736678",
  "#8e8667",
  "#51514b",
];
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const points = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n * 100).toFixed(1)} pp`;

function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const b = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Diff({ original, text }: { original: string; text: string }) {
  return (
    <>
      {wordDiff(original, text).map((part, i) =>
        part.type === "removed" ? (
          <del key={i}>{part.text}</del>
        ) : part.type === "added" ? (
          <mark key={i}>{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function ProbabilityPlot({ run, optionId }: { run: Run; optionId: string }) {
  const plotRef = useRef<SVGSVGElement>(null);
  const [plotWidth, setPlotWidth] = useState(388);
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const observer = new ResizeObserver(() => {
      setPlotWidth(plot.getBoundingClientRect().width);
    });
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
  const base = meanProb(run, "original", optionId);
  const conditions = run.conditions;
  const h = conditions.length * 48 + 32;
  const left = 112,
    width = plotWidth - left - 48;
  const x = (p: number) => left + p * width;
  return (
    <svg
      ref={plotRef}
      className="probability-plot"
      viewBox={`0 0 ${plotWidth} ${h}`}
      role="img"
      aria-label="Probability by wording on a common zero to one hundred percent scale"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={x(p)}
            y1="12"
            x2={x(p)}
            y2={h - 32}
            stroke="var(--line)"
            strokeDasharray={p === 0.5 ? "3 4" : undefined}
          />
          <text x={x(p)} y={h - 8} textAnchor="middle" className="axis-label">
            {p * 100}%
          </text>
        </g>
      ))}
      <line
        x1={x(base)}
        y1="12"
        x2={x(base)}
        y2={h - 32}
        stroke="var(--muted)"
        strokeDasharray="2 4"
      />
      {conditions.map((c, i) => {
        const p = meanProb(run, c.id, optionId),
          y = i * 48 + 24;
        const vals = run.responses.map(
          (r) => r.answers[c.id].probabilities[optionId] ?? 0,
        );
        return (
          <g key={c.id}>
            <text x="0" y={y + 4} className="plot-label">
              {c.kind === "expanded"
                ? "More options"
                : c.kind === "reversed"
                  ? "Order reversed"
                  : c.label}
            </text>
            <line
              x1={x(base)}
              y1={y}
              x2={x(p)}
              y2={y}
              stroke="var(--line-strong)"
              strokeWidth="2"
            />
            {vals.length > 1 && (
              <line
                x1={x(Math.min(...vals))}
                y1={y}
                x2={x(Math.max(...vals))}
                y2={y}
                stroke="var(--accent)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}
            <circle
              cx={x(p)}
              cy={y}
              r="5.5"
              fill={i === 0 ? "var(--paper)" : "var(--accent)"}
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <text
              x={plotWidth}
              y={y + 4}
              textAnchor="end"
              className="plot-value"
            >
              {pct(p)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Results({ run }: { run: Run }) {
  const [tracked, setTracked] = useState(run.experiment.options[0].id);
  const [showDiff, setShowDiff] = useState(true);
  const [details, setDetails] = useState(false);
  const allOptions = Array.from(
    new Map(
      run.conditions.flatMap((c) => c.options).map((o) => [o.id, o]),
    ).values(),
  );
  const selected =
    run.experiment.options.find((o) => o.id === tracked) ??
    run.experiment.options[0];
  const baseWinners = winners(run, "original");
  const comparable = run.conditions.filter((c) => c.kind === "paraphrase");
  const flips = comparable.filter((c) => {
    const w = winners(run, c.id);
    return (
      w.length === 1 && baseWinners.length === 1 && w[0] !== baseWinners[0]
    );
  }).length;
  const cost = run.responses.every((r) => typeof r.usage?.cost === "number")
    ? run.responses.reduce((s, r) => s + r.usage!.cost!, 0)
    : undefined;
  return (
    <section className="results" aria-label="Comparison results">
      {run.sample && (
        <div className="sample-note">
          <FlaskConical size={14} aria-hidden="true" />
          <span>Illustrative · invented numbers, not model output</span>
          <span className="sr-only">
            These numbers are made up to show the interface.
          </span>
        </div>
      )}
      <div className="stats">
        <div>
          <div className="stat-number">
            {Math.round(maxWordingSwing(run) * 100)}
          </div>
          <span
            className="stat-caption"
            title="Largest probability range for any shared answer across the original and versions tagged as rewordings."
          >
            Largest swing, pp
          </span>
        </div>
        <div>
          <div className="stat-number">
            {flips}
            <span> of </span>
            {comparable.length}
          </div>
          <span className="stat-caption">Flips</span>
        </div>
      </div>
      {run.conditions.some((c) =>
        ["framing", "expanded", "reversed"].includes(c.kind),
      ) && (
        <p className="condition-legend">Tagged rows are excluded from swing</p>
      )}
      {run.experiment.options.length > 2 && (
        <div className="plot-header">
          <select
            id="track-option"
            aria-label="Track probability of"
            value={selected.id}
            onChange={(e) => setTracked(e.target.value)}
          >
            {run.experiment.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <ProbabilityPlot run={run} optionId={selected.id} />
      <p className="plot-footnote">
        {run.responses.length > 1
          ? `Mean of ${run.responses.length} runs · thick lines show observed range`
          : `Dotted line: original · tracking ${selected.label}`}
      </p>
      <div className="answer-heading">
        <h3>Answers by wording</h3>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
          />{" "}
          Show edits
        </label>
      </div>
      <div className="answer-list">
        {run.conditions.map((c, i) => {
          const leading = winners(run, c.id);
          const isFlip =
            leading.length === 1 &&
            baseWinners.length === 1 &&
            leading[0] !== baseWinners[0];
          const delta =
            meanProb(run, c.id, selected.id) -
            meanProb(run, "original", selected.id);
          return (
            <article className="answer" key={c.id}>
              <div className="answer-top">
                <div className="condition-label">
                  <span>
                    {String(i + 1).padStart(2, "0")} · {c.label}
                  </span>
                  {["framing", "expanded", "reversed"].includes(c.kind) && (
                    <span className="condition-tag">
                      {c.kind === "framing"
                        ? "Framing"
                        : c.kind === "expanded"
                          ? "+2 answers"
                          : "Reversed order"}
                    </span>
                  )}
                </div>
                <div className="answer-delta">
                  {leading.length > 1 && <span className="tie-label">Tie</span>}
                  {isFlip && <span className="flip-pill">Flip</span>}
                  {i > 0 && <span className="delta">{points(delta)}</span>}
                </div>
              </div>
              <p className="answer-question">
                {showDiff && c.kind !== "original" ? (
                  <Diff original={run.experiment.original} text={c.text} />
                ) : (
                  c.text
                )}
              </p>
              {c.options.length > 2 && (
                <div
                  className="distribution"
                  aria-label={`${c.label} answer distribution`}
                >
                  {allOptions
                    .filter((o) => c.options.some((co) => co.id === o.id))
                    .map((o) => {
                      const p = meanProb(run, c.id, o.id);
                      return (
                        <span
                          key={o.id}
                          title={`${o.label}: ${pct(p)}`}
                          style={{
                            width: `${p * 100}%`,
                            background:
                              colors[
                                allOptions.findIndex((a) => a.id === o.id)
                              ],
                          }}
                        />
                      );
                    })}
                </div>
              )}
              <div
                className={`distribution-legend ${c.options.length === 2 ? "binary-figures" : ""}`}
              >
                {allOptions
                  .filter((o) => c.options.some((co) => co.id === o.id))
                  .map((o) => (
                    <span
                      key={o.id}
                      className={leading.includes(o.id) ? "winning-answer" : ""}
                    >
                      {c.options.length > 2 && (
                        <i
                          style={{
                            background:
                              colors[
                                allOptions.findIndex((a) => a.id === o.id)
                              ],
                          }}
                        />
                      )}
                      {o.label}{" "}
                      <b>{Math.round(meanProb(run, c.id, o.id) * 100)}%</b>
                    </span>
                  ))}
              </div>
            </article>
          );
        })}
      </div>
      <div className="result-footer">
        <button
          className="text-button"
          aria-expanded={details}
          onClick={() => setDetails(!details)}
        >
          Details <ChevronDown size={16} className={details ? "rotated" : ""} />
        </button>
        <span>
          {run.sample
            ? "Illustrative · not model output"
            : [...new Set(run.responses.map((r) => r.model))].join(", ")}
        </span>
      </div>
      {details && (
        <div className="technical-details">
          {!run.sample && (
            <p>{`${run.responses.length} ${run.responses.length === 1 ? "run" : "runs"} · ${(run.durationMs / 1000).toFixed(2)}s${cost !== undefined ? ` · $${cost.toFixed(6)}` : ""}`}</p>
          )}
          <p>
            Probabilities describe the model’s allocation across the supplied
            answers. They do not establish whether a moral or political position
            is correct.
          </p>
          <p>
            “Wording swing” compares the original and versions tagged
            “Rewording.” A paraphrase can still change meaning; review the
            highlighted edits. Ties are not counted as flips.
          </p>
          <p>
            {run.sample
              ? "This example is synthetic and has no measured confidence."
              : `Model: ${[...new Set(run.responses.map((r) => r.model))].join(", ")}. ${new Date(run.createdAt).toLocaleString()}.`}
          </p>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const initial = useMemo(() => sampleRun(), []);
  const [experiment, setExperiment] = useState<Experiment>(() => {
    const saved = readStorage("draft", null);
    return isDraft(saved) ? saved : initial.experiment;
  });
  const [selectedRun, setRun] = useState<Run | null>(() => {
    const saved = readStorage("draft", null);
    return isDraft(saved) ? null : initial;
  });
  const [saved, setSaved] = useState(readSaved);
  const [history, setHistory] = useState(readHistory);
  const run = useMemo(
    () => selectedRun ?? findMatchingRun(experiment, history),
    [selectedRun, experiment, history],
  );
  const [dialog, setDialog] = useState<"sources" | "saved" | "request" | null>(
    null,
  );
  const [advanced, setAdvanced] = useState(false);
  const [repeats, setRepeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const originalRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const validError = validateExperiment(experiment);
  const count =
    1 +
    experiment.variants.filter((v) => v.text.trim()).length +
    Number(experiment.expanded) +
    Number(experiment.reversed);
  const savedCurrent = saved.some((s) => s.id === experiment.id);

  useEffect(() => {
    if (!writeStorage("draft", experiment))
      setNotice("Browser storage is full. Export your experiment to keep it.");
  }, [experiment]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => controller.current?.abort(), []);

  function change(patch: Partial<Experiment>) {
    setExperiment((e) => ({ ...e, ...patch }));
    setRun(null);
    setError("");
  }
  function openExperiment(e: Experiment, result: Run | null = null) {
    if (busy) return;
    setExperiment(structuredClone(e));
    setRun(result);
    setError("");
    setDialog(null);
  }
  function newQuestion() {
    openExperiment(blankExperiment());
    setTimeout(() => originalRef.current?.focus(), 0);
  }
  function changeMode(mode: Experiment["mode"]) {
    if (mode === experiment.mode) return;
    change({
      mode,
      options:
        mode === "binary"
          ? binaryOptions()
          : [
              { id: "option_1", label: "" },
              { id: "option_2", label: "" },
              { id: "option_3", label: "" },
            ],
    });
  }
  function addVariant() {
    change({
      variants: [
        ...experiment.variants,
        {
          id: `v${crypto.randomUUID().replaceAll("-", "")}`,
          text: experiment.original,
          kind: "paraphrase",
        },
      ],
    });
  }
  function saveExperiment() {
    if (validError) {
      setError(validError);
      return;
    }
    const next = [
      structuredClone(experiment),
      ...saved.filter((s) => s.id !== experiment.id),
    ].slice(0, 50);
    setSaved(next);
    if (writeStorage("saved", next))
      setNotice("Experiment saved on this device.");
    else setNotice("Could not save. Export your experiment to keep it.");
  }
  function exportData(value: Experiment | Run = run ?? experiment) {
    const data = {
      format: "inflection-v1",
      exportedAt: new Date().toISOString(),
      ...("responses" in value ? { run: value } : { experiment: value }),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `inflection-${"sample" in value && value.sample ? "illustrative-" : ""}${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error();
      const data = JSON.parse(await file.text());
      const e = data.experiment ?? data.run?.experiment;
      if (data.format !== "inflection-v1" || !isExperiment(e))
        throw new Error();
      openExperiment(e);
      setNotice("Experiment imported. Run it to get fresh probabilities.");
    } catch {
      setNotice("This file is not a valid Inflection experiment.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  async function runExperiment() {
    if (busy) return;
    if (validError) {
      setError(validError);
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setProgress(0);
    setError("");
    setRun(null);
    try {
      const result = await evaluate(
        structuredClone(experiment),
        repeats,
        abort.signal,
        setProgress,
      );
      setRun(result);
      const next = [result, ...history].slice(0, 20);
      setHistory(next);
      if (!writeStorage("history", next))
        setNotice(
          "Comparison complete. Export it to keep a copy; browser storage is full.",
        );
    } catch (err) {
      if (abort.signal.aborted) setNotice("Run canceled.");
      else if (err instanceof Error && err.name === "TimeoutError")
        setError("Jev took more than 45 seconds. Try again.");
      else
        setError(
          err instanceof TypeError
            ? "Could not reach Jev. Check your connection and try again."
            : err instanceof Error
              ? err.message
              : "The run failed. Try again.",
        );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <h1 className="brand">inflection</h1>
          <p>explore how wording changes jev’s answer probabilities</p>
        </div>
        <nav>
          <button
            className="text-button saved-nav"
            disabled={busy}
            onClick={() => setDialog("saved")}
          >
            Saved{" "}
            {saved.length > 0 && (
              <span className="count-badge">{saved.length}</span>
            )}
          </button>
        </nav>
      </header>
      <main className="layout">
        <nav className="example-chips" aria-label="Example questions">
          {seeds.map((s) => (
            <button
              disabled={busy}
              key={s.id}
              className="example-chip"
              aria-pressed={experiment.id === s.id}
              onClick={() => openExperiment(fromSeed(s))}
            >
              {s.title}
            </button>
          ))}
          <button
            className="example-chip"
            disabled={busy}
            aria-pressed={!seeds.some((s) => s.id === experiment.id)}
            onClick={newQuestion}
          >
            <Plus size={16} /> Your own question
          </button>
        </nav>
        <div className="workspace">
          <section className="editor" aria-label="Experiment editor">
            <div className="editor-heading">
              <input
                className="experiment-title"
                aria-label="Experiment title"
                maxLength={120}
                value={experiment.title}
                disabled={busy}
                onChange={(e) => change({ title: e.target.value })}
              />
              <div className="editor-actions">
                <button
                  disabled={busy}
                  className="icon-button"
                  aria-label="Save experiment"
                  title="Save experiment"
                  onClick={saveExperiment}
                >
                  {savedCurrent ? (
                    <Bookmark size={16} fill="currentColor" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                </button>
                <button
                  className="icon-button"
                  aria-label={run ? "Export comparison" : "Export experiment"}
                  title={run ? "Export comparison" : "Export experiment"}
                  onClick={() => exportData()}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
            <fieldset disabled={busy} className="editor-fieldset">
              <div className="format-row">
                <div className="segmented" aria-label="Answer format">
                  <button
                    type="button"
                    aria-pressed={experiment.mode === "binary"}
                    onClick={() => changeMode("binary")}
                  >
                    Yes / No
                  </button>
                  <button
                    type="button"
                    aria-pressed={experiment.mode === "multiple"}
                    onClick={() => changeMode("multiple")}
                  >
                    Multiple choice
                  </button>
                </div>
              </div>
              {experiment.mode === "multiple" && (
                <div className="option-editor">
                  <span className="field-label">Answer options</span>
                  {experiment.options.map((o, i) => (
                    <div className="option-input" key={o.id}>
                      <span style={{ color: colors[i] }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        aria-label={`Answer option ${i + 1}`}
                        maxLength={300}
                        placeholder={`Option ${i + 1}`}
                        value={o.label}
                        onChange={(e) =>
                          change({
                            options: experiment.options.map((a) =>
                              a.id === o.id
                                ? { ...a, label: e.target.value }
                                : a,
                            ),
                          })
                        }
                      />
                      <button
                        className="icon-button"
                        aria-label={`Remove answer option ${i + 1}`}
                        disabled={experiment.options.length <= 2}
                        onClick={() =>
                          change({
                            options: experiment.options.filter(
                              (a) => a.id !== o.id,
                            ),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {experiment.options.length < 8 && (
                    <button
                      className="text-button"
                      onClick={() =>
                        change({
                          options: [
                            ...experiment.options,
                            {
                              id: `option_${crypto.randomUUID().replaceAll("-", "")}`,
                              label: "",
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={14} /> Add answer option
                    </button>
                  )}
                </div>
              )}
              <div className="wording-row original-row">
                <div className="wording-row-top">
                  <label htmlFor="original">
                    <span className="wording-number">01</span> Original
                  </label>
                </div>
                <textarea
                  ref={originalRef}
                  id="original"
                  aria-label="Original question"
                  maxLength={3000}
                  rows={2}
                  placeholder="Should…?"
                  value={experiment.original}
                  onChange={(e) => change({ original: e.target.value })}
                />
              </div>
              <div className="variants-label">
                <h3>
                  Wordings <span>{experiment.variants.length} / 7</span>
                </h3>
                <button
                  className="text-button add-wording"
                  disabled={experiment.variants.length >= 7}
                  onClick={addVariant}
                >
                  <Plus size={16} /> Add a wording
                </button>
              </div>
              {experiment.variants.map((v, i) => (
                <div className="wording-row" key={v.id}>
                  <div className="wording-row-top">
                    <label htmlFor={v.id}>
                      <span className="wording-number">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                      <span className="sr-only">Wording {i + 1}</span>
                    </label>
                    <div className="variant-tools">
                      <button
                        className="text-button"
                        aria-label={`Wording ${i + 1} comparison type: ${v.kind === "framing" ? "Changed framing" : "Rewording"}`}
                        aria-pressed={v.kind === "framing"}
                        onClick={() =>
                          change({
                            variants: experiment.variants.map((a) =>
                              a.id === v.id
                                ? {
                                    ...a,
                                    kind:
                                      v.kind === "paraphrase"
                                        ? "framing"
                                        : "paraphrase",
                                  }
                                : a,
                            ),
                          })
                        }
                      >
                        {v.kind === "framing" ? "Changed framing" : "Rewording"}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove wording ${i + 1}`}
                        onClick={() =>
                          change({
                            variants: experiment.variants.filter(
                              (a) => a.id !== v.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    id={v.id}
                    aria-label={`Wording ${i + 1}`}
                    maxLength={3000}
                    rows={2}
                    placeholder="Change a word, a phrase, or the whole framing…"
                    value={v.text}
                    onChange={(e) =>
                      change({
                        variants: experiment.variants.map((a) =>
                          a.id === v.id ? { ...a, text: e.target.value } : a,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                className="advanced-toggle"
                aria-expanded={advanced}
                onClick={() => setAdvanced(!advanced)}
              >
                Controls{" "}
                <ChevronDown size={16} className={advanced ? "rotated" : ""} />
              </button>
              {advanced && (
                <div className="advanced-controls">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={experiment.expanded}
                      onChange={(e) => change({ expanded: e.target.checked })}
                    />
                    <span>
                      Extra answers: insufficient information, false premise
                    </span>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={experiment.reversed}
                      onChange={(e) => change({ reversed: e.target.checked })}
                    />
                    <span>Reversed answer order</span>
                  </label>
                  <label className="field-label" htmlFor="shared-context">
                    Shared context
                  </label>
                  <textarea
                    id="shared-context"
                    rows={3}
                    maxLength={12000}
                    placeholder="optional facts or assumptions, identical for every wording"
                    value={experiment.context}
                    onChange={(e) => change({ context: e.target.value })}
                  />
                  <button
                    className="text-button"
                    disabled={!!validError}
                    onClick={() => setDialog("request")}
                  >
                    View exact API request
                  </button>
                </div>
              )}
            </fieldset>
            <div className="run-bar">
              {busy ? (
                <button
                  className="primary-button"
                  onClick={() => controller.current?.abort()}
                >
                  Stop · {progress}/{repeats}
                </button>
              ) : (
                <button className="primary-button" onClick={runExperiment}>
                  <span>Run comparison</span>
                </button>
              )}
              <div
                className="segmented repeat-control"
                role="group"
                aria-label="Repeat each wording"
              >
                {[1, 3, 5].map((n) => (
                  <button
                    key={n}
                    disabled={busy}
                    aria-pressed={repeats === n}
                    onClick={() => setRepeats(n)}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
            </div>
            <div className="run-caption">
              {count} decisions{repeats > 1 ? ` × ${repeats} runs` : ""}
            </div>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
          </section>
          <div className="results-column">
            {run ? (
              <Results key={run.id} run={run} />
            ) : (
              <section className="results empty-results" aria-live="polite">
                <p>
                  {busy
                    ? `Evaluating ${count} decisions. Run ${Math.min(progress + 1, repeats)} of ${repeats}.`
                    : "Run a comparison to see probabilities"}
                </p>
                {!busy && (
                  <button
                    className="text-button sample-link"
                    onClick={() => {
                      const r = sampleRun();
                      openExperiment(r.experiment, r);
                    }}
                  >
                    View the example
                  </button>
                )}
              </section>
            )}
          </div>
        </div>
        <footer className="page-footer">
          <a href="https://bensonperry.com/">bensonperry.com</a>
          {" · "}
          <button className="text-button" onClick={() => setDialog("sources")}>
            Questions & method
          </button>
          {" · Jev 1.13 via OpenRouter · shared budget, 20 runs per minute"}
        </footer>
      </main>
      {dialog === "sources" && (
        <Modal title="Questions & method" close={() => setDialog(null)} wide>
          <div className="connection-info">
            <span>Model</span>
            <strong>TypeSafe / Jev 1.13</strong>
            <span>Access</span>
            <strong>20 runs per minute</strong>
            <p>
              Comparisons use a shared, capped budget; questions go through
              Inflection’s server to OpenRouter and TypeSafe; saved experiments
              stay in your browser.
            </p>
          </div>
          <p>
            If a version changes the meaning, tag it “Changed framing” to
            exclude it from wording swing.
          </p>
          <h3>What the experiment measures</h3>
          <p>
            Jev assigns probabilities to your answer options. Both yes/no and
            multiple-choice questions use its Choice primitive. Each wording is
            evaluated independently against the same context.
          </p>
          <p>
            Repeat runs show observed variability, not statistical confidence
            intervals. Controls use the original question and are excluded from
            wording swing.
          </p>
          <h3>Reading & sources</h3>
          <div className="sources-list">
            {sources.map((s) => (
              <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.publisher}</span>
                  <p>{s.note}</p>
                </div>
              </a>
            ))}
          </div>
        </Modal>
      )}
      {dialog === "saved" && (
        <Modal title="Your experiments" close={() => setDialog(null)} wide>
          <div className="saved-toolbar">
            <p>Saved on this device.</p>
            <button
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
            >
              <Plus size={15} /> Import JSON
            </button>
          </div>
          <h3>
            Saved questions <span className="muted">{saved.length}</span>
          </h3>
          {!saved.length && (
            <p className="muted">
              Use the bookmark on an experiment to keep it here.
            </p>
          )}
          <div className="saved-list">
            {saved.map((e) => (
              <div key={e.id}>
                <button onClick={() => openExperiment(e)}>
                  <strong>{e.title}</strong>
                  <span>{e.original}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove saved ${e.title}`}
                  onClick={() => {
                    const next = saved.filter((s) => s.id !== e.id);
                    setSaved(next);
                    writeStorage("saved", next);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <h3>
            Recent comparisons <span className="muted">{history.length}</span>
          </h3>
          {!history.length && (
            <p className="muted">Run a comparison to save its results here.</p>
          )}
          <div className="saved-list">
            {history.map((r) => (
              <div key={r.id}>
                <button onClick={() => openExperiment(r.experiment, r)}>
                  <strong>{r.experiment.title}</strong>
                  <span>
                    {new Date(r.createdAt).toLocaleString()} ·{" "}
                    {(maxWordingSwing(r) * 100).toFixed(1)} pp swing ·{" "}
                    {r.responses.length} runs{r.sample ? " · Illustrative" : ""}
                  </span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Export ${r.experiment.title} comparison`}
                  onClick={() => exportData(r)}
                >
                  <Download size={15} />
                </button>
              </div>
            ))}
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(e) => importData(e.target.files?.[0])}
          />
        </Modal>
      )}
      {dialog === "request" && (
        <Modal
          title="Exactly what Jev receives"
          close={() => setDialog(null)}
          wide
        >
          <pre className="request-preview">
            {!validError
              ? JSON.stringify(buildRequest(experiment), null, 2)
              : validError}
          </pre>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
