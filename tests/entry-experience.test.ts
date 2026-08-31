import assert from "node:assert/strict";
import test from "node:test";
import { deriveEntryExperience } from "../src/lib/entry-experience.ts";
import { generateDailyMission } from "../src/lib/mission-generator.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import type {
  DailyMission,
  FocusSession,
  LearningGoal,
  StatQuestState,
} from "../src/lib/types.ts";

function goal(overrides: Partial<LearningGoal> = {}): LearningGoal {
  return {
    id: "entry-goal",
    category: "learning",
    subject: "Discrete Mathematics",
    currentLevel: "intermediate",
    desiredOutcome: "Write correct proofs",
    minutesPerDay: 60,
    daysPerWeek: 4,
    deadline: "",
    referenceFiles: [],
    courseDetails: [],
    learningTopics: [{
      id: "logic",
      title: "Predicates and quantifiers",
      status: "unseen",
      mastery: 0,
      lastStudiedAt: null,
      nextReviewDate: null,
      attemptCount: 0,
      successCount: 0,
      sourceReferences: [],
    }],
    status: "active",
    position: 0,
    createdAt: "2026-08-19T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function activeMission(
  learningGoal: LearningGoal,
  id: string,
  createdAt: string,
): DailyMission {
  return {
    ...generateDailyMission(learningGoal, "standard", "2026-08-24"),
    id,
    steps: generateDailyMission(
      learningGoal,
      "standard",
      "2026-08-24",
    ).steps.map((step, index) => ({
      ...step,
      id: `${id}:step-${index + 1}`,
    })),
    rewardOpportunityId: id,
    createdAt,
  };
}

function linkedFocus(
  mission: DailyMission,
  id: string,
  startedAt: string,
  status: FocusSession["status"] = "completed",
): FocusSession {
  return {
    id,
    goalId: mission.goalId,
    missionId: mission.id,
    stepId: mission.steps.find((step) => !step.completed)?.id ?? mission.steps[0].id,
    focusMinutes: 25,
    breakMinutes: 5,
    phase: "focus",
    status,
    startedAt,
    endsAt: new Date(new Date(startedAt).getTime() + 25 * 60_000).toISOString(),
    completedAt: status === "completed"
      ? new Date(new Date(startedAt).getTime() + 25 * 60_000).toISOString()
      : null,
    rewardEligible: false,
    xpAwarded: false,
  };
}

test("Welcome Back resumes the exact active mission and current unfinished step", () => {
  const learningGoal = goal();
  const generated = generateDailyMission(learningGoal, "standard", "2026-08-24");
  const mission = {
    ...generated,
    steps: generated.steps.map((step, index) => ({
      ...step,
      completed: index === 0,
    })),
  };
  const state: StatQuestState = {
    ...EMPTY_STATE,
    goals: [learningGoal],
    missions: [mission],
  };
  const result = deriveEntryExperience(state, "2026-08-24");

  assert.equal(result.resume?.missionId, mission.id);
  assert.equal(result.resume?.stepNumber, 2);
  assert.equal(result.resume?.stepTitle, mission.steps[1].title);
  assert.equal(
    result.resume?.remainingMinutes,
    mission.steps.slice(1).reduce((total, step) => total + step.minutes, 0),
  );
  assert.equal(result.recommendation, null);
  assert.equal(result.guardianMessage, "Step 2 is ready.");
});

test("an active linked Focus session outranks newer active missions", () => {
  const firstGoal = goal({ id: "first-goal", position: 0 });
  const secondGoal = goal({ id: "second-goal", subject: "French", position: 1 });
  const focused = activeMission(
    firstGoal,
    "focused-mission",
    "2026-08-20T10:00:00.000Z",
  );
  focused.steps[0].completed = true;
  const newer = activeMission(
    secondGoal,
    "newer-mission",
    "2026-08-24T10:00:00.000Z",
  );
  const focus = linkedFocus(
    focused,
    "current-focus",
    "2026-08-24T12:00:00.000Z",
    "ready-to-complete",
  );
  const result = deriveEntryExperience({
    ...EMPTY_STATE,
    goals: [firstGoal, secondGoal],
    missions: [newer, focused],
    focusSessions: [focus],
  }, "2026-08-24");

  assert.equal(result.resume?.missionId, focused.id);
  assert.equal(result.resume?.stepNumber, 2);
  assert.equal(result.resume?.stepTitle, focused.steps[1].title);
});

test("most recent linked Focus history selects the real latest mission context", () => {
  const firstGoal = goal({ id: "first-goal", position: 0 });
  const secondGoal = goal({ id: "second-goal", subject: "French", position: 1 });
  const first = activeMission(
    firstGoal,
    "first-mission",
    "2026-08-24T11:00:00.000Z",
  );
  const second = activeMission(
    secondGoal,
    "second-mission",
    "2026-08-20T11:00:00.000Z",
  );
  const result = deriveEntryExperience({
    ...EMPTY_STATE,
    goals: [firstGoal, secondGoal],
    missions: [first, second],
    focusSessions: [
      linkedFocus(first, "older-focus", "2026-08-22T12:00:00.000Z"),
      linkedFocus(second, "latest-focus", "2026-08-24T12:00:00.000Z"),
    ],
  }, "2026-08-24");

  assert.equal(result.resume?.missionId, second.id);
});

test("stale and unlinked Focus sessions fall back to newest active mission without mutation", () => {
  const firstGoal = goal({ id: "first-goal", position: 0 });
  const secondGoal = goal({ id: "second-goal", subject: "French", position: 1 });
  const older = activeMission(
    firstGoal,
    "older-mission",
    "2026-08-20T11:00:00.000Z",
  );
  const newest = activeMission(
    secondGoal,
    "newest-mission",
    "2026-08-24T11:00:00.000Z",
  );
  const stale = {
    ...linkedFocus(older, "stale-focus", "2026-08-24T12:00:00.000Z", "active"),
    missionId: "missing-mission",
  };
  const unlinked = {
    ...linkedFocus(older, "unlinked-focus", "2026-08-24T13:00:00.000Z"),
    goalId: null,
    missionId: null,
    stepId: null,
  };
  const state: StatQuestState = {
    ...EMPTY_STATE,
    goals: [firstGoal, secondGoal],
    missions: [older, newest],
    focusSessions: [stale, unlinked],
  };
  const before = JSON.stringify(state);
  const result = deriveEntryExperience(state, "2026-08-24");

  assert.equal(result.resume?.missionId, newest.id);
  assert.equal(JSON.stringify(state), before);
});

test("derived recommendations never create or persist a mission during render", () => {
  const state: StatQuestState = { ...EMPTY_STATE, goals: [goal()] };
  const before = JSON.stringify(state);
  const result = deriveEntryExperience(state, "2026-08-24");

  assert.equal(result.resume, null);
  assert.equal(result.recommendation?.topicId, "logic");
  assert.equal(result.recommendation?.kind, "learn");
  assert.equal(result.guardianMessage, "Your next learning target is ready.");
  assert.notEqual(result.guardianMessage, "You're clear for today.");
  assert.equal(JSON.stringify(state), before);
  assert.equal(state.missions.length, 0);
});

test("guardian and Today plan use real review, assessment, and weekly signals", () => {
  const sourceReference = {
    fileId: "syllabus",
    fileName: "syllabus.txt",
    excerpt: "Quiz 1 date: August 28, 2026",
  };
  const learningGoal = goal({
    courseDetails: [{
      id: "assessment",
      kind: "assessment",
      title: "Quiz 1",
      date: "2026-08-28",
      confirmed: true,
      sourceReference,
    }],
    learningTopics: [{
      ...goal().learningTopics[0],
      status: "comfortable",
      mastery: 70,
      attemptCount: 2,
      successCount: 2,
      nextReviewDate: "2026-08-24",
    }],
  });
  const state: StatQuestState = { ...EMPTY_STATE, goals: [learningGoal] };
  const result = deriveEntryExperience(state, "2026-08-24");

  assert.equal(result.guardianMessage, "Your next review is ready.");
  assert.equal(result.plan.reviewsDue, 1);
  assert.equal(result.plan.assessment?.title, "Quiz 1");
  assert.equal(result.plan.assessment?.daysUntil, 4);
  assert.deepEqual(result.plan.weekly, { completedDays: 0, targetDays: 4 });
});

test("empty learning state renders an honest no-work recommendation", () => {
  const result = deriveEntryExperience(EMPTY_STATE, "2026-08-24");
  assert.equal(result.resume, null);
  assert.equal(result.recommendation, null);
  assert.equal(result.plan.assessment, null);
  assert.equal(result.plan.weekly, null);
  assert.match(result.introduction, /Open Focus when you're ready/i);
  assert.equal(result.guardianMessage, "You're clear for today.");
});
