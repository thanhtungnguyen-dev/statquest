import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync(new URL("../src/app/welcome/page.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/welcome/welcome.module.css", import.meta.url), "utf8");

test("landing responds to each selected learning challenge with a matching mission", () => {
  assert.match(PAGE, /const currentMission = struggles\[struggle\]\.mission/);
  assert.match(PAGE, /\{currentMission\.lead\}/);
  assert.match(PAGE, /\{currentMission\.accent\}/);
  assert.match(PAGE, /\{currentMission\.first\}/);
  assert.match(PAGE, /\{currentMission\.next\}/);
  assert.match(PAGE, /\{currentMission\.last\}/);
});

test("landing preview is explicitly illustrative and its progress is accessible", () => {
  assert.match(PAGE, /EXAMPLE MISSION/);
  assert.match(PAGE, /role="group" aria-label="Choose what you are struggling with"/);
  assert.match(PAGE, /role="progressbar" aria-label="Example mission progress"/);
  assert.match(PAGE, /aria-valuemax=\{3\} aria-valuenow=\{1\}/);
});

test("landing offers keyboard focus and accurately describes browser-only storage", () => {
  assert.match(CSS, /\.landing a:focus-visible,\.landing button:focus-visible/);
  assert.match(PAGE, /Progress stays in this browser/);
  assert.doesNotMatch(PAGE, /Progress saved on this device/);
});
