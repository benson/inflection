async (page) => {
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
  await page.getByText("Illustrative example", { exact: true }).waitFor();
  check(
    (await page.locator(".sample-note").textContent()).includes(
      "These numbers are made up to show the interface.",
    ),
    "Synthetic example is unmistakably labeled",
  );
  await page
    .getByRole("textbox", { name: "Original question", exact: false })
    .fill("Should AI companies need permission to train on copyrighted work?");
  check(
    await page
      .getByText("Find the tipping point.", { exact: true })
      .isVisible(),
    "Editing clears old probabilities",
  );

  const rail = page.getByRole("complementary");
  await rail.getByRole("textbox", { name: "Search questions" }).fill("carbon");
  check(
    (await rail.getByRole("status").textContent()) === "1 question",
    "Library search filters results",
  );
  await rail.getByRole("button", { name: /Carbon tax/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Original question", exact: false })
      .inputValue()) === "Should governments tax carbon emissions?",
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
    .getByRole("button", { name: /Carbon tax Should/ })
    .click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Carbon tax",
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
    .getByRole("combobox", { name: "Wording 2 comparison type" })
    .selectOption("framing");
  await page.getByRole("button", { name: "Experiment controls" }).click();
  await page
    .getByRole("checkbox", { name: /Insufficient information/ })
    .check();
  await page.getByRole("checkbox", { name: /reversed answer order/ }).check();
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
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "OpenRouter API key" })
    .fill("sk-or-browser-test-fixture");
  await page.getByRole("button", { name: "Connect key", exact: true }).click();
  const captured = [];
  await page.route(
    "https://openrouter.ai/api/alpha/decisions",
    async (route) => {
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
    .getByRole("combobox", { name: "Repeat each wording" })
    .selectOption("3");
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
    (await page.locator(".stat-number").first().textContent()).includes("55.0"),
    "Probability swing is calculated correctly for multiple choice",
  );
  check(
    await page
      .getByText("Different framing · excluded from wording swing")
      .isVisible(),
    "Changed framing is separately identified",
  );
  await page
    .getByRole("combobox", { name: "Track probability of" })
    .selectOption("option_2");
  check(
    (await page.locator(".probability-plot").textContent()).includes("70.0%"),
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

  await page.unroute("https://openrouter.ai/api/alpha/decisions");
  await page.route("https://openrouter.ai/api/alpha/decisions", (route) =>
    route.fulfill({ status: 402, contentType: "application/json", body: "{}" }),
  );
  await page
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByRole("alert").textContent()).includes("needs API credits"),
    "Unpaid API errors are visible and never turn into fake results",
  );
  check(
    (await page.getByRole("region", { name: "Comparison results" }).count()) ===
      0,
    "Failed requests have no fabricated comparison",
  );
  await page.unroute("https://openrouter.ai/api/alpha/decisions");
  await page.reload();
  await page
    .getByRole("button", { name: "Connect OpenRouter", exact: true })
    .waitFor();
  check(
    await page
      .getByRole("button", { name: "Connect OpenRouter", exact: true })
      .isVisible(),
    "Reload discards the API key",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Browse 120 questions" }).click();
  const mobile = page.getByRole("dialog", { name: "Question library" });
  await mobile
    .getByRole("textbox", { name: "Search questions" })
    .fill("abortion");
  await mobile.getByRole("button", { name: /Abortion access Should/ }).click();
  check(
    (await page
      .getByRole("textbox", { name: "Experiment title" })
      .inputValue()) === "Abortion access",
    "Mobile library selection works",
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Phone layout has no horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Explore an illustrative example" })
    .click();
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
};
