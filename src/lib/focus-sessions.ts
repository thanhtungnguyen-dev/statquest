import { getLocalDateKey } from "./mission-generator.ts";
import { localCompletionDate, updateStreak } from "./progress.ts";
import type {
  FocusPreset,
  FocusSession,
  StatQuestState,
} from "./types.ts";

const MILLISECONDS_PER_MINUTE = 60_000;
const FOCUS_XP = 5;
const REWARDED_FOCUS_PERIODS_PER_DAY = 6;

export const FOCUS_PRESETS: Record<
  FocusPreset,
  { focusMinutes: number; breakMinutes: number; label: string }
> = {
  "25/5": { focusMinutes: 25, breakMinutes: 5, label: "25 min focus / 5 min break" },
  "50/10": { focusMinutes: 50, breakMinutes: 10, label: "50 min deep focus / 10 min break" },
};

export function focusSessionRemainingMilliseconds(
  session: FocusSession,
  now = Date.now(),
): number | null {
  if (session.status === "ready-to-complete") return 0;
  if (session.status !== "active") return null;
  const endTime = new Date(session.endsAt).getTime();
  if (!Number.isFinite(endTime)) return 0;
  return Math.max(0, endTime - now);
}

export function getActiveFocusSession(
  sessions: FocusSession[],
): FocusSession | null {
  return (
    sessions.find(
      (session) =>
        session.status === "active" ||
        session.status === "ready-to-complete",
    ) ?? null
  );
}

export function getPendingBreakSession(
  sessions: FocusSession[],
): FocusSession | null {
  return (
    sessions.find(
      (session) =>
        session.phase === "focus" &&
        session.status === "completed" &&
        session.completedAt !== null,
    ) ?? null
  );
}

export function startFocusSessionInState(
  state: StatQuestState,
  preset: FocusPreset,
  goalId: string | null,
  startedAt = new Date().toISOString(),
  id = crypto.randomUUID(),
  linkage: { missionId?: string | null; stepId?: string | null } = {},
): StatQuestState {
  if (
    getActiveFocusSession(state.focusSessions) ||
    getPendingBreakSession(state.focusSessions)
  ) {
    return state;
  }
  const missionId = linkage.missionId ?? null;
  const stepId = linkage.stepId ?? null;
  if (missionId !== null) {
    const mission = state.missions.find(
      (candidate) =>
        candidate.id === missionId &&
        candidate.status === "active" &&
        candidate.goalId === goalId,
    );
    const step = mission?.steps.find(
      (candidate) => candidate.id === stepId && !candidate.completed,
    );
    if (!mission || !step) return state;
  } else if (stepId !== null) {
    return state;
  }
  if (
    goalId !== null &&
    !state.goals.some((goal) => goal.id === goalId && goal.status === "active")
  ) {
    return state;
  }

  const selected = FOCUS_PRESETS[preset];
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return state;
  const session: FocusSession = {
    id,
    goalId,
    missionId,
    stepId,
    focusMinutes: selected.focusMinutes,
    breakMinutes: selected.breakMinutes,
    phase: "focus",
    status: "active",
    startedAt,
    endsAt: new Date(
      started + selected.focusMinutes * MILLISECONDS_PER_MINUTE,
    ).toISOString(),
    completedAt: null,
    rewardEligible: false,
    xpAwarded: false,
  };
  return { ...state, focusSessions: [session, ...state.focusSessions] };
}

export function completeLinkedStepFocusInState(
  state: StatQuestState,
  sessionId: string,
  completedAt = new Date().toISOString(),
): StatQuestState {
  const target = state.focusSessions.find(
    (session) => session.id === sessionId,
  );
  if (
    !target ||
    target.status !== "ready-to-complete" ||
    !target.missionId ||
    !target.stepId
  ) {
    return state;
  }
  const completed = completeFocusSessionInState(state, sessionId, completedAt);
  if (completed === state) return state;
  return {
    ...completed,
    missions: completed.missions.map((mission) =>
      mission.id === target.missionId && mission.status === "active"
        ? {
            ...mission,
            steps: mission.steps.map((step) =>
              step.id === target.stepId ? { ...step, completed: true } : step,
            ),
          }
        : mission,
    ),
  };
}

export function continueLinkedFocusInState(
  state: StatQuestState,
  sessionId: string,
  completedAt = new Date().toISOString(),
  nextSessionId = crypto.randomUUID(),
): StatQuestState {
  const target = state.focusSessions.find(
    (session) => session.id === sessionId,
  );
  if (
    !target ||
    target.status !== "ready-to-complete" ||
    !target.missionId ||
    !target.stepId
  ) {
    return state;
  }
  const completed = completeFocusSessionInState(state, sessionId, completedAt);
  if (completed === state) return state;
  const withoutBreakOffer = skipFocusBreakInState(completed, sessionId);
  return startFocusSessionInState(
    withoutBreakOffer,
    target.focusMinutes === 50 ? "50/10" : "25/5",
    target.goalId,
    completedAt,
    nextSessionId,
    { missionId: target.missionId, stepId: target.stepId },
  );
}

export function advanceFocusSessions(
  state: StatQuestState,
  now = Date.now(),
): StatQuestState {
  let changed = false;
  const focusSessions = state.focusSessions.map((session) => {
    if (
      session.status !== "active" ||
      (focusSessionRemainingMilliseconds(session, now) ?? 1) > 0
    ) {
      return session;
    }
    changed = true;
    return session.phase === "focus"
      ? { ...session, status: "ready-to-complete" as const }
      : { ...session, status: "completed" as const };
  });
  return changed ? { ...state, focusSessions } : state;
}

export function cancelFocusSessionInState(
  state: StatQuestState,
  sessionId: string,
): StatQuestState {
  const target = state.focusSessions.find((session) => session.id === sessionId);
  if (
    !target ||
    target.phase !== "focus" ||
    target.completedAt !== null ||
    (target.status !== "active" && target.status !== "ready-to-complete")
  ) {
    return state;
  }
  return {
    ...state,
    focusSessions: state.focusSessions.map((session) =>
      session.id === sessionId
        ? { ...session, status: "cancelled", rewardEligible: false, xpAwarded: false }
        : session,
    ),
  };
}

export function completeFocusSessionInState(
  state: StatQuestState,
  sessionId: string,
  completedAt = new Date().toISOString(),
): StatQuestState {
  const target = state.focusSessions.find((session) => session.id === sessionId);
  if (
    !target ||
    target.phase !== "focus" ||
    target.status !== "ready-to-complete" ||
    target.completedAt !== null
  ) {
    return state;
  }

  const completionDate = localCompletionDate(completedAt);
  const rewardedOnDate = state.focusSessions.filter(
    (session) =>
      session.id !== sessionId &&
      session.xpAwarded &&
      session.completedAt !== null &&
      localCompletionDate(session.completedAt) === completionDate,
  ).length;
  const hasActiveGoal =
    target.goalId !== null &&
    state.goals.some(
      (goal) => goal.id === target.goalId && goal.status === "active",
    );
  const rewardEligible =
    hasActiveGoal && rewardedOnDate < REWARDED_FOCUS_PERIODS_PER_DAY;

  return {
    ...state,
    focusSessions: state.focusSessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status: "completed",
            completedAt,
            rewardEligible,
            xpAwarded: rewardEligible,
          }
        : session,
    ),
    totalXp: state.totalXp + (rewardEligible ? FOCUS_XP : 0),
    streak: updateStreak(state.streak, completionDate),
  };
}

export function startFocusBreakInState(
  state: StatQuestState,
  sessionId: string,
  startedAt = new Date().toISOString(),
): StatQuestState {
  const target = getPendingBreakSession(state.focusSessions);
  if (!target || target.id !== sessionId) return state;
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return state;
  return {
    ...state,
    focusSessions: state.focusSessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            phase: "break",
            status: "active",
            startedAt,
            endsAt: new Date(
              started + session.breakMinutes * MILLISECONDS_PER_MINUTE,
            ).toISOString(),
          }
        : session,
    ),
  };
}

export function skipFocusBreakInState(
  state: StatQuestState,
  sessionId: string,
): StatQuestState {
  const target = getPendingBreakSession(state.focusSessions);
  if (!target || target.id !== sessionId) return state;
  return {
    ...state,
    focusSessions: state.focusSessions.map((session) =>
      session.id === sessionId
        ? { ...session, phase: "break", status: "completed" }
        : session,
    ),
  };
}

function weekBounds(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: getLocalDateKey(start), end: getLocalDateKey(end) };
}

export function weeklyStudyDates(
  state: StatQuestState,
  goalId: string,
  date = new Date(),
): string[] {
  const bounds = weekBounds(date);
  const dates = new Set<string>();
  const inWeek = (dateKey: string) =>
    dateKey >= bounds.start && dateKey <= bounds.end;

  for (const mission of state.missions) {
    if (mission.goalId !== goalId || mission.status !== "completed") continue;
    const completionDate = mission.completedAt
      ? localCompletionDate(mission.completedAt)
      : mission.date;
    if (inWeek(completionDate)) dates.add(completionDate);
  }
  for (const session of state.focusSessions) {
    if (session.goalId !== goalId || session.completedAt === null) continue;
    const completionDate = localCompletionDate(session.completedAt);
    if (inWeek(completionDate)) dates.add(completionDate);
  }
  return [...dates].sort();
}
