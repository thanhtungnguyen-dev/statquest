import type {
  DailyMission,
  MissionEvidence,
  MissionFeedback,
  StatQuestState,
  StreakState,
} from "@/lib/types";
import { applyFeedbackToGoal } from "./learning-map.ts";

const XP_PER_LEVEL = 100;

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "before",
  "build",
  "complete",
  "completed",
  "create",
  "every",
  "from",
  "have",
  "into",
  "learning",
  "mission",
  "result",
  "that",
  "the",
  "their",
  "then",
  "this",
  "toward",
  "using",
  "with",
  "work",
  "your",
]);

function words(value: string): string[] {
  return value.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function validateEvidenceContent(
  mission: DailyMission,
  reflection: string,
): void {
  const trimmed = reflection.trim();
  if (trimmed.length < 80) {
    throw new Error(
      "Evidence must contain at least 80 characters describing the work and result.",
    );
  }

  if (/([\p{L}\p{N}])\1{4,}/iu.test(trimmed)) {
    throw new Error("Evidence contains repeated characters instead of a work log.");
  }

  const evidenceWords = words(trimmed);
  const uniqueWords = new Set(evidenceWords);
  if (
    evidenceWords.length < 12 ||
    uniqueWords.size < 8 ||
    uniqueWords.size / evidenceWords.length < 0.45
  ) {
    throw new Error(
      "Evidence needs at least 12 meaningful words with specific actions and results.",
    );
  }

  const missionWords = new Set(
    words(
      [
        mission.subject,
        mission.title,
        mission.objective,
        ...mission.steps.flatMap((step) => [step.title, step.instruction]),
      ].join(" "),
    ).filter((word) => word.length >= 4 && !STOP_WORDS.has(word)),
  );
  const relatedWords = [...uniqueWords].filter((word) => missionWords.has(word));
  if (relatedWords.length < 2) {
    throw new Error(
      "Evidence must name at least two ideas, tools, or results from this mission.",
    );
  }

  const concreteClauses = trimmed
    .split(/[.!?;:,\n]+/u)
    .filter((clause) => words(clause).length >= 3);
  const hasConcreteMarker = /(?:\p{N}|https?:\/\/|[()[\]{}=<>])/u.test(trimmed);
  if (
    concreteClauses.length < 2 &&
    !hasConcreteMarker &&
    relatedWords.length < 3
  ) {
    throw new Error(
      "Evidence must concretely describe the work performed and the result you checked.",
    );
  }
}

export function getLevelProgress(totalXp: number) {
  return {
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpInLevel: totalXp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercent: totalXp % XP_PER_LEVEL,
  };
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayDifference(laterDateKey: string, earlierDateKey: string): number {
  const millisecondsPerDay = 86_400_000;
  const later = parseDateKey(laterDateKey).getTime();
  const earlier = parseDateKey(earlierDateKey).getTime();
  return Math.round((later - earlier) / millisecondsPerDay);
}

export function updateStreak(
  streak: StreakState,
  completionDate: string,
): StreakState {
  if (streak.lastCompletionDate === completionDate) return streak;

  const continues =
    streak.lastCompletionDate !== null &&
    dayDifference(completionDate, streak.lastCompletionDate) === 1;
  const current = continues ? streak.current + 1 : 1;

  return {
    current,
    longest: Math.max(streak.longest, current),
    lastCompletionDate: completionDate,
  };
}

export function expireStreak(
  streak: StreakState,
  today: string,
): StreakState {
  if (
    streak.lastCompletionDate === null ||
    dayDifference(today, streak.lastCompletionDate) <= 1
  ) {
    return streak;
  }

  return { ...streak, current: 0 };
}

export function completeMission(
  mission: DailyMission,
  evidence: MissionEvidence,
): { mission: DailyMission; awardedXp: number } {
  if (mission.status !== "active" || mission.xpAwarded) {
    return { mission, awardedXp: 0 };
  }

  if (!mission.steps.every((step) => step.completed)) {
    throw new Error("Complete every mission step before submitting evidence.");
  }

  const evidenceUrl = evidence.evidenceUrl.trim();
  if (evidenceUrl) {
    try {
      const parsedUrl = new URL(evidenceUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new Error("Evidence URL must begin with http:// or https://.");
    }
  }

  validateEvidenceContent(mission, evidence.reflection);

  return {
    mission: {
      ...mission,
      status: "completed",
      evidence: {
        ...evidence,
        reflection: evidence.reflection.trim(),
        evidenceUrl,
      },
      xpAwarded: mission.rewardEligible,
      completedAt: evidence.submittedAt,
    },
    awardedXp: mission.rewardEligible ? mission.xp : 0,
  };
}

export function abandonMissionInState(
  state: StatQuestState,
  missionId: string,
): StatQuestState {
  const target = state.missions.find((mission) => mission.id === missionId);
  if (!target || target.status !== "active") return state;
  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId
        ? { ...mission, status: "abandoned", evidence: null, completedAt: null }
        : mission,
    ),
  };
}

export function continueOldMissionInState(
  state: StatQuestState,
  missionId: string,
  today: string,
): StatQuestState {
  const target = state.missions.find((mission) => mission.id === missionId);
  if (!target || target.status !== "active" || target.date >= today) return state;
  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId
        ? { ...mission, carryoverDecision: "continued" as const }
        : mission,
    ),
  };
}

export function skipOldMissionInState(
  state: StatQuestState,
  missionId: string,
  today: string,
): StatQuestState {
  const target = state.missions.find((mission) => mission.id === missionId);
  if (!target || target.status !== "active" || target.date >= today) return state;
  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            status: "abandoned" as const,
            carryoverDecision: "skipped" as const,
            evidence: null,
            completedAt: null,
          }
        : mission,
    ),
  };
}

export function effectiveMood(
  state: Pick<StatQuestState, "mood" | "moodDate">,
  dateKey: string,
) {
  return state.moodDate === dateKey ? state.mood : "moderate";
}

export function rolloverLocalDate(
  state: StatQuestState,
  dateKey: string,
): StatQuestState {
  const nextStreak = expireStreak(state.streak, dateKey);
  if (state.moodDate === dateKey && nextStreak === state.streak) return state;
  return {
    ...state,
    mood: state.moodDate === dateKey ? state.mood : "moderate",
    moodDate: dateKey,
    streak: nextStreak,
  };
}

export function localCompletionDate(submittedAt: string): string {
  const date = new Date(submittedAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function completeMissionInState(
  state: StatQuestState,
  missionId: string,
  evidence: MissionEvidence,
): StatQuestState {
  const currentMission = state.missions.find(
    (mission) => mission.id === missionId,
  );
  if (!currentMission) return state;

  const result = completeMission(currentMission, evidence);
  if (result.mission === currentMission && result.awardedXp === 0) return state;

  return {
    ...state,
    missions: state.missions.map((mission) =>
      mission.id === missionId ? result.mission : mission,
    ),
    totalXp: state.totalXp + result.awardedXp,
    streak: updateStreak(
      state.streak,
      localCompletionDate(result.mission.completedAt!),
    ),
  };
}

export function applyMissionFeedbackInState(
  state: StatQuestState,
  missionId: string,
  feedback: MissionFeedback,
): StatQuestState {
  const mission = state.missions.find((candidate) => candidate.id === missionId);
  if (
    !mission ||
    mission.status !== "completed" ||
    mission.feedback !== null ||
    ![1, 2, 3, 4, 5].includes(feedback.confidence) ||
    !["too-easy", "about-right", "difficult"].includes(feedback.difficulty)
  ) {
    return state;
  }
  const goal = state.goals.find((candidate) => candidate.id === mission.goalId);
  return {
    ...state,
    missions: state.missions.map((candidate) =>
      candidate.id === missionId ? { ...candidate, feedback } : candidate,
    ),
    goals: goal
      ? state.goals.map((candidate) =>
          candidate.id === goal.id
            ? applyFeedbackToGoal(goal, mission, feedback)
            : candidate,
        )
      : state.goals,
  };
}

export function markPastMissionsMissed(
  missions: DailyMission[],
  today: string,
): DailyMission[] {
  void today;
  return missions;
}
