import { missionKindForTopic } from "./learning-map.ts";
import type {
  CourseDetail,
  LearnerMood,
  LearningGoal,
  LearningTopic,
  MissionDifficulty,
  MissionKind,
  StatQuestState,
} from "./types.ts";

export type AdaptiveTarget = {
  goalId: string;
  topicId: string;
  topicTitle: string;
  kind: MissionKind;
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  reasons: string[];
};

type RankedTarget = AdaptiveTarget & { score: number };

function learnerFacingTarget(target: RankedTarget): AdaptiveTarget {
  return {
    goalId: target.goalId,
    topicId: target.topicId,
    topicTitle: target.topicTitle,
    kind: target.kind,
    difficulty: target.difficulty,
    estimatedMinutes: target.estimatedMinutes,
    reasons: target.reasons,
  };
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysFrom(today: string, target: string): number {
  return Math.round(
    (dateFromKey(target).getTime() - dateFromKey(today).getTime()) / 86_400_000,
  );
}

function weekBounds(today: string): { start: string; end: string } {
  const start = dateFromKey(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const key = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: key(start), end: key(end) };
}

function localCompletionKey(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weeklyStudyDayCount(
  state: StatQuestState,
  goalId: string,
  today: string,
): number {
  const bounds = weekBounds(today);
  const dates = new Set<string>();
  for (const mission of state.missions) {
    if (mission.goalId !== goalId || mission.status !== "completed") continue;
    const date = mission.completedAt
      ? localCompletionKey(mission.completedAt)
      : mission.date;
    if (date >= bounds.start && date <= bounds.end) dates.add(date);
  }
  for (const session of state.focusSessions) {
    if (session.goalId !== goalId || !session.completedAt) continue;
    const date = localCompletionKey(session.completedAt);
    if (date >= bounds.start && date <= bounds.end) dates.add(date);
  }
  return dates.size;
}

export type WeeklySchedulePressure = {
  completedDays: number;
  targetDays: number;
  remainingTargetDays: number;
  remainingCalendarDays: number;
  score: number;
  reason: string | null;
};

export function weeklySchedulePressure(
  state: StatQuestState,
  goal: LearningGoal,
  today: string,
): WeeklySchedulePressure {
  const completedDays = weeklyStudyDayCount(state, goal.id, today);
  const remainingTargetDays = Math.max(0, goal.daysPerWeek - completedDays);
  const remainingCalendarDays = 7 - ((dateFromKey(today).getDay() + 6) % 7);
  if (remainingTargetDays === 0) {
    return {
      completedDays,
      targetDays: goal.daysPerWeek,
      remainingTargetDays,
      remainingCalendarDays,
      score: 0,
      reason: null,
    };
  }
  const tight = remainingTargetDays >= remainingCalendarDays;
  return {
    completedDays,
    targetDays: goal.daysPerWeek,
    remainingTargetDays,
    remainingCalendarDays,
    score: tight ? 12 : 4,
    reason:
      remainingTargetDays === 1
        ? "One more study day supports your weekly target"
        : `${remainingTargetDays} study days remaining this week`,
  };
}

function detailIndex(detail: CourseDetail): number | null {
  const match = detail.id.match(/:(\d+):(?:topic|outcome|task|assessment)$/);
  return match ? Number(match[1]) : null;
}

function assessmentForTopic(
  goal: LearningGoal,
  topic: LearningTopic,
  today: string,
): { detail: CourseDetail; days: number } | null {
  const sourceFileIds = new Set(
    topic.sourceReferences.map((reference) => reference.fileId),
  );
  const topicDetail = goal.courseDetails.find(
    (detail) =>
      detail.confirmed &&
      detail.kind !== "assessment" &&
      topic.sourceReferences.some(
        (reference) =>
          reference.fileId === detail.sourceReference.fileId &&
          reference.excerpt === detail.sourceReference.excerpt,
      ),
  );
  const topicIndex = topicDetail ? detailIndex(topicDetail) : null;

  return (
    goal.courseDetails
      .filter((detail) => {
        if (
          !detail.confirmed ||
          detail.kind !== "assessment" ||
          !detail.date ||
          !sourceFileIds.has(detail.sourceReference.fileId)
        ) {
          return false;
        }
        const assessmentIndex = detailIndex(detail);
        return (
          topicIndex !== null &&
          assessmentIndex !== null &&
          Math.abs(topicIndex - assessmentIndex) <= 3
        );
      })
      .map((detail) => ({ detail, days: daysFrom(today, detail.date!) }))
      .filter(({ days }) => days >= 0 && days <= 14)
      .sort((left, right) => left.days - right.days || left.detail.id.localeCompare(right.detail.id))[0] ??
    null
  );
}

function reviewMatchesTopic(reviewText: string, topic: LearningTopic): boolean {
  const words = topic.title.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const normalizedReview = reviewText.toLocaleLowerCase();
  return words.some((word) => normalizedReview.includes(word));
}

function shiftDifficulty(
  difficulty: MissionDifficulty,
  amount: -1 | 0 | 1,
): MissionDifficulty {
  const order: MissionDifficulty[] = ["easy", "medium", "hard"];
  const index = order.indexOf(difficulty);
  return order[Math.min(2, Math.max(0, index + amount))];
}

export function cognitiveDifficultyForTarget(
  goal: LearningGoal,
  topic: LearningTopic,
  kind: MissionKind,
  mood: LearnerMood,
  moreChallenge = false,
): MissionDifficulty {
  let difficulty: MissionDifficulty =
    goal.currentLevel === "beginner"
      ? "easy"
      : goal.currentLevel === "advanced"
        ? "hard"
        : "medium";
  if (topic.status === "weak" || mood === "struggling" || mood === "tired") {
    difficulty = shiftDifficulty(difficulty, -1);
  }
  if (kind === "apply") difficulty = shiftDifficulty(difficulty, 1);
  if (moreChallenge) difficulty = shiftDifficulty(difficulty, 1);
  return difficulty;
}

function recentCompletionDate(
  state: StatQuestState,
  goalId: string,
  topicId: string,
): string | null {
  return (
    state.missions
      .filter(
        (mission) =>
          mission.goalId === goalId &&
          mission.topicId === topicId &&
          mission.status === "completed",
      )
      .map((mission) =>
        mission.completedAt ? localCompletionKey(mission.completedAt) : mission.date,
      )
      .sort()
      .at(-1) ?? null
  );
}

function rankTopic(
  state: StatQuestState,
  goal: LearningGoal,
  topic: LearningTopic,
  today: string,
): RankedTarget | null {
  const kind = missionKindForTopic(topic, today);
  const recentDate = recentCompletionDate(state, goal.id, topic.id);
  if (
    kind !== "review" &&
    recentDate !== null &&
    daysFrom(recentDate, today) <= 2
  ) {
    return null;
  }

  let score = 0;
  const reasons: string[] = [];
  if (kind === "review" && topic.nextReviewDate) {
    const overdue = Math.max(0, -daysFrom(today, topic.nextReviewDate));
    score += 220 + overdue;
    reasons.push(overdue > 0 ? `Review overdue by ${overdue} days` : "Review due today");
  } else if (topic.status === "weak") {
    score += 160;
    reasons.push("You found this difficult last time");
  } else if (topic.status === "unseen") {
    score += 120;
    reasons.push("This topic has not been studied yet");
  } else if (topic.status === "learning") {
    score += 100;
    reasons.push("More practice will strengthen this topic");
  } else {
    score += 60 + topic.mastery;
    reasons.push("Apply what you already know");
  }

  const assessment = assessmentForTopic(goal, topic, today);
  if (assessment) {
    score += 150 - assessment.days * 7;
    const label =
      assessment.detail.title.match(/\b(?:quiz|exam|test|midterm|final|assignment|project)\b/i)?.[0] ??
      "Assessment";
    reasons.unshift(`${label} ${assessment.days === 0 ? "today" : `in ${assessment.days} days`}`);
  } else if (goal.deadline) {
    const deadlineDays = daysFrom(today, goal.deadline);
    if (deadlineDays >= 0 && deadlineDays <= 14) {
      score += 90 - deadlineDays * 4;
      reasons.push(deadlineDays === 0 ? "Goal deadline today" : `Goal deadline in ${deadlineDays} days`);
    }
  }

  const latestReview = state.weeklyReviews
    .filter((review) => review.goalId === goal.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  if (latestReview && reviewMatchesTopic(latestReview.nextFocus, topic)) {
    score += 35;
    reasons.push("Your weekly review points here");
  }

  const schedule = weeklySchedulePressure(state, goal, today);
  if (schedule.reason) {
    score += schedule.score;
    reasons.push(schedule.reason);
  }

  const mood = state.moodDate === today ? state.mood : "moderate";
  return {
    goalId: goal.id,
    topicId: topic.id,
    topicTitle: topic.title,
    kind,
    difficulty: cognitiveDifficultyForTarget(goal, topic, kind, mood),
    estimatedMinutes: goal.minutesPerDay,
    reasons: [...new Set(reasons)].slice(0, 3),
    score,
  };
}

export function selectNextTargetForGoal(
  state: StatQuestState,
  goalId: string,
  today: string,
  excludeTopicId?: string,
): AdaptiveTarget | null {
  const goal = state.goals.find(
    (candidate) => candidate.id === goalId && candidate.status === "active",
  );
  if (!goal) return null;
  const ranked = (goal.learningTopics ?? [])
    .filter((topic) => topic.id !== excludeTopicId)
    .map((topic) => rankTopic(state, goal, topic, today))
    .filter((target): target is RankedTarget => target !== null)
    .sort(
      (left, right) =>
        right.score - left.score || left.topicId.localeCompare(right.topicId),
    )[0];
  if (!ranked) return null;
  return learnerFacingTarget(ranked);
}

export function recommendNextTarget(
  state: StatQuestState,
  today: string,
): AdaptiveTarget | null {
  const ranked = state.goals
    .filter((goal) => goal.status === "active")
    .flatMap((goal) => {
      const target = selectNextTargetForGoal(state, goal.id, today);
      if (!target) return [];
      const reranked = rankTopic(
        state,
        goal,
        (goal.learningTopics ?? []).find((topic) => topic.id === target.topicId)!,
        today,
      );
      return reranked ? [reranked] : [];
    })
    .sort((left, right) => {
      const score = right.score - left.score;
      if (score) return score;
      const leftGoal = state.goals.find((goal) => goal.id === left.goalId)!;
      const rightGoal = state.goals.find((goal) => goal.id === right.goalId)!;
      return leftGoal.position - rightGoal.position || left.topicId.localeCompare(right.topicId);
    })[0];
  if (!ranked) return null;
  return learnerFacingTarget(ranked);
}
