// With `npm run dev` running, execute `node scripts/check-browser.js`.
// Uses an existing Playwright installation; PLAYWRIGHT_MODULE may point to its
// entry file when it is installed outside this checkout. Never installs browsers.
// The exported workflow can also be called with a Playwright CLI page.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export default async function checkBrowser(page) {
  const checks = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://127.0.0.1:5197/");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("inflection-v1-")) localStorage.removeItem(k);
  });
  await page.reload();
  await page
    .getByText("recorded 20 sep 2026 · jev 1.13-20260917 · mean of 3 runs", {
      exact: true,
    })
    .waitFor();
  check(
    (await page.locator(".sample-note").textContent()).includes(
      "recorded 20 sep 2026 · jev 1.13-20260917 · mean of 3 runs",
    ),
    "Recorded example identifies date, model, and three repeats",
  );
  check(
    (await page
      .getByRole("textbox", { name: "Original question", exact: true })
      .inputValue()) === "If I flip a fair coin, will it land heads?",
    "First visit opens the fair coin example",
  );
  check(
    (await page
      .getByRole("combobox", { name: "Track probability of" })
      .count()) === 0 && (await page.locator(".binary-figures").count()) === 4,
    "Two-answer results use compact figures and track the first option",
  );
  check(
    (await page.locator(".stat-number").allTextContents())
      .map((text) => text.trim())
      .join(" / ") === "18 / 2 of 3",
    "Recorded stats show integer swing and flips out of comparable wordings",
  );
  check(
    (await page.getByRole("dialog").count()) === 0 &&
      (await page.locator(".about-intro").count()) === 0 &&
      (await page.locator(".layout > :first-child").getAttribute("class")) ===
        "example-chips",
    "First visit opens directly on the chips and tool with no dialog",
  );
  const howThisWorks = page.getByRole("button", {
    name: "how this works",
    exact: true,
  });
  const about = page.getByRole("dialog", {
    name: "how this works",
    exact: true,
  });
  const storageBeforeAbout = await page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage).sort()),
  );
  await howThisWorks.click();
  check(
    (await about.isVisible()) &&
      (await about.textContent()).includes("none of this is a knock on jev"),
    "How this works opens a dialog containing none of this is a knock on jev",
  );
  check(
    (await about.locator(".about-intro p").count()) === 8 &&
      (await about.locator(".about-intro a").getAttribute("rel")) ===
        "noreferrer",
    "The dialog contains all eight introductory paragraphs and the model link",
  );
  check(
    await about.evaluate((dialog) => {
      const intro = dialog.querySelector(".about-intro");
      const rule = getComputedStyle(dialog.querySelector(".about-divider"));
      return (
        dialog.getBoundingClientRect().width === 640 &&
        getComputedStyle(intro).rowGap === "12px" &&
        [...intro.querySelectorAll("p")].every((p) => {
          const style = getComputedStyle(p);
          return (
            style.fontSize === "13px" &&
            style.lineHeight === "19.5px" &&
            style.color === getComputedStyle(dialog).color
          );
        }) &&
        rule.borderTopWidth === "1px" &&
        rule.marginTop === "24px" &&
        rule.marginBottom === "24px"
      );
    }),
    "The wide dialog preserves introductory typography and divider spacing",
  );
  const aboutCopy = await about.textContent();
  await page.keyboard.press("Escape");
  check(
    (await page.getByRole("dialog").count()) === 0 &&
      (await howThisWorks.evaluate(
        (button) => button === document.activeElement,
      )) &&
      (await page.evaluate(() =>
        JSON.stringify(Object.entries(localStorage).sort()),
      )) === storageBeforeAbout,
    "Closing the dialog restores focus without writing browser storage",
  );
  await page.reload();
  check(
    (await howThisWorks.isVisible()) &&
      (await page.getByRole("dialog").count()) === 0,
    "How this works remains available after reload without opening automatically",
  );
  check(
    await page.locator(".sample-note").isVisible(),
    "Reload restores a seed's recorded run",
  );
  await howThisWorks.click();
  check(
    (await about.textContent()) === aboutCopy,
    "How this works reopens with the same content",
  );
  await about
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  check(
    await page
      .locator(".answer-question mark, .answer-question del")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.textContent === node.textContent.trim() &&
            (!node.nextSibling ||
              node.nextSibling.nodeType !== Node.ELEMENT_NODE ||
              node.nextSibling.nodeName !== node.nodeName),
        ),
      ),
    "Diff changes merge adjacent edits and leave trailing whitespace outside marks",
  );
  check(
    (
      await page
        .locator(".plot-value, .delta, .binary-figures")
        .allTextContents()
    ).every((text) => !/\d+\.\d/.test(text)),
    "Displayed probabilities and deltas are integers",
  );
  for (const width of [860, 859, 701, 700, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => {
      const plot = document.querySelector(".probability-plot");
      return (
        Math.abs(
          plot.viewBox.baseVal.width - plot.getBoundingClientRect().width,
        ) < 0.1
      );
    });
    const layout = await page.evaluate(() => {
      const editor = document.querySelector(".editor").getBoundingClientRect();
      const results = document
        .querySelector(".results-column")
        .getBoundingClientRect();
      return {
        stacked: results.top >= editor.bottom,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    check(
      layout.stacked === width < 860 && !layout.overflow,
      `Columns and page overflow are correct at ${width}px`,
    );
    check(
      await page.locator(".topbar").evaluate((bar) => {
        const brand = bar
          .querySelector(".brand-lockup")
          .getBoundingClientRect();
        const nav = bar.querySelector("nav").getBoundingClientRect();
        const buttons = [...bar.querySelectorAll("nav button")];
        const [about, saved] = buttons.map((button) =>
          button.getBoundingClientRect(),
        );
        return (
          nav.top >= brand.bottom === window.innerWidth <= 700 &&
          about.top === saved.top &&
          about.right < saved.left &&
          buttons.every(
            (button) => getComputedStyle(button).fontSize === "13px",
          ) &&
          getComputedStyle(buttons[0]).color ===
            getComputedStyle(document.querySelector(".primary-button"))
              .backgroundColor
        );
      }),
      `Header actions have the right order, styling, and wrapping at ${width}px`,
    );
    check(
      await page
        .locator(".plot-label")
        .first()
        .evaluate(
          (label) =>
            Math.abs(
              Number.parseFloat(getComputedStyle(label).fontSize) *
                label.getScreenCTM().a -
                12,
            ) < 0.1,
        ),
      `Plot labels remain 12px at ${width}px`,
    );
    check(
      await page.locator(".wording-row textarea").evaluateAll((nodes) =>
        nodes.every((node) => {
          const style = getComputedStyle(node);
          const height = node.getBoundingClientRect().height;
          const contentHeight =
            height -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom) -
            parseFloat(style.borderBottomWidth);
          const lineHeight = parseFloat(style.lineHeight);
          return (
            style.resize === "none" &&
            style.paddingTop === "8px" &&
            style.paddingBottom === "8px" &&
            Math.abs(node.scrollHeight - node.clientHeight) <= 1 &&
            contentHeight >= lineHeight - 1 &&
            Math.abs(
              contentHeight / lineHeight -
                Math.round(contentHeight / lineHeight),
            ) < 0.06
          );
        }),
      ),
      `Wording fields fit their content after resizing to ${width}px`,
    );
    if (width <= 700) {
      await howThisWorks.click();
      check(
        await about.evaluate((dialog) => {
          const bounds = dialog.getBoundingClientRect();
          dialog.scrollTop = dialog.scrollHeight;
          return (
            bounds.height <= window.innerHeight - 48 &&
            bounds.top >= 24 &&
            bounds.bottom <= window.innerHeight - 24 &&
            dialog.scrollTop > 0 &&
            dialog.scrollWidth <= dialog.clientWidth
          );
        }),
        `The about dialog scrolls within the viewport at ${width}px`,
      );
      await about.locator(".sources-list a").last().scrollIntoViewIfNeeded();
      check(
        await about.locator(".sources-list a").last().isVisible(),
        `The last source is reachable in the mobile dialog at ${width}px`,
      );
      await page.keyboard.press("Escape");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .getByRole("textbox", { name: "Original question", exact: false })
    .fill("Are autonomous vehicles safer than human drivers?");
  check(
    await page
      .getByText("Run a comparison to see probabilities", { exact: true })
      .isVisible(),
    "Editing clears old probabilities",
  );

  const chips = page.getByRole("navigation", { name: "Example questions" });
  check(
    (await chips.getByRole("button").count()) === 6,
    "Five starter examples and a custom question chip are shown",
  );
  for (const title of [
    "Fair coin",
    "Four-day week",
    "Self-driving safety",
    "Remote work",
    "Wealth tax",
  ]) {
    await chips.getByRole("button", { name: title, exact: true }).click();
    check(
      await page.locator(".sample-note").isVisible(),
      `${title} opens with recorded results`,
    );
    const original = page.getByRole("textbox", {
      name: "Original question",
      exact: true,
    });
    const text = await original.inputValue();
    await original.fill(text + " Really?");
    check(
      (await page.locator(".sample-note").count()) === 0,
      `${title} edit clears the recording`,
    );
    await original.fill(text);
    check(
      await page.locator(".sample-note").isVisible(),
      `${title} exact text restores the recording`,
    );
  }
  check(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("inflection-v1-history") || "[]")
          .length === 0,
    ),
    "Recorded runs never enter browser history",
  );
  await chips.getByRole("button", { name: /Self-driving safety/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Original question", exact: false })
      .inputValue()) === "Are self-driving cars safer than human drivers?",
    "Selecting a seed loads its question",
  );
  await page
    .getByRole("button", { name: "Save experiment", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Saved/ })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Your experiments" })
    .getByRole("button", { name: /Self-driving safety Are/ })
    .click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Self-driving safety",
    "Saved questions reopen",
  );

  await page.getByRole("button", { name: "Your own question" }).click();
  await page
    .getByRole("textbox", { name: "Experiment title" })
    .fill("Browser QA fixture");
  await page
    .getByRole("textbox", { name: "Original question", exact: false })
    .fill("Which policy should be prioritized?");
  await page
    .getByRole("button", { name: "Multiple choice", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Answer option 1", exact: true })
    .fill("Housing");
  await page
    .getByRole("textbox", { name: "Answer option 2", exact: true })
    .fill("Energy");
  await page
    .getByRole("textbox", { name: "Answer option 3", exact: true })
    .fill("Education");
  await page
    .getByRole("textbox", { name: "Wording 1", exact: true })
    .fill("Which policy should come first?");
  await page.getByRole("button", { name: /Add a wording/ }).click();
  await page
    .getByRole("textbox", { name: "Wording 2", exact: true })
    .fill("Which policy should receive priority?");
  await page
    .getByRole("button", { name: "Wording 2 comparison type: Rewording" })
    .click();
  await page.getByRole("button", { name: "Controls", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /insufficient information/ })
    .check();
  await page.getByRole("checkbox", { name: /Reversed answer order/i }).check();
  await page
    .getByRole("textbox", { name: "Shared context" })
    .fill("This is a browser test fixture, not a real policy evaluation.");
  await page.getByRole("button", { name: "View exact API request" }).click();
  check(
    (await page.locator(".request-preview").textContent()).includes(
      '"type": "choice"',
    ),
    "Exact typed request is reviewable",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  await page
    .getByRole("button", { name: "Questions & method", exact: true })
    .click();
  check(
    (await about.isVisible()) && (await about.textContent()) === aboutCopy,
    "Questions and method opens the same how this works dialog",
  );
  check(
    (await page.locator(".connection-info").textContent()).includes(
      "Comparisons use a shared, capped budget",
    ),
    "Questions and method explains the shared budget and connection",
  );
  check(
    (await page.locator('input[type="password"]').count()) === 0,
    "Visitors are never asked for an API key",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const captured = [];
  await page.route(
    "https://inflection-api.bensonperry.workers.dev/decisions",
    async (route) => {
      check(
        !route.request().headers().authorization,
        "Browser request contains no credential",
      );
      const request = route.request().postDataJSON();
      captured.push(request);
      const answers = Object.fromEntries(
        Object.entries(request.questions).map(([id, q], i) => {
          const keys = Object.keys(q.criteria),
            top = i === 1 ? 1 : 0;
          const p = keys.map((_, k) =>
            k === top ? 0.7 : 0.3 / (keys.length - 1),
          );
          return [
            id,
            {
              type: "choice",
              choice: keys[top],
              confidence: 0.5,
              probabilities: Object.fromEntries(keys.map((k, j) => [k, p[j]])),
            },
          ];
        }),
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          model: "typesafe/jev-1.13-browser-fixture",
          answers,
          usage: { input_tokens: 900, output_tokens: 100, cost: 0.0000378 },
        }),
      });
    },
  );
  await page
    .getByRole("group", { name: "Repeat each wording" })
    .getByRole("button", { name: "×3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await page.getByRole("region", { name: "Comparison results" }).waitFor();
  check(
    captured.length === 3,
    "Three repeats issue exactly three Decisions requests",
  );
  check(
    Object.keys(captured[0].questions).length === 5,
    "Original, two variants, and two controls reach the API",
  );
  check(
    captured[0].questions.original.instructions ===
      "Which policy should be prioritized?",
    "No invisible prompt is prepended",
  );
  check(
    (await page.locator(".stat-number").first().textContent()).trim() === "55",
    "Probability swing is calculated correctly for multiple choice",
  );
  check(
    (await page.locator(".condition-tag").allTextContents()).includes(
      "Framing",
    ) &&
      (await page
        .getByText("Tagged rows are excluded from swing", { exact: true })
        .isVisible()),
    "Changed framing is separately identified",
  );
  await page
    .getByRole("combobox", { name: "Track probability of" })
    .selectOption("option_2");
  check(
    (await page.locator(".probability-plot").textContent()).includes("70%"),
    "Chart follows the selected answer",
  );
  await page.getByRole("checkbox", { name: "Show edits" }).uncheck();
  check(
    (await page.locator(".answer-question mark").count()) === 0,
    "Word changes can be toggled",
  );
  const stored = await page.evaluate(() =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(localStorage).filter(([k]) =>
          k.startsWith("inflection-v1-"),
        ),
      ),
    ),
  );
  check(
    !stored.includes("sk-or-browser-test-fixture"),
    "Credentials never enter browser storage",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export comparison", exact: true })
    .click();
  const download = await downloadPromise;
  check(
    download.suggestedFilename().endsWith(".json"),
    "Comparison export produces a JSON download",
  );

  const measured = await page
    .getByRole("region", { name: "Comparison results" })
    .textContent();
  await page
    .getByRole("button", { name: "Save experiment", exact: true })
    .click();
  await chips.getByRole("button", { name: /Self-driving safety/ }).click();
  await page
    .getByRole("button", { name: /^Saved/ })
    .first()
    .click();
  await page
    .getByRole("dialog", { name: "Your experiments" })
    .getByRole("button", {
      name: "Browser QA fixture Which policy should be prioritized?",
      exact: true,
    })
    .click();
  // Tracking defaults to the first answer when a result is remounted.
  await page
    .getByRole("combobox", { name: "Track probability of" })
    .selectOption("option_2");
  await page.getByRole("checkbox", { name: "Show edits" }).uncheck();
  check(
    (await page
      .getByRole("region", { name: "Comparison results" })
      .textContent()) === measured,
    "Reopening a saved question restores the same comparison without inference",
  );
  const wording = page.getByRole("textbox", { name: "Wording 1", exact: true });
  await wording.fill("Which policy should come first now?");
  check(
    await page
      .getByText("Run a comparison to see probabilities", { exact: true })
      .isVisible(),
    "A changed wording hides mismatched results",
  );
  await wording.fill("Which policy should come first?");
  check(
    await page.getByRole("region", { name: "Comparison results" }).isVisible(),
    "Undoing a wording edit restores its measured results",
  );
  await page.reload();
  await page.getByRole("region", { name: "Comparison results" }).waitFor();
  check(
    captured.length === 3,
    "Reload and navigation never issue another Decisions request",
  );

  await page.unroute(
    "https://inflection-api.bensonperry.workers.dev/decisions",
  );
  await page.route(
    "https://inflection-api.bensonperry.workers.dev/decisions",
    (route) =>
      route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The shared Jev budget has been used up.",
        }),
      }),
  );
  await page
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByRole("alert").textContent()).includes("shared Jev budget"),
    "Unpaid API errors are visible and never turn into fake results",
  );
  check(
    (await page.getByRole("region", { name: "Comparison results" }).count()) ===
      1,
    "A failed rerun preserves the previous matching comparison",
  );
  await page.unroute(
    "https://inflection-api.bensonperry.workers.dev/decisions",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Questions & method", exact: true })
    .waitFor();
  check(
    await page
      .getByRole("button", { name: "Questions & method", exact: true })
      .isVisible(),
    "Questions and method remains available after reload",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await chips.evaluate(
      (row) =>
        row.scrollWidth > row.clientWidth &&
        getComputedStyle(row).flexWrap === "nowrap",
    ),
    "Phone example chips form a horizontally scrolling row",
  );
  await chips.getByRole("button", { name: /Remote work/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Remote work",
    "Mobile example chip selection works",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Phone layout has no horizontal overflow",
  );
  check(
    await page.locator(".sample-note").isVisible(),
    "Mobile seed shows its recording",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "output/playwright/mobile.png",
    fullPage: true,
  });
  check(errors.length === 0, `No browser exceptions: ${errors.join("; ")}`);
  // This browser is a dedicated QA session. Remove its fixture data before delivery.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("inflection-v1-")) localStorage.removeItem(k);
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.reload();
  await page.screenshot({ path: "output/playwright/desktop.png" });
  return { passed: checks.length, checks };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  let playwright;
  try {
    playwright = await import(
      process.env.PLAYWRIGHT_MODULE
        ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
        : "playwright"
    );
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
    console.error(
      "Playwright is not installed here. Set PLAYWRIGHT_MODULE to an existing installation to run browser checks.",
    );
    process.exit(1);
  }
  await mkdir("output/playwright", { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    console.log(JSON.stringify(await checkBrowser(page), null, 2));
  } finally {
    await browser.close();
  }
}
