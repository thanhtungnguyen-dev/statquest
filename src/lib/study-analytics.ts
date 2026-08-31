import { getLocalDateKey } from "./mission-generator.ts";
import { localCompletionDate } from "./progress.ts";
import type { StatQuestState } from "./types.ts";

export type WeeklyStudyAnalytics = {
  weekStart: string;
  weekEnd: string;
  completedFocusPeriods: number;
  completedFocusMinutes: number;
  completedMissions: number;
  uniqueStudyDays: number;
};

function currentWeekBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { weekStart: getLocalDateKey(start), weekEnd: getLocalDateKey(end) };
}

export function weeklyStudyAnalytics(
  state: Pick<StatQuestState, "focusSessions" | "missions">,
  date = new Date(),
): WeeklyStudyAnalytics {
  const { weekStart, weekEnd } = currentWeekBounds(date);
  const inCurrentWeek = (dateKey: string) =>
    dateKey >= weekStart && dateKey <= weekEnd;
  const studyDays = new Set<string>();
  let completedFocusPeriods = 0;
  let completedFocusMinutes = 0;
  let completedMissions = 0;

  for (const session of state.focusSessions) {
    if (session.completedAt === null || session.status === "cancelled") continue;
    const completionDate = localCompletionDate(session.completedAt);
    if (!inCurrentWeek(completionDate)) continue;

    // A break reuses its completed Focus record, so it never adds a second period.
    completedFocusPeriods += 1;
    completedFocusMinutes += session.focusMinutes;
    studyDays.add(completionDate);
  }

  for (const mission of state.missions) {
    if (mission.status !== "completed") continue;
    const completionDate = mission.completedAt
      ? localCompletionDate(mission.completedAt)
      : mission.date;
    if (!inCurrentWeek(completionDate)) continue;

    completedMissions += 1;
    studyDays.add(completionDate);
  }

  return {
    weekStart,
    weekEnd,
    completedFocusPeriods,
    completedFocusMinutes,
    completedMissions,
    uniqueStudyDays: studyDays.size,
  };
}
