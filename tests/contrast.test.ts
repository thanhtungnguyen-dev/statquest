import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

test("normal text token pairs meet WCAG AA contrast", () => {
  const pairs = [
    ["#f4f8ff", "#050912", "primary text"],
    ["#bcc9dc", "#0f1928", "secondary text"],
    ["#9cadc5", "#09121f", "placeholder text"],
    ["#78f7a0", "#0f1928", "green status text"],
    ["#ff9da8", "#0f1928", "error text"],
    ["#a8c9ff", "#0f1928", "link text"],
    ["#c2ccda", "#344154", "disabled text"],
    ["#b2c5c2", "#11271f", "completed step text"],
    ["#06120a", "#78f7a0", "primary button text"],
  ] as const;

  for (const [foreground, background, label] of pairs) {
    assert.ok(
      contrast(foreground, background) >= 4.5,
      `${label} contrast was ${contrast(foreground, background).toFixed(2)}:1`,
    );
  }
});

test("ambient visuals stop for reduced motion and completed text stays explicit", () => {
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(CSS, /body::before \{ animation: none; \}/);
  assert.doesNotMatch(CSS, /\.step-completed\s*\{[^}]*opacity/);
  assert.match(CSS, /\.step-completed p \{ color: #b2c5c2; \}/);
});
