export type StreakVisualTier =
  | "ember"
  | "small"
  | "warm"
  | "strong"
  | "advanced"
  | "radiant";

export type LevelCosmeticTier =
  | "starter"
  | "bronze"
  | "silver"
  | "gold"
  | "aura";

export function streakVisualTier(currentStreak: number): StreakVisualTier {
  const days = Number.isFinite(currentStreak)
    ? Math.max(0, Math.floor(currentStreak))
    : 0;
  if (days === 0) return "ember";
  if (days <= 2) return "small";
  if (days <= 6) return "warm";
  if (days <= 13) return "strong";
  if (days <= 29) return "advanced";
  return "radiant";
}

export function levelCosmeticTier(level: number): LevelCosmeticTier {
  const normalizedLevel = Number.isFinite(level)
    ? Math.max(1, Math.floor(level))
    : 1;
  if (normalizedLevel <= 4) return "starter";
  if (normalizedLevel <= 9) return "bronze";
  if (normalizedLevel <= 19) return "silver";
  if (normalizedLevel <= 29) return "gold";
  return "aura";
}
