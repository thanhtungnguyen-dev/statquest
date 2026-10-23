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
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile("ui-artifacts/audit.json", JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
