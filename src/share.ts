import { binaryOptions, maxWordingSwing, meanProb, tallyText } from "./engine";
import { isExperiment, parseRun } from "./storage";
import type { Experiment, Run } from "./types";

const MAX_BYTES = 2_000_000;

export async function encodeShare(
  experiment: Experiment,
  run: Run | null,
): Promise<string> {
  if (!isExperiment(experiment))
    throw new Error("Complete at least two wordings before sharing.");
  const result = run ? parseRun(run, experiment) : null;
  const payload = {
    experiment: {
      title: experiment.title,
      wordings: experiment.wordings,
      options: experiment.options,
      context: experiment.context,
    },
    ...(result
      ? {
          run: {
            conditions: result.conditions,
            responses: result.responses,
            model: result.responses[0].model,
            createdAt: result.createdAt,
            source: result.source,
          },
        }
      : {}),
  };
  const stream = new Blob([JSON.stringify(payload)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function decodeShare(
  hash: string,
): Promise<{ experiment: Experiment; run: Run | null } | null> {
  try {
    if (!/^#s=[A-Za-z0-9_-]+$/.test(hash) || hash.length > MAX_BYTES)
      return null;
    const bytes = Uint8Array.from(
      atob(hash.slice(3).replaceAll("-", "+").replaceAll("_", "/")),
      (c) => c.charCodeAt(0),
    );
    const reader = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"))
      .getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const payload = JSON.parse(await new Blob(chunks).text());
    const e = payload.experiment;
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      title: e.title,
      category: "Shared comparison",
      mode:
        JSON.stringify(e.options) === JSON.stringify(binaryOptions())
          ? "binary"
          : "multiple",
      wordings: e.wordings,
      options: e.options,
      context: e.context,
    };
    if (!isExperiment(experiment)) return null;
    const run =
      payload.run === undefined ? null : parseRun(payload.run, experiment);
    if (run && payload.run.model !== run.responses[0].model) return null;
    if (run) run.source = "shared";
    return { experiment, run };
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function comparisonImage(
  experiment: Experiment,
  run: Run,
  optionId: string,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the image.");
  const theme = getComputedStyle(document.documentElement);
  const color = (name: string) => theme.getPropertyValue(`--${name}`).trim();
  const body = color("body"),
    serif = color("serif");
  ctx.fillStyle = color("paper");
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = color("ink");
  ctx.font = `44px ${serif}`;
  // Wrap long titles into two lines, keeping the requested type size.
  const words = (experiment.title.trim() || "untitled comparison").split(/\s+/);
  const lines = [""];
  for (const word of words) {
    const last = lines.length - 1;
    const next = lines[last] ? `${lines[last]} ${word}` : word;
    if (ctx.measureText(next).width > 1088 && lines[last] && lines.length < 2)
      lines.push(word);
    else lines[last] = next;
  }
  const fit = (text: string, width: number) => {
    if (ctx.measureText(text).width <= width) return text;
    while (text && ctx.measureText(`${text}…`).width > width)
      text = text.slice(0, -1);
    return `${text}…`;
  };
  lines.forEach((line, i) => ctx.fillText(fit(line, 1088), 56, 80 + i * 52));
  const summaryY = lines.length === 1 ? 128 : 180;
  ctx.font = `24px ${body}`;
  ctx.fillText(
    fit(
      `largest swing ${Math.round(maxWordingSwing(run) * 100)} pp · answers ${tallyText(run)}`,
      1088,
    ),
    56,
    summaryY,
  );
  ctx.fillStyle = color("muted");
  ctx.font = `18px ${body}`;
  const selected =
    experiment.options.find((o) => o.id === optionId) ?? experiment.options[0];
  ctx.fillText(
    fit(`probability of ${selected.label}`, 1088),
    56,
    summaryY + 36,
  );
  const top = summaryY + 64,
    bottom = 516;
  const step = Math.min(
    48,
    (bottom - top) / Math.max(1, run.conditions.length - 1),
  );
  const lastY = top + (run.conditions.length - 1) * step;
  const x = (p: number) => 112 + p * 920;
  ctx.lineWidth = 1;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.strokeStyle = color("line");
    ctx.beginPath();
    ctx.moveTo(x(p), top - 16);
    ctx.lineTo(x(p), lastY + 16);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(`${p * 100}%`, x(p), lastY + 40);
  }
  run.conditions.forEach((c, i) => {
    const y = top + i * step;
    const values = run.responses.map(
      (r) => r.answers[c.id].probabilities[selected.id],
    );
    ctx.fillStyle = color("muted");
    ctx.textAlign = "left";
    ctx.fillText(c.label, 56, y + 6);
    ctx.strokeStyle = color("accent");
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    if (values.length > 1) {
      ctx.beginPath();
      ctx.moveTo(x(Math.min(...values)), y);
      ctx.lineTo(x(Math.max(...values)), y);
      ctx.stroke();
    }
    const mean = meanProb(run, c.id, selected.id);
    ctx.fillStyle = color("accent");
    ctx.beginPath();
    ctx.arc(x(mean), y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(mean * 100)}%`, 1144, y + 6);
  });
  ctx.textAlign = "left";
  ctx.fillStyle = color("muted");
  ctx.font = `18px ${body}`;
  ctx.fillText("bensonperry.com/inflection", 56, 598);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not create the image.")),
      "image/png",
    ),
  );
}

export async function copyImage(
  experiment: Experiment,
  run: Run,
  optionId: string,
): Promise<string> {
  const blob = await comparisonImage(experiment, run, optionId);
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return "image copied";
  } catch {
    const slug =
      experiment.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "comparison";
    downloadBlob(blob, `inflection-${slug}.png`);
    return "image saved";
  }
}
