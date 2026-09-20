// With `npm run dev` running, execute `node scripts/check-browser.js`.
// Uses an existing Playwright installation; PLAYWRIGHT_MODULE may point to its
// entry file when it is installed outside this checkout. Never installs browsers.
// The exported workflow can also be called with a Playwright CLI page.
import { mkdir, writeFile } from "node:fs/promises";
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
  await page.addInitScript(() => {
    window.__canvasText = [];
    window.__canvasRects = [];
    window.__canvasArcs = 0;
    window.__canvasStrokes = 0;
    for (const [method, counter] of [
      ["arc", "__canvasArcs"],
      ["stroke", "__canvasStrokes"],
    ]) {
      const draw = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function (...args) {
        window[counter]++;
        return draw.apply(this, args);
      };
    }
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      const metrics = this.measureText(args[0]);
      window.__canvasText.push({
        text: args[0],
        font: this.font,
        color: this.fillStyle,
        x: args[1],
        y: args[2],
        left: args[1] - metrics.actualBoundingBoxLeft,
        right: args[1] + metrics.actualBoundingBoxRight,
        top: args[2] - metrics.actualBoundingBoxAscent,
        bottom: args[2] + metrics.actualBoundingBoxDescent,
      });
      return fillText.apply(this, args);
    };
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (
      x,
      y,
      width,
      height,
    ) {
      window.__canvasRects.push({ x, y, width, height, color: this.fillStyle });
      return fillRect.call(this, x, y, width, height);
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__sharedText = text;
        },
        write: async (items) => {
          if (window.__denyImage) throw new Error("Clipboard fixture denial");
          const blob = await items[0].getType("image/png");
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          window.__image = {
            width: bitmap.width,
            height: bitmap.height,
            type: blob.type,
            background: [...ctx.getImageData(0, 0, 1, 1).data],
          };
          bitmap.close();
        },
      },
    });
  });
  await page.goto("http://127.0.0.1:5197/");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("inflection-v2-")) localStorage.removeItem(k);
  });
  await page.evaluate(() =>
    localStorage.setItem(
      "inflection-v1-draft",
      JSON.stringify({ title: "obsolete draft" }),
    ),
  );
  await page.reload();
  await page
    .getByText("recorded 20 sep 2026 · mean of 3 runs", {
      exact: true,
    })
    .waitFor();
  check(
    (await page.locator(".result-source").textContent()).includes(
      "recorded 20 sep 2026 · mean of 3 runs",
    ),
    "Recorded example identifies date and three repeats",
  );
  check(
    (await page.locator(".result-footer").textContent())
      .replace(/\s+/g, " ")
      .trim() === "details typesafe/jev-1.13-20260917",
    "Recorded details footer contains only the toggle and resolved model",
  );
  check(
    (await page
      .getByRole("textbox", { name: "Wording 1", exact: true })
      .inputValue()) ===
      "Is Reno, Nevada farther west than Los Angeles, California?",
    "First visit opens the Reno and Los Angeles example",
  );
  check(
    (await page
      .getByRole("combobox", { name: "Track probability of" })
      .count()) === 0 && (await page.locator(".binary-figures").count()) === 4,
    "Two-answer results use compact figures and track the first option",
  );
  check(
    (await page.locator(".stat-number").textContent()).trim() === "66" &&
      (await page.locator(".answer-tally").textContent()) === "yes 1 · no 3",
    "Recorded stats show integer swing and an answer tally",
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
    JSON.stringify(
      (await about.locator(".about-intro p").allTextContents())
        .slice(3, 7)
        .map((text) => text.replace(/\s+/g, " ").trim()),
    ) ===
      JSON.stringify([
        `you'd expect a computer to read the same question the same way however you phrase it. it doesn't. reno is west of los angeles. ask "is reno farther west than los angeles" and jev says 33% yes. ask "is los angeles farther east than reno" and it says 69%. same fact, same words, different order.`,
        `this isn't noise on questions with no answer. on settled facts, monty hall, the birthday problem, nuclear versus coal, jev doesn't move a point however you phrase it. the flips happen where the model is unsure of a fact, and it doesn't tell you it's unsure. the number just moves.`,
        `two questions that mean the same thing to a person should get the same answer from one model of the world, even if not the same digits. typesafe's docs say not to expect arithmetic consistency between separately asked questions. this site is what that looks like in practice.`,
        `this doesn't happen on every question. in a screen of about forty questions, most didn't move at all, and the examples here are the ones that did. the point is that it can happen, on edits you didn't mean anything by.`,
      ]),
    "The dialog uses the exact fact-based explainer copy",
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
    await page.locator(".result-source").isVisible(),
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
    !(await page.getByRole("checkbox", { name: "Show edits" }).isChecked()),
    "Show edits defaults off",
  );
  await page.getByRole("checkbox", { name: "Show edits" }).check();
  check(
    (await page.locator(".answer-question mark").count()) > 0,
    "Show edits highlights word changes against wording 1",
  );
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
      await page.locator(".plot-value, .binary-figures").allTextContents()
    ).every((text) => !/\d+\.\d/.test(text)),
    "Displayed probabilities are integers",
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
        const [about, history] = buttons.map((button) =>
          button.getBoundingClientRect(),
        );
        return (
          nav.top >= brand.bottom === window.innerWidth <= 700 &&
          about.top === history.top &&
          about.right < history.left &&
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
    .getByRole("textbox", { name: "Wording 1", exact: false })
    .fill("Are autonomous vehicles safer than human drivers?");
  check(
    await page
      .getByText("Run a comparison to see probabilities", { exact: true })
      .isVisible(),
    "Editing clears old probabilities",
  );

  const chips = page.getByRole("navigation", { name: "Example questions" });
  check(
    (await chips.getByRole("button").count()) === 5,
    "Four starter examples and a custom question chip are shown",
  );
  for (const title of [
    "Reno and Los Angeles",
    "Cubs and the Ottomans",
    "Closest state to Africa",
    "Self-driving safety",
  ]) {
    await chips.getByRole("button", { name: title, exact: true }).click();
    check(
      await page.locator(".result-source").isVisible(),
      `${title} opens with recorded results`,
    );
    const firstWording = page.getByRole("textbox", {
      name: "Wording 1",
      exact: true,
    });
    const text = await firstWording.inputValue();
    await firstWording.fill(text + " Really?");
    check(
      (await page.locator(".result-source").count()) === 0,
      `${title} edit clears the recording`,
    );
    await firstWording.fill(text);
    check(
      await page.locator(".result-source").isVisible(),
      `${title} exact text restores the recording`,
    );
  }
  check(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("inflection-v2-history") || "[]")
          .length === 0,
    ),
    "Recorded runs never enter browser history",
  );
  await chips.getByRole("button", { name: /Self-driving safety/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Wording 1", exact: false })
      .inputValue()) === "Are self-driving cars safer than human drivers?",
    "Selecting a seed loads its question",
  );
  await page.getByRole("button", { name: /^history/i }).click();
  check(
    (await page.locator(".history-list > div").count()) === 0,
    "History contains only local runs",
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Your own question" }).click();
  await page
    .getByRole("textbox", { name: "Experiment title" })
    .fill("Browser QA fixture");
  await page
    .getByRole("textbox", { name: "Wording 1", exact: false })
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
    .getByRole("textbox", { name: "Wording 2", exact: true })
    .fill("Which policy should come first?");
  await page.getByRole("button", { name: /add a wording/i }).click();
  await page
    .getByRole("textbox", { name: "Wording 3", exact: true })
    .fill("Which policy should receive priority?");
  await page.locator(".context-toggle").click();
  check(
    (await page.locator(".context-editor textarea").count()) === 1 &&
      (await page.locator(".context-editor input").count()) === 0,
    "Shared context opens directly to its textarea",
  );
  await page
    .getByRole("textbox", { name: "Shared context" })
    .fill("This is a browser test fixture, not a real policy evaluation.");
  await page.getByRole("button", { name: "view exact API request" }).click();
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
    .getByRole("group", { name: "Repeats" })
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
    Object.keys(captured[0].questions).join(",") === "w1,w2,w3",
    "Only numbered wordings reach the API",
  );
  check(
    captured[0].questions.w1.instructions ===
      "Which policy should be prioritized?",
    "No invisible prompt is prepended",
  );
  check(
    (await page.locator(".stat-number").first().textContent()).trim() === "55",
    "Probability swing is calculated correctly for multiple choice",
  );
  check(
    (await page.locator(".answer-tally").textContent()) ===
      "Housing 2 · Energy 1",
    "Multiple-choice answers tally winning options only",
  );
  check(
    (await page.locator(".result-source").textContent()) ===
      "your run · 3 repeats",
    "Repeated browser runs identify their source",
  );
  check(
    (await page.locator(".result-footer").textContent())
      .replace(/\s+/g, " ")
      .trim() === "details typesafe/jev-1.13-browser-fixture",
    "Local details footer contains only the toggle and resolved model",
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
          k.startsWith("inflection-v2-"),
        ),
      ),
    ),
  );
  check(
    !stored.includes("sk-or-browser-test-fixture"),
    "Credentials never enter browser storage",
  );
  await page.getByRole("button", { name: /^history/i }).click();
  const historyDialog = page.getByRole("dialog", {
    name: "history",
    exact: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await historyDialog
    .getByRole("button", {
      name: "export json: Browser QA fixture",
      exact: true,
    })
    .click();
  const download = await downloadPromise;
  check(
    download.suggestedFilename().endsWith(".json"),
    "Per-item history export downloads JSON",
  );
  await download.saveAs("output/playwright/history.json");
  await page.keyboard.press("Escape");
  await chips.getByRole("button", { name: /Self-driving safety/ }).click();
  await page.getByRole("button", { name: /^history/i }).click();
  await historyDialog
    .getByRole("button", { name: /^Browser QA fixture/ })
    .click();
  check(
    (await page.locator(".result-source").textContent()) ===
      "your run · 3 repeats",
    "History restores your run without inference",
  );
  await page
    .getByRole("combobox", { name: "Track probability of" })
    .selectOption("option_2");
  await page.getByRole("button", { name: "copy image", exact: true }).click();
  await page.getByText("image copied", { exact: true }).waitFor();
  const image = await page.evaluate(() => window.__image);
  check(
    image.width === 1200 &&
      image.height === 630 &&
      image.type === "image/png" &&
      image.background.join() === "247,242,234,255",
    "Image clipboard receives a 1200 × 630 PNG on theme paper",
  );
  const imageText = await page.evaluate(() => window.__canvasText);
  check(
    imageText.some(
      (t) => t.text === "Browser QA fixture" && t.font.includes("40px"),
    ) &&
      imageText.some(
        (t) =>
          t.text === "largest swing 55 pp · Housing 2 · Energy 1" &&
          t.font.includes("20px") &&
          t.color === "#685d55",
      ) &&
      imageText.some((t) => t.text === "probability of Energy") &&
      imageText.some((t) => t.text === "bensonperry.com/inflection") &&
      imageText.some((t) => /^jev 1\.13 · your run · \d/.test(t.text)),
    "Canvas uses the 40px title, muted 20px stats, selected answer, and both credits",
  );
  check(
    [
      "Which policy should be prioritized?",
      "Which policy should come first?",
      "Which policy should receive priority?",
    ].every((wording) =>
      imageText.some((t) => t.text === wording && t.font.includes("22px")),
    ),
    "The image includes every wording",
  );
  const percentages = imageText.filter((t) => t.font.includes("28px"));
  check(
    [...new Set(percentages.map((t) => t.y))]
      .map((y) =>
        percentages
          .filter((t) => t.y === y)
          .sort((a, b) => a.x - b.x)
          .map((t) => t.text)
          .join(""),
      )
      .join() === "15%,70%,15%",
    "Serif percentages follow the tracked option's means",
  );
  await checkImageLayouts(page, check);
  await page.evaluate(() => {
    window.__denyImage = true;
  });
  const pngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "copy image", exact: true }).click();
  const png = await pngPromise;
  await png.saveAs("output/playwright/shared.png");
  await page.getByText("image saved", { exact: true }).waitFor();
  check(
    png.suggestedFilename() === "inflection-browser-qa-fixture.png",
    "Image copy denial falls back to a named PNG download",
  );

  await page
    .getByRole("textbox", { name: "Experiment title" })
    .fill("Shared title — café");
  await page.getByRole("button", { name: "copy link", exact: true }).click();
  await page.getByText("link copied", { exact: true }).waitFor();
  const sharedUrl = await page.evaluate(() => window.__sharedText);
  check(/#s=[A-Za-z0-9_-]+$/.test(sharedUrl), "Link uses a base64url hash");
  const sharedTag = await page.evaluate(() => {
    const run = JSON.parse(localStorage.getItem("inflection-v2-history"))[0];
    const date = new Date(run.createdAt)
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
      .toLowerCase()
      .replace("sept", "sep");
    return `shared link · ${date}`;
  });
  const recipient = await page.context().browser().newPage();
  recipient.on("pageerror", (e) => errors.push(e.message));
  let recipientRequests = 0;
  await recipient.route(
    "https://inflection-api.bensonperry.workers.dev/decisions",
    (route) => {
      recipientRequests++;
      return route.abort();
    },
  );
  await recipient.goto(sharedUrl);
  await recipient.locator(".result-source").waitFor();
  check(
    (await recipient.locator(".result-source").textContent()) === sharedTag &&
      new URL(recipient.url()).hash === "" &&
      (await recipient.locator(".answer-tally").textContent()) ===
        "Housing 2 · Energy 1",
    "Loading a share in another tab restores results and clears the hash",
  );
  const recipientChips = recipient.getByRole("navigation", {
    name: "Example questions",
  });
  const sharedChip = recipientChips.getByRole("button", {
    name: "shared question",
    exact: true,
  });
  check(
    (await recipientChips.getByRole("button").count()) === 6 &&
      (await recipientChips.getByRole("button").nth(4).textContent()) ===
        "shared question" &&
      (await recipientChips.locator('[aria-pressed="true"]').textContent()) ===
        "shared question" &&
      (await recipientChips
        .getByRole("button", { name: "Your own question" })
        .getAttribute("aria-pressed")) === "false",
    "Shared question is the only active chip, after examples and before the custom chip",
  );
  const sharedSnapshot = async () => ({
    inputs: await recipient
      .locator(".editor input, .editor textarea")
      .evaluateAll((nodes) => nodes.map((node) => node.value)),
    results: await recipient.locator(".results").textContent(),
  });
  const originalSnapshot = await sharedSnapshot();
  for (const title of ["Reno and Los Angeles", "Your own question"]) {
    await recipientChips
      .getByRole("button", { name: title, exact: true })
      .click();
    check(
      (await sharedChip.getAttribute("aria-pressed")) === "false" &&
        (await recipientChips
          .getByRole("button", { name: title, exact: true })
          .getAttribute("aria-pressed")) === "true",
      `${title} deactivates the shared chip while keeping it available`,
    );
    await sharedChip.click();
    check(
      JSON.stringify(await sharedSnapshot()) ===
        JSON.stringify(originalSnapshot) &&
        (await recipientChips
          .locator('[aria-pressed="true"]')
          .textContent()) === "shared question",
      `Returning from ${title} restores all shared inputs and results`,
    );
  }
  await recipient
    .getByRole("textbox", { name: "Wording 1", exact: true })
    .fill("An edited shared wording?");
  await sharedChip.click();
  check(
    JSON.stringify(await sharedSnapshot()) === JSON.stringify(originalSnapshot),
    "Editing a shared question leaves its original snapshot available",
  );
  await recipient.reload();
  await recipient.getByRole("textbox", { name: "Experiment title" }).waitFor();
  check(
    (await sharedChip.count()) === 0 &&
      (await recipient.locator(".result-source").count()) === 0 &&
      (await recipientChips
        .getByRole("button", { name: "Your own question" })
        .getAttribute("aria-pressed")) === "true" &&
      recipientRequests === 0,
    "Reload without a hash drops the shared chip and results without inference",
  );
  await recipient.close();
  await page.goto(sharedUrl);
  await page.waitForFunction(() =>
    document
      .querySelector(".result-source")
      ?.textContent.startsWith("shared link"),
  );
  check(
    (await page.locator(".result-source").textContent()) === sharedTag &&
      (await page.locator(".result-footer").textContent())
        .replace(/\s+/g, " ")
        .trim() === "details typesafe/jev-1.13-browser-fixture" &&
      (await chips.locator('[aria-pressed="true"]').textContent()) ===
        "shared question",
    "A same-page share activates its chip and labels its source only above results",
  );
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Shared title — café" &&
      new URL(page.url()).hash === "",
    "Share restores Unicode title and clears the hash",
  );
  check(
    (await page.locator(".answer-tally").textContent()) ===
      "Housing 2 · Energy 1" &&
      (await page.evaluate(
        () => JSON.parse(localStorage.getItem("inflection-v2-history")).length,
      )) === 1,
    "Shared averages are preserved without adding to browser history",
  );
  await page.evaluate(() => {
    window.__canvasText = [];
    window.__denyImage = false;
  });
  await page.getByRole("button", { name: "copy image", exact: true }).click();
  await page.getByText("image copied", { exact: true }).waitFor();
  check(
    await page.evaluate(() =>
      window.__canvasText.some((t) =>
        /^jev 1\.13 · shared link · \d/.test(t.text),
      ),
    ),
    "The shared image stamp identifies a shared link",
  );
  await page.getByRole("button", { name: /^history/i }).click();
  await historyDialog
    .locator('input[type="file"]')
    .setInputFiles("output/playwright/history.json");
  await page
    .getByText("Experiment imported. Run it to get fresh probabilities.", {
      exact: true,
    })
    .waitFor();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Browser QA fixture",
    "History imports exported experiment inputs",
  );
  const wording = page.getByRole("textbox", { name: "Wording 2", exact: true });
  await wording.fill("Which policy should come first now?");
  check(
    await page
      .getByText("Run a comparison to see probabilities", { exact: true })
      .isVisible(),
    "A changed wording hides mismatched results",
  );
  await page.getByRole("button", { name: "copy link", exact: true }).click();
  await page.getByText("link copied", { exact: true }).waitFor();
  const draftUrl = await page.evaluate(() => window.__sharedText);
  await page.goto(draftUrl);
  await page
    .getByText("Run a comparison to see probabilities", { exact: true })
    .waitFor();
  check(
    new URL(page.url()).hash === "" &&
      (await wording.inputValue()) === "Which policy should come first now?" &&
      (await chips.getByRole("button", { name: "shared question" }).count()) ===
        1 &&
      (await chips.locator('[aria-pressed="true"]').textContent()) ===
        "shared question",
    "Input-only links restore without results or inference",
  );
  await chips
    .getByRole("button", { name: "Reno and Los Angeles", exact: true })
    .click();
  await chips
    .getByRole("button", { name: "shared question", exact: true })
    .click();
  check(
    (await wording.inputValue()) === "Which policy should come first now?" &&
      (await page.locator(".result-source").count()) === 0,
    "A new share replaces the session snapshot and returns without stale results",
  );
  await wording.fill("Which policy should come first?");
  check(
    await page.getByRole("region", { name: "Comparison results" }).isVisible(),
    "Undoing a wording edit restores its measured results",
  );
  await page.reload();
  await page.getByRole("region", { name: "Comparison results" }).waitFor();
  check(
    captured.length === 3 &&
      (await chips.getByRole("button", { name: "shared question" }).count()) ===
        0,
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
  await chips.getByRole("button", { name: /Closest state to Africa/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Closest state to Africa",
    "Mobile example chip selection works",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Phone layout has no horizontal overflow",
  );
  check(
    await page.locator(".result-source").isVisible(),
    "Mobile seed shows its recording",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "output/playwright/mobile.png",
    fullPage: true,
  });
  check(
    (await page.locator(".probability-plot circle").count()) ===
      (await page.locator(".wording-row").count()) &&
      (await page.locator(".probability-plot > line").count()) === 0,
    "Every wording has one dot with no reference line",
  );
  check(
    (await page.locator(".plot-label").allTextContents()).join() === "1,2,3,4",
    "Plot labels are just numbers",
  );
  check(
    (
      await page
        .getByRole("region", { name: "Comparison results" })
        .textContent()
    ).match(/mean of 3 runs/g).length === 1,
    "Mean copy appears only once",
  );
  await page.getByRole("button", { name: "Your own question" }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .getAttribute("placeholder")) === "name this comparison",
    "Empty title has the requested placeholder",
  );
  await page
    .getByRole("textbox", { name: "Wording 1", exact: true })
    .fill("Is this a test?");
  await page
    .getByRole("textbox", { name: "Wording 2", exact: true })
    .fill("Is this a test fixture?");
  for (let i = 0; i < 6; i++)
    await page
      .getByRole("button", { name: "add a wording", exact: true })
      .click();
  check(
    await page
      .getByRole("button", { name: "add a wording", exact: true })
      .isDisabled(),
    "At most eight wordings can be added",
  );
  for (let i = 8; i >= 3; i--)
    await page
      .getByRole("button", { name: `Remove wording ${i}`, exact: true })
      .click();
  check(
    await page
      .getByRole("button", { name: "Remove wording 1", exact: true })
      .isDisabled(),
    "At least two numbered rows remain",
  );
  await page.route(
    "https://inflection-api.bensonperry.workers.dev/decisions",
    (route) => {
      const q = route.request().postDataJSON().questions;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          model: "fixture",
          answers: Object.fromEntries(
            Object.keys(q).map((id) => [
              id,
              {
                type: "choice",
                choice: "yes",
                confidence: 0,
                probabilities: { yes: 0.5, no: 0.5 },
              },
            ]),
          ),
        }),
      });
    },
  );
  await page
    .getByRole("group", { name: "Repeats" })
    .getByRole("button", { name: "×1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await page.getByText("your run · just now", { exact: true }).waitFor();
  check(
    (await page.locator(".plot-footnote").count()) === 0 &&
      (await page.locator(".answer-tally").textContent()) ===
        "yes 0 · no 0 · tie 2",
    "Single runs omit range copy and ties count once per wording",
  );
  await page.goto("http://127.0.0.1:5197/#s=invalid-gzip");
  await page.getByText("your run · just now", { exact: true }).waitFor();
  check(
    (await page.locator(".wording-row").count()) === 2,
    "Invalid links are ignored without damaging the browser draft",
  );
  check(errors.length === 0, `No browser exceptions: ${errors.join("; ")}`);
  // This browser is a dedicated QA session. Remove its fixture data before delivery.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("inflection-v2-")) localStorage.removeItem(k);
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://127.0.0.1:5197/");
  await page.locator(".result-source").waitFor();
  await page.screenshot({ path: "output/playwright/desktop.png" });
  return { passed: checks.length, checks };
}

async function checkImageLayouts(page, check) {
  const layouts = await page.evaluate(async () => {
    const { comparisonImage } = await import("/src/share.ts");
    const { recordedRun } = await import("/src/recorded.ts");
    const { seeds } = await import("/src/seeds.ts");
    const { buildRequest, conditionsFor } = await import("/src/engine.ts");
    const layouts = [];
    for (const count of [2, 4, 6, 7, 8]) {
      const seed = recordedRun(seeds[0].id);
      const run = structuredClone(seed);
      if (count !== 4) {
        run.experiment.wordings = Array.from({ length: count }, (_, i) => ({
          id: `w${i + 1}`,
          text:
            count <= 2
              ? seed.conditions[i].text
              : i === 0
                ? "長い文言も画像の中で二行以内に収まります。".repeat(12)
                : i === 1
                  ? "W".repeat(200)
                  : `${seed.conditions[i % 4].text} ${"Additional wording to check wrapping and ellipsis. ".repeat(6)}`,
        }));
        if (count > 4)
          run.experiment.title = "Long comparison title ".repeat(5);
        run.conditions = conditionsFor(run.experiment);
        run.request = buildRequest(run.experiment);
        run.responses = seed.responses
          .slice(0, count === 2 ? 1 : 3)
          .map((r) => ({
            ...r,
            answers: Object.fromEntries(
              run.conditions.map((c, i) => [
                c.id,
                count === 2
                  ? {
                      ...r.answers.w1,
                      choice: i === 0 ? "no" : "yes",
                      probabilities: { yes: i, no: 1 - i },
                    }
                  : r.answers[`w${(i % 4) + 1}`],
              ]),
            ),
          }));
      }
      window.__canvasText = [];
      window.__canvasRects = [];
      window.__canvasArcs = 0;
      window.__canvasStrokes = 0;
      const blob = await comparisonImage(run.experiment, run, "yes");
      const fontSize = count > 6 ? 22 - (count - 6) * 2 : 22;
      const text = window.__canvasText;
      const wordingLines = text.filter(
        (t) =>
          t.font.startsWith(`${fontSize}px `) &&
          t.x >= 96 &&
          t.x < 904 &&
          t.y > 164,
      );
      const rows = run.conditions.map((c, i) => {
        const top = 164 + (378 * i) / count;
        const bottom = 164 + (378 * (i + 1)) / count;
        const lines = wordingLines.filter((t) => t.y >= top && t.y < bottom);
        return (
          lines.length >= 1 &&
          lines.length <= 2 &&
          c.text.startsWith(lines[0].text) &&
          lines.every(
            (t) => t.top >= top && t.bottom <= bottom && t.right <= 873,
          ) &&
          (count <= 4 || lines.at(-1).text.endsWith("…"))
        );
      });
      const rects = window.__canvasRects;
      layouts.push({
        count,
        rowsFit: rows.every(Boolean),
        // Font ink can extend a fraction of a pixel beyond its advance width.
        padding: text.every(
          (t) =>
            t.left >= 55 && t.right <= 1145 && t.top >= 55 && t.bottom <= 575,
        ),
        tracks: rects.filter(
          (r) => r.width === 240 && r.height === 6 && r.color === "#f1eae0",
        ).length,
        fills: rects
          .filter((r) => r.height === 6 && r.color === "#653d78")
          .map((r) => r.width),
        hairlines: rects.filter((r) => r.height === 1 && r.width === 1088)
          .length,
        arcs: window.__canvasArcs,
        ranges: window.__canvasStrokes,
        summary: text.some(
          (t) => t.text === "largest swing 66 pp · yes 1 · no 3",
        ),
        footer: text.some(
          (t) => t.text === "jev 1.13 · recorded · 20 sep 2026",
        ),
        png:
          count === 4 || count === 8
            ? Array.from(new Uint8Array(await blob.arrayBuffer()))
            : null,
      });
    }
    return layouts;
  });
  for (const layout of layouts) {
    check(
      layout.rowsFit && layout.padding,
      `${layout.count}-row image wraps each wording within two lines and keeps text inside the padding`,
    );
    check(
      layout.tracks === layout.count &&
        layout.fills.length === layout.count &&
        layout.hairlines === layout.count - 1 &&
        layout.arcs === 0 &&
        layout.ranges === (layout.count === 2 ? 0 : layout.count),
      `${layout.count}-row image has percentage bars, hairlines, and ranges only for repeats`,
    );
    if (layout.count === 2)
      check(
        layout.fills.join() === "0,240",
        "Zero and 100 percent fill the expected widths",
      );
    if (layout.count === 4)
      check(
        layout.summary && layout.footer,
        "Recorded image has the exact swing, tally, and date",
      );
    if (layout.png)
      await writeFile(
        `output/playwright/share-${layout.count}-rows.png`,
        Buffer.from(layout.png),
      );
  }
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
