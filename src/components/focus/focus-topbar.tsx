import type { AppTheme } from "@/lib/theme";
import type {
  LevelCosmeticTier,
  StreakVisualTier,
} from "@/lib/progression-visuals";

type FocusTopbarProps = {
  displayName: string;
  level: number;
  levelTier: LevelCosmeticTier;
  totalXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  streakCurrent: number;
  streakLongest: number;
  streakTier: StreakVisualTier;
  theme: AppTheme;
  inactive: boolean;
  onThemeChange: (theme: AppTheme) => void;
  onProfile: () => void;
  onAdventure: () => void;
  onLogout: () => void;
};

function tierLabel(tier: string): string {
  return tier.charAt(0).toLocaleUpperCase() + tier.slice(1);
}

function StreakFlame({ tier }: { tier: StreakVisualTier }) {
  return (
    <svg
      className={`streak-flame streak-flame-${tier}`}
      viewBox="0 0 32 40"
      aria-hidden="true"
    >
      <path
        className="streak-flame-outer"
        d="M17 2c2 8-3 10 1 15 2-5 6-7 7-12 5 7 7 14 4 22-2 7-8 11-15 11C6 38 1 33 2 25 3 17 10 13 12 6c3 3 4 6 3 10 3-4 3-8 2-14Z"
      />
      <path
        className="streak-flame-core"
        d="M17 18c4 5 5 8 3 12-1 3-3 5-6 5-4 0-7-3-6-7 1-4 4-6 6-10 1 3 1 5 0 7 2-2 3-4 3-7Z"
      />
      <circle className="streak-ember" cx="16" cy="33" r="3" />
    </svg>
  );
}

export function FocusTopbar({
  displayName,
  level,
  levelTier,
  totalXp,
  xpInLevel,
  xpForNextLevel,
  streakCurrent,
  streakLongest,
  streakTier,
  theme,
  inactive,
  onThemeChange,
  onProfile,
  onAdventure,
  onLogout,
}: FocusTopbarProps) {
  const runMenuAction = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  };

  return (
    <header
      className="focus-topbar"
      inert={inactive ? true : undefined}
      aria-hidden={inactive || undefined}
    >
      <a
        className="brand focus-brand"
        href="#focus-dashboard"
        aria-label="StatQuest Focus home"
      >
        <span className={`brand-mark level-cosmetic-${levelTier}`}>SQ</span>
        <span>StatQuest</span>
      </a>

      <div className="focus-top-stats" aria-label="Current progress">
        <div
          className={`focus-progress-item focus-level-item level-cosmetic-${levelTier}`}
          aria-label={`Level ${level}, ${tierLabel(levelTier)} cosmetic tier`}
        >
          <span className="focus-stat-kicker">Level</span>
          <strong>{level}</strong>
          <small>{tierLabel(levelTier)}</small>
        </div>

        <div className="focus-progress-item focus-xp-item">
          <span className="focus-stat-icon" aria-hidden="true">✦</span>
          <span>
            <small>XP</small>
            <strong>{totalXp}</strong>
          </span>
          <span
            className="focus-xp-track"
            role="progressbar"
            aria-label="Current level XP progress"
            aria-valuemin={0}
            aria-valuemax={xpForNextLevel}
            aria-valuenow={xpInLevel}
          >
            <i style={{ width: `${(xpInLevel / xpForNextLevel) * 100}%` }} />
          </span>
        </div>

        <details className="focus-streak-details">
          <summary
            className="focus-progress-item focus-streak-item"
            aria-label={`Current streak: ${streakCurrent} days. Longest streak: ${streakLongest} days.`}
          >
            <StreakFlame tier={streakTier} />
            <span>
              <small>Streak</small>
              <strong>{streakCurrent}</strong>
            </span>
          </summary>
          <div className="focus-streak-popover">
            <strong>Current streak: {streakCurrent} days</strong>
            <span>Longest streak: {streakLongest} days</span>
          </div>
        </details>
      </div>

      <div className="focus-top-actions">
        <div className="theme-toggle" role="group" aria-label="Focus appearance">
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={() => onThemeChange("light")}
          >
            Light
          </button>
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={() => onThemeChange("dark")}
          >
            Dark
          </button>
        </div>

        <details className="focus-account-menu">
          <summary>
            <span>{displayName}</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="focus-account-popover">
            <button type="button" onClick={(event) => runMenuAction(event, onProfile)}>
              Profile
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, onAdventure)}>
              Adventure mode
            </button>
            <button type="button" onClick={(event) => runMenuAction(event, onLogout)}>
              Log out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
