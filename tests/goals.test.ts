import assert from "node:assert/strict";
import test from "node:test";
import {
  canFinishGoal,
  completeActiveGoal,
  createLearningGoal,
  editLearningGoal,
} from "../src/lib/goals.ts";
import { generateDailyMission } from "../src/lib/mission-generator.ts";
import type { LearningGoal, LearningGoalDraft } from "../src/lib/types.ts";

const DRAFT: LearningGoalDraft = {
  subject: "Full-Stack Web Development",
  currentLevel: "beginner",
  desiredOutcome: "Build and deploy a working StatQuest MVP",
  minutesPerDay: 60,
  daysPerWeek: 6,
  deadline: "2026-09-30",
  referenceFiles: [],
  courseDetails: [],
  learningTopics: [],
};

function goal(id: string, status: LearningGoal["status"]): LearningGoal {
  return createLearningGoal(DRAFT, {
    id,
    status,
    position: 0,
    createdAt: "2026-08-19T00:00:00.000Z",
  });
}

test("goal editing preserves identity, active state, and creation date", () => {
  const original = goal("goal-1", "active");
  const edited = editLearningGoal(original, {
    ...DRAFT,
    subject: "  Advanced TypeScript  ",
    desiredOutcome: "  Build a typed production application  ",
  });

  assert.equal(edited.id, original.id);
  assert.equal(edited.createdAt, original.createdAt);
  assert.equal(edited.status, "active");
  assert.equal(edited.subject, "Advanced TypeScript");
});

test("new goals default to active and allow an optional deadline", () => {
  const first = createLearningGoal({ ...DRAFT, deadline: "" }, { id: "first" });
  const second = createLearningGoal(DRAFT, { id: "second" });

  assert.equal(first.status, "active");
  assert.equal(first.deadline, "");
  assert.equal(second.status, "active");
});

test("multiple goals remain active simultaneously", () => {
  const goals = [
    goal("math", "active"),
    goal("english", "active"),
    goal("career", "active"),
  ];
  assert.deepEqual(
    goals.filter((item) => item.status === "active").map((item) => item.id),
    ["math", "english", "career"],
  );
});

test("completing one expected goal does not affect another", () => {
  const goals = [goal("goal-a", "active"), goal("goal-b", "active")];
  const completedAt = "2026-08-20T12:00:00.000Z";
  const once = completeActiveGoal(goals, "goal-a", completedAt);
  const twice = completeActiveGoal(once, "goal-a", completedAt);

  assert.equal(once.find((item) => item.id === "goal-a")?.status, "completed");
  assert.equal(once.find((item) => item.id === "goal-a")?.completedAt, completedAt);
  assert.equal(once.find((item) => item.id === "goal-b")?.status, "active");
  assert.equal(twice, once);
});

test("a goal cannot finish before it has a completed mission", () => {
  const active = goal("active", "active");
  const mission = generateDailyMission(active, "standard", "2026-08-19");

  assert.equal(canFinishGoal(active.id, [mission]), false);
  assert.equal(
    canFinishGoal(active.id, [{ ...mission, status: "completed" }]),
    true,
  );
});
