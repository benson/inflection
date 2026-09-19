import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FlaskConical,
  FolderHeart,
  KeyRound,
  Library,
  Plus,
  Search,
  Shuffle,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { Experiment, Run } from "./types";
import {
  binaryOptions,
  blankExperiment,
  buildRequest,
  evaluate,
  fromSeed,
  maxWordingSwing,
  meanProb,
  validateExperiment,
  winners,
  wordDiff,
} from "./engine";
import { categories, curatedDate, seeds, sources } from "./seeds";
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
  "#3e6655",
  "#bc785b",
  "#688aab",
  "#b39b53",
  "#8c75a7",
  "#629a95",
  "#aa6680",
  "#777e8b",
  "#99a39c",
  "#707671",
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
          <X size={19} />
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
  const base = meanProb(run, "original", optionId);
  const conditions = run.conditions;
  const h = conditions.length * 51 + 40;
  const left = 119,
    width = 217;
  const x = (p: number) => left + p * width;
  return (
    <svg
      className="probability-plot"
      viewBox={`0 0 388 ${h}`}
      role="img"
      aria-label="Probability by wording on a common zero to one hundred percent scale"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={x(p)}
            y1="19"
            x2={x(p)}
            y2={h - 30}
            stroke="#e5e6df"
            strokeDasharray={p === 0.5 ? "3 4" : undefined}
          />
          <text x={x(p)} y={h - 10} textAnchor="middle" className="axis-label">
            {p * 100}%
          </text>
        </g>
      ))}
      <line
        x1={x(base)}
        y1="20"
        x2={x(base)}
        y2={h - 30}
        stroke="#708877"
        strokeDasharray="2 4"
      />
      {conditions.map((c, i) => {
        const p = meanProb(run, c.id, optionId),
          y = i * 51 + 30;
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
              stroke="#b3bfb3"
              strokeWidth="2"
            />
            {vals.length > 1 && (
              <line
                x1={x(Math.min(...vals))}
                y1={y}
                x2={x(Math.max(...vals))}
                y2={y}
                stroke="#3e6655"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}
            <circle
              cx={x(p)}
              cy={y}
              r="5.5"
              fill={i === 0 ? "#f7f6f2" : "#3e6655"}
              stroke="#3e6655"
              strokeWidth="2"
            />
            <text x="388" y={y + 4} textAnchor="end" className="plot-value">
              {pct(p)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Results({ run, onExport }: { run: Run; onExport: () => void }) {
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
      <div className="section-heading">
        <span className="eyebrow">THE DIFFERENCE</span>
        <button
          className="icon-button"
          onClick={onExport}
          aria-label="Export comparison"
        >
          <Download size={17} />
        </button>
      </div>
      {run.sample && (
        <div className="sample-note">
          <FlaskConical size={16} />
          <span>
            <strong>Illustrative example</strong>These numbers are made up to
            show the interface.
          </span>
        </div>
      )}
      <div className="stats">
        <div>
          <div className="stat-number">
            {(maxWordingSwing(run) * 100).toFixed(1)}
            <span> pp</span>
          </div>
          <span
            className="stat-caption"
            title="Largest probability range for any shared answer across the original and versions tagged as rewordings."
          >
            Largest wording swing
          </span>
        </div>
        <div>
          <div className="stat-number">
            {flips}
            <span> / {comparable.length}</span>
          </div>
          <span className="stat-caption">Rewordings flip the answer</span>
        </div>
      </div>
      <div className="plot-header">
        <label htmlFor="track-option">Track probability of</label>
        <select
          id="track-option"
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
      <ProbabilityPlot run={run} optionId={selected.id} />
      <p className="plot-footnote">
        {run.responses.length > 1
          ? `Mean of ${run.responses.length} runs. Thick lines show the observed range.`
          : "Dotted line marks the original. Changes are percentage points."}
      </p>
      <div className="answer-heading">
        <h3>Every wording. Every answer.</h3>
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
                <span className="small-caps">
                  {String(i + 1).padStart(2, "0")} / {c.label}
                </span>
                {i > 0 && <span className="delta">{points(delta)}</span>}
              </div>
              <p className="answer-question">
                {showDiff && c.kind !== "original" ? (
                  <Diff original={run.experiment.original} text={c.text} />
                ) : (
                  c.text
                )}
              </p>
              {["framing", "expanded", "reversed"].includes(c.kind) && (
                <span className="condition-note">
                  {c.kind === "framing"
                    ? "Different framing · excluded from wording swing"
                    : c.kind === "expanded"
                      ? "Answer set changed · excluded from wording swing"
                      : "Option-order control · excluded from wording swing"}
                </span>
              )}
              <div className="answer-winner">
                <strong>
                  {leading.length === 1
                    ? c.options.find((o) => o.id === leading[0])?.label
                    : "Tie"}
                </strong>
                {isFlip && <span className="flip-pill">Answer changed</span>}
              </div>
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
                            colors[allOptions.findIndex((a) => a.id === o.id)],
                        }}
                      />
                    );
                  })}
              </div>
              <div className="distribution-legend">
                {allOptions
                  .filter((o) => c.options.some((co) => co.id === o.id))
                  .map((o) => (
                    <span key={o.id}>
                      <i
                        style={{
                          background:
                            colors[allOptions.findIndex((a) => a.id === o.id)],
                        }}
                      />
                      {o.label}
                      <b>{pct(meanProb(run, c.id, o.id))}</b>
                    </span>
                  ))}
              </div>
            </article>
          );
        })}
      </div>
      <div className="result-footer">
        <span>
          {run.sample
            ? "Simulated · not model output"
            : `${run.responses.length} ${run.responses.length === 1 ? "run" : "runs"} · ${(run.durationMs / 1000).toFixed(2)}s${cost !== undefined ? ` · $${cost.toFixed(6)}` : ""}`}
        </span>
        <button className="text-button" onClick={() => setDetails(!details)}>
          Details <ChevronDown size={14} />
        </button>
      </div>
      {details && (
        <div className="technical-details">
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
          <p>
            Every question is evaluated against the same shared context. No
            stance, safety, or persona instructions are added. The API receives
            exactly the question text and answer labels you see.
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
  const [run, setRun] = useState<Run | null>(() => {
    const saved = readStorage("draft", null);
    return isDraft(saved) ? null : initial;
  });
  const [saved, setSaved] = useState(readSaved);
  const [history, setHistory] = useState(readHistory);
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [dialog, setDialog] = useState<
    "connection" | "sources" | "saved" | "request" | null
  >(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showLibrary, setShowLibrary] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [repeats, setRepeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const originalRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mobileLibrary = useRef<HTMLDialogElement>(null);
  const [libraryLimit, setLibraryLimit] = useState(30);
  const filtered = seeds.filter(
    (s) =>
      (category === "All topics" || s.category === category) &&
      (typeFilter === "all" ||
        (typeFilter === "multiple" ? !!s.options : !s.options)) &&
      `${s.title} ${s.question} ${s.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
    setLibraryLimit(30);
  }, [query, category, typeFilter]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (showLibrary) mobileLibrary.current?.showModal();
    else mobileLibrary.current?.close();
  }, [showLibrary]);
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
    setShowLibrary(false);
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
    if (!apiKey) {
      setDialog("connection");
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
        apiKey,
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
            ? "Could not reach OpenRouter. Check your connection and try again."
            : err instanceof Error
              ? err.message
              : "The run failed. Try again.",
        );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }

  const library = (
    <>
      <div className="library-heading">
        <Library size={17} />
        <h2>Question library</h2>
        <span>{seeds.length}</span>
      </div>
      <div className="search-field">
        <Search size={16} />
        <input
          aria-label="Search questions"
          placeholder="Find a question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="library-filters">
        <select
          aria-label="Filter by topic"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All topics</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filter by question type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All formats</option>
          <option value="binary">Yes / No</option>
          <option value="multiple">Multiple choice</option>
        </select>
      </div>
      <div className="library-meta">
        <span role="status">
          {filtered.length} {filtered.length === 1 ? "question" : "questions"}
        </span>
        <button
          className="text-button"
          disabled={busy || !filtered.length}
          onClick={() =>
            openExperiment(
              fromSeed(filtered[Math.floor(Math.random() * filtered.length)]),
            )
          }
        >
          <Shuffle size={13} /> Surprise me
        </button>
      </div>
      <div className="library-list">
        {filtered.slice(0, libraryLimit).map((s) => (
          <button
            disabled={busy}
            key={s.id}
            className={`library-item ${experiment.id === s.id ? "selected" : ""}`}
            onClick={() => openExperiment(fromSeed(s))}
          >
            <span className="library-item-category">
              {s.category}
              {s.options && <span className="mc-tag">MC</span>}
            </span>
            <span className="library-item-title">{s.title}</span>
            <span className="library-item-question">{s.question}</span>
            <span className="library-item-bottom">
              3 wordings <ArrowRight size={13} />
            </span>
          </button>
        ))}
        {!filtered.length && (
          <div className="no-matches">
            <p>No questions found.</p>
            <button
              className="text-button"
              onClick={() => {
                setQuery("");
                setCategory("All topics");
                setTypeFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        {filtered.length > libraryLimit && (
          <button
            className="load-more"
            onClick={() => setLibraryLimit((n) => n + 30)}
          >
            Show more questions <ChevronDown size={15} />
          </button>
        )}
      </div>
      <button
        className="library-sources"
        onClick={() => {
          setShowLibrary(false);
          setDialog("sources");
        }}
      >
        Curated September 2026 <ExternalLink size={12} />
      </button>
    </>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label="Inflection home"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M5 25C17 25 14 7 27 7M5 16C15 16 18 23 27 23" />
          </svg>
          inflection<span className="brand-dot">.</span>
        </a>
        <div className="brand-description">A WORDING EXPERIMENT</div>
        <nav>
          <button
            className="quiet-button saved-nav"
            disabled={busy}
            onClick={() => setDialog("saved")}
          >
            <FolderHeart size={16} /> Saved{" "}
            {saved.length > 0 && (
              <span className="count-badge">{saved.length}</span>
            )}
          </button>
          <button
            className={`connection-button ${apiKey ? "connected" : ""}`}
            disabled={busy}
            onClick={() => {
              setKeyDraft("");
              setDialog("connection");
            }}
          >
            <span className="status-dot" />
            {apiKey ? "Key connected" : "Connect OpenRouter"}
            <KeyRound size={14} />
          </button>
        </nav>
      </header>
      <div className="layout">
        <aside className="library-panel">{library}</aside>
        <main>
          <div className="intro">
            <div>
              <div className="eyebrow">SMALL EDITS. DIFFERENT ANSWERS.</div>
              <h1>Every word has a weight.</h1>
              <p>Change the question. See where Jev changes its mind.</p>
            </div>
            <button
              className="secondary-button new-question"
              disabled={busy}
              onClick={newQuestion}
            >
              <Plus size={16} /> Your own question
            </button>
          </div>
          <div className="mobile-tools">
            <button
              className="secondary-button"
              onClick={() => setShowLibrary(true)}
            >
              <Library size={16} /> Browse {seeds.length} questions
            </button>
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() => setDialog("saved")}
            >
              <Bookmark size={16} /> Saved
            </button>
          </div>
          <div className="workspace">
            <section className="editor" aria-label="Experiment editor">
              <div className="experiment-meta">
                <span className="topic-pill">{experiment.category}</span>
                <div className="editor-actions">
                  <button
                    disabled={busy}
                    className="icon-button"
                    aria-label="Save experiment"
                    title="Save experiment"
                    onClick={saveExperiment}
                  >
                    {savedCurrent ? (
                      <Bookmark size={17} fill="currentColor" />
                    ) : (
                      <Bookmark size={17} />
                    )}
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Export experiment"
                    title="Export experiment"
                    onClick={() => exportData(experiment)}
                  >
                    <Download size={17} />
                  </button>
                </div>
              </div>
              <input
                className="experiment-title"
                aria-label="Experiment title"
                maxLength={120}
                value={experiment.title}
                disabled={busy}
                onChange={(e) => change({ title: e.target.value })}
              />
              <fieldset disabled={busy} className="editor-fieldset">
                <div className="format-row">
                  <span className="field-label">Answer format</span>
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
                    <span className="field-label">Shared answer options</span>
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
                <div className="wording-card original-card">
                  <div className="wording-card-top">
                    <label htmlFor="original">
                      <span className="wording-number">01</span> Original
                      question
                    </label>
                    <span className="baseline-pill">Baseline</span>
                  </div>
                  <textarea
                    ref={originalRef}
                    id="original"
                    maxLength={3000}
                    rows={3}
                    placeholder="Should…?"
                    value={experiment.original}
                    onChange={(e) => change({ original: e.target.value })}
                  />
                </div>
                <div className="variants-label">
                  <h3>Try another way of asking.</h3>
                  <span>{experiment.variants.length} / 7</span>
                </div>
                {experiment.variants.map((v, i) => (
                  <div className="wording-card variant-card" key={v.id}>
                    <div className="wording-card-top">
                      <label htmlFor={v.id}>
                        <span className="wording-number">
                          {String(i + 2).padStart(2, "0")}
                        </span>{" "}
                        Wording {i + 1}
                      </label>
                      <div className="variant-tools">
                        <select
                          aria-label={`Wording ${i + 1} comparison type`}
                          value={v.kind}
                          onChange={(e) =>
                            change({
                              variants: experiment.variants.map((a) =>
                                a.id === v.id
                                  ? {
                                      ...a,
                                      kind: e.target.value as
                                        "paraphrase" | "framing",
                                    }
                                  : a,
                              ),
                            })
                          }
                        >
                          <option value="paraphrase">Rewording</option>
                          <option value="framing">Changed framing</option>
                        </select>
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
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      id={v.id}
                      aria-label={`Wording ${i + 1}`}
                      maxLength={3000}
                      rows={3}
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
                    {v.text && v.text !== experiment.original && (
                      <div
                        className="inline-diff"
                        aria-label={`Edits in wording ${i + 1}`}
                      >
                        <Diff original={experiment.original} text={v.text} />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="add-wording"
                  disabled={experiment.variants.length >= 7}
                  onClick={addVariant}
                >
                  <Plus size={16} /> Add a wording{" "}
                  <span>Starts with the original</span>
                </button>
                <button
                  className="advanced-toggle"
                  aria-expanded={advanced}
                  onClick={() => setAdvanced(!advanced)}
                >
                  <SlidersHorizontal size={15} /> Experiment controls{" "}
                  <ChevronDown
                    size={15}
                    className={advanced ? "rotated" : ""}
                  />
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
                        Add a control with “Insufficient information” and “False
                        premise”
                      </span>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={experiment.reversed}
                        onChange={(e) => change({ reversed: e.target.checked })}
                      />
                      <span>Add a control with reversed answer order</span>
                    </label>
                    <label className="field-label" htmlFor="shared-context">
                      Shared context
                    </label>
                    <textarea
                      id="shared-context"
                      rows={3}
                      maxLength={12000}
                      placeholder="Optional facts or assumptions, kept identical for every wording."
                      value={experiment.context}
                      onChange={(e) => change({ context: e.target.value })}
                    />
                    <p>
                      Controls use the original question. Changed framing and
                      control rows are excluded from the wording-swing
                      statistic.
                    </p>
                    <button
                      className="text-button"
                      disabled={!!validError}
                      onClick={() => setDialog("request")}
                    >
                      View exact API request <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </fieldset>
              <div className="run-bar">
                <div className="repeat-control">
                  <label htmlFor="repeat-count">Repeat each wording</label>
                  <select
                    id="repeat-count"
                    disabled={busy}
                    value={repeats}
                    onChange={(e) => setRepeats(Number(e.target.value))}
                  >
                    <option value={1}>1 time</option>
                    <option value={3}>3 times</option>
                    <option value={5}>5 times</option>
                  </select>
                </div>
                {busy ? (
                  <button
                    className="primary-button"
                    onClick={() => controller.current?.abort()}
                  >
                    <Square size={14} /> Stop · {progress}/{repeats}
                  </button>
                ) : (
                  <button className="primary-button" onClick={runExperiment}>
                    <span>Run comparison</span>
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
              <div className="run-caption">
                <span>
                  {count} decisions × {repeats} {repeats === 1 ? "run" : "runs"}
                </span>
                <span>Jev 1.13 via OpenRouter</span>
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
                  onExport={() => exportData(run)}
                />
              ) : (
                <section className="results empty-results" aria-live="polite">
                  <div className="eyebrow">THE DIFFERENCE</div>
                  <div className="empty-graphic" aria-hidden="true">
                    <svg viewBox="0 0 240 120">
                      <path
                        d="M20 30H220M20 60H220M20 90H220"
                        stroke="#e0e4dc"
                      />
                      <path
                        d="M93 20V105"
                        stroke="#8ca591"
                        strokeDasharray="3 5"
                      />
                      <path
                        d="M93 30H93M93 60H141M93 90H61"
                        stroke="#9fb49f"
                        strokeWidth="2"
                      />
                      <circle
                        cx="93"
                        cy="30"
                        r="6"
                        fill="#f7f6f2"
                        stroke="#476c59"
                        strokeWidth="2"
                      />
                      <circle cx="141" cy="60" r="6" fill="#476c59" />
                      <circle cx="61" cy="90" r="6" fill="#476c59" />
                    </svg>
                  </div>
                  <h2>
                    {busy
                      ? "A question of wording…"
                      : "Find the tipping point."}
                  </h2>
                  <p>
                    {busy
                      ? `Evaluating ${count} decisions. Run ${Math.min(progress + 1, repeats)} of ${repeats}.`
                      : "Compare your wordings to see probability shifts, answer flips, and the words that changed."}
                  </p>
                  {!busy && !apiKey && (
                    <button
                      className="secondary-button"
                      onClick={() => setDialog("connection")}
                    >
                      <KeyRound size={15} /> Connect to run Jev
                    </button>
                  )}
                  {!busy && (
                    <button
                      className="text-button sample-link"
                      onClick={() => {
                        const r = sampleRun();
                        openExperiment(r.experiment, r);
                      }}
                    >
                      Explore an illustrative example <ArrowRight size={14} />
                    </button>
                  )}
                </section>
              )}
              <div className="margin-note">
                <span>∵</span>
                <p>
                  A decisive answer can still be uncertain.
                  <br />
                  Keep an eye on the whole distribution.
                </p>
              </div>
            </div>
          </div>
          <footer className="page-footer">
            <span>Built for curiosity.</span>
            <button
              className="text-button"
              onClick={() => setDialog("sources")}
            >
              About the questions & method <ArrowRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={mobileLibrary}
        className="mobile-library modal"
        aria-label="Question library"
        onCancel={() => setShowLibrary(false)}
      >
        <button
          className="icon-button mobile-library-close"
          aria-label="Close question library"
          onClick={() => setShowLibrary(false)}
        >
          <X size={20} />
        </button>
        {library}
      </dialog>
      {dialog === "connection" && (
        <Modal
          title="Connect to Jev"
          close={() => {
            setDialog(null);
            setKeyDraft("");
          }}
        >
          <p className="modal-intro">
            Use your OpenRouter API credits to run real comparisons.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (keyDraft.trim()) {
                setApiKey(keyDraft.trim());
                setKeyDraft("");
                setDialog(null);
                setNotice("Key connected. Run a comparison to try Jev.");
              }
            }}
          >
            <label className="field-label" htmlFor="api-key">
              OpenRouter API key
            </label>
            <input
              className="key-input"
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-or-…"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              required
            />
            <p className="key-privacy">
              Kept in memory for this tab. Sent only to OpenRouter; never saved
              in your experiments or exports.
            </p>
            <a
              className="external-link"
              href="https://openrouter.ai/settings/keys"
              target="_blank"
              rel="noreferrer"
            >
              Get an OpenRouter API key <ExternalLink size={14} />
            </a>
            <div className="connection-info">
              <span>Model</span>
              <strong>TypeSafe / Jev 1.13</strong>
              <span>Endpoint</span>
              <strong>OpenRouter Decisions</strong>
            </div>
            <div className="modal-actions">
              {apiKey && (
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => {
                    setApiKey("");
                    setKeyDraft("");
                    setDialog(null);
                    setNotice("Key disconnected.");
                  }}
                >
                  Disconnect key
                </button>
              )}
              <button
                className="primary-button"
                type="submit"
                disabled={!keyDraft.trim()}
              >
                Connect key <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "sources" && (
        <Modal
          title="A lab for the question itself."
          close={() => setDialog(null)}
          wide
        >
          <p className="modal-intro">
            120 starting points. No prescribed answers.
          </p>
          <p>
            The questions are original policy prompts, spanning current debates
            and longstanding controversies. They lean toward U.S. policy, with a
            section on global affairs. Curated {curatedDate}; this is a dated
            collection, not a live news feed.
          </p>
          <p>
            Every seed includes two attempted paraphrases. Read them critically:
            changed scope, added assumptions, or different moral language can
            change the question itself. Tag those versions “Changed framing” to
            keep them out of the wording-swing statistic.
          </p>
          <h3>What the experiment measures</h3>
          <p>
            Jev assigns probabilities to the answer options you provide. We use
            Choice for both yes/no and multiple-choice questions so comparisons
            stay within the same primitive. Each wording is evaluated
            independently against identical context. We send no hidden persona
            or instructions about which position to favor.
          </p>
          <p>
            Repeat runs show observed variability, not statistical confidence
            intervals. Expanding the answer set changes the comparison; those
            control results remain separate from paraphrase sensitivity. The
            illustrative example uses invented numbers, always labeled.
          </p>
          <h3>Reading & sources</h3>
          <p className="muted">
            News links informed topic selection; they do not endorse the
            questions or supply model answers.
          </p>
          <div className="sources-list">
            {sources.map((s) => (
              <a href={s.url} target="_blank" rel="noreferrer" key={s.url}>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.publisher}</span>
                  <p>{s.note}</p>
                </div>
                <ExternalLink size={16} />
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
            <p className="muted">
              Real Jev runs will appear here, with their exact questions and
              results.
            </p>
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
          <p className="modal-intro">
            One batch. Shared context. Your words, unchanged.
          </p>
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
