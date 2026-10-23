import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const QUEST = readFileSync(new URL("../src/components/game/quest-board.tsx", import.meta.url), "utf8");
const QUEST_STYLE = readFileSync(new URL("../src/components/game/quest-board.module.css", import.meta.url), "utf8");
const FOCUS_STYLE = readFileSync(new URL("../src/app/quest-refresh.css", import.meta.url), "utf8");
const LAYOUT = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");

test("Adventure quest board uses real missions, learning topics and weekly activity", () => {
  assert.match(PAGE, /<QuestBoard\s+[\s\S]*?goals=\{activeGoals\}/);
  assert.match(PAGE, /missions=\{appState\.missions\}/);
  assert.match(PAGE, /featuredMission=\{todayMission\}/);
  assert.match(QUEST, /mission\.status === "active"/);
  assert.match(QUEST, /current\?\.steps/);
  assert.match(QUEST, /weekly\.completedMissions/);
  assert.match(QUEST, /weekly\.completedFocusPeriods/);
  assert.match(QUEST, /weekly\.uniqueStudyDays/);
  assert.match(QUEST, /goal\.learningTopics/);
  assert.match(QUEST, /aria-valuenow=\{skill\.mastery\}/);
  assert.match(QUEST, /onClick=\{onOpenFocus\}/);
});

test("Quest map and Focus use responsive layouts and keyboard-accessible controls", () => {
  assert.match(QUEST_STYLE, /@media\(max-width:650px\)/);
  assert.match(QUEST_STYLE, /:focus-visible/);
  assert.match(FOCUS_STYLE, /\.focus-mobile-navigation/);
  assert.match(FOCUS_STYLE, /@media\(max-width:720px\)/);
  assert.match(PAGE, /href="#focus-goals-title"/);
  assert.match(PAGE, /href="#focus-missions-title"/);
  assert.match(PAGE, /href="#focus-progress-title"/);
  assert.match(LAYOUT, /import "\.\/quest-refresh\.css"/);
});

test("Focus mastery summary uses topic data, not invented percentages", () => {
  assert.match(PAGE, /activeGoals\.flatMap\(\(goal\) => goal\.learningTopics\)/);
  assert.match(PAGE, /tracked\.reduce\(\(total, topic\) => total \+ topic\.mastery, 0\)/);
  assert.match(PAGE, /mastery === null \? "—"/);
  assert.match(PAGE, /aria-valuenow=\{mastery \?\? undefined\}/);
  assert.doesNotMatch(QUEST, /500 XP|Weekly Bounties|Score 80%/);
});
