import type { DailyMission } from "@/lib/types";

export function plannedMissionMinutes(mission: DailyMission): number {
  return mission.steps.reduce((total, step) => total + step.minutes, 0);
}

export function missionRemainingMilliseconds(
  mission: DailyMission,
  now = Date.now(),
): number | null {
  void mission;
  void now;
  // Missions are plans, not timers. Countdown state begins only when the
  // learner explicitly starts a FocusSession.
  return null;
}

export function formatMissionCountdown(remainingMilliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.ceil(remainingMilliseconds / 1_000),
  );
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
