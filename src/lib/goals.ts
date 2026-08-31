import type {
  DailyMission,
  GoalStatus,
  LearningGoal,
  LearningGoalDraft,
} from "@/lib/types";
import { syncLearningTopics } from "./learning-map.ts";

export function canFinishGoal(
  goalId: string,
  missions: DailyMission[],
): boolean {
  return missions.some(
    (mission) => mission.goalId === goalId && mission.status === "completed",
  );
}

type GoalCreationOptions = {
  id?: string;
  createdAt?: string;
  position?: number;
  status?: GoalStatus;
};

export function createLearningGoal(
  draft: LearningGoalDraft,
  options: GoalCreationOptions = {},
): LearningGoal {
  const id = options.id ?? crypto.randomUUID();
  const courseDetails = draft.courseDetails ?? [];
  return {
    ...draft,
    id,
    courseDetails,
    learningTopics: syncLearningTopics(
      id,
      draft.subject,
      draft.learningTopics ?? [],
      courseDetails,
    ),
    category: "learning",
    status: options.status ?? "active",
    position: options.position ?? 0,
    createdAt: options.createdAt ?? new Date().toISOString(),
    completedAt: null,
  };
}

export function editLearningGoal(
  goal: LearningGoal,
  draft: LearningGoalDraft,
): LearningGoal {
  const courseDetails = draft.courseDetails ?? goal.courseDetails ?? [];
  return {
    ...goal,
    ...draft,
    subject: draft.subject.trim(),
    desiredOutcome: draft.desiredOutcome.trim(),
    courseDetails,
    learningTopics: syncLearningTopics(
      goal.id,
      draft.subject,
      draft.learningTopics ?? goal.learningTopics ?? [],
      courseDetails,
    ),
  };
}

export function getActiveGoal(goals: LearningGoal[]): LearningGoal | null {
  return goals.find((goal) => goal.status === "active") ?? null;
}

export function nextGoalPosition(goals: LearningGoal[]): number {
  return goals.reduce((highest, goal) => Math.max(highest, goal.position), -1) + 1;
}

export function completeActiveGoal(
  goals: LearningGoal[],
  expectedGoalId: string,
  completedAt: string,
): LearningGoal[] {
  const active = goals.find(
    (goal) => goal.id === expectedGoalId && goal.status === "active",
  );
  if (!active) return goals;

  return goals.map((goal) => {
    if (goal.id === active.id) {
      return { ...goal, status: "completed", completedAt };
    }
    return goal;
  });
}
