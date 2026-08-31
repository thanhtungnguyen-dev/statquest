import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const PACKAGE = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

test("Optional Timer Start Focus uses one scoped calm animated gradient", () => {
  assert.match(PAGE, /className="primary-button focus-start-button"/);
  assert.match(
    CSS,
    /\.focus-shell \.focus-session-setup \.focus-start-button\s*\{[\s\S]*?linear-gradient\(\s*135deg,[\s\S]*?background-size:[\s\S]*?animation: focus-start-gradient 8\.5s/,
  );
  assert.doesNotMatch(CSS, /\.primary-button\s*\{[^}]*focus-start-gradient/);
  assert.match(
    CSS,
    /\[data-theme="dark"\] \.focus-shell \.focus-session-setup \.focus-start-button \{\s*color: #fff;/,
  );
  assert.match(
    CSS,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.focus-shell \.focus-session-setup \.focus-start-button \{ animation: none; \}/,
  );
});

test("floating timer keeps activation while native pointer drag distinguishes movement", () => {
  assert.match(PAGE, /ref=\{floatingTimerRef\}/);
  assert.match(PAGE, /onClick=\{handleFloatingTimerClick\}/);
  assert.match(PAGE, /onPointerDown=\{beginFloatingTimerDrag\}/);
  assert.match(PAGE, /window\.addEventListener\("pointermove", updateDragPosition\)/);
  assert.match(PAGE, /window\.addEventListener\("pointerup", endDrag\)/);
  assert.match(PAGE, /window\.addEventListener\("pointercancel", endDrag\)/);
  assert.match(PAGE, /TIMER_DRAG_THRESHOLD = 6/);
  assert.match(PAGE, /suppressTimerClickRef\.current = true/);
  assert.match(PAGE, /if \(suppressTimerClickRef\.current\)[\s\S]*?scrollToCurrentTimer\(\)/);
  assert.match(PAGE, /className="floating-timer-grip"/);
  assert.match(PAGE, /aria-live="off"/);
});

test("timer position is clamped, normalized, and stored outside learning state", () => {
  assert.match(PAGE, /statquest\.focusTimerPosition\.v1/);
  assert.match(PAGE, /function clampTimerPixels/);
  assert.match(PAGE, /timerAxisBounds\(window\.innerWidth, timerWidth\)/);
  assert.match(PAGE, /window\.addEventListener\("resize", handleResize\)/);
  assert.match(PAGE, /window\.localStorage\.setItem\([\s\S]*?FOCUS_TIMER_POSITION_KEY/);
  assert.match(PAGE, /function parseFocusTimerPosition[\s\S]*?Number\.isFinite[\s\S]*?return null/);
  assert.match(PAGE, /type FocusTimerPosition = \{\s*xRatio: number;\s*yRatio: number;/);
  assert.doesNotMatch(PAGE, /StatQuestState[\s\S]{0,120}focusTimerPosition/);

  const dragHandlers = PAGE.slice(
    PAGE.indexOf("function beginFloatingTimerDrag"),
    PAGE.indexOf("function updateReview"),
  );
  assert.doesNotMatch(dragHandlers, /setAppState|totalXp|xpAwarded|focusSessions|missions:/);

  const dependencyNames = [
    ...Object.keys(PACKAGE.dependencies ?? {}),
    ...Object.keys(PACKAGE.devDependencies ?? {}),
  ].join(" ");
  assert.doesNotMatch(dependencyNames, /drag|dnd/i);
});

test("default floating timer remains safe bottom-center and drag styling is restrained", () => {
  assert.match(
    CSS,
    /\.floating-study-timer\s*\{[\s\S]*?left: 50%;[\s\S]*?bottom: max\(14px, env\(safe-area-inset-bottom\)\)[\s\S]*?transform: translateX\(-50%\)/,
  );
  assert.match(CSS, /\.floating-timer-grip[\s\S]*?cursor: grab;[\s\S]*?touch-action: none/);
  assert.match(CSS, /\.floating-study-timer\.is-dragging[\s\S]*?cursor: grabbing/);
});
