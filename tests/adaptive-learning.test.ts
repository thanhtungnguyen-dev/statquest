import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendNextTarget,
  selectNextTargetForGoal,
  weeklySchedulePressure,
} from "../src/lib/adaptive-learning.ts";
import {
  extractCourseDetails,
  mergeExtractedCourseDetails,
} from "../src/lib/course-context.ts";
import {
  advanceFocusSessions,
  completeLinkedStepFocusInState,
  continueLinkedFocusInState,
  getActiveFocusSession,
  startFocusSessionInState,
} from "../src/lib/focus-sessions.ts";
import {
  applyFeedbackToGoal,
  classifyLearningOutcome,
  missionKindForTopic,
} from "../src/lib/learning-map.ts";
import {
  generateDailyMission,
  generateMissionForGoal,
  replaceActiveMissionInState,
} from "../src/lib/mission-generator.ts";
import {
  applyMissionFeedbackInState,
  continueOldMissionInState,
  skipOldMissionInState,
} from "../src/lib/progress.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import type {
  CourseDetail,
  DailyMission,
  GoalReferenceFile,
  LearningGoal,
  LearningTopic,
  MissionFeedback,
  StatQuestState,
} from "../src/lib/types.ts";

function topic(
  id: string,
  status: LearningTopic["status"],
  overrides: Partial<LearningTopic> = {},
): LearningTopic {
  const attemptCount = status === "unseen" ? 0 : 1;
  return {
    id,
    title: id === "logic" ? "Predicates and quantifiers" : "Proof structure",
    status,
    mastery:
      status === "unseen"
        ? 0
        : status === "weak"
          ? 25
          : status === "learning"
            ? 45
            : status === "comfortable"
              ? 70
              : 90,
    lastStudiedAt: attemptCount ? "2026-08-20T12:00:00.000Z" : null,
    nextReviewDate: null,
    attemptCount,
    successCount: attemptCount,
    sourceReferences: [],
    ...overrides,
  };
}

function goal(overrides: Partial<LearningGoal> = {}): LearningGoal {
  return {
    id: "goal-adaptive",
    category: "learning",
    subject: "Discrete Mathematics",
    currentLevel: "intermediate",
    desiredOutcome: "Write correct proofs",
    minutesPerDay: 60,
    daysPerWeek: 4,
    deadline: "",
    referenceFiles: [],
    courseDetails: [],
    learningTopics: [topic("logic", "unseen"), topic("proofs", "weak")],
    status: "active",
    position: 0,
    createdAt: "2026-08-19T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

function targetFor(
  learningGoal: LearningGoal,
  selectedTopic: LearningTopic,
  kind: DailyMission["kind"],
) {
  return {
    goalId: learningGoal.id,
    topicId: selectedTopic.id,
    topicTitle: selectedTopic.title,
    kind,
    difficulty: "medium" as const,
    estimatedMinutes: learningGoal.minutesPerDay,
    reasons: ["Test recommendation"],
  };
}

function generatedMission(
  learningGoal: LearningGoal,
  selectedTopic = learningGoal.learningTopics[0],
  date = "2026-08-24",
): DailyMission {
  return generateDailyMission(
    learningGoal,
    "standard",
    date,
    undefined,
    true,
    { target: targetFor(learningGoal, selectedTopic, missionKindForTopic(selectedTopic, date)) },
  );
}

test("mission kinds follow unseen, weak, due-review, and comfortable rules", () => {
  assert.equal(missionKindForTopic(topic("a", "unseen"), "2026-08-24"), "learn");
  assert.equal(missionKindForTopic(topic("a", "weak"), "2026-08-24"), "practice");
  assert.equal(
    missionKindForTopic(
      topic("a", "comfortable", { nextReviewDate: "2026-08-24" }),
      "2026-08-24",
    ),
    "review",
  );
  assert.equal(missionKindForTopic(topic("a", "mastered"), "2026-08-24"), "apply");
});

test("mission kinds use genuinely distinct learning structures", () => {
  const learningGoal = goal({ minutesPerDay: 60 });
  const selectedTopic = learningGoal.learningTopics[0];
  const missions = (["learn", "practice", "review", "apply"] as const).map((kind) =>
    generateDailyMission(
      learningGoal,
      "standard",
      "2026-08-24",
      undefined,
      true,
      { target: targetFor(learningGoal, selectedTopic, kind) },
    ),
  );

  assert.equal(new Set(missions.map((mission) => mission.steps[0].title)).size, 4);
  assert.match(JSON.stringify(missions[0].steps), /Define and retrieve|guided first attempt/i);
  assert.match(JSON.stringify(missions[1].steps), /Solve independently|Redo the hardest problem/i);
  assert.match(JSON.stringify(missions[2].steps), /closed-book|Retrieve again/i);
  assert.match(JSON.stringify(missions[3].steps), /justify the method|edge or failure case|tradeoff/i);
});

test("each mission kind uses wording that fits the learning domain", () => {
  const cases = [
    {
      subject: "TypeScript Programming",
      patterns: [
        /working example|implementation stages/i,
        /implementation plan|debug/i,
        /behavior, API, or implementation pattern/i,
        /implementation context|failure condition/i,
      ],
    },
    {
      subject: "Discrete Mathematics",
      patterns: [
        /worked example|theorem used/i,
        /definitions, conditions|problem or proof/i,
        /theorem conditions|solution method/i,
        /mathematical setting|counterexample|alternate method/i,
      ],
    },
    {
      subject: "French language",
      patterns: [
        /sentence, exchange|meaning, form/i,
        /grammar, vocabulary|without a script/i,
        /words, forms, meanings|new sentence/i,
        /speaking, writing|register|language choices/i,
      ],
    },
    {
      subject: "Career interview",
      patterns: [
        /model response|evidence, structure/i,
        /response structure|critique/i,
        /criteria, examples|own words/i,
        /professional scenario|realistic follow-up/i,
      ],
    },
    {
      subject: "Biology",
      patterns: [
        /concrete example|explicit stages/i,
        /decision process|hardest part/i,
        /concept, conditions|without help/i,
        /less familiar context|meaningful constraint/i,
      ],
    },
  ];

  for (const [caseIndex, domainCase] of cases.entries()) {
    const learningGoal = goal({
      id: `domain-${caseIndex}`,
      subject: domainCase.subject,
      minutesPerDay: 60,
    });
    const selectedTopic = learningGoal.learningTopics[0];
    for (const [kindIndex, kind] of (["learn", "practice", "review", "apply"] as const).entries()) {
      const mission = generateDailyMission(
        learningGoal,
        "standard",
        "2026-08-24",
        undefined,
        true,
        { target: targetFor(learningGoal, selectedTopic, kind) },
      );
      assert.match(
        JSON.stringify({ objective: mission.objective, steps: mission.steps }),
        domainCase.patterns[kindIndex],
        `${domainCase.subject} ${kind} wording should fit its domain`,
      );
    }
  }
});

test("an explicit source task stays intact across pedagogical mission kinds", () => {
  const requirement = "Complete Questions 1–4 and justify every quantifier rule used";
  const learningGoal = goal({
    minutesPerDay: 60,
    referenceFiles: [{
      id: "practice",
      name: "practice.txt",
      kind: "text",
      mimeType: "text/plain",
      size: 180,
      status: "ready",
      progress: 100,
      extractedText: `Practice: ${requirement}.`,
      extractionError: null,
      addedAt: "2026-08-24T12:00:00.000Z",
    }],
  });
  const selectedTopic = learningGoal.learningTopics[0];

  for (const kind of ["learn", "practice", "review", "apply"] as const) {
    const mission = generateDailyMission(
      learningGoal,
      "standard",
      "2026-08-24",
      undefined,
      true,
      { target: targetFor(learningGoal, selectedTopic, kind) },
    );
    assert.equal(mission.title, requirement);
    assert.match(JSON.stringify(mission.steps), /Questions 1–4/);
    assert.match(mission.learningTargetKey ?? "", /^source:practice:question:/);
  }
});

test("feedback classification distinguishes strong, ordinary, assisted, and weak outcomes", () => {
  const base = {
    difficulty: "about-right" as const,
    submittedAt: "2026-08-24T18:05:00.000Z",
  };
  assert.equal(classifyLearningOutcome({ ...base, confidence: 5, reasons: ["independent"] }), "strong-success");
  assert.equal(classifyLearningOutcome({ ...base, confidence: 3, reasons: ["independent"] }), "success");
  assert.equal(classifyLearningOutcome({ ...base, confidence: 5, reasons: ["needed-hints"] }), "assisted");
  assert.equal(classifyLearningOutcome({ ...base, confidence: 2, reasons: ["independent"] }), "weak");
});

test("workload and XP come from minutes while cognitive difficulty does not", () => {
  const beginner = generatedMission(goal({ currentLevel: "beginner" }));
  const advanced = generatedMission(goal({ currentLevel: "advanced" }));
  assert.equal(beginner.workload, "hard");
  assert.equal(advanced.workload, "hard");
  assert.equal(beginner.xp, 30);
  assert.equal(advanced.xp, 30);
  assert.equal(beginner.difficulty, "medium");
  assert.equal(advanced.difficulty, "medium");

  const beginnerState = {
    ...EMPTY_STATE,
    goals: [goal({ currentLevel: "beginner", learningTopics: [topic("logic", "unseen")] })],
  };
  const advancedState = {
    ...EMPTY_STATE,
    goals: [goal({ currentLevel: "advanced", learningTopics: [topic("logic", "unseen")] })],
  };
  assert.equal(
    generateMissionForGoal(beginnerState, "goal-adaptive", "2026-08-24").missions[0].difficulty,
    "easy",
  );
  assert.equal(
    generateMissionForGoal(advancedState, "goal-adaptive", "2026-08-24").missions[0].difficulty,
    "hard",
  );
});

test("recently completed topics are skipped unless review is deliberately due", () => {
  const learningGoal = goal();
  const recent = {
    ...generatedMission(learningGoal, learningGoal.learningTopics[0], "2026-08-23"),
    status: "completed" as const,
    completedAt: "2026-08-23T18:00:00.000Z",
  };
  const state = { ...EMPTY_STATE, goals: [learningGoal], missions: [recent] };
  assert.equal(selectNextTargetForGoal(state, learningGoal.id, "2026-08-24")?.topicId, "proofs");

  const onlyRecent = {
    ...state,
    goals: [{ ...learningGoal, learningTopics: [learningGoal.learningTopics[0]] }],
  };
  assert.equal(selectNextTargetForGoal(onlyRecent, learningGoal.id, "2026-08-24"), null);

  const reviewGoal = {
    ...learningGoal,
    learningTopics: [
      topic("logic", "comfortable", { nextReviewDate: "2026-08-24" }),
    ],
  };
  assert.equal(
    selectNextTargetForGoal(
      { ...state, goals: [reviewGoal] },
      reviewGoal.id,
      "2026-08-24",
    )?.kind,
    "review",
  );
});

test("review due outranks weakness and confirmed nearby assessments add urgency", () => {
  const reference = {
    fileId: "syllabus",
    fileName: "syllabus.txt",
    excerpt: "Topic: Predicates and quantifiers",
  };
  const details: CourseDetail[] = [
    {
      id: "course-detail:syllabus:0:topic",
      kind: "topic",
      title: "Predicates and quantifiers",
      date: null,
      confirmed: true,
      sourceReference: reference,
    },
    {
      id: "course-detail:syllabus:1:assessment",
      kind: "assessment",
      title: "Quiz 1: August 28, 2026",
      date: "2026-08-28",
      confirmed: true,
      sourceReference: {
        ...reference,
        excerpt: "Quiz 1: August 28, 2026",
      },
    },
  ];
  const learningGoal = goal({
    courseDetails: details,
    learningTopics: [
      topic("logic", "comfortable", {
        nextReviewDate: "2026-08-24",
        sourceReferences: [reference],
      }),
      topic("proofs", "weak"),
    ],
  });
  const recommendation = recommendNextTarget(
    { ...EMPTY_STATE, goals: [learningGoal] },
    "2026-08-24",
  );
  assert.equal(recommendation?.topicId, "logic");
  assert.equal(recommendation?.kind, "review");
  assert.ok(recommendation?.reasons.includes("Review due today"));
  assert.ok(recommendation?.reasons.some((reason) => /Quiz in 4 days/i.test(reason)));
});

test("structured details stay unconfirmed until the learner approves them", () => {
  const file: GoalReferenceFile = {
    id: "course-file",
    name: "course.txt",
    kind: "text",
    mimeType: "text/plain",
    size: 200,
    status: "ready",
    progress: 100,
    extractedText:
      "Topic: Predicates and quantifiers\nQuiz 1 date: August 28, 2026\nLearning outcome: Negate quantified statements correctly.",
    extractionError: null,
    addedAt: "2026-08-24T12:00:00.000Z",
  };
  const details = extractCourseDetails([file]);
  assert.deepEqual(details.map((detail) => detail.kind), ["topic", "assessment", "outcome"]);
  assert.ok(details.every((detail) => !detail.confirmed));
  assert.equal(details.find((detail) => detail.kind === "assessment")?.date, "2026-08-28");
});

test("reviewed uploads cannot influence planning until a detail is confirmed", () => {
  const file: GoalReferenceFile = {
    id: "course-file",
    name: "course.txt",
    kind: "text",
    mimeType: "text/plain",
    size: 200,
    status: "ready",
    progress: 100,
    extractedText: "Topic: Predicates and quantifiers\nPractice: Complete Questions 1-4.",
    extractionError: null,
    addedAt: "2026-08-24T12:00:00.000Z",
  };
  const learningGoal = goal({
    referenceFiles: [file],
    courseDetails: extractCourseDetails([file]),
    courseContextReviewed: true,
  });
  const beforeConfirmation = generatedMission(learningGoal);
  assert.equal(beforeConfirmation.sourceReferences.length, 0);
  assert.doesNotMatch(beforeConfirmation.title, /Questions 1-4/i);

  const confirmedGoal = {
    ...learningGoal,
    courseDetails: learningGoal.courseDetails.map((detail) => ({
      ...detail,
      confirmed: true,
    })),
  };
  const afterConfirmation = generatedMission(confirmedGoal);
  assert.ok(afterConfirmation.sourceReferences.length > 0);
  assert.match(JSON.stringify(afterConfirmation), /Predicates and quantifiers/i);
});

test("refreshing one file does not restore a detail removed from another file", () => {
  const makeFile = (id: string, extractedText: string): GoalReferenceFile => ({
    id,
    name: `${id}.txt`,
    kind: "text",
    mimeType: "text/plain",
    size: 100,
    status: "ready",
    progress: 100,
    extractedText,
    extractionError: null,
    addedAt: "2026-08-24T12:00:00.000Z",
  });
  const first = makeFile("first", "Topic: Predicates and quantifiers");
  const second = makeFile("second", "Topic: Proof by contradiction");
  const currentAfterRemoval = extractCourseDetails([first, second]).filter(
    (detail) => detail.sourceReference.fileId !== first.id,
  );
  const refreshed = mergeExtractedCourseDetails(currentAfterRemoval, [second]);
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].sourceReference.fileId, second.id);
});

test("unrelated source facts from different files are never combined", () => {
  const learningGoal = goal({
    learningTopics: [],
    referenceFiles: [
      {
        id: "questions",
        name: "questions.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 100,
        status: "ready",
        progress: 100,
        extractedText: "Practice: Complete Questions 1–4 and justify every answer carefully.",
        extractionError: null,
        addedAt: "2026-08-24T12:00:00.000Z",
      },
      {
        id: "unrelated",
        name: "biology.txt",
        kind: "text",
        mimeType: "text/plain",
        size: 100,
        status: "ready",
        progress: 100,
        extractedText: "Topic: Cellular respiration and mitochondrial membranes.",
        extractionError: null,
        addedAt: "2026-08-24T12:00:00.000Z",
      },
    ],
  });
  const mission = generateDailyMission(learningGoal, "standard", "2026-08-24");
  assert.equal(mission.title, "Complete Questions 1–4 and justify every answer carefully");
  assert.ok(mission.sourceReferences.every((source) => source.fileId === "questions"));
  assert.doesNotMatch(
    JSON.stringify({ title: mission.title, objective: mission.objective, steps: mission.steps }),
    /Cellular respiration|mitochondrial/i,
  );
});

test("mission feedback updates mastery and review timing without awarding XP", () => {
  const learningGoal = goal({
    learningTopics: [topic("logic", "learning", { mastery: 45 })],
  });
  const mission = {
    ...generatedMission(learningGoal),
    status: "completed" as const,
    completedAt: "2026-08-24T18:00:00.000Z",
  };
  const state: StatQuestState = {
    ...EMPTY_STATE,
    goals: [learningGoal],
    missions: [mission],
    totalXp: 130,
  };
  const feedback: MissionFeedback = {
    difficulty: "difficult",
    confidence: 2,
    reasons: ["forgot-concepts"],
    submittedAt: "2026-08-24T18:05:00.000Z",
  };
  const once = applyMissionFeedbackInState(state, mission.id, feedback);
  const twice = applyMissionFeedbackInState(once, mission.id, feedback);
  const updated = once.goals[0].learningTopics[0];
  assert.equal(once.totalXp, 130);
  assert.equal(once.streak, state.streak);
  assert.equal(updated.status, "weak");
  assert.equal(updated.nextReviewDate, "2026-08-25");
  assert.equal(once.missions[0].feedback?.confidence, 2);
  assert.equal(twice, once);
});

test("confident repeated success expands the deterministic review interval", () => {
  const learningGoal = goal({
    learningTopics: [topic("logic", "learning", { mastery: 45, successCount: 0 })],
  });
  const feedback: MissionFeedback = {
    difficulty: "about-right",
    confidence: 5,
    reasons: ["independent"],
    submittedAt: "2026-08-24T18:05:00.000Z",
  };
  const firstMission = {
    ...generatedMission(learningGoal),
    status: "completed" as const,
    completedAt: "2026-08-24T18:00:00.000Z",
  };
  const first = applyFeedbackToGoal(learningGoal, firstMission, feedback);
  assert.equal(first.learningTopics[0].nextReviewDate, "2026-08-31");
  const secondMission = {
    ...generatedMission(first),
    status: "completed" as const,
    completedAt: "2026-08-31T18:00:00.000Z",
  };
  const second = applyFeedbackToGoal(first, secondMission, {
    ...feedback,
    submittedAt: "2026-08-31T18:05:00.000Z",
  });
  assert.equal(second.learningTopics[0].nextReviewDate, "2026-09-14");
  const third = applyFeedbackToGoal(second, {
    ...generatedMission(second, second.learningTopics[0], "2026-09-14"),
    status: "completed" as const,
    completedAt: "2026-09-14T18:00:00.000Z",
  }, {
    ...feedback,
    submittedAt: "2026-09-14T18:05:00.000Z",
  });
  assert.equal(third.learningTopics[0].nextReviewDate, "2026-10-12");
  const fourth = applyFeedbackToGoal(third, {
    ...generatedMission(third, third.learningTopics[0], "2026-10-12"),
    status: "completed" as const,
    completedAt: "2026-10-12T18:00:00.000Z",
  }, {
    ...feedback,
    submittedAt: "2026-10-12T18:05:00.000Z",
  });
  assert.equal(fourth.learningTopics[0].nextReviewDate, "2026-11-11");
});

test("assisted outcomes return sooner than independent success", () => {
  const learningGoal = goal({
    learningTopics: [topic("logic", "learning", { mastery: 45, successCount: 0 })],
  });
  const mission = {
    ...generatedMission(learningGoal),
    status: "completed" as const,
    completedAt: "2026-08-24T18:00:00.000Z",
  };
  const assisted = applyFeedbackToGoal(learningGoal, mission, {
    difficulty: "about-right",
    confidence: 5,
    reasons: ["needed-hints"],
    submittedAt: "2026-08-24T18:05:00.000Z",
  });
  const independent = applyFeedbackToGoal(learningGoal, mission, {
    difficulty: "about-right",
    confidence: 5,
    reasons: ["independent"],
    submittedAt: "2026-08-24T18:05:00.000Z",
  });
  assert.equal(assisted.learningTopics[0].nextReviewDate, "2026-08-26");
  assert.equal(independent.learningTopics[0].nextReviewDate, "2026-08-31");
  assert.ok(assisted.learningTopics[0].mastery < independent.learningTopics[0].mastery);
});

test("completed concrete source tasks do not repeat as ordinary work but remain available for review", () => {
  const sourceReference = {
    fileId: "practice",
    fileName: "practice.txt",
    excerpt: "Practice: Complete Questions 1–4 and justify every quantifier rule used.",
  };
  const referenceFile: GoalReferenceFile = {
    id: "practice",
    name: "practice.txt",
    kind: "text",
    mimeType: "text/plain",
    size: 180,
    status: "ready",
    progress: 100,
    extractedText: sourceReference.excerpt,
    extractionError: null,
    addedAt: "2026-08-24T12:00:00.000Z",
  };
  const ordinaryGoal = goal({ referenceFiles: [referenceFile] });
  const first = generateMissionForGoal(
    { ...EMPTY_STATE, goals: [ordinaryGoal] },
    ordinaryGoal.id,
    "2026-08-24",
  ).missions[0];
  const completed = {
    ...first,
    status: "completed" as const,
    completedAt: "2026-08-24T18:00:00.000Z",
  };
  const ordinaryNext = generateMissionForGoal(
    { ...EMPTY_STATE, goals: [ordinaryGoal], missions: [completed] },
    ordinaryGoal.id,
    "2026-08-27",
  ).missions.find((mission) => mission.status === "active")!;
  assert.notEqual(ordinaryNext.learningTargetKey, first.learningTargetKey);

  const reviewTopic = topic("logic", "comfortable", {
    title: "Complete Questions 1–4",
    nextReviewDate: "2026-08-27",
    sourceReferences: [sourceReference],
  });
  const reviewGoal = goal({
    referenceFiles: [referenceFile],
    learningTopics: [reviewTopic],
  });
  const reviewMission = generateMissionForGoal(
    {
      ...EMPTY_STATE,
      goals: [reviewGoal],
      missions: [{ ...completed, goalId: reviewGoal.id, topicId: reviewTopic.id }],
    },
    reviewGoal.id,
    "2026-08-27",
  ).missions.find((mission) => mission.status === "active")!;
  assert.equal(reviewMission.kind, "review");
  assert.equal(reviewMission.learningTargetKey, first.learningTargetKey);
});

test("weekly schedule pressure counts unique study days and stays lower priority than learning need", () => {
  const learningGoal = goal({ daysPerWeek: 5 });
  const completed = {
    ...generatedMission(learningGoal),
    status: "completed" as const,
    completedAt: "2026-08-24T18:00:00.000Z",
  };
  const state = {
    ...EMPTY_STATE,
    goals: [learningGoal],
    missions: [
      completed,
      { ...completed, id: "same-day", completedAt: "2026-08-24T20:00:00.000Z" },
    ],
  };
  const pressure = weeklySchedulePressure(state, learningGoal, "2026-08-27");
  assert.equal(pressure.completedDays, 1);
  assert.equal(pressure.remainingTargetDays, 4);
  assert.equal(pressure.remainingCalendarDays, 4);
  assert.equal(pressure.score, 12);
  assert.match(pressure.reason ?? "", /4 study days remaining/i);

  const recommendation = recommendNextTarget(state, "2026-08-27");
  assert.equal(recommendation?.topicId, "proofs");
  assert.match(recommendation?.reasons.join(" ") ?? "", /difficult last time/i);
});

test("replacement and adjustments preserve one reward opportunity", () => {
  const learningGoal = goal();
  const generated = generateMissionForGoal(
    { ...EMPTY_STATE, goals: [learningGoal] },
    learningGoal.id,
    "2026-08-23",
  );
  const original = generated.missions[0];
  const replaced = replaceActiveMissionInState(
    generated,
    original.id,
    "2026-08-24",
  );
  const firstReplacement = replaced.missions.find((mission) => mission.status === "active")!;
  assert.equal(firstReplacement.rewardOpportunityId, original.rewardOpportunityId);
  assert.equal(firstReplacement.rewardDate, original.rewardDate);
  assert.equal(firstReplacement.xp, original.xp);
  assert.equal(replaced.totalXp, generated.totalXp);
  assert.equal(replaced.missions.find((mission) => mission.id === original.id)?.carryoverDecision, "replaced");

  const adjusted = replaceActiveMissionInState(
    replaced,
    firstReplacement.id,
    "2026-08-24",
    "more-challenge",
  );
  const secondReplacement = adjusted.missions.find((mission) => mission.status === "active")!;
  assert.equal(secondReplacement.rewardOpportunityId, original.rewardOpportunityId);
  assert.equal(
    new Set(
      adjusted.missions
        .filter((mission) => mission.rewardEligible)
        .map((mission) => mission.rewardOpportunityId),
    ).size,
    1,
  );
});

test("Continue and Skip handle old missions without automatic punishment", () => {
  const learningGoal = goal();
  const mission = generatedMission(learningGoal, learningGoal.learningTopics[0], "2026-08-23");
  const state = { ...EMPTY_STATE, goals: [learningGoal], missions: [mission] };
  const continued = continueOldMissionInState(state, mission.id, "2026-08-24");
  assert.equal(continued.missions[0].status, "active");
  assert.equal(continued.missions[0].carryoverDecision, "continued");
  assert.equal(continued.totalXp, 0);

  const skipped = skipOldMissionInState(state, mission.id, "2026-08-24");
  assert.equal(skipped.missions[0].status, "abandoned");
  assert.equal(skipped.missions[0].carryoverDecision, "skipped");
  assert.equal(skipped.totalXp, 0);
});

test("mission-linked Focus stores exact IDs and timer expiry never completes the step", () => {
  const learningGoal = goal();
  const mission = generatedMission(learningGoal);
  const step = mission.steps[0];
  const startedAt = "2026-08-24T12:00:00.000Z";
  let state = startFocusSessionInState(
    { ...EMPTY_STATE, goals: [learningGoal], missions: [mission] },
    "25/5",
    learningGoal.id,
    startedAt,
    "linked-focus",
    { missionId: mission.id, stepId: step.id },
  );
  assert.equal(state.focusSessions[0].missionId, mission.id);
  assert.equal(state.focusSessions[0].stepId, step.id);
  state = advanceFocusSessions(state, Date.parse(startedAt) + 25 * 60_000);
  assert.equal(state.focusSessions[0].status, "ready-to-complete");
  assert.equal(state.missions[0].steps[0].completed, false);

  const completed = completeLinkedStepFocusInState(
    state,
    "linked-focus",
    "2026-08-24T12:25:00.000Z",
  );
  assert.equal(completed.missions[0].steps[0].completed, true);
  assert.equal(completed.totalXp, 5);
});

test("Need another focus block starts a linked session without completing the step", () => {
  const learningGoal = goal();
  const mission = generatedMission(learningGoal);
  const step = mission.steps[0];
  const startedAt = "2026-08-24T13:00:00.000Z";
  let state = startFocusSessionInState(
    { ...EMPTY_STATE, goals: [learningGoal], missions: [mission] },
    "25/5",
    learningGoal.id,
    startedAt,
    "first-block",
    { missionId: mission.id, stepId: step.id },
  );
  state = advanceFocusSessions(state, Date.parse(startedAt) + 25 * 60_000);
  const continued = continueLinkedFocusInState(
    state,
    "first-block",
    "2026-08-24T13:25:00.000Z",
    "second-block",
  );
  const active = getActiveFocusSession(continued.focusSessions);
  assert.equal(active?.id, "second-block");
  assert.equal(active?.missionId, mission.id);
  assert.equal(active?.stepId, step.id);
  assert.equal(continued.missions[0].steps[0].completed, false);
  assert.equal(continued.totalXp, 5);
});
