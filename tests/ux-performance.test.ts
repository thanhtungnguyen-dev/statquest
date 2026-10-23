import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const WELCOME = readFileSync(new URL("../src/app/welcome/page.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const LANDING = readFileSync(new URL("../src/app/welcome/welcome.module.css", import.meta.url), "utf8");
const CHARACTER = readFileSync(new URL("../src/components/game/character.tsx", import.meta.url), "utf8");
const LOGO = readFileSync(new URL("../src/components/brand/statquest-logo.tsx", import.meta.url), "utf8");

test("the optional intro is brief, remembered, and keyboard accessible", () => {
  assert.match(WELCOME, /localStorage\.getItem\(INTRO_KEY\)/);
  assert.match(WELCOME, /localStorage\.setItem\(INTRO_KEY, "1"\)/);
  assert.match(WELCOME, /opening: \["question", 1300\]/);
  assert.match(WELCOME, /question: \["exit", 1400\]/);
  assert.match(WELCOME, /exit: \["done", 700\]/);
  assert.match(WELCOME, /skipRef\.current\?\.focus/);
  assert.match(WELCOME, /startRef\.current\?\.focus/);
  assert.match(WELCOME, /prefers-reduced-motion: reduce/);
  assert.match(LANDING, /introExit \.7s/);
});

test("responsive companion artwork uses the Next.js optimizer", () => {
  assert.match(CHARACTER, /import Image from "next\/image"/);
  assert.equal((CHARACTER.match(/<Image\b/g) ?? []).length, 2);
  assert.doesNotMatch(CHARACTER, /<img\b/);
  assert.match(CHARACTER, /loading=\{entryAsset \? "eager" : "lazy"\}/);
  assert.match(CHARACTER, /sizes="\(max-width: 600px\) 160px/);
  assert.doesNotMatch(LOGO, /unoptimized/);
});

test("small-screen reading and active logo theme survive old CSS cleanup", () => {
  assert.match(CSS, /\.focus-stat-kicker \{ font-size: 11px; \}/);
  assert.doesNotMatch(CSS, /\.brand-mark\.statquest-mark/);
  assert.match(CSS, /\/\* STATQUEST_DOM_LOGO_FIX_START \*\//);
  assert.match(CSS, /html\[data-theme="dark"\] \.statquest-logo > \.statquest-logo-dark \{ display: block; \}/);
  assert.match(LANDING, /\.eyebrow\{font-size:11px/);
  assert.doesNotMatch(WELCOME, /One step closer\./);
});
