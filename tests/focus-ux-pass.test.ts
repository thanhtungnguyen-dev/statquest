import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatMissionCountdown,
  missionRemainingMilliseconds,
  plannedMissionMinutes,
} from "../src/lib/mission-timer.ts";
import {
  loadAppTheme,
  saveAppTheme,
  THEME_STORAGE_KEY,
} from "../src/lib/theme.ts";
import type { DailyMission } from "../src/lib/types.ts";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const LAYOUT = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

class ThemeStorage {
  private value: string | null = null;
  getItem(key: string) {
    return key === THEME_STORAGE_KEY ? this.value : null;
  }
  setItem(key: string, value: string) {
    if (key === THEME_STORAGE_KEY) this.value = value;
  }
}

function mission(
  overrides: Partial<DailyMission> = {},
): DailyMission {
  return {
    id: "goal:2026-08-23:1",
    goalId: "goal",
    subject: "Mathematics",
    date: "2026-08-23",
    title: "Practice",
    objective: "Complete focused practice",
    kind: "practice",
    topicId: null,
    learningTargetKey: null,
    difficulty: "hard",
    workload: "hard",
    pace: "standard",
    xp: 30,
    rewardEligible: true,
    steps: [
      { id: "one", title: "One", instruction: "Work", minutes: 15, completed: false },
      { id: "two", title: "Two", instruction: "Check", minutes: 45, completed: false },
    ],
    evidenceRequirements: [],
    completionCriteria: [],
    sourceReferences: [],
    recommendationReasons: [],
    status: "active",
    evidence: null,
    feedback: null,
    xpAwarded: false,
    rewardOpportunityId: "goal:2026-08-23:1",
    rewardDate: "2026-08-23",
    replacementOf: null,
    carryoverDecision: null,
    createdAt: "2026-08-23T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

test("theme preference defaults to light and persists light or dark", () => {
  const storage = new ThemeStorage();
  assert.equal(loadAppTheme(storage), "light");
  saveAppTheme(storage, "dark");
  assert.equal(loadAppTheme(storage), "dark");
  saveAppTheme(storage, "light");
  assert.equal(loadAppTheme(storage), "light");
});

test("Register, Welcome Back, and Focus share one pre-hydrated theme preference", () => {
  assert.match(LAYOUT, /data-theme="light"/);
  assert.match(LAYOUT, /statquest\.theme\.v1/);
  assert.equal(PAGE.match(/\{renderEntryHeader\(\)\}/g)?.length, 2);
  assert.match(PAGE, /function renderEntryHeader[\s\S]*?\{renderThemeToggle\(\)\}/);
  assert.match(PAGE, /<FocusTopbar[\s\S]*?theme=\{theme\}[\s\S]*?onThemeChange=\{changeTheme\}/);

  const adventure = PAGE.slice(
    PAGE.indexOf("function renderAdventureSetup"),
    PAGE.indexOf("if (!hydrated)"),
  );
  assert.doesNotMatch(adventure, /renderThemeToggle|theme-toggle/);
});

test("Focus themes use readable semantic colors and translucent surfaces", () => {
  assert.match(CSS, /--background: #f7f8fc/);
  assert.match(CSS, /--text: #172033/);
  assert.match(CSS, /--primary: #5865f2/);
  assert.match(CSS, /--surface: rgba\(255, 255, 255, 0\.9\)/);
  assert.match(CSS, /\[data-theme="dark"\][\s\S]*?--background: #0b1220/);
  assert.match(CSS, /\[data-theme="dark"\][\s\S]*?--text: #f4f7fc/);
  assert.match(CSS, /--surface: rgba\(18, 29, 48, 0\.9\)/);
  assert.match(CSS, /\.onboarding-card,[\s\S]*?\.focus-panel[\s\S]*?backdrop-filter: blur\(8px\)/);

  const pairs = [
    ["#172033", "#f7f8fc"],
    ["#596579", "#f7f8fc"],
    ["#ffffff", "#5865f2"],
    ["#f4f7fc", "#0b1220"],
    ["#b8c4d6", "#0b1220"],
    ["#0b1220", "#6875f5"],
  ] as const;
  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5);
  }
});

test("Minimal Register and Welcome Back panels use scoped translucent entry surfaces", () => {
  const entryPass = CSS.slice(CSS.indexOf("/* Minimal entry glass:"));
  assert.ok(entryPass.length > 0);
  assert.match(
    entryPass,
    /html\[data-theme="light"\] \.onboarding-shell > \.onboarding-card\s*\{[\s\S]*?rgba\(255, 255, 255, 0\.40\)[\s\S]*?rgba\(248, 250, 255, 0\.32\)[\s\S]*?backdrop-filter: none/,
  );
  assert.match(
    entryPass,
    /html\[data-theme="light"\] \.onboarding-shell > \.onboarding-card input,[\s\S]*?rgba\(255, 255, 255, 0\.78\)/,
  );
  assert.match(
    entryPass,
    /html\[data-theme="dark"\] \.onboarding-shell > \.onboarding-card\s*\{[\s\S]*?rgba\(7, 11, 19, 0\.46\)[\s\S]*?rgba\(11, 18, 31, 0\.36\)[\s\S]*?backdrop-filter: none/,
  );
  assert.doesNotMatch(entryPass, /\.focus-dashboard|\.page-shell|\.game-|!important/);
});

test("Focus panels keep distinct scoped gradients above calmer inner surfaces", () => {
  const surfacePass = CSS.slice(CSS.indexOf("STATQUEST FOCUS — TRANSLUCENT GRADIENT PANELS"));
  assert.ok(surfacePass.length > 0);
  assert.match(surfacePass, /html\[data-theme="light"\] \.focus-dashboard \.focus-goals-panel\s*\{[\s\S]*?rgba\(103, 92, 255, 0\.18\)/);
  assert.match(surfacePass, /html\[data-theme="light"\] \.focus-dashboard \.focus-missions-panel\s*\{[\s\S]*?rgba\(54, 165, 255, 0\.14\)/);
  assert.match(surfacePass, /html\[data-theme="light"\] \.focus-dashboard \.focus-progress-panel\s*\{[\s\S]*?rgba\(37, 204, 151, 0\.18\)/);
  assert.match(surfacePass, /\.focus-dashboard \.compact-goal-item,[\s\S]*?rgba\(255, 255, 255, 0\.70\)/);
  assert.match(surfacePass, /\.focus-dashboard \.evidence-box\s*\{[\s\S]*?rgba\(89, 101, 232, 0\.10\)/);
  assert.match(surfacePass, /\.focus-dashboard \.completion-criteria\s*\{[\s\S]*?rgba\(37, 199, 143, 0\.12\)/);
  assert.doesNotMatch(surfacePass, /\.page-shell|\.game-|!important/);
});

test("Dark Focus topbar and panels use neutral translucent depth", () => {
  assert.match(
    CSS,
    /\.focus-topbar\s*\{[\s\S]*?linear-gradient\(115deg, rgba\(11, 18, 32, \.84\), rgba\(15, 27, 46, \.77\)\)/,
  );
  assert.match(
    CSS,
    /\.focus-panel\s*\{[\s\S]*?background: var\(--surface\);[\s\S]*?backdrop-filter: blur\(8px\)/,
  );
});

test("Focus timer, abandonment, drafts, and pointer glow stay scoped and accessible", () => {
  assert.match(PAGE, /Abandon mission/);
  assert.match(PAGE, /Record<string, \{ reflection: string; evidenceUrl: string \}>/);
  assert.match(PAGE, /FOCUS SESSION/);
  assert.match(PAGE, /activeFocusSession \? [\s\S]*?selectedMission/);
  assert.match(PAGE, /nextMidnight[\s\S]*?setToday\(nextDate\)/);
  assert.match(CSS, /circle 230px at var\(--pointer-x\) var\(--pointer-y\)/);
  assert.match(CSS, /rgba\(79, 106, 230, 0\.34\)/);
  assert.match(CSS, /rgba\(43, 188, 154, 0\.28\)/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pointer-grid-glow \{ display: none; \}/);
  const pointerPass = CSS.slice(CSS.indexOf("html[data-theme=\"light\"] .pointer-grid-glow"), CSS.indexOf("/* Register / Welcome Back"));
  assert.doesNotMatch(pointerPass, /\.page-shell|\.game-/);
  assert.match(CSS, /@media \(max-width: 720px\)[\s\S]*?padding-bottom: calc\(92px \+ env\(safe-area-inset-bottom\)\)/);
});

test("theme wipe is horizontal and disabled for reduced motion", () => {
  assert.match(CSS, /focus-theme-wipe 340ms/);
  assert.match(CSS, /clip-path: inset\(0 100% 0 0\)/);
  assert.match(
    CSS,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?theme-wipe-active[\s\S]*?animation: none !important/,
  );
});

test("static Focus UI hides the caret while editable fields retain it", () => {
  assert.match(CSS, /\.onboarding-shell,[\s\S]*?\.focus-shell\s*\{[\s\S]*?caret-color: transparent/);
  assert.match(
    CSS,
    /\.onboarding-shell input,[\s\S]*?\.focus-shell textarea,[\s\S]*?caret-color: auto/,
  );
  assert.match(CSS, /\.pointer-grid-glow/);
  assert.doesNotMatch(CSS, /\.focus-shell\s*\{[^}]*user-select:\s*none/);
});

test("generated missions are estimates and never start a countdown", () => {
  const active = mission();
  const start = Date.parse(active.createdAt);
  assert.equal(plannedMissionMinutes(active), 60);
  assert.equal(missionRemainingMilliseconds(active, start), null);
  assert.equal(missionRemainingMilliseconds(active, start + 12_345), null);
  assert.match(PAGE, /Estimated \{plannedMissionMinutes\(selectedMission\)\} min/);
  assert.doesNotMatch(PAGE, /missionRemainingMilliseconds/);
});

test("mission estimates never mutate rewards while countdown formatting remains available to Focus", () => {
  const first = mission();
  const now = Date.parse("2026-08-23T12:20:00.000Z");
  const snapshot = structuredClone(first);
  assert.equal(missionRemainingMilliseconds(first, now), null);
  assert.equal(formatMissionCountdown(0), "00:00");
  assert.equal(formatMissionCountdown(3_587_655), "59:48");
  assert.deepEqual(first, snapshot);
  assert.equal(first.status, "active");
  assert.equal(first.xp, 30);
  assert.equal(first.rewardEligible, true);
});
