import assert from "node:assert/strict";
import test from "node:test";
import {
  generateDailyMission,
  generateMissionForGoal,
} from "../src/lib/mission-generator.ts";
import {
  abandonMissionInState,
  completeMission,
  completeMissionInState,
  expireStreak,
  getLevelProgress,
  markPastMissionsMissed,
  rolloverLocalDate,
  updateStreak,
} from "../src/lib/progress.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import type { LearningGoal, StreakState } from "../src/lib/types.ts";

const GOAL: LearningGoal = {
  id: "goal-1",
  category: "learning",
  subject: "MATH 271",
  currentLevel: "intermediate",
  desiredOutcome: "Write correct proofs without notes",
  minutesPerDay: 120,
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

function localNoonIso(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12).toISOString();
}

test("level calculation uses 100 XP per level", () => {
  assert.deepEqual(getLevelProgress(0), {
    level: 1,
    xpInLevel: 0,
    xpForNextLevel: 100,
    progressPercent: 0,
  });
  assert.equal(getLevelProgress(230).level, 3);
  assert.equal(getLevelProgress(230).xpInLevel, 30);
});

test("completion requires every step and meaningful evidence", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");

  assert.throws(
    () =>
      completeMission(mission, {
        reflection: "This explanation is long enough but steps are incomplete.",
        evidenceUrl: "",
        submittedAt: "2026-08-19T12:00:00.000Z",
      }),
    /Complete every mission step/,
  );

  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };

  assert.throws(
    () =>
      completeMission(checkedMission, {
        reflection: "Too short",
        evidenceUrl: "",
        submittedAt: "2026-08-19T12:00:00.000Z",
      }),
    /at least 80 characters/,
  );
});

test("gibberish and unrelated evidence are rejected", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };

  assert.throws(
    () =>
      completeMission(checkedMission, {
        reflection:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeee3333333333333333 unrelated filler text that does not describe real work",
        evidenceUrl: "",
        submittedAt: "2026-08-19T12:00:00.000Z",
      }),
    /repeated characters/,
  );

  assert.throws(
    () =>
      completeMission(checkedMission, {
        reflection:
          "I cooked dinner, washed dishes, cleaned the kitchen, watered plants, folded clothes, and watched a movie afterward.",
        evidenceUrl: "",
        submittedAt: "2026-08-19T12:00:00.000Z",
      }),
    /ideas, tools, or results from this mission/,
  );
});

test("Unicode evidence is accepted without an English completion-verb whitelist", () => {
  const mission = generateDailyMission(
    { ...GOAL, subject: "Toán rời rạc", desiredOutcome: "Trình bày chứng minh logic chính xác" },
    "standard",
    "2026-08-19",
  );
  const checked = { ...mission, steps: mission.steps.map((step) => ({ ...step, completed: true })) };
  const result = completeMission(checked, {
    reflection:
      "Tôi trình bày chứng minh logic cho mệnh đề đã chọn, ghi rõ từng điều kiện. Sau đó tôi đối chiếu phương pháp, sửa hai bước suy luận và kiểm tra kết quả bằng một trường hợp khác.",
    evidenceUrl: "",
    submittedAt: localNoonIso(2026, 8, 19),
  });
  assert.equal(result.mission.status, "completed");
  assert.equal(result.awardedXp, 30);
});

test("abandoning releases the goal slot without XP, streak, or reward refund", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const initial = { ...EMPTY_STATE, goals: [GOAL], missions: [mission] };
  const abandoned = abandonMissionInState(initial, mission.id);

  assert.equal(abandoned.missions[0].status, "abandoned");
  assert.equal(abandoned.totalXp, 0);
  assert.deepEqual(abandoned.streak, initial.streak);
  assert.equal(abandoned.missions[0].rewardEligible, true);

  const regenerated = generateMissionForGoal(abandoned, GOAL.id, "2026-08-19");
  assert.equal(regenerated.missions[0].status, "active");
  assert.equal(regenerated.missions[0].id, `${GOAL.id}:2026-08-19:2`);
  assert.equal(regenerated.missions.filter((item) => item.rewardEligible).length, 2);

  const checkedAbandoned = {
    ...abandoned.missions[0],
    steps: abandoned.missions[0].steps.map((step) => ({ ...step, completed: true })),
  };
  const completion = completeMission(checkedAbandoned, {
    reflection:
      "I worked through the selected course concept, showed each proof condition, corrected two reasoning gaps, and checked the final result independently.",
    evidenceUrl: "",
    submittedAt: localNoonIso(2026, 8, 19),
  });
  assert.equal(completion.mission.status, "abandoned");
  assert.equal(completion.awardedXp, 0);
});

test("local date rollover resets daily mood and expires only stale streaks", () => {
  const state = {
    ...EMPTY_STATE,
    mood: "tired" as const,
    moodDate: "2026-08-23",
    streak: { current: 3, longest: 4, lastCompletionDate: "2026-08-22" },
  };
  const next = rolloverLocalDate(state, "2026-08-24");
  assert.equal(next.mood, "moderate");
  assert.equal(next.moodDate, "2026-08-24");
  assert.equal(next.streak.current, 0);
  assert.equal(next.totalXp, state.totalXp);
});

test("XP can be awarded only once", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };
  const evidence = {
    reflection:
      "I completed the selected course concept practice, corrected two method errors, and reproduced the key reasoning without notes.",
    evidenceUrl: "",
    submittedAt: "2026-08-19T12:00:00.000Z",
  };

  const first = completeMission(checkedMission, evidence);
  const second = completeMission(first.mission, evidence);

  assert.equal(first.awardedXp, 30);
  assert.equal(second.awardedXp, 0);
});

test("duplicate state completion awards XP and updates streak once", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };
  const evidence = {
    reflection:
      "I solved the selected course concept practice, corrected two method errors, and verified the key reasoning from a blank page.",
    evidenceUrl: "",
    submittedAt: "2026-08-19T12:00:00.000Z",
  };
  const initial = { ...EMPTY_STATE, missions: [checkedMission] };

  const once = completeMissionInState(initial, mission.id, evidence);
  const twice = completeMissionInState(once, mission.id, evidence);

  assert.equal(once.totalXp, 30);
  assert.equal(once.streak.current, 1);
  assert.equal(once.streak.longest, 1);
  assert.equal(once.missions[0]?.status, "completed");
  assert.equal(twice, once);
  assert.equal(twice.totalXp, 30);
  assert.equal(twice.streak.current, 1);
});

test("a same-day transition practice mission completes without XP", () => {
  const mission = generateDailyMission(
    GOAL,
    "standard",
    "2026-08-19",
    undefined,
    false,
  );
  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };
  const result = completeMission(checkedMission, {
    reflection:
      "I solved the selected course concept practice, corrected two method errors, and verified the key reasoning from a blank page.",
    evidenceUrl: "",
    submittedAt: "2026-08-19T14:00:00.000Z",
  });

  assert.equal(result.mission.status, "completed");
  assert.equal(result.awardedXp, 0);
  assert.equal(result.mission.xpAwarded, false);
});

test("evidence links accept only HTTP or HTTPS URLs", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const checkedMission = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };

  assert.throws(
    () =>
      completeMission(checkedMission, {
        reflection:
          "I completed all required work and documented every verification result.",
        evidenceUrl: "javascript:alert(1)",
        submittedAt: "2026-08-19T12:00:00.000Z",
      }),
    /http:\/\//,
  );
});

test("streak continues on consecutive dates and resets after a gap", () => {
  const empty: StreakState = {
    current: 0,
    longest: 0,
    lastCompletionDate: null,
  };
  const dayOne = updateStreak(empty, "2026-08-19");
  const dayTwo = updateStreak(dayOne, "2026-08-20");
  const afterGap = updateStreak(dayTwo, "2026-08-22");

  assert.equal(dayOne.current, 1);
  assert.equal(dayTwo.current, 2);
  assert.equal(afterGap.current, 1);
  assert.equal(afterGap.longest, 2);
});

test("an inactive streak expires after a missed calendar day", () => {
  const streak: StreakState = {
    current: 5,
    longest: 5,
    lastCompletionDate: "2026-08-17",
  };

  assert.equal(expireStreak(streak, "2026-08-18").current, 5);
  assert.equal(expireStreak(streak, "2026-08-19").current, 0);
  assert.equal(expireStreak(streak, "2026-08-19").longest, 5);
});

test("unfinished past missions remain active so they can be completed later", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-18");
  const [updated] = markPastMissionsMissed([mission], "2026-08-19");
  assert.equal(updated.status, "active");
});

test("reward eligibility survives completion on a later local date", () => {
  const mission = generateDailyMission(GOAL, "standard", "2026-08-19");
  const checked = {
    ...mission,
    steps: mission.steps.map((step) => ({ ...step, completed: true })),
  };
  const completed = completeMissionInState(
    { ...EMPTY_STATE, missions: [checked] },
    checked.id,
    {
      reflection:
        "I solved every proof problem, corrected the logical mistakes, and verified the final solution without notes.",
      evidenceUrl: "",
      submittedAt: "2026-08-20T12:00:00.000Z",
    },
  );

  assert.equal(completed.totalXp, 30);
  assert.equal(completed.streak.lastCompletionDate, "2026-08-20");
});

test("eligible mission XP accumulates without an aggregate daily XP cap", () => {
  const missions = Array.from({ length: 5 }, (_, index) => {
    const mission = generateDailyMission(
      { ...GOAL, id: `goal-${index}` },
      "standard",
      "2026-08-23",
      undefined,
      true,
      { id: `goal-${index}:2026-08-23:1` },
    );
    return {
      ...mission,
      steps: mission.steps.map((step) => ({ ...step, completed: true })),
    };
  });
  let state = { ...EMPTY_STATE, missions };
  for (const mission of missions) {
    state = completeMissionInState(state, mission.id, {
      reflection:
        "I solved the selected proof work, corrected each logical error, and verified the final reasoning from a blank page.",
      evidenceUrl: "",
      submittedAt: "2026-08-24T12:00:00.000Z",
    });
  }

  assert.equal(state.totalXp, 150);
  assert.equal(state.streak.current, 1);
  assert.equal(state.streak.lastCompletionDate, "2026-08-24");
});
