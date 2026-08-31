import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizePlayerClass } from "../src/lib/hero.ts";
import { getDoorDialogue, getTimeOfDay } from "../src/lib/world.ts";

const GAME_SCENE = readFileSync(
  new URL("../src/components/game/game-scene.tsx", import.meta.url),
  "utf8",
);

test("player class normalization preserves valid classes and defaults old data", () => {
  assert.equal(normalizePlayerClass("warrior"), "warrior");
  assert.equal(normalizePlayerClass("mage"), "mage");
  assert.equal(normalizePlayerClass("explorer"), "explorer");
  assert.equal(normalizePlayerClass(undefined), "warrior");
  assert.equal(normalizePlayerClass("paladin"), "warrior");
});

test("the world uses one deterministic day and night boundary", () => {
  assert.equal(getTimeOfDay(new Date(2026, 7, 21, 5, 59)), "night");
  assert.equal(getTimeOfDay(new Date(2026, 7, 21, 6, 0)), "day");
  assert.equal(getTimeOfDay(new Date(2026, 7, 21, 17, 59)), "day");
  assert.equal(getTimeOfDay(new Date(2026, 7, 21, 18, 0)), "night");
});

test("door dialogue changes with world time and selected companion", () => {
  const day = getDoorDialogue("day", "fox");
  const night = getDoorDialogue("night", "cat");

  assert.match(day.world, /locked/i);
  assert.match(day.companion, /explore somewhere else/i);
  assert.equal(day.reaction, "concerned");
  assert.match(night.world, /warm light/i);
  assert.match(night.companion, /sleeping spot/i);
  assert.equal(night.reaction, "happy");
});

test("the cottage exposes only a real door button and never uses browser alerts", () => {
  assert.match(GAME_SCENE, /className="house-door-hitbox"/);
  assert.match(GAME_SCENE, /type="button"/);
  assert.match(GAME_SCENE, /aria-label={`Knock on the house door/);
  assert.doesNotMatch(GAME_SCENE, /\balert\s*\(/);
});
