import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import axe from "axe-core";

const ORIGIN = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const report = [];
await mkdir("ui-artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [
    ["mobile", 360, 800],
    ["desktop", 1365, 900],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await context.addInitScript(() => {
      localStorage.setItem("statquest.welcome.intro.seen.v1", "1");
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    const response = await page.goto(ORIGIN, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert.equal(response?.status(), 200, `Landing must return HTTP 200 on ${name}`);
    await page.locator("#welcome-heading").waitFor({ state: "visible" });
    assert.ok(await page.getByRole("link", { name: /start your quest/i }).first().isVisible());
    assert.ok(await page.getByRole("heading", { name: "More than a to-do list." }).isVisible());
    const initialWidth = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(initialWidth.document <= initialWidth.viewport + 3, `Landing overflows on ${name}: ${JSON.stringify(initialWidth)}`);
    await page.screenshot({ path: `ui-artifacts/landing-light-${name}.png`, fullPage: true });
    await page.addScriptTag({ content: axe.source });
    const lightAudit = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    });
    const lightIssues = lightAudit.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ targets: n.target, summary: n.failureSummary })) }));
    report.push({ page: "landing-light", viewport: name, issues: lightIssues });
    assert.equal(lightIssues.filter((v) => ["serious", "critical"].includes(v.impact)).length, 0, `Light accessibility failures on ${name}: ${JSON.stringify(lightIssues)}`);
    await page.getByRole("button", { name: "Use dark appearance" }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
    await page.screenshot({ path: `ui-artifacts/landing-dark-${name}.png`, fullPage: true });
    const audit = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    });
    const issues = audit.violations.map((v) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map((n) => ({ targets: n.target, html: n.html.slice(0, 280), summary: n.failureSummary })) }));
    report.push({ page: "landing-dark", viewport: name, width, overflow: initialWidth, issues });
    const serious = issues.filter((v) => ["serious", "critical"].includes(v.impact));
    assert.equal(serious.length, 0, `Serious accessibility issue on ${name}: ${JSON.stringify(serious)}`);
    const app = await page.goto(`${ORIGIN}/app`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    assert.equal(app?.status(), 200, `App must return HTTP 200 on ${name}`);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 20_000 });
    await page.screenshot({ path: `ui-artifacts/app-onboarding-${name}.png`, fullPage: true });
    const appWidth = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    await page.addScriptTag({ content: axe.source });
    const appAudit = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    });
    const appIssues = appAudit.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ targets: n.target, summary: n.failureSummary })) }));
    report.push({ page: "app", viewport: name, width, overflow: appWidth, errors: consoleErrors, issues: appIssues });
    assert.equal(appIssues.filter((v) => ["serious", "critical"].includes(v.impact)).length, 0, `Application accessibility failures on ${name}: ${JSON.stringify(appIssues)}`);
    assert.ok(appWidth.document <= appWidth.viewport + 3, `App overflows on ${name}: ${JSON.stringify(appWidth)}`);
    assert.equal(consoleErrors.length, 0, `Browser errors on ${name}: ${consoleErrors.join("; ")}`);
    // Complete the real first-run path with no birth year and test the Focus dashboard.
    await page.getByLabel("Display name").fill("Avery");
    await page.getByLabel("Current learning stage").selectOption("college");
    await page.getByLabel("Career, job, or field you want to study").fill("Computer science");
    await page.getByRole("button", { name: "Continue with Focus" }).click();
    await page.locator("#focus-dashboard").waitFor({ state: "visible", timeout: 20_000 });
    await page.screenshot({ path: `ui-artifacts/focus-dashboard-${name}.png`, fullPage: true });
    const focusWidth = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(focusWidth.document <= focusWidth.viewport + 3, `Focus dashboard overflows on ${name}: ${JSON.stringify(focusWidth)}`);
    const focusAudit = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    });
    const focusIssues = focusAudit.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ targets: n.target, summary: n.failureSummary })) }));
    report.push({ page: "focus-dashboard", viewport: name, width, overflow: focusWidth, errors: consoleErrors, issues: focusIssues });
    assert.equal(focusIssues.filter((v) => ["serious", "critical"].includes(v.impact)).length, 0, `Focus accessibility failures on ${name}: ${JSON.stringify(focusIssues)}`);
    assert.equal(consoleErrors.length, 0, `Browser errors during Focus on ${name}: ${consoleErrors.join("; ")}`);
    // Create two real missions before opening Adventure. Verify populated paths,
    // subject selection, and handoff back to the same mission in Focus.
    for (const [index, subject, outcome] of [
      [0, "JavaScript", "Build and explain a small JavaScript function"],
      [1, "Discrete Math", "Solve counting and set problems independently"],
    ]) {
      if (index > 0) await page.getByRole("button", { name: /Add Goal/i }).click();
      await page.locator('form.compact-goal-form input[name="subject"]').fill(subject);
      await page.locator('form.compact-goal-form textarea[name="desiredOutcome"]').fill(outcome);
      await page.getByRole("button", { name: "Add active goal" }).click();
      const goalItem = page.locator(".compact-goal-item").filter({ hasText: subject });
      await goalItem.waitFor({ state: "visible" });
      await goalItem.getByRole("button", { name: "Generate", exact: true }).click();
      await page.locator(".mission-selector button").filter({ hasText: subject }).waitFor({ state: "visible" });
    }
    await page.screenshot({ path: `ui-artifacts/focus-populated-${name}.png`, fullPage: true });
    // Verify the dashboard additions from the supplied design references.
    await page.locator(".focus-skill-pulse").waitFor({ state: "visible" });
    if (name === "mobile") {
      assert.ok(await page.getByRole("navigation", { name: "Dashboard shortcuts" }).isVisible());
    }
    await page.locator(".focus-account-menu > summary").click();
    await page.getByRole("button", { name: "Adventure mode" }).click();
    await page.locator("form.adventure-form").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: /Enter the Learning World|Save Hero Changes/ }).click();
    const questBoard = page.locator('section[aria-label="Adventure study quest board"]');
    await questBoard.waitFor({ state: "visible", timeout: 30_000 });
    const pathSteps = questBoard.getByRole("list", { name: "Actual mission steps" }).locator("li");
    assert.ok(await pathSteps.count() >= 1, `Generated mission steps missing on ${name}`);
    const tabs = questBoard.getByRole("group", { name: "Choose an active quest" });
    assert.equal(await tabs.getByRole("button").count(), 2, "Both active quests should be selectable");
    await tabs.getByRole("button", { name: "Discrete Math" }).click();
    assert.equal(await tabs.getByRole("button", { name: "Discrete Math" }).getAttribute("aria-pressed"), "true");
    assert.ok(await questBoard.getByRole("heading", { name: "Your next quest" }).isVisible());
    assert.ok(await questBoard.getByRole("progressbar", { name: "Completed mission steps" }).count() === 1);
    await page.screenshot({ path: `ui-artifacts/adventure-quest-board-${name}.png`, fullPage: true });
    const adventureSize = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(adventureSize.document <= adventureSize.viewport + 3, `Adventure quest board overflows on ${name}: ${JSON.stringify(adventureSize)}`);
    const adventureAudit = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    });
    const adventureIssues = adventureAudit.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ targets: n.target, summary: n.failureSummary })) }));
    report.push({ page: "adventure-quest-board", viewport: name, overflow: adventureSize, errors: consoleErrors, issues: adventureIssues });
    assert.equal(adventureIssues.filter((v) => ["serious", "critical"].includes(v.impact)).length, 0, `Adventure accessibility failures on ${name}: ${JSON.stringify(adventureIssues)}`);
    assert.equal(consoleErrors.length, 0, `Browser errors during Adventure on ${name}: ${consoleErrors.join("; ")}`);
    await questBoard.getByRole("button", { name: "Continue this mission" }).click();
    await page.locator("#focus-dashboard").waitFor({ state: "visible", timeout: 20_000 });
    const selectedFocusMission = page.locator(".mission-selector button").filter({ hasText: "Discrete Math" });
    assert.equal(await selectedFocusMission.getAttribute("aria-pressed"), "true", "Returning to Focus must open the chosen quest");
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile("ui-artifacts/audit.json", JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
