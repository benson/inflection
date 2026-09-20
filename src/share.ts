import {
  binaryOptions,
  majorityWinner,
  maxWordingSwing,
  meanProb,
  tallyText,
  winners,
} from "./engine";
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
  const padding = 56,
    right = canvas.width - padding,
    width = right - padding;
  ctx.fillStyle = color("paper");
  ctx.fillRect(0, 0, 1200, 630);
  const fit = (text: string, width: number) => {
    if (ctx.measureText(text).width <= width) return text;
    const chars = Array.from(text);
    while (chars.length && ctx.measureText(`${chars.join("")}…`).width > width)
      chars.pop();
    return `${chars.join("").trimEnd()}…`;
  };
  const wrap = (text: string, width: number) => {
    const words = text.trim().split(/\s+/);
    let first = "";
    while (words.length) {
      const next = first ? `${first} ${words[0]}` : words[0];
      if (ctx.measureText(next).width > width) break;
      first = next;
      words.shift();
    }
    // Split an unbroken word too, so pasted URLs and CJK text stay in bounds.
    if (!first && words.length) {
      const chars = Array.from(words[0]);
      while (chars.length && ctx.measureText(first + chars[0]).width <= width)
        first += chars.shift();
      words[0] = chars.join("");
    }
    return words.length ? [first, fit(words.join(" "), width)] : [first];
  };
  ctx.textBaseline = "top";
  ctx.fillStyle = color("ink");
  ctx.font = `40px ${serif}`;
  ctx.fillText(
    fit(experiment.title.trim() || "untitled comparison", width),
    padding,
    padding,
  );
  ctx.fillStyle = color("muted");
  ctx.font = `20px ${body}`;
  ctx.fillText(
    fit(
      `largest swing ${Math.round(maxWordingSwing(run) * 100)} pp · ${tallyText(run)}`,
      width,
    ),
    padding,
    108,
  );
  const selected =
    experiment.options.find((o) => o.id === optionId) ?? experiment.options[0];
  const barWidth = 240,
    barX = right - barWidth,
    top = 164,
    bottom = 542,
    rowHeight = (bottom - top) / run.conditions.length,
    rowFont =
      run.conditions.length > 6 ? 22 - (run.conditions.length - 6) * 2 : 22,
    lineHeight = rowFont + 4;
  const majority = majorityWinner(run);
  const differs = run.conditions.map((c) => {
    const leading = winners(run, c.id);
    const winner = leading.length === 1 ? leading[0] : "__tie__";
    return majority !== null && winner !== majority;
  });
  const gutter = 40,
    tagWidth = 58,
    textX = padding + gutter + (differs.some(Boolean) ? tagWidth + 14 : 0),
    textWidth = barX - 32 - textX;
  ctx.font = `18px ${body}`;
  ctx.textAlign = "right";
  ctx.fillText(fit(`probability of ${selected.label}`, barWidth), right, 136);
  run.conditions.forEach((c, i) => {
    const rowTop = top + i * rowHeight,
      centerY = rowTop + rowHeight / 2;
    if (i > 0) {
      ctx.fillStyle = color("line");
      ctx.fillRect(padding, Math.round(rowTop), width, 1);
    }
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `20px ${body}`;
    ctx.fillStyle = color("muted");
    ctx.fillText(c.label, padding, centerY);
    if (differs[i]) {
      ctx.fillStyle = color("accent-soft");
      ctx.beginPath();
      ctx.roundRect(padding + gutter, centerY - 12, tagWidth, 24, 5);
      ctx.fill();
      ctx.fillStyle = color("accent");
      ctx.font = `14px ${body}`;
      ctx.fillText("differs", padding + gutter + 8, centerY);
    }
    ctx.fillStyle = color("ink");
    ctx.font = `${rowFont}px ${body}`;
    const lines = wrap(c.text, textWidth);
    lines.forEach((line, j) =>
      ctx.fillText(
        line,
        textX,
        centerY + (j - (lines.length - 1) / 2) * lineHeight,
      ),
    );

    const mean = meanProb(run, c.id, selected.id);
    const values = run.responses.map(
      (r) => r.answers[c.id].probabilities[selected.id],
    );
    const barY = Math.round(centerY + 14);
    ctx.fillStyle = color("surface-sunken");
    ctx.fillRect(barX, barY, barWidth, 6);
    ctx.fillStyle = color("accent");
    ctx.fillRect(barX, barY, mean * barWidth, 6);
    if (values.length > 1) {
      const low = barX + Math.min(...values) * barWidth,
        high = barX + Math.max(...values) * barWidth;
      ctx.strokeStyle = color("ink");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(low, barY + 3);
      ctx.lineTo(high, barY + 3);
      ctx.moveTo(low, barY - 2);
      ctx.lineTo(low, barY + 8);
      ctx.moveTo(high, barY - 2);
      ctx.lineTo(high, barY + 8);
      ctx.stroke();
    }
    ctx.fillStyle = color("ink");
    ctx.font = `28px ${serif}`;
    // Canvas has no font-variant-numeric setting. Fixed digit cells keep the
    // percentages tabular even when the system serif uses proportional digits.
    const digitWidth = Math.max(
      ...Array.from("0123456789", (digit) => ctx.measureText(digit).width),
    );
    ctx.textAlign = "right";
    ctx.fillText("%", right, centerY - 6);
    let digitX = right - ctx.measureText("%").width - digitWidth / 2;
    ctx.textAlign = "center";
    for (const digit of Array.from(String(Math.round(mean * 100))).reverse()) {
      ctx.fillText(digit, digitX, centerY - 6);
      digitX -= digitWidth;
    }
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = color("muted");
  ctx.font = `18px ${body}`;
  ctx.fillText("bensonperry.com/inflection", padding, canvas.height - padding);
  const date = new Date(run.createdAt)
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase()
    .replace("sept", "sep");
  ctx.textAlign = "right";
  ctx.fillText(
    `jev 1.13 · ${run.source === "local" ? "your run" : "recorded"} · ${date}`,
    right,
    canvas.height - padding,
  );
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
