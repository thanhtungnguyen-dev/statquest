import type {
  CourseDetail,
  DailyMission,
  LearningGoal,
  LearningOutcomeQuality,
  LearningTopic,
  MissionFeedback,
  MissionKind,
  TopicMasteryStatus,
} from "./types.ts";

function bounded(value: number, minimum = 0, maximum = 100): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function topicStatus(
  mastery: number,
  attemptCount: number,
): TopicMasteryStatus {
  if (attemptCount === 0) return "unseen";
  if (mastery < 35) return "weak";
  if (mastery < 60) return "learning";
  if (mastery < 80) return "comfortable";
  return "mastered";
}

function defaultTopic(goalId: string, subject: string): LearningTopic {
  return {
    id: `learning-topic:${goalId}:subject`,
    title: subject.trim() || "Current learning goal",
    status: "unseen",
    mastery: 0,
    lastStudiedAt: null,
    nextReviewDate: null,
    attemptCount: 0,
    successCount: 0,
    sourceReferences: [],
  };
}

export function normalizeLearningTopics(
  goalId: string,
  subject: string,
  value: unknown,
): LearningTopic[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [defaultTopic(goalId, subject)];
  }

  const topics = value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const raw = candidate as Partial<LearningTopic>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) return [];
    const attemptCount = bounded(raw.attemptCount ?? 0, 0, Number.MAX_SAFE_INTEGER);
    const mastery = bounded(raw.mastery ?? 0);
    return [{
      id:
        typeof raw.id === "string" && raw.id
          ? raw.id
          : `learning-topic:${goalId}:legacy-${index}`,
      title,
      status: topicStatus(mastery, attemptCount),
      mastery,
      lastStudiedAt:
        typeof raw.lastStudiedAt === "string" ? raw.lastStudiedAt : null,
      nextReviewDate:
        typeof raw.nextReviewDate === "string" ? raw.nextReviewDate : null,
      attemptCount,
      successCount: bounded(
        raw.successCount ?? 0,
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      sourceReferences: Array.isArray(raw.sourceReferences)
        ? raw.sourceReferences
        : [],
    } satisfies LearningTopic];
  });

  return topics.length > 0 ? topics : [defaultTopic(goalId, subject)];
}

export function normalizeCourseDetails(value: unknown): CourseDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const raw = candidate as Partial<CourseDetail>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.title !== "string" ||
      !["topic", "outcome", "task", "assessment"].includes(raw.kind ?? "") ||
      !raw.sourceReference
    ) {
      return [];
    }
    return [{
      id: raw.id,
      kind: raw.kind as CourseDetail["kind"],
      title: raw.title.trim(),
      date: typeof raw.date === "string" ? raw.date : null,
      confirmed: raw.confirmed === true,
      sourceReference: raw.sourceReference,
    }];
  });
}

export function syncLearningTopics(
  goalId: string,
  subject: string,
  current: LearningTopic[],
  courseDetails: CourseDetail[],
): LearningTopic[] {
  const normalized = normalizeLearningTopics(goalId, subject, current);
  const byTitle = new Map(
    normalized.map((topic, index) => [topic.title.toLocaleLowerCase(), index]),
  );

  for (const detail of courseDetails) {
    if (!detail.confirmed || (detail.kind !== "topic" && detail.kind !== "outcome")) {
      continue;
    }
    const key = detail.title.toLocaleLowerCase();
    const existingIndex = byTitle.get(key);
    if (existingIndex !== undefined) {
      const existing = normalized[existingIndex];
      if (
        !existing.sourceReferences.some(
          (reference) =>
            reference.fileId === detail.sourceReference.fileId &&
            reference.excerpt === detail.sourceReference.excerpt,
        )
      ) {
        normalized[existingIndex] = {
          ...existing,
          sourceReferences: [...existing.sourceReferences, detail.sourceReference],
        };
      }
      continue;
    }
    const topic: LearningTopic = {
      ...defaultTopic(goalId, detail.title),
      id: `learning-topic:${detail.id}`,
      sourceReferences: [detail.sourceReference],
    };
    normalized.push(topic);
    byTitle.set(key, normalized.length - 1);
  }

  return normalized;
}

export function missionKindForTopic(
  topic: LearningTopic,
  today: string,
): MissionKind {
  if (
    topic.attemptCount > 0 &&
    topic.nextReviewDate !== null &&
    topic.nextReviewDate <= today
  ) {
    return "review";
  }
  if (topic.status === "unseen") return "learn";
  if (topic.status === "weak" || topic.status === "learning") return "practice";
  return "apply";
}

function localDateKey(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date.toISOString());
}

export function classifyLearningOutcome(
  feedback: MissionFeedback,
): LearningOutcomeQuality {
  if (
    feedback.difficulty === "difficult" ||
    feedback.confidence <= 2 ||
    feedback.reasons.includes("forgot-concepts") ||
    feedback.reasons.includes("ran-out-of-time")
  ) {
    return "weak";
  }
  if (
    feedback.reasons.includes("needed-hints") ||
    (feedback.reasons.includes("mistakes") &&
      !feedback.reasons.includes("independent"))
  ) {
    return "assisted";
  }
  if (
    feedback.confidence >= 4 &&
    feedback.reasons.includes("independent") &&
    !feedback.reasons.some((reason) =>
      ["forgot-concepts", "needed-hints", "mistakes", "ran-out-of-time"].includes(reason),
    )
  ) {
    return "strong-success";
  }
  return "success";
}

function masteryDelta(
  quality: LearningOutcomeQuality,
  feedback: MissionFeedback,
): number {
  const qualityDelta = {
    "strong-success": 14,
    success: 9,
    assisted: 3,
    weak: -6,
  }[quality];
  return qualityDelta + (feedback.difficulty === "too-easy" && quality !== "weak" ? 2 : 0);
}

function reviewIntervalDays(
  quality: LearningOutcomeQuality,
  successCount: number,
): number {
  if (quality === "weak") return 1;
  if (quality === "assisted") return 2;
  if (quality === "success") return Math.min(7, 3 + successCount);
  return Math.min(30, 7 * (2 ** Math.max(0, successCount - 1)));
}

export function applyFeedbackToGoal(
  goal: LearningGoal,
  mission: DailyMission,
  feedback: MissionFeedback,
): LearningGoal {
  if (!mission.topicId || mission.goalId !== goal.id) return goal;
  const target = goal.learningTopics.find((topic) => topic.id === mission.topicId);
  if (!target) return goal;

  const quality = classifyLearningOutcome(feedback);
  const mastery = bounded(target.mastery + masteryDelta(quality, feedback));
  const successCount =
    target.successCount +
    (quality === "success" || quality === "strong-success" ? 1 : 0);
  const interval = reviewIntervalDays(quality, successCount);
  const studiedAt = mission.completedAt ?? feedback.submittedAt;

  return {
    ...goal,
    learningTopics: goal.learningTopics.map((topic) =>
      topic.id === target.id
        ? {
            ...topic,
            mastery,
            status:
              quality === "weak"
                ? "weak"
                : topicStatus(mastery, topic.attemptCount + 1),
            lastStudiedAt: studiedAt,
            nextReviewDate: addLocalDays(localDateKey(studiedAt), interval),
            attemptCount: topic.attemptCount + 1,
            successCount,
          }
        : topic,
    ),
  };
}

export function goalCompletionSummary(
  goal: LearningGoal,
  missions: DailyMission[],
  reviewCount: number,
): string {
  const completedMissions = missions.filter(
    (mission) => mission.goalId === goal.id && mission.status === "completed",
  ).length;
  const mastered = goal.learningTopics.filter(
    (topic) => topic.status === "mastered",
  ).length;
  return [
    `${completedMissions} completed mission${completedMissions === 1 ? "" : "s"}`,
    `${mastered} of ${goal.learningTopics.length} tracked topics mastered`,
    `${reviewCount} weekly review${reviewCount === 1 ? "" : "s"}`,
  ].join("\n");
}
