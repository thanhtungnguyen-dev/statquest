import type {
  AppMode,
  DailyMission,
  FocusSession,
  GoalReferenceFile,
  LearningGoal,
  LearningStage,
  LearnerMood,
  LocalProfile,
  MissionStep,
  PlayerClassId,
  StatQuestState,
} from "@/lib/types";
import { normalizeHero, normalizePlayerClass } from "./hero.ts";
import {
  normalizeCourseDetails,
  normalizeLearningTopics,
  syncLearningTopics,
} from "./learning-map.ts";

export const STORAGE_KEY = "statquest.state.v2";
export const PREVIOUS_STORAGE_KEY = "statquest.state.v1";
export const LOCAL_SESSION_KEY = "statquest.localSession.v1";
export const LOCAL_PROFILES_KEY = "statquest.localProfiles.v1";
const PROFILE_STATE_PREFIX = "statquest.localProfileState.v2.";
const LEGACY_GOAL_KEY = "statquest.activeLearningGoal";
const LEGACY_MISSION_KEY = "statquest.todayMission";

const LEARNING_STAGES = new Set<LearningStage>([
  "elementary",
  "middle-school",
  "high-school",
  "college",
  "professional",
  "other",
]);

const LEARNER_MOODS = new Set<LearnerMood>([
  "good",
  "moderate",
  "struggling",
  "tired",
]);

type PreviousGoal = Omit<
  LearningGoal,
  | "status"
  | "position"
  | "completedAt"
  | "referenceFiles"
  | "courseDetails"
  | "courseContextReviewed"
  | "learningTopics"
> & {
  referenceFiles?: GoalReferenceFile[];
  courseDetails?: LearningGoal["courseDetails"];
  courseContextReviewed?: boolean;
  learningTopics?: LearningGoal["learningTopics"];
};

type PreviousState = Partial<Omit<StatQuestState, "version" | "goals">> & {
  version?: 1;
  activeGoal?: PreviousGoal | null;
};

type LocalProfileCatalog = {
  version: 1;
  selectedProfileId: string | null;
  profileIds: string[];
};

export type LocalProfileSummary = Pick<
  LocalProfile,
  | "id"
  | "displayName"
  | "birthYear"
  | "learningStage"
  | "careerInterest"
  | "hero"
  | "playerCharacter"
  | "preferredMode"
  | "adventureSetupComplete"
>;

export const EMPTY_STATE: StatQuestState = {
  version: 2,
  profile: null,
  goals: [],
  missions: [],
  totalXp: 0,
  streak: {
    current: 0,
    longest: 0,
    lastCompletionDate: null,
  },
  missionPace: "standard",
  mood: "moderate",
  moodDate: null,
  focusSessions: [],
  weeklyReviews: [],
};

function profileStateKey(profileId: string): string {
  return `${PROFILE_STATE_PREFIX}${profileId}`;
}

function readCatalog(storage: Storage): LocalProfileCatalog | null {
  const saved = storage.getItem(LOCAL_PROFILES_KEY);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved) as Partial<LocalProfileCatalog>;
    return {
      version: 1,
      selectedProfileId:
        typeof parsed.selectedProfileId === "string"
          ? parsed.selectedProfileId
          : null,
      profileIds: Array.isArray(parsed.profileIds)
        ? [...new Set(parsed.profileIds.filter((id) => typeof id === "string"))]
        : [],
    };
  } catch {
    return null;
  }
}

function saveCatalog(storage: Storage, catalog: LocalProfileCatalog): void {
  storage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(catalog));
}

export function normalizeAppMode(value: unknown): AppMode {
  return value === "adventure" ? "adventure" : "focus";
}

function hasLegacyAdventureCustomization(profile: LocalProfile): boolean {
  return Boolean(
    ["warrior", "mage", "explorer"].includes(
      profile.playerCharacter as string,
    ) &&
      profile.hero &&
      ["owl", "fox", "cat"].includes(profile.hero.preset) &&
      ["meadow", "sunset", "sky", "violet"].includes(profile.hero.color) &&
      ["glasses", "satchel", "leaf"].includes(profile.hero.accessory),
  );
}

function normalizeProfile(profile: LocalProfile): LocalProfile {
  return {
    ...profile,
    birthYear: Number.isInteger(profile.birthYear) ? profile.birthYear : null,
    learningStage:
      profile.learningStage && LEARNING_STAGES.has(profile.learningStage)
        ? profile.learningStage
        : null,
    careerInterest:
      typeof profile.careerInterest === "string" ? profile.careerInterest : "",
    hero: normalizeHero(profile.hero),
    playerCharacter: normalizePlayerClass(
      profile.playerCharacter as PlayerClassId | undefined,
    ),
    preferredMode: normalizeAppMode(profile.preferredMode),
    adventureSetupComplete:
      typeof profile.adventureSetupComplete === "boolean"
        ? profile.adventureSetupComplete
        : hasLegacyAdventureCustomization(profile),
  };
}

export function setPreferredMode(
  state: StatQuestState,
  preferredMode: unknown,
): StatQuestState {
  if (!state.profile) return state;
  return {
    ...state,
    profile: {
      ...state.profile,
      preferredMode: normalizeAppMode(preferredMode),
    },
  };
}

function normalizeMission(mission: DailyMission): DailyMission {
  const workloadMinutes = Array.isArray(mission.steps)
    ? mission.steps.reduce((total, step) => total + (step.minutes || 0), 0)
    : 0;
  const workload =
    mission.workload ??
    (workloadMinutes <= 30 ? "easy" : workloadMinutes < 60 ? "medium" : "hard");
  const kind: DailyMission["kind"] = ["learn", "practice", "review", "apply"].includes(mission.kind)
    ? mission.kind
    : "practice";
  return {
    ...mission,
    kind,
    topicId: typeof mission.topicId === "string" ? mission.topicId : null,
    workload,
    rewardEligible:
      typeof mission.rewardEligible === "boolean"
        ? mission.rewardEligible
        : mission.xp > 0,
    completionCriteria: Array.isArray(mission.completionCriteria)
      ? mission.completionCriteria
      : ["Complete every step and submit the required evidence."],
    sourceReferences: Array.isArray(mission.sourceReferences)
      ? mission.sourceReferences
      : [],
    learningTargetKey:
      typeof mission.learningTargetKey === "string"
        ? mission.learningTargetKey
        : null,
    recommendationReasons: Array.isArray(mission.recommendationReasons)
      ? mission.recommendationReasons.filter((reason) => typeof reason === "string")
      : [],
    feedback: mission.feedback ?? null,
    rewardOpportunityId:
      typeof mission.rewardOpportunityId === "string"
        ? mission.rewardOpportunityId
        : mission.id,
    rewardDate:
      typeof mission.rewardDate === "string" ? mission.rewardDate : mission.date,
    replacementOf:
      typeof mission.replacementOf === "string" ? mission.replacementOf : null,
    carryoverDecision: ["continued", "replaced", "skipped"].includes(
      mission.carryoverDecision ?? "",
    )
      ? mission.carryoverDecision
      : null,
  };
}

function normalizeFocusSession(session: FocusSession): FocusSession {
  const phase = session.phase === "break" ? "break" : "focus";
  const status = ["active", "ready-to-complete", "completed", "cancelled"].includes(
    session.status,
  )
    ? session.status
    : "cancelled";
  return {
    ...session,
    goalId: typeof session.goalId === "string" ? session.goalId : null,
    missionId: typeof session.missionId === "string" ? session.missionId : null,
    stepId: typeof session.stepId === "string" ? session.stepId : null,
    focusMinutes: session.focusMinutes === 50 ? 50 : 25,
    breakMinutes: session.breakMinutes === 10 ? 10 : 5,
    phase,
    status,
    completedAt:
      typeof session.completedAt === "string" ? session.completedAt : null,
    rewardEligible: session.rewardEligible === true,
    xpAwarded: session.xpAwarded === true,
  };
}

function normalizeReferenceFile(file: GoalReferenceFile): GoalReferenceFile {
  const interrupted = file.status === "extracting";
  return {
    ...file,
    progress: file.status === "ready" ? 100 : Math.max(0, file.progress ?? 0),
    extractedText:
      typeof file.extractedText === "string" ? file.extractedText : "",
    status: interrupted ? "error" : file.status,
    extractionError: interrupted
      ? "File processing was interrupted. Replace the file to try again."
      : file.extractionError ?? null,
  };
}

function normalizeGoal(goal: LearningGoal): LearningGoal {
  const courseDetails = normalizeCourseDetails(goal.courseDetails);
  return {
    ...goal,
    status: goal.status === "queued" ? "active" : goal.status,
    referenceFiles: Array.isArray(goal.referenceFiles)
      ? goal.referenceFiles.map(normalizeReferenceFile)
      : [],
    courseDetails,
    courseContextReviewed: goal.courseContextReviewed === true,
    learningTopics: syncLearningTopics(
      goal.id,
      goal.subject,
      normalizeLearningTopics(goal.id, goal.subject, goal.learningTopics),
      courseDetails,
    ),
  };
}

function normalizeState(parsed: Partial<StatQuestState>): StatQuestState {
  const moodDate = typeof parsed.moodDate === "string" ? parsed.moodDate : null;
  return {
    ...EMPTY_STATE,
    ...parsed,
    version: 2,
    profile: parsed.profile ? normalizeProfile(parsed.profile) : null,
    goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : [],
    streak: { ...EMPTY_STATE.streak, ...parsed.streak },
    missions: Array.isArray(parsed.missions)
      ? parsed.missions.map(normalizeMission)
      : [],
    mood: moodDate && LEARNER_MOODS.has(parsed.mood as LearnerMood)
      ? (parsed.mood as LearnerMood)
      : "moderate",
    moodDate,
    focusSessions: Array.isArray(parsed.focusSessions)
      ? parsed.focusSessions.map(normalizeFocusSession)
      : [],
    weeklyReviews: Array.isArray(parsed.weeklyReviews)
      ? parsed.weeklyReviews
      : [],
  };
}

function readProfileState(
  storage: Storage,
  profileId: string,
): StatQuestState | null {
  const saved = storage.getItem(profileStateKey(profileId));
  if (!saved) return null;
  try {
    const state = normalizeState(JSON.parse(saved) as Partial<StatQuestState>);
    return state.profile?.id === profileId ? state : null;
  } catch {
    return null;
  }
}

function upgradeGoal(goal: PreviousGoal, position = 0): LearningGoal {
  return {
    ...goal,
    referenceFiles: goal.referenceFiles ?? [],
    courseDetails: goal.courseDetails ?? [],
    courseContextReviewed: goal.courseContextReviewed === true,
    learningTopics: normalizeLearningTopics(
      goal.id,
      goal.subject,
      goal.learningTopics,
    ),
    status: "active",
    position,
    completedAt: null,
  };
}

function upgradePreviousState(previous: PreviousState): StatQuestState {
  return normalizeState({
    profile: previous.profile,
    goals: previous.activeGoal ? [upgradeGoal(previous.activeGoal)] : [],
    missions: previous.missions,
    totalXp: previous.totalXp,
    streak: previous.streak,
    missionPace: previous.missionPace,
    weeklyReviews: previous.weeklyReviews,
  });
}

export function loadState(storage: Storage): StatQuestState {
  const catalog = readCatalog(storage);
  if (catalog) {
    if (!catalog.selectedProfileId) return EMPTY_STATE;
    const selected = readProfileState(storage, catalog.selectedProfileId);
    if (selected) return selected;
  }

  const saved = storage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const state = normalizeState(JSON.parse(saved) as Partial<StatQuestState>);
      if (state.profile) saveState(storage, state);
      return state;
    } catch {
      // Keep looking for a valid older snapshot instead of clearing progress.
    }
  }

  const previous = storage.getItem(PREVIOUS_STORAGE_KEY);
  if (previous) {
    try {
      const migrated = upgradePreviousState(
        JSON.parse(previous) as PreviousState,
      );
      saveState(storage, migrated);
      return migrated;
    } catch {
      // The standalone legacy keys remain a final non-destructive fallback.
    }
  }

  return migrateLegacyState(storage);
}

function migrateLegacyState(storage: Storage): StatQuestState {
  const savedGoal = storage.getItem(LEGACY_GOAL_KEY);
  if (!savedGoal) return EMPTY_STATE;

  try {
    const activeGoal = upgradeGoal(JSON.parse(savedGoal) as PreviousGoal);
    const savedMission = storage.getItem(LEGACY_MISSION_KEY);
    let missions: DailyMission[] = [];

    if (savedMission) {
      const legacyMission = JSON.parse(savedMission) as Partial<DailyMission> & {
        steps?: MissionStep[];
      };

      if (legacyMission.id && legacyMission.date && legacyMission.title) {
        missions = [
          normalizeMission({
            ...(legacyMission as DailyMission),
            subject: legacyMission.subject ?? activeGoal.subject,
            pace: legacyMission.pace ?? "standard",
            steps: (legacyMission.steps ?? []).map((step) => ({
              ...step,
              completed: step.completed ?? false,
            })),
            evidence: legacyMission.evidence ?? null,
            xpAwarded: legacyMission.xpAwarded ?? false,
            completedAt: legacyMission.completedAt ?? null,
          }),
        ];
      }
    }

    const migrated: StatQuestState = {
      ...EMPTY_STATE,
      goals: [activeGoal],
      missions,
    };
    saveState(storage, migrated);
    return migrated;
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(storage: Storage, state: StatQuestState): void {
  if (!state.profile) return;

  const normalized = normalizeState(state);
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  storage.setItem(
    profileStateKey(normalized.profile!.id),
    JSON.stringify(normalized),
  );

  const catalog = readCatalog(storage) ?? {
    version: 1,
    selectedProfileId: null,
    profileIds: [],
  };
  saveCatalog(storage, {
    version: 1,
    selectedProfileId: normalized.profile!.id,
    profileIds: [...new Set([...catalog.profileIds, normalized.profile!.id])],
  });
}

export function listLocalProfiles(storage: Storage): LocalProfileSummary[] {
  const catalog = readCatalog(storage);
  if (!catalog) return [];
  return catalog.profileIds.flatMap((profileId) => {
    const profile = readProfileState(storage, profileId)?.profile;
    return profile ? [profile] : [];
  });
}

export function beginNewLocalProfile(storage: Storage): void {
  const catalog = readCatalog(storage) ?? {
    version: 1,
    selectedProfileId: null,
    profileIds: [],
  };
  saveCatalog(storage, { ...catalog, selectedProfileId: null });
  saveLocalSession(storage, true);
}

export function selectLocalProfile(
  storage: Storage,
  profileId: string,
): StatQuestState | null {
  const catalog = readCatalog(storage);
  if (!catalog?.profileIds.includes(profileId)) return null;
  const state = readProfileState(storage, profileId);
  if (!state) return null;
  saveCatalog(storage, { ...catalog, selectedProfileId: profileId });
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function deleteLocalProfile(
  storage: Storage,
  profileId: string,
): StatQuestState {
  const catalog = readCatalog(storage);
  if (!catalog?.profileIds.includes(profileId)) return loadState(storage);

  storage.removeItem(profileStateKey(profileId));
  const profileIds = catalog.profileIds.filter((id) => id !== profileId);
  const selectedProfileId = profileIds[0] ?? null;
  saveCatalog(storage, { version: 1, selectedProfileId, profileIds });

  if (!selectedProfileId) {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(PREVIOUS_STORAGE_KEY);
    storage.removeItem(LEGACY_GOAL_KEY);
    storage.removeItem(LEGACY_MISSION_KEY);
    saveLocalSession(storage, false);
    return EMPTY_STATE;
  }

  const nextState = readProfileState(storage, selectedProfileId) ?? EMPTY_STATE;
  storage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function loadLocalSession(
  storage: Storage,
  hasLocalProfile: boolean,
): boolean {
  const saved = storage.getItem(LOCAL_SESSION_KEY);
  if (saved === null) return hasLocalProfile;
  return saved === "active";
}

export function saveLocalSession(storage: Storage, active: boolean): void {
  storage.setItem(LOCAL_SESSION_KEY, active ? "active" : "logged-out");
}
