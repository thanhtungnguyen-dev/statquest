import {
  recommendNextTarget,
  weeklySchedulePressure,
  type AdaptiveTarget,
} from "./adaptive-learning.ts";
import type {
  DailyMission,
  FocusSession,
  LearningGoal,
  StatQuestState,
} from "./types.ts";

export type EntryResume = {
  missionId: string;
  goalId: string;
  subject: string;
  title: string;
  stepNumber: number;
  stepCount: number;
  stepTitle: string;
  remainingMinutes: number;
};

export type EntryAssessment = {
  goalId: string;
  subject: string;
  title: string;
  date: string;
  daysUntil: number;
};

export type EntryTodayPlan = {
  reviewsDue: number;
  assessment: EntryAssessment | null;
  weekly: {
    completedDays: number;
    targetDays: number;
  } | null;
};

export type EntryExperience = {
  resume: EntryResume | null;
  recommendation: AdaptiveTarget | null;
  guardianMessage: string;
  introduction: string;
  plan: EntryTodayPlan;
};

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000,
  );
}

function localDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resumeDetails(mission: DailyMission): EntryResume {
  const incompleteIndex = mission.steps.findIndex((step) => !step.completed);
  const stepNumber = incompleteIndex >= 0 ? incompleteIndex + 1 : mission.steps.length;
  return {
    missionId: mission.id,
    goalId: mission.goalId,
    subject: mission.subject,
    title: mission.title,
    stepNumber,
    stepCount: mission.steps.length,
    stepTitle:
      incompleteIndex >= 0
        ? mission.steps[incompleteIndex].title
        : "Submit mission evidence",
    remainingMinutes: mission.steps
      .filter((step) => !step.completed)
      .reduce((total, step) => total + step.minutes, 0),
  };
}

function timestampValue(...timestamps: Array<string | null>): number {
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const value = new Date(timestamp).getTime();
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function linkedActiveMission(
  session: FocusSession,
  activeMissions: Map<string, DailyMission>,
): DailyMission | null {
  if (!session.missionId || !session.stepId) return null;
  const mission = activeMissions.get(session.missionId);
  if (!mission || session.goalId !== mission.goalId) return null;
  const step = mission.steps.find((candidate) => candidate.id === session.stepId);
  if (!step) return null;
  if (
    (session.status === "active" || session.status === "ready-to-complete") &&
    step.completed
  ) {
    return null;
  }
  return mission;
}

function mostRecentResumeMission(state: StatQuestState): DailyMission | null {
  const activeMissions = state.missions.filter(
    (mission) => mission.status === "active",
  );
  if (activeMissions.length === 0) return null;
  const byId = new Map(activeMissions.map((mission) => [mission.id, mission]));
  const linked = state.focusSessions.flatMap((session) => {
    const mission = linkedActiveMission(session, byId);
    return mission
      ? [{
          mission,
          session,
          activityAt: timestampValue(session.completedAt, session.startedAt),
        }]
      : [];
  });
  const compareLinked = (
    left: (typeof linked)[number],
    right: (typeof linked)[number],
  ) =>
    right.activityAt - left.activityAt ||
    right.mission.createdAt.localeCompare(left.mission.createdAt) ||
    left.session.id.localeCompare(right.session.id);
  const current = linked
    .filter(
      ({ session }) =>
        session.status === "active" || session.status === "ready-to-complete",
    )
    .sort(compareLinked)[0];
  if (current) return current.mission;
  const recentLinked = linked.sort(compareLinked)[0];
  if (recentLinked) return recentLinked.mission;
  return [...activeMissions].sort(
    (left, right) =>
      timestampValue(right.createdAt) - timestampValue(left.createdAt) ||
      left.id.localeCompare(right.id),
  )[0];
}

function reviewsDue(goals: LearningGoal[], today: string): number {
  return goals.reduce(
    (count, goal) =>
      count +
      goal.learningTopics.filter(
        (topic) =>
          topic.attemptCount > 0 &&
          topic.nextReviewDate !== null &&
          topic.nextReviewDate <= today,
      ).length,
    0,
  );
}

function closestAssessment(
  goals: LearningGoal[],
  today: string,
): EntryAssessment | null {
  return (
    goals
      .flatMap((goal) =>
        goal.courseDetails
          .filter(
            (detail) =>
              detail.confirmed &&
              detail.kind === "assessment" &&
              detail.date !== null &&
              detail.date >= today,
          )
          .map((detail) => ({
            goalId: goal.id,
            subject: goal.subject,
            title: detail.title,
            date: detail.date!,
            daysUntil: daysBetween(today, detail.date!),
          })),
      )
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) ||
          left.goalId.localeCompare(right.goalId),
      )[0] ?? null
  );
}

function inactiveDays(state: StatQuestState, today: string): number | null {
  const activity = [
    ...state.missions.flatMap((mission) =>
      mission.completedAt ? [mission.completedAt] : [],
    ),
    ...state.focusSessions.flatMap((session) =>
      session.completedAt ? [session.completedAt] : [],
    ),
  ].sort();
  const latest = activity.at(-1);
  return latest ? Math.max(0, daysBetween(localDateKey(latest), today)) : null;
}

export function deriveEntryExperience(
  state: StatQuestState,
  today: string,
): EntryExperience {
  const goals = state.goals
    .filter((goal) => goal.status === "active")
    .sort((left, right) => left.position - right.position);
  const activeMission = mostRecentResumeMission(state);
  const resume = activeMission ? resumeDetails(activeMission) : null;
  const recommendation = resume ? null : recommendNextTarget(state, today);
  const dueCount = reviewsDue(goals, today);
  const assessment = closestAssessment(goals, today);
  const planGoalId = resume?.goalId ?? recommendation?.goalId ?? goals[0]?.id;
  const planGoal = goals.find((goal) => goal.id === planGoalId);
  const schedule = planGoal
    ? weeklySchedulePressure(state, planGoal, today)
    : null;
  const absence = inactiveDays(state, today);

  let guardianMessage = "You're clear for today.";
  if (resume) {
    guardianMessage = `Step ${resume.stepNumber} is ready.`;
  } else if (recommendation) {
    const targetKind = recommendation.kind === "learn"
      ? "learning target"
      : recommendation.kind === "practice"
        ? "practice mission"
        : recommendation.kind === "apply"
          ? "application mission"
          : "review";
    guardianMessage = `Your next ${targetKind} is ready.`;
  } else if (dueCount > 0) {
    guardianMessage = `${dueCount === 1 ? "One review is" : `${dueCount} reviews are`} due today.`;
  } else if (assessment && assessment.daysUntil <= 14) {
    guardianMessage = assessment.daysUntil === 0
      ? `Your ${assessment.title} is today.`
      : `Your ${assessment.title} is in ${assessment.daysUntil} days.`;
  } else if (state.streak.current > 0 && state.streak.current % 5 === 0) {
    guardianMessage = `Your ${state.streak.current}-day streak is active.`;
  }

  const introduction = resume
    ? "Let's continue with one useful step."
    : absence !== null && absence >= 3 && dueCount > 0
      ? "A few reviews are ready. Start with the highest-priority one."
      : recommendation
        ? "Your next useful study target is ready."
        : "Open Focus when you're ready to plan your next learning goal.";

  return {
    resume,
    recommendation,
    guardianMessage,
    introduction,
    plan: {
      reviewsDue: dueCount,
      assessment,
      weekly: schedule
        ? {
            completedDays: schedule.completedDays,
            targetDays: schedule.targetDays,
          }
        : null,
    },
  };
}
