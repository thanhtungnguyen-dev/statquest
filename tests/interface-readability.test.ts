import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const LANDING = readFileSync(new URL("../src/app/welcome/welcome.module.css", import.meta.url), "utf8");
const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");

test("Focus labels and action targets remain legible", () => {
  assert.match(CSS, /\.focus-progress-item small,\s*\.focus-stat-kicker\s*\{[^}]*font-size: 10px/);
  assert.match(CSS, /\.mission-feedback-panel fieldset label\s*\{[^}]*font-size: 12px/);
  assert.match(CSS, /\.focus-room-audio label\s*\{[^}]*font-size: 12px/);
  assert.match(CSS, /\.focus-audio-input-row button\s*\{[^}]*min-height: 40px[^}]*font-size: 12px/);
});

test("Landing supporting text is legible", () => {
  assert.match(LANDING, /\.previewNumber\s*\{[^}]*font-size:12px/);
  assert.match(LANDING, /\.closing>p\s*\{[^}]*font-size:12px/);
});

test("Onboarding gives a clear next action and honest storage information", () => {
  assert.match(PAGE, /What would you like to work on next\?/);
  assert.match(PAGE, /Saved in this browser\./);
  assert.doesNotMatch(PAGE, /Stored on this device\./);
});
