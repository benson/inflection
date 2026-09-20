import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import type { Experiment, Run } from "./types";
import {
  binaryOptions,
  blankExperiment,
  buildRequest,
  evaluate,
  findMatchingRun,
  fromSeed,
  maxWordingSwing,
  answerTally,
  meanProb,
  validateExperiment,
  winners,
  wordDiff,
} from "./engine";
import { seeds, sources } from "./seeds";
import { findRecordedRun, recordedRun } from "./recorded";
import {
  isDraft,
  isExperiment,
  readHistory,
  readStorage,
  writeStorage,
} from "./storage";

import { copyImage, decodeShare, downloadBlob, encodeShare } from "./share";

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
const pct = (n: number) => `${Math.round(n * 100)}%`;
function growTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
}

function WordingTextarea({
  inputRef,
  ...props
}: ComponentProps<"textarea"> & {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  useLayoutEffect(() => {
    if (ref.current) growTextarea(ref.current);
  }, [props.value, ref]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (width !== nextWidth) {
        width = nextWidth;
        growTextarea(element);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      onInput={(e) => growTextarea(e.currentTarget)}
    />
  );
}

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
  useLayoutEffect(() => {
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

function Diff({ before, text }: { before: string; text: string }) {
  const groups: ReturnType<typeof wordDiff> = [];
  for (const part of wordDiff(before, text)) {
    const previous = groups.at(-1);
    if (previous?.type === part.type) previous.text += part.text;
    else groups.push({ ...part });
  }
  return (
    <>
      {groups.map((part, i) => {
        const content = part.text.trimEnd();
        return (
          <Fragment key={i}>
            {part.type === "removed" ? (
              <del>{content}</del>
            ) : part.type === "added" ? (
              <mark>{content}</mark>
            ) : (
              content
            )}
            {part.text.slice(content.length)}
          </Fragment>
        );
      })}
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
  const conditions = run.conditions;
  const h = conditions.length * 24 + 32;
  const left = 32,
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
      {conditions.map((c, i) => {
        const p = meanProb(run, c.id, optionId),
          y = i * 24 + 12;
        const vals = run.responses.map(
          (r) => r.answers[c.id].probabilities[optionId] ?? 0,
        );
        return (
          <g key={c.id}>
            <text x="0" y={y + 4} className="plot-label">
              {c.label}
            </text>
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
              fill="var(--accent)"
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

function ResultDetails({
  experiment,
  run,
}: {
  experiment: Experiment;
  run?: Run;
}) {
  const cost = run?.responses.every((r) => typeof r.usage?.cost === "number")
    ? run.responses.reduce((s, r) => s + r.usage!.cost!, 0)
    : undefined;
  return (
    <details className="result-details">
      <summary className="result-footer">
        <span className="text-button">
          details <ChevronDown size={16} />
        </span>
        {run && <span>{run.responses[0].model}</span>}
      </summary>
      <div className="technical-details">
        {run && (
          <>
            {run.source === "local" && (
              <p>{`${(run.durationMs / 1000).toFixed(2)}s${cost !== undefined ? ` · $${cost.toFixed(6)}` : ""}`}</p>
            )}
            <p>
              Probabilities describe the model’s allocation across the supplied
              answers. They do not establish whether a moral or political
              position is correct.
            </p>
            <p>
              Largest swing is the largest range of mean probabilities for any
              answer across all wordings. Answers tally each wording’s winner;
              ties count as a tie. A paraphrase can still change meaning; review
              the highlighted edits.
            </p>
            <p>{`Model: ${run.responses[0].model}. ${new Date(run.createdAt).toLocaleString()}.`}</p>
          </>
        )}
        <h3 className="field-label">exact api request</h3>
        <pre className="request-preview">
          {JSON.stringify(run?.request ?? buildRequest(experiment), null, 2)}
        </pre>
      </div>
    </details>
  );
}

function Results({
  run,
  tracked,
  setTracked,
}: {
  run: Run;
  tracked: string;
  setTracked: (id: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const selected =
    run.experiment.options.find((o) => o.id === tracked) ??
    run.experiment.options[0];
  const date = new Date(run.createdAt)
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase()
    .replace("sept", "sep");
  const tag =
    run.source === "recorded"
      ? `recorded ${date} · mean of ${run.responses.length} runs`
      : run.source === "shared"
        ? `shared link · ${date}`
        : `your run · ${run.responses.length > 1 ? `${run.responses.length} repeats` : "just now"}`;
  return (
    <section className="results" aria-label="Comparison results">
      <div className="result-source">{tag}</div>
      <div className="stats">
        <div className="swing-stat">
          <span className="stat-number">
            {Math.round(maxWordingSwing(run) * 100)}
          </span>
          <span
            className="stat-caption"
            title="Largest range of mean probabilities for any answer across all wordings."
          >
            pp largest swing
          </span>
        </div>
        <div className="tally-stat">
          <div className="answer-tally">
            {answerTally(run).map((answer, i) => (
              <Fragment key={answer.id}>
                {i > 0 && " · "}
                <span>
                  {run.experiment.mode === "binary"
                    ? answer.label.toLowerCase()
                    : answer.label}{" "}
                  <span className="tally-number">{answer.count}</span>
                </span>
              </Fragment>
            ))}
          </div>
          <span className="stat-caption">answers</span>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
          />{" "}
          show edits
        </label>
      </div>
      {run.experiment.options.length > 2 && (
        <div className="plot-header">
          <select
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
      {run.responses.length > 1 && (
        <p className="plot-footnote">thick lines show the observed range</p>
      )}
      <div className="answer-list">
        {run.conditions.map((c) => {
          const leading = winners(run, c.id);
          const binary = c.options.length === 2;
          const figures = (
            <div
              className={`distribution-legend ${binary ? "binary-figures" : ""}`}
            >
              {c.options.map((o) => (
                <span
                  key={o.id}
                  className={leading.includes(o.id) ? "winning-answer" : ""}
                >
                  {o.label}{" "}
                  <b>
                    {Math.round(meanProb(run, c.id, o.id) * 100)}
                    {binary ? "" : "%"}
                  </b>
                </span>
              ))}
              {leading.length > 1 && <span className="answer-tie">tie</span>}
            </div>
          );
          return (
            <article className="answer" key={c.id}>
              <span className="answer-number">{c.label}</span>
              <div className="answer-copy">
                <p className="answer-question">
                  {showDiff && c.id !== "w1" ? (
                    <Diff
                      before={run.experiment.wordings[0].text}
                      text={c.text}
                    />
                  ) : (
                    c.text
                  )}
                </p>
                {!binary && (
                  <div className="answer-distribution">
                    <div className="distribution-bar" aria-hidden="true">
                      {c.options.map((o, i) => (
                        <span
                          key={o.id}
                          style={{
                            width: `${meanProb(run, c.id, o.id) * 100}%`,
                            backgroundColor: colors[i],
                          }}
                        />
                      ))}
                    </div>
                    {figures}
                  </div>
                )}
              </div>
              {binary && figures}
            </article>
          );
        })}
      </div>
      <ResultDetails experiment={run.experiment} run={run} />
    </section>
  );
}

export default function App({
  shared,
}: {
  shared: { experiment: Experiment; run: Run | null } | null;
}) {
  const initial = useMemo(() => recordedRun(seeds[0].id)!, []);
  const [sharedQuestion, setSharedQuestion] = useState(shared);
  const [sharedSelected, setSharedSelected] = useState(!!shared);
  const [experiment, setExperiment] = useState<Experiment>(() => {
    const draft = readStorage("draft", null);
    return shared?.experiment ?? (isDraft(draft) ? draft : initial.experiment);
  });
  const [selectedRun, setRun] = useState<Run | null>(() => {
    const draft = readStorage("draft", null);
    return shared?.run ?? (isDraft(draft) || shared ? null : initial);
  });
  const [history, setHistory] = useState(readHistory);
  const run = useMemo(
    () =>
      selectedRun ??
      findMatchingRun(experiment, history) ??
      findRecordedRun(experiment),
    [selectedRun, experiment, history],
  );
  const [dialog, setDialog] = useState<"about" | "history" | null>(null);
  const [tracked, setTracked] = useState("");
  const [repeats, setRepeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const wordingRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const validError = validateExperiment(experiment);
  const count = experiment.wordings.filter((w) => w.text.trim()).length;

  useEffect(() => {
    if (!writeStorage("draft", experiment))
      setNotice(
        "Browser storage is full. Copy a link to keep this comparison.",
      );
  }, [experiment]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    let active = true;
    const restoreLink = async () => {
      if (busy) return;
      const hash = window.location.hash;
      const result = await decodeShare(hash);
      if (!active || !result || window.location.hash !== hash) return;
      setSharedQuestion(result);
      setSharedSelected(true);
      setExperiment(result.experiment);
      setRun(result.run);
      setTracked("");
      setError("");
      setDialog(null);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    };
    window.addEventListener("hashchange", restoreLink);
    return () => {
      active = false;
      window.removeEventListener("hashchange", restoreLink);
    };
  }, [busy]);

  function change(patch: Partial<Experiment>) {
    setExperiment((e) => ({ ...e, ...patch }));
    if (Object.keys(patch).some((key) => key !== "title")) setRun(null);
    setError("");
  }
  function openExperiment(
    e: Experiment,
    result: Run | null = null,
    isShared = false,
  ) {
    if (busy) return;
    setSharedSelected(isShared);
    setExperiment(structuredClone(e));
    setRun(result);
    setTracked("");
    setError("");
    setDialog(null);
  }
  function newQuestion() {
    openExperiment(blankExperiment());
    setTimeout(() => wordingRef.current?.focus(), 0);
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
  function addWording() {
    change({
      wordings: [
        ...experiment.wordings,
        { id: `w${experiment.wordings.length + 1}`, text: "" },
      ],
    });
  }
  function exportData(value: Run) {
    downloadBlob(
      new Blob(
        [
          JSON.stringify(
            {
              format: "inflection-v2",
              exportedAt: new Date().toISOString(),
              run: value,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      `inflection-${value.createdAt.slice(0, 10)}.json`,
    );
  }
  async function shareLink() {
    try {
      const url = new URL(window.location.href);
      url.hash = `s=${await encodeShare(experiment, run)}`;
      await navigator.clipboard.writeText(url.href);
      setNotice("link copied");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not copy the link.",
      );
    }
  }
  async function shareImage() {
    if (!run) return;
    try {
      setNotice(await copyImage(experiment, run, tracked));
    } catch {
      setNotice("Could not create the image.");
    }
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error();
      const data = JSON.parse(await file.text());
      const e = data.experiment ?? data.run?.experiment;
      if (data.format !== "inflection-v2" || !isExperiment(e))
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
            className="text-button about-nav"
            onClick={() => setDialog("about")}
          >
            how this works
          </button>
          <button
            className="text-button history-nav"
            disabled={busy}
            onClick={() => setDialog("history")}
          >
            history{" "}
            {history.length > 0 && (
              <span className="count-badge">{history.length}</span>
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
              aria-pressed={!sharedSelected && experiment.id === s.id}
              onClick={() => openExperiment(fromSeed(s))}
            >
              {s.title}
            </button>
          ))}
          {sharedQuestion && (
            <button
              className="example-chip"
              disabled={busy}
              aria-pressed={sharedSelected}
              onClick={() =>
                openExperiment(
                  sharedQuestion.experiment,
                  sharedQuestion.run,
                  true,
                )
              }
            >
              shared question
            </button>
          )}
          <button
            className="example-chip"
            disabled={busy}
            aria-pressed={
              !sharedSelected && !seeds.some((s) => s.id === experiment.id)
            }
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
                placeholder="name this comparison"
                maxLength={120}
                value={experiment.title}
                disabled={busy}
                onChange={(e) => change({ title: e.target.value })}
              />
              <div className="editor-actions">
                <button
                  className="text-button"
                  disabled={busy || !run}
                  onClick={shareImage}
                >
                  copy image
                </button>
                <button
                  className="text-button"
                  disabled={busy || !!validError}
                  onClick={shareLink}
                >
                  copy link
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
              <div className="wordings-label">
                <h3>
                  wordings <span>{experiment.wordings.length} / 8</span>
                </h3>
                <button
                  className="text-button add-wording"
                  disabled={experiment.wordings.length >= 8}
                  onClick={addWording}
                >
                  <Plus size={16} /> add a wording
                </button>
              </div>
              {experiment.wordings.map((w, i) => (
                <div className="wording-row" key={w.id}>
                  <label className="wording-number" htmlFor={w.id}>
                    {i + 1}
                  </label>
                  <WordingTextarea
                    inputRef={i === 0 ? wordingRef : undefined}
                    id={w.id}
                    aria-label={`Wording ${i + 1}`}
                    maxLength={3000}
                    placeholder="write a wording…"
                    value={w.text}
                    onChange={(e) =>
                      change({
                        wordings: experiment.wordings.map((a) =>
                          a.id === w.id ? { ...a, text: e.target.value } : a,
                        ),
                      })
                    }
                  />
                  <button
                    className="icon-button"
                    aria-label={`Remove wording ${i + 1}`}
                    disabled={experiment.wordings.length <= 2}
                    onClick={() =>
                      change({
                        wordings: experiment.wordings
                          .filter((a) => a.id !== w.id)
                          .map((a, j) => ({ ...a, id: `w${j + 1}` })),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <details className="shared-context">
                <summary className="context-toggle">
                  shared context <ChevronDown size={16} />
                </summary>
                <div className="context-editor">
                  <textarea
                    id="shared-context"
                    aria-label="Shared context"
                    rows={3}
                    maxLength={12000}
                    placeholder="optional facts or assumptions, identical for every wording"
                    value={experiment.context}
                    onChange={(e) => change({ context: e.target.value })}
                  />
                </div>
              </details>
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
                aria-label="Repeats"
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
              <Results
                key={run.id}
                run={run}
                tracked={tracked}
                setTracked={setTracked}
              />
            ) : (
              <section className="results empty-results" aria-live="polite">
                <p>
                  {busy
                    ? `Evaluating ${count} decisions. Run ${Math.min(progress + 1, repeats)} of ${repeats}.`
                    : "Run a comparison to see probabilities"}
                </p>
                {!busy && (
                  <button
                    className="text-button recorded-link"
                    onClick={() => {
                      const r = recordedRun(seeds[0].id)!;
                      openExperiment(r.experiment, r);
                    }}
                  >
                    View the example
                  </button>
                )}
                {!validError && <ResultDetails experiment={experiment} />}
              </section>
            )}
          </div>
        </div>
        <footer className="page-footer">
          <a href="https://bensonperry.com/">bensonperry.com</a>
          {" · "}
          <button className="text-button" onClick={() => setDialog("about")}>
            Questions & method
          </button>
          {" · Jev 1.13 via OpenRouter · shared budget, 20 runs per minute"}
        </footer>
      </main>
      {dialog === "about" && (
        <Modal title="how this works" close={() => setDialog(null)} wide>
          <div className="about-intro">
            <p>
              jev is{" "}
              <a
                href="https://typesafe.ai/blog/introducing-system-one-models-and-jev"
                target="_blank"
                rel="noreferrer"
              >
                a new kind of model
              </a>
              . instead of writing a reply, it returns probabilities over a
              fixed set of answers you give it.
            </p>
            <p>
              so it can't decline, hedge, or pile on caveats. ask it a yes/no
              question and all it can do is say how much yes and how much no.
            </p>
            <p>
              that's what makes it fun. ask a chat model a spicy question and
              you get a careful essay, or a refusal, and you'd need a second
              model to turn the essay back into a number. jev just gives you the
              number.
            </p>
            <p>
              you'd expect a computer to read the same question the same way
              however you phrase it. it doesn't. reno is west of los angeles.
              ask "is reno farther west than los angeles" and jev says 33% yes.
              ask "is los angeles farther east than reno" and it says 69%. same
              fact, same words, different order.
            </p>
            <p>
              this isn't noise on questions with no answer. on settled facts,
              monty hall, the birthday problem, nuclear versus coal, jev doesn't
              move a point however you phrase it. the flips happen where the
              model is unsure of a fact, and it doesn't tell you it's unsure.
              the number just moves.
            </p>
            <p>
              two questions that mean the same thing to a person should get the
              same answer from one model of the world, even if not the same
              digits. typesafe's docs say not to expect arithmetic consistency
              between separately asked questions. this site is what that looks
              like in practice.
            </p>
            <p>
              this doesn't happen on every question. in a screen of about forty
              questions, most didn't move at all, and the examples here are the
              ones that did. the point is that it can happen, on edits you
              didn't mean anything by.
            </p>
            <p>
              none of this is a knock on jev. it's a genuinely useful tool, and
              being able to see this at all is the point. try the examples or
              write your own. it runs on my shared budget, so go easy.
            </p>
          </div>
          <hr className="about-divider" />
          <p>
            <a
              href="https://docs.typesafe.ai/model-jaggedness/jev-1.13"
              target="_blank"
              rel="noreferrer"
            >
              TypeSafe documents
            </a>{" "}
            that Jev reads instructions literally and that answers to separately
            asked questions are not held to arithmetic identities. The wording
            swing here is exactly such an identity. The numbers measure how
            large that gap gets on questions a person would call the same.
          </p>
          <h3>What the experiment measures</h3>
          <p>
            Jev assigns probabilities to your answer options. Both yes/no and
            multiple-choice questions use its Choice primitive. Each wording is
            evaluated independently against the same context.
          </p>
          <p>
            Largest swing is the largest range of mean probabilities for any
            answer across wordings 1 to N. Answers tally each wording’s winner;
            ties count as a tie.
          </p>
          <p>
            Repeat runs show observed variability, not statistical confidence
            intervals. A paraphrase can still change meaning; review the edits.
          </p>
          <div className="connection-info">
            <span>Model</span>
            <strong>TypeSafe / Jev 1.13</strong>
            <span>Access</span>
            <strong>20 runs per minute</strong>
            <p>
              Comparisons use a shared, capped budget; questions go through
              Inflection’s server to OpenRouter and TypeSafe; recent runs stay
              in your browser.
            </p>
          </div>
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
      {dialog === "history" && (
        <Modal title="history" close={() => setDialog(null)} wide>
          <div className="history-toolbar">
            <p>This browser’s 20 most recent runs.</p>
            <button
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
            >
              <Plus size={15} /> import json
            </button>
          </div>
          <h3>
            Recent comparisons <span className="muted">{history.length}</span>
          </h3>
          {!history.length && (
            <p className="muted">Run a comparison to save its results here.</p>
          )}
          <div className="history-list">
            {history.map((r) => (
              <div key={r.id}>
                <button onClick={() => openExperiment(r.experiment, r)}>
                  <strong>{r.experiment.title}</strong>
                  <span>
                    {new Date(r.createdAt).toLocaleString()} ·{" "}
                    {Math.round(maxWordingSwing(r) * 100)} pp swing ·{" "}
                    {r.responses.length} runs
                  </span>
                </button>
                <button
                  className="text-button"
                  aria-label={`export json: ${r.experiment.title}`}
                  onClick={() => exportData(r)}
                >
                  export json
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
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
