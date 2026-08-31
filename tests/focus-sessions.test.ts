import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceFocusSessions,
  cancelFocusSessionInState,
  completeFocusSessionInState,
  completeLinkedStepFocusInState,
  FOCUS_PRESETS,
  focusSessionRemainingMilliseconds,
  getActiveFocusSession,
  skipFocusBreakInState,
  startFocusBreakInState,
  startFocusSessionInState,
  weeklyStudyDates,
} from "../src/lib/focus-sessions.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import { weeklyStudyAnalytics } from "../src/lib/study-analytics.ts";
import type { DailyMission, LearningGoal, StatQuestState } from "../src/lib/types.ts";

const GOAL: LearningGoal = {
  id: "goal-focus",
  category: "learning",
  subject: "MATH 271",
  currentLevel: "intermediate",
  desiredOutcome: "Write correct proofs",
  minutesPerDay: 60,
  daysPerWeek: 4,
  deadline: "",
  referenceFiles: [],
  courseDetails: [],
  learningTopics: [],
  status: "active",
  position: 0,
  createdAt: "2026-08-19T00:00:00.000Z",
  completedAt: null,
};

const ACTIVE_MISSION: DailyMission = {
  id: "mission-focus",
  goalId: GOAL.id,
  subject: GOAL.subject,
  date: "2026-08-23",
  title: "Proof practice",
  objective: "Write one correct proof",
  kind: "practice",
  topicId: null,
  learningTargetKey: null,
  difficulty: "medium",
  workload: "medium",
  pace: "standard",
  xp: 20,
  rewardEligible: true,
  steps: [{
    id: "mission-focus:step-1",
    title: "Write the proof",
    instruction: "Complete and check the proof.",
    minutes: 25,
    completed: false,
  }],
  evidenceRequirements: [],
  completionCriteria: [],
  sourceReferences: [],
  recommendationReasons: [],
  status: "active",
  evidence: null,
  feedback: null,
  xpAwarded: false,
  rewardOpportunityId: "mission-focus",
  rewardDate: "2026-08-23",
  replacementOf: null,
  carryoverDecision: null,
  createdAt: "2026-08-23T00:00:00.000Z",
  completedAt: null,
};

function localTime(day: number, hour = 12, minute = 0): string {
  return new Date(2026, 7, day, hour, minute).toISOString();
}

function finishFocus(
  state: StatQuestState,
  id: string,
  day: number,
  minute: number,
  preset: "25/5" | "50/10" = "25/5",
  goalId: string | null = GOAL.id,
): StatQuestState {
  const startedAt = localTime(day, 12, minute);
  const duration = FOCUS_PRESETS[preset].focusMinutes * 60_000;
  let next = startFocusSessionInState(state, preset, goalId, startedAt, id);
  next = advanceFocusSessions(next, Date.parse(startedAt) + duration);
  next = completeFocusSessionInState(
    next,
    id,
    new Date(Date.parse(startedAt) + duration).toISOString(),
  );
  return skipFocusBreakInState(next, id);
}

test("Focus presets and countdown are timestamp-derived and survive cloning", () => {
  assert.deepEqual(FOCUS_PRESETS["25/5"], {
    focusMinutes: 25,
    breakMinutes: 5,
    label: "25 min focus / 5 min break",
  });
  assert.equal(FOCUS_PRESETS["50/10"].focusMinutes, 50);
  assert.equal(FOCUS_PRESETS["50/10"].breakMinutes, 10);

  const startedAt = localTime(23);
  const state = startFocusSessionInState(
    { ...EMPTY_STATE, goals: [GOAL] },
    "25/5",
    GOAL.id,
    startedAt,
    "focus-persistent",
  );
  const restored = structuredClone(state.focusSessions[0]);
  assert.equal(
    focusSessionRemainingMilliseconds(restored, Date.parse(startedAt) + 60_000),
    24 * 60_000,
  );
  assert.equal(state.missions.length, 0);
  assert.equal(state.focusSessions[0].goalId, GOAL.id);
});

test("only one standalone Focus session can run and cancellation awards nothing", () => {
  const initial = { ...EMPTY_STATE, goals: [GOAL] };
  const once = startFocusSessionInState(initial, "25/5", null, localTime(23), "one");
  const duplicate = startFocusSessionInState(once, "50/10", GOAL.id, localTime(23), "two");
  const cancelled = cancelFocusSessionInState(duplicate, "one");

  assert.equal(duplicate, once);
  assert.equal(cancelled.focusSessions[0].status, "cancelled");
  assert.equal(cancelled.totalXp, 0);
  assert.equal(cancelled.streak.current, 0);
  assert.equal(getActiveFocusSession(cancelled.focusSessions), null);
});

test("elapsed focus waits for idempotent confirmation before XP and streak", () => {
  const startedAt = localTime(23);
  let state = startFocusSessionInState(
    { ...EMPTY_STATE, goals: [GOAL] },
    "25/5",
    GOAL.id,
    startedAt,
    "confirm-me",
  );
  state = advanceFocusSessions(state, Date.parse(startedAt) + 25 * 60_000);

  assert.equal(state.focusSessions[0].status, "ready-to-complete");
  assert.equal(state.totalXp, 0);
  assert.equal(state.streak.current, 0);

  const completedAt = localTime(23, 12, 25);
  const once = completeFocusSessionInState(state, "confirm-me", completedAt);
  const twice = completeFocusSessionInState(once, "confirm-me", completedAt);
  assert.equal(once.totalXp, 5);
  assert.equal(once.streak.current, 1);
  assert.equal(once.focusSessions[0].xpAwarded, true);
  assert.equal(twice, once);
});

test("mission-linked Focus keeps the normal rewarded completion path", () => {
  const startedAt = localTime(23);
  let state = startFocusSessionInState(
    { ...EMPTY_STATE, goals: [GOAL], missions: [ACTIVE_MISSION] },
    "25/5",
    GOAL.id,
    startedAt,
    "linked-focus",
    { missionId: ACTIVE_MISSION.id, stepId: ACTIVE_MISSION.steps[0].id },
  );
  state = advanceFocusSessions(state, Date.parse(startedAt) + 25 * 60_000);
  state = completeLinkedStepFocusInState(
    state,
    "linked-focus",
    localTime(23, 12, 25),
  );

  assert.equal(state.totalXp, 5);
  assert.equal(state.focusSessions[0].xpAwarded, true);
  assert.equal(state.focusSessions[0].rewardEligible, true);
  assert.equal(state.missions[0].steps[0].completed, true);
});

test("No-goal Focus records time without XP or consuming a reward slot", () => {
  let state: StatQuestState = { ...EMPTY_STATE, goals: [GOAL] };
  for (let index = 0; index < 3; index += 1) {
    state = finishFocus(state, `independent-${index}`, 23, index * 30, "25/5", null);
  }

  assert.equal(state.totalXp, 0);
  assert.ok(state.focusSessions.every((session) => !session.rewardEligible && !session.xpAwarded));

  state = finishFocus(state, "eligible-after-independent", 23, 180, "25/5", GOAL.id);
  assert.equal(state.totalXp, 5);
  assert.equal(state.focusSessions[0].rewardEligible, true);
  assert.equal(state.focusSessions[0].xpAwarded, true);
  assert.deepEqual(weeklyStudyAnalytics(state, new Date(2026, 7, 23, 18)), {
    weekStart: "2026-08-17",
    weekEnd: "2026-08-23",
    completedFocusPeriods: 4,
    completedFocusMinutes: 100,
    completedMissions: 0,
    uniqueStudyDays: 1,
  });
});

test("first six local-date Focus completions earn XP and the seventh is practice", () => {
  let state: StatQuestState = { ...EMPTY_STATE, goals: [GOAL] };
  for (let index = 0; index < 7; index += 1) {
    state = finishFocus(state, `daily-${index}`, 23, index * 30);
  }

  const completed = [...state.focusSessions].reverse();
  assert.equal(state.totalXp, 30);
  assert.ok(completed.slice(0, 6).every((session) => session.rewardEligible && session.xpAwarded));
  assert.equal(completed[6].rewardEligible, false);
  assert.equal(completed[6].xpAwarded, false);
  assert.equal(state.streak.current, 1);
});

test("breaks award zero XP and release the standalone timer when complete", () => {
  let state = finishFocus(
    { ...EMPTY_STATE, goals: [GOAL] },
    "with-break",
    23,
    0,
  );
  const completed = state.focusSessions[0];
  state = {
    ...state,
    focusSessions: [{ ...completed, phase: "focus", status: "completed" }],
  };
  const xpBeforeBreak = state.totalXp;
  state = startFocusBreakInState(state, "with-break", localTime(23, 13));
  state = advanceFocusSessions(state, Date.parse(localTime(23, 13, 5)));

  assert.equal(state.focusSessions[0].phase, "break");
  assert.equal(state.focusSessions[0].status, "completed");
  assert.equal(state.totalXp, xpBeforeBreak);
  assert.equal(getActiveFocusSession(state.focusSessions), null);
});

test("weekly target counts unique linked local dates and shares study-day streak", () => {
  let state: StatQuestState = {
    ...EMPTY_STATE,
    goals: [GOAL],
    streak: { current: 1, longest: 1, lastCompletionDate: "2026-08-24" },
    missions: [
      {
        id: "mission-complete",
        goalId: GOAL.id,
        subject: GOAL.subject,
        date: "2026-08-24",
        title: "Proof practice",
        objective: "Write a proof",
        kind: "practice",
        topicId: null,
        learningTargetKey: null,
        difficulty: "medium",
        workload: "medium",
        pace: "standard",
        xp: 20,
        rewardEligible: true,
        steps: [],
        evidenceRequirements: [],
        completionCriteria: [],
        sourceReferences: [],
        recommendationReasons: [],
        status: "completed",
        evidence: null,
        feedback: null,
        xpAwarded: true,
        rewardOpportunityId: "mission-complete",
        rewardDate: "2026-08-24",
        replacementOf: null,
        carryoverDecision: null,
        createdAt: localTime(24, 9),
        completedAt: localTime(24, 10),
      },
    ],
  };
  state = finishFocus(state, "same-day", 24, 0);
  assert.equal(state.streak.current, 1);
  state = finishFocus(state, "next-day", 25, 0);
  assert.equal(state.streak.current, 2);

  const weekDate = new Date(2026, 7, 25, 12);
  assert.deepEqual(weeklyStudyDates(state, GOAL.id, weekDate), ["2026-08-24", "2026-08-25"]);
});
