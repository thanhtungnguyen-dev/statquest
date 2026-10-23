import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EMPTY_PROFILE_DRAFT, validateProfileDraft } from "../src/lib/profile.ts";

const LANDING = readFileSync(new URL("../src/app/welcome/page.tsx", import.meta.url), "utf8");
const STYLES = readFileSync(new URL("../src/app/welcome/welcome.module.css", import.meta.url), "utf8");
const POLISH = readFileSync(new URL("../src/app/polish.css", import.meta.url), "utf8");
const ROOT = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const ADVENTURE = readFileSync(new URL("../src/components/game/adventure-onboarding.tsx", import.meta.url), "utf8");

test("Adventure birth year is optional but valid when supplied", () => {
  const draft = { ...EMPTY_PROFILE_DRAFT, heroSelected: true, displayName: "Alex", learningStage: "college" as const, careerInterest: "math", birthYear: "" };
  assert.deepEqual(validateProfileDraft(draft, 2026), {});
  assert.match(ADVENTURE, /birthYear: number \| null/);
  assert.match(ADVENTURE, /Birth year \(optional\)/);
  assert.match(ADVENTURE, /draft\.birthYear\.trim\(\) \? Number\(draft\.birthYear\) : null/);
  assert.match(validateProfileDraft({ ...draft, birthYear: "99" }, 2026).birthYear ?? "", /four-digit/i);
});

test("Landing describes real features and supports the stored application theme", () => {
  assert.match(LANDING, /More than a to-do list/);
  assert.match(LANDING, /Clearing browser data can erase saved progress/);
  assert.match(LANDING, /role="group" aria-label="Choose what you are struggling with"/);
  assert.match(LANDING, /aria-pressed=\{theme === "dark"\}/);
  assert.match(LANDING, /statquest\.theme\.v1/);
  assert.match(STYLES, /html\[data-theme="dark"\]/);
});

test("Shared styling supports readable controls and visible keyboard focus", () => {
  assert.match(ROOT, /import "\.\/polish\.css"/);
  assert.match(POLISH, /--sq-readable-xs: 12px/);
  assert.match(POLISH, /min-height: var\(--sq-touch-target\)/);
  assert.match(POLISH, /:focus-visible/);
  assert.match(POLISH, /prefers-reduced-motion:reduce/);
});
