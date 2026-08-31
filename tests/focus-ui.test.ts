import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("Focus no longer presents queue or one-reward-per-day behavior", () => {
  assert.doesNotMatch(PAGE, /Add goal to queue|unlock the next queued goal|one active focus/i);
  assert.doesNotMatch(PAGE, /rewardEarnedToday|daily XP already earned/i);
  assert.match(PAGE, /New goals are active immediately/);
  assert.match(PAGE, /rewarded missions/);
});

test("selected mission safely determines the evidence completion target", () => {
  assert.match(PAGE, /const missionId = selectedMission\.id/);
  assert.match(PAGE, /setSelectedMissionId\(mission\.id\)/);
  assert.match(PAGE, /Record<string, \{ reflection: string; evidenceUrl: string \}>/);
  assert.match(PAGE, /evidenceDrafts\[selectedMission\.id\]/);
  assert.doesNotMatch(PAGE, /setEvidenceText|setEvidenceUrl/);
});

test("deadline is optional and empty deadlines render without formatting", () => {
  const deadlineField = PAGE.match(/<input\s+name="deadline"[\s\S]*?\/>/)?.[0] ?? "";
  assert.ok(deadlineField);
  assert.doesNotMatch(deadlineField, /required/);
  assert.match(PAGE, /goal\.deadline \? formatDate\(goal\.deadline\) : "No deadline"/);
});

test("recommended missions are generated for review before Focus starts", () => {
  const recommendationHandler = PAGE.slice(
    PAGE.indexOf("function studyRecommended"),
    PAGE.indexOf("function cancelFocus"),
  );
  const existingMissionBranch = recommendationHandler.slice(
    recommendationHandler.indexOf("if (existing)"),
    recommendationHandler.indexOf("try {"),
  );
  const generatedMissionBranch = recommendationHandler.slice(
    recommendationHandler.indexOf("try {"),
  );

  assert.match(existingMissionBranch, /startMissionStepFocus\(existing\.id\)/);
  assert.match(generatedMissionBranch, /setAppState\(generated\)/);
  assert.match(generatedMissionBranch, /setSelectedMissionId\(mission\.id\)/);
  assert.doesNotMatch(
    generatedMissionBranch,
    /startFocusSessionInState|setFocusRoomOpen\(true\)/,
  );
  const recommendedEmptyBranch = PAGE.match(
    /recommendedGoal && recommendedTarget \? \(\s*(<div className="empty-state compact focus-empty">[\s\S]*?<\/div>)\s*\) : \(/,
  )?.[1] ?? "";

  assert.match(PAGE, /recommendedActiveMission \? "Resume unfinished step" : "Generate mission"/);
  assert.match(recommendedEmptyBranch, /Recommended mission ready to generate/);
  assert.doesNotMatch(recommendedEmptyBranch, /No active missions/);
});

test("desktop lists are bounded while mobile returns to normal page scrolling", () => {
  assert.match(CSS, /\.focus-dashboard\s*\{[\s\S]*?height: calc\(100svh - 80px\)/);
  assert.match(
    CSS,
    /\.focus-scroll-list,[\s\S]*?\.compact-goal-form\s*\{[\s\S]*?overflow-y: auto/,
  );
  assert.match(
    CSS,
    /@media \(max-width: 720px\)[\s\S]*?\.focus-scroll-list,[\s\S]*?overflow-y: visible/,
  );
  assert.match(CSS, /\.focus-dashboard\s*\{[\s\S]*?grid-template-columns:/);
});

test("file disclosure shows deterministic recognized and general statuses", () => {
  assert.match(PAGE, /<details className="goal-files-disclosure">/);
  assert.match(PAGE, /Ready · context recognized/);
  assert.match(PAGE, /Ready · general context only/);
  assert.doesNotMatch(PAGE, /sourceReferences\.map/);
});
