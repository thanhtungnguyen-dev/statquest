import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  addMissionIfAbsent,
  generateDailyMission,
  generateMissionForGoal,
  hasRecognizedSourceContext,
  latestReviewForGoal,
  MAX_ACTIVE_MISSIONS,
  missionTimePlan,
  nextMissionId,
} from "../src/lib/mission-generator.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import type { DailyMission, LearningGoal } from "../src/lib/types.ts";

const GOAL: LearningGoal = {
  id: "goal-1",
  category: "learning",
  subject: "Full-Stack Web Development",
  currentLevel: "beginner",
  desiredOutcome: "Build a working StatQuest MVP",
  minutesPerDay: 240,
  daysPerWeek: 6,
  deadline: "2026-09-30",
  referenceFiles: [],
  courseDetails: [],
  learningTopics: [],
  status: "active",
  position: 0,
  createdAt: "2026-08-19T00:00:00.000Z",
  completedAt: null,
};

test("generates a focused web mission using all available minutes", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const totalMinutes = mission.steps.reduce(
    (total, step) => total + step.minutes,
    0,
  );

  assert.equal(mission.title, "Finish one focused programming result");
  assert.equal(mission.goalId, GOAL.id);
  assert.equal(mission.status, "active");
  assert.equal(mission.difficulty, "easy");
  assert.equal(mission.workload, "hard");
  assert.equal(mission.xp, 30);
  assert.equal(mission.rewardEligible, true);
  assert.equal(mission.steps.length, 4);
  assert.equal(totalMinutes, 240);
  assert.ok(mission.steps.every((step) => !step.completed));
});

function learnerFacingFields(mission: DailyMission) {
  return {
    title: mission.title,
    objective: mission.objective,
    steps: mission.steps.map(({ title, instruction, minutes }) => ({
      title,
      instruction,
      minutes,
    })),
    evidenceRequirements: mission.evidenceRequirements,
    completionCriteria: mission.completionCriteria,
  };
}

function missionPlanningFields(mission: DailyMission) {
  return {
    goalId: mission.goalId,
    kind: mission.kind,
    topicId: mission.topicId,
    difficulty: mission.difficulty,
    workload: mission.workload,
    xp: mission.xp,
    rewardEligible: mission.rewardEligible,
    minutes: mission.steps.map((step) => step.minutes),
  };
}

test("birth year remains metadata and does not alter a generated mission", () => {
  const youngerBirthYear = generateDailyMission(
    { ...GOAL, subject: "Mathematics" },
    "standard",
    "2026-08-19",
    {
      birthYear: 2008,
      learningStage: "college",
      careerInterest: "",
    },
  );
  const olderBirthYear = generateDailyMission(
    { ...GOAL, subject: "Mathematics" },
    "standard",
    "2026-08-19",
    {
      birthYear: 1980,
      learningStage: "college",
      careerInterest: "",
    },
  );

  assert.deepEqual(
    learnerFacingFields(youngerBirthYear),
    learnerFacingFields(olderBirthYear),
  );
  assert.deepEqual(
    missionPlanningFields(youngerBirthYear),
    missionPlanningFields(olderBirthYear),
  );
});

test("learning stage changes scaffolding without changing mission planning", () => {
  const neutral = generateDailyMission(
    { ...GOAL, subject: "Mathematics", currentLevel: "intermediate", minutesPerDay: 45 },
    "standard",
    "2026-08-19",
    { birthYear: null, learningStage: "other", careerInterest: "" },
  );
  const college = generateDailyMission(
    { ...GOAL, subject: "Mathematics", currentLevel: "intermediate", minutesPerDay: 45 },
    "standard",
    "2026-08-19",
    { birthYear: null, learningStage: "college", careerInterest: "" },
  );

  assert.notEqual(neutral.steps[0].instruction, college.steps[0].instruction);
  assert.match(college.steps[0].instruction, /assumptions|definitions|reasoning/i);
  assert.deepEqual(missionPlanningFields(neutral), missionPlanningFields(college));
});

test("career interest appears only in a naturally contextual generic mission", () => {
  const contextualGoal = {
    ...GOAL,
    subject: "Professional communication",
    currentLevel: "intermediate" as const,
    desiredOutcome: "Deliver a clear five-minute briefing",
  };
  const contextual = generateDailyMission(
    contextualGoal,
    "standard",
    "2026-08-19",
    { birthYear: null, learningStage: "other", careerInterest: "nursing" },
  );
  const unrelatedMath = generateDailyMission(
    { ...GOAL, subject: "Discrete Mathematics", currentLevel: "intermediate" },
    "standard",
    "2026-08-19",
    { birthYear: null, learningStage: "other", careerInterest: "software engineering" },
  );

  assert.match(JSON.stringify(learnerFacingFields(contextual)), /nursing/i);
  assert.doesNotMatch(
    JSON.stringify(learnerFacingFields(unrelatedMath)),
    /software engineering/i,
  );
  assert.deepEqual(
    missionPlanningFields(contextual),
    missionPlanningFields(generateDailyMission(contextualGoal, "standard", "2026-08-19")),
  );
});

test("learner context never changes exact source-grounded requirements", () => {
  const groundedGoal: LearningGoal = {
    ...GOAL,
    subject: "Discrete Mathematics",
    referenceFiles: [{
      id: "source-context",
      name: "practice.txt",
      kind: "text",
      mimeType: "text/plain",
      size: 180,
      status: "ready",
      progress: 100,
      extractedText: "Practice requirement: Complete Questions 1–4 and justify every quantifier rule used in each negation.",
      extractionError: null,
      addedAt: "2026-08-19T00:00:00.000Z",
    }],
  };
  const mission = generateDailyMission(
    groundedGoal,
    "standard",
    "2026-08-19",
    {
      birthYear: 2008,
      learningStage: "professional",
      careerInterest: "software engineering",
    },
  );
  const visibleText = JSON.stringify(learnerFacingFields(mission));

  assert.match(visibleText, /Complete Questions 1–4/);
  assert.match(visibleText, /justify every quantifier rule/i);
  assert.doesNotMatch(visibleText, /software engineering|profile says|because your profile/i);
  assert.equal(mission.sourceReferences[0]?.fileId, "source-context");
});

test("a second same-day goal mission can be practice without more XP", () => {
  const mission = generateDailyMission(
    GOAL,
    "standard",
    "2026-08-19",
    undefined,
    false,
  );

  assert.equal(mission.rewardEligible, false);
  assert.equal(mission.xp, 0);
});

test("pace does not adjust cognitive difficulty or time-based XP", () => {
  const standard = generateDailyMission(GOAL, "standard", "2026-08-19");
  const stretch = generateDailyMission(GOAL, "stretch", "2026-08-20");

  assert.equal(standard.difficulty, "easy");
  assert.equal(standard.xp, 30);
  assert.equal(stretch.difficulty, "easy");
  assert.equal(stretch.xp, 30);
});

test("one goal creates one stable mission id per date", () => {
  const first = generateDailyMission(GOAL, "standard", "2026-08-19");
  const second = generateDailyMission(GOAL, "standard", "2026-08-19");
  const tomorrow = generateDailyMission(GOAL, "standard", "2026-08-20");

  assert.equal(first.id, second.id);
  assert.notEqual(first.id, tomorrow.id);
});

test("uploaded course material changes the mission and remains cited", () => {
  const groundedGoal: LearningGoal = {
    ...GOAL,
    subject: "Discrete Mathematics",
    referenceFiles: [
      {
        id: "file-1",
        name: "Lecture-2-and-practice.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 420,
        status: "ready",
        progress: 100,
        extractedText:
          "Lecture 2: Predicates and quantifiers.\nPractice Sheet: Complete Questions 1–4 by writing the negation of each statement and naming the quantifier rule used.\nLearning outcome: Translate quantified statements and test whether each negation is logically equivalent.",
        extractionError: null,
        addedAt: "2026-08-19T00:00:00.000Z",
      },
    ],
  };

  const mission = generateDailyMission(
    groundedGoal,
    "standard",
    "2026-08-19",
  );

  const visibleText = JSON.stringify(learnerFacingFields(mission));

  assert.equal(
    mission.title,
    "Complete Questions 1–4 by writing the negation of each statement and naming the quantifier rule used",
  );
  assert.match(mission.objective, /Predicates and quantifiers|Questions 1–4/i);
  assert.ok(mission.steps.some((step) => /Questions 1–4/.test(step.instruction)));
  assert.equal(mission.sourceReferences[0]?.fileName, "Lecture-2-and-practice.txt");
  assert.equal(
    mission.sourceReferences[0]?.excerpt,
    "Practice Sheet: Complete Questions 1–4 by writing the negation of each statement and naming the quantifier rule used.",
  );
  assert.ok(mission.completionCriteria.length >= 3);
  assert.doesNotMatch(visibleText, /Lecture-2-and-practice\.txt|Practice Sheet:/);
  assert.doesNotMatch(
    visibleText,
    /Open [“"]|locate|Work directly from|Compare with|source-grounded|cited source/i,
  );
  assert.doesNotMatch(visibleText, /Question 5|Lecture 3/);
});

test("meta-only reference text falls back to the normal flexible mission", () => {
  const noSource = generateDailyMission(GOAL, "standard", "2026-08-19");
  const metaOnlyGoal: LearningGoal = {
    ...GOAL,
    referenceFiles: [
      {
        id: "file-meta",
        name: "conversation.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 220,
        status: "ready",
        progress: 100,
        extractedText:
          "Give me the project brief again.\nCan you summarize this?\nHere is the document.\nPlease explain this again.\nThanks.",
        extractionError: null,
        addedAt: "2026-08-19T00:00:00.000Z",
      },
    ],
  };
  const withMeta = generateDailyMission(
    metaOnlyGoal,
    "standard",
    "2026-08-19",
  );

  assert.deepEqual(learnerFacingFields(withMeta), learnerFacingFields(noSource));
  assert.deepEqual(withMeta.sourceReferences, []);
  assert.doesNotMatch(
    JSON.stringify(learnerFacingFields(withMeta)),
    /Give me the project brief again|summarize this|Here is the document/i,
  );
});

test("insufficient or failed extraction blocks misleading mission generation", () => {
  const unreadableGoal: LearningGoal = {
    ...GOAL,
    referenceFiles: [
      {
        id: "file-error",
        name: "blurred-notes.jpg",
        kind: "image",
        mimeType: "image/jpeg",
        size: 1024,
        status: "error",
        progress: 0,
        extractedText: "",
        extractionError: "No readable text found.",
        addedAt: "2026-08-19T00:00:00.000Z",
      },
    ],
  };

  assert.throws(
    () => generateDailyMission(unreadableGoal, "standard", "2026-08-19"),
    /do not contain enough readable course detail/i,
  );
});

test("duplicate mission generation commits exactly one goal-date mission", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const once = addMissionIfAbsent(
    { ...EMPTY_STATE, missions: [] },
    mission,
  );
  const duplicateId = addMissionIfAbsent(once, mission);
  const duplicateGoalDate = addMissionIfAbsent(once, {
    ...mission,
    id: "accidental-second-id",
  });

  assert.equal(once.missions.length, 1);
  assert.equal(duplicateId, once);
  assert.equal(duplicateGoalDate, once);
});

test("time controls workload and XP while cognitive difficulty stays separate", () => {
  assert.deepEqual(missionTimePlan(30), {
    xp: 10,
    workload: "easy",
  });
  assert.equal(missionTimePlan(31).workload, "medium");
  assert.equal(missionTimePlan(31).xp, 20);
  assert.equal(missionTimePlan(59).workload, "medium");
  assert.equal(missionTimePlan(59).xp, 20);
  assert.equal(missionTimePlan(60).workload, "hard");
  assert.equal(missionTimePlan(60).xp, 30);

  const easy = generateDailyMission(
    { ...GOAL, minutesPerDay: 30, currentLevel: "advanced" },
    "stretch",
    "2026-08-19",
    undefined,
    true,
    { mood: "struggling" },
  );
  const medium = generateDailyMission(
    { ...GOAL, minutesPerDay: 31, currentLevel: "beginner" },
    "light",
    "2026-08-20",
    undefined,
    true,
    { mood: "tired" },
  );
  const hard = generateDailyMission(
    { ...GOAL, minutesPerDay: 60, currentLevel: "beginner" },
    "standard",
    "2026-08-21",
  );

  assert.equal(easy.steps.length, 2);
  assert.equal(medium.steps.length, 3);
  assert.equal(hard.steps.length, 4);
  assert.notDeepEqual(
    easy.steps.map((step) => step.title),
    medium.steps.map((step) => step.title),
  );
  assert.equal(easy.difficulty, "hard");
  assert.equal(easy.workload, "easy");
  assert.equal(easy.xp, 10);
  assert.equal(medium.difficulty, "easy");
  assert.equal(medium.workload, "medium");
  assert.equal(medium.xp, 20);
});

test("active mission limits are global and goal scoped", () => {
  const goals = Array.from({ length: 6 }, (_, index) => ({
    ...GOAL,
    id: `goal-${index + 1}`,
    subject: `Course ${index + 1}`,
  }));
  let state = { ...EMPTY_STATE, goals };

  state = generateMissionForGoal(state, goals[0].id, "2026-08-23");
  assert.equal(
    generateMissionForGoal(state, goals[0].id, "2026-08-23"),
    state,
  );
  for (const goal of goals.slice(1, MAX_ACTIVE_MISSIONS)) {
    state = generateMissionForGoal(state, goal.id, "2026-08-23");
  }
  assert.equal(state.missions.filter((mission) => mission.status === "active").length, 5);
  assert.throws(
    () => generateMissionForGoal(state, goals[5].id, "2026-08-23"),
    /5 active missions/i,
  );
});

test("same goal and date can create later missions without reusing ordinals", () => {
  const existing = generateDailyMission(
    GOAL,
    "standard",
    "2026-08-23",
    undefined,
    true,
    { id: `${GOAL.id}:2026-08-23:7` },
  );
  const state = {
    ...EMPTY_STATE,
    goals: [GOAL],
    missions: [{ ...existing, status: "completed" as const }],
  };
  const next = generateMissionForGoal(state, GOAL.id, "2026-08-23");

  assert.equal(nextMissionId(state.missions, GOAL.id, "2026-08-23"), `${GOAL.id}:2026-08-23:8`);
  assert.equal(next.missions[0].id, `${GOAL.id}:2026-08-23:8`);
  assert.equal(next.missions.length, 2);
});

test("the first five missions per mission date are eligible and later ones are practice", () => {
  const goals = Array.from({ length: 6 }, (_, index) => ({
    ...GOAL,
    id: `reward-goal-${index + 1}`,
  }));
  let state = { ...EMPTY_STATE, goals };
  for (const goal of goals) {
    state = generateMissionForGoal(state, goal.id, "2026-08-23");
    state = {
      ...state,
      missions: state.missions.map((mission) =>
        mission.id === state.missions[0].id
          ? { ...mission, status: "completed" as const }
          : mission,
      ),
    };
  }

  const ordered = [...state.missions].reverse();
  assert.ok(ordered.slice(0, 5).every((mission) => mission.rewardEligible));
  assert.equal(ordered[5].rewardEligible, false);
  assert.equal(ordered[5].xp, 0);
});

test("source recognition distinguishes reliable facts from readable meta text", () => {
  const reliable = {
    id: "reliable",
    name: "practice.txt",
    kind: "text" as const,
    mimeType: "text/plain",
    size: 100,
    status: "ready" as const,
    progress: 100,
    extractedText: "Practice: Complete Questions 1–4 and show every rule used.",
    extractionError: null,
    addedAt: "2026-08-19T00:00:00.000Z",
  };
  const meta = { ...reliable, id: "meta", extractedText: "Give me the project brief again." };

  assert.equal(hasRecognizedSourceContext([reliable], "Mathematics"), true);
  assert.equal(hasRecognizedSourceContext([meta], "Mathematics"), false);
});

test("short weak ready files fall back without leaking excerpts", () => {
  const noSource = generateDailyMission(GOAL, "standard", "2026-08-23");
  const weak = generateDailyMission(
    {
      ...GOAL,
      referenceFiles: [{
        id: "weak",
        name: "note.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 20,
        status: "ready",
        progress: 100,
        extractedText: "Study this again.",
        extractionError: null,
        addedAt: "2026-08-23T00:00:00.000Z",
      }],
    },
    "standard",
    "2026-08-23",
  );

  assert.deepEqual(learnerFacingFields(weak), learnerFacingFields(noSource));
  assert.deepEqual(weak.sourceReferences, []);
});

test("goal-scoped review and mood adapt strategy without changing XP or difficulty", () => {
  const goalB = { ...GOAL, id: "goal-b", subject: "English" };
  const review = {
    id: "review-a",
    goalId: GOAL.id,
    weekStart: "2026-08-17",
    win: "Finished practice",
    obstacle: "I checked hints too early",
    nextFocus: "proof structure",
    nextMissionPace: "light" as const,
    createdAt: "2026-08-23T00:00:00.000Z",
  };
  const base = {
    ...EMPTY_STATE,
    goals: [GOAL, goalB],
    mood: "tired" as const,
    moodDate: "2026-08-23",
    weeklyReviews: [review],
  };
  const withA = generateMissionForGoal(base, GOAL.id, "2026-08-23");
  const withBoth = generateMissionForGoal(withA, goalB.id, "2026-08-23");
  const missionA = withBoth.missions.find((mission) => mission.goalId === GOAL.id)!;
  const missionB = withBoth.missions.find((mission) => mission.goalId === goalB.id)!;
  const aText = JSON.stringify(learnerFacingFields(missionA));
  const bText = JSON.stringify(learnerFacingFields(missionB));

  assert.match(aText, /proof structure/i);
  assert.match(aText, /Focus this session on proof structure within/i);
  assert.doesNotMatch(aText, /learner-selected focus/i);
  assert.match(aText, /independent attempt/i);
  assert.match(aText, /less novelty/i);
  assert.doesNotMatch(bText, /proof structure|independent attempt/i);
  assert.equal(missionA.difficulty, "easy");
  assert.equal(missionA.workload, "hard");
  assert.equal(missionA.xp, 30);
});

test("easy missions keep preparation and execution coherent across domain families", () => {
  const goals = [
    { subject: "Discrete Mathematics", desiredOutcome: "Write sound proofs" },
    { subject: "TypeScript Programming", desiredOutcome: "Build a tested feature" },
    { subject: "French language", desiredOutcome: "Speak accurately" },
    { subject: "Career interview", desiredOutcome: "Prepare strong examples" },
    { subject: "Biology", desiredOutcome: "Explain the current unit" },
  ];
  for (const [index, details] of goals.entries()) {
    const mission = generateDailyMission(
      { ...GOAL, ...details, id: `easy-${index}`, minutesPerDay: 30 },
      "standard",
      "2026-08-23",
    );
    assert.equal(mission.steps.length, 2);
    assert.equal(mission.steps.reduce((sum, step) => sum + step.minutes, 0), 30);
    assert.equal(mission.steps[0].title, "Prepare and complete one focused result");
    assert.match(mission.steps[1].title, /correction|check/i);
  }

  const grounded = generateDailyMission(
    {
      ...GOAL,
      id: "easy-grounded",
      subject: "Discrete Mathematics",
      minutesPerDay: 30,
      referenceFiles: [{
        id: "practice-file",
        name: "practice.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 200,
        status: "ready",
        progress: 100,
        extractedText: "Practice requirement: Complete Questions 1–4 and justify every quantifier rule used in each negation.",
        extractionError: null,
        addedAt: "2026-08-23T00:00:00.000Z",
      }],
    },
    "standard",
    "2026-08-23",
  );
  assert.equal(grounded.steps.length, 2);
  assert.match(grounded.steps[0].instruction, /Questions 1–4/);
  assert.match(grounded.steps[1].instruction, /check|correct|verify/i);
});

test("current level changes cognitive difficulty without changing workload or XP", () => {
  const beginner = generateDailyMission(
    { ...GOAL, currentLevel: "beginner", minutesPerDay: 45 },
    "standard",
    "2026-08-23",
  );
  const intermediate = generateDailyMission(
    { ...GOAL, currentLevel: "intermediate", minutesPerDay: 45 },
    "standard",
    "2026-08-23",
  );
  const advanced = generateDailyMission(
    { ...GOAL, currentLevel: "advanced", minutesPerDay: 45 },
    "standard",
    "2026-08-23",
  );
  assert.match(beginner.steps[0].instruction, /trace one small working example|explicit check/i);
  assert.doesNotMatch(intermediate.steps[0].instruction, /trace one small working example|failure condition/i);
  assert.match(advanced.steps[0].instruction, /independently from retrieval|failure condition/i);
  assert.equal(beginner.difficulty, "easy");
  assert.equal(intermediate.difficulty, "medium");
  assert.equal(advanced.difficulty, "hard");
  for (const mission of [beginner, intermediate, advanced]) {
    assert.equal(mission.workload, "medium");
    assert.equal(mission.xp, 20);
    assert.equal(mission.steps.reduce((sum, step) => sum + step.minutes, 0), 45);
  }
});

test("latest review is deterministic by createdAt then weekStart", () => {
  const reviews = [
    { id: "old", goalId: GOAL.id, weekStart: "2026-08-10", win: "", obstacle: "", nextFocus: "old", nextMissionPace: "standard" as const, createdAt: "2026-08-20T00:00:00.000Z" },
    { id: "newer-week", goalId: GOAL.id, weekStart: "2026-08-24", win: "", obstacle: "", nextFocus: "fallback", nextMissionPace: "standard" as const, createdAt: "2026-08-23T00:00:00.000Z" },
    { id: "same-created", goalId: GOAL.id, weekStart: "2026-08-17", win: "", obstacle: "", nextFocus: "same", nextMissionPace: "standard" as const, createdAt: "2026-08-23T00:00:00.000Z" },
  ];
  assert.equal(latestReviewForGoal(reviews, GOAL.id)?.id, "newer-week");
});

test("unknown review obstacles are stored context but do not invent strategy", () => {
  const plain = generateDailyMission(GOAL, "standard", "2026-08-23");
  const unknown = generateDailyMission(
    GOAL,
    "standard",
    "2026-08-23",
    undefined,
    true,
    {
      review: {
        id: "review",
        goalId: GOAL.id,
        weekStart: "2026-08-17",
        win: "A win",
        obstacle: "The room was purple",
        nextFocus: "",
        nextMissionPace: "standard",
        createdAt: "2026-08-23T00:00:00.000Z",
      },
    },
  );
  assert.deepEqual(learnerFacingFields(unknown), learnerFacingFields(plain));
});

test("the normal learner UI does not render internal source references", () => {
  const pageSource = readFileSync(
    new URL("../src/app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /Grounded in your files/);
  assert.doesNotMatch(pageSource, /todayMission\.sourceReferences\.map/);
});
