import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Read credentials from an ignored local file; never accept them as CLI arguments.
async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const key = (
    await readFile(
      new URL("../.secrets/openrouter-key.txt", import.meta.url),
      "utf8",
    )
  ).trim();
  if (!key.startsWith("sk-or-") || /\s/.test(key))
    throw new Error("The setup file must contain only an OpenRouter key.");
  const response = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `OpenRouter rejected key verification (HTTP ${response.status}).`,
    );
  const { data } = await response.json();
  if (data.is_management_key)
    throw new Error("Use a dedicated inference key, not a management key.");
  if (
    typeof data.limit !== "number" ||
    !Number.isFinite(data.limit) ||
    data.limit <= 0
  )
    throw new Error(
      "Set a positive spending limit on the dedicated key before connecting it.",
    );
  if (typeof data.limit_remaining === "number" && data.limit_remaining <= 0)
    throw new Error("The key has no remaining budget.");
  console.log(
    JSON.stringify({
      verified: true,
      limitUSD: data.limit,
      reset: data.limit_reset ?? "none",
      remainingUSD: data.limit_remaining,
    }),
  );
  if (process.argv.includes("--check")) return;
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "secret",
        "put",
        "OPENROUTER_API_KEY",
        "--config",
        "worker/wrangler.toml",
      ],
      {
        cwd: root,
        stdio: ["pipe", "inherit", "inherit"],
        windowsHide: true,
      },
    );
    child.on("error", () =>
      reject(new Error("Could not start the secret installer.")),
    );
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Secret installation failed.")),
    );
    child.stdin.on("error", () => {});
    child.stdin.end(`${key}\n`);
  });
  console.log(
    "Server secret installed. Remove the local setup file after a successful live comparison.",
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Key setup failed.");
  process.exitCode = 1;
});
