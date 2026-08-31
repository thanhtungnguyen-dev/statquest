"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AdventureOnboarding,
  ReturnToAdventure,
  type SavedProfileInput,
} from "@/components/game/adventure-onboarding";
import { EnterWorldTransition } from "@/components/game/enter-world-transition";
import { Character } from "@/components/game/character";
import { playerClassDetails } from "@/components/game/rpg-character-setup";
import { FocusRoom } from "@/components/focus/focus-room";
import { FocusTopbar } from "@/components/focus/focus-topbar";
import {
  generateMissionForGoal,
  getLocalDateKey,
  hasRecognizedSourceContext,
  latestReviewForGoal,
  missionGenerationIssue,
  replaceActiveMissionInState,
} from "@/lib/mission-generator";
import {
  canFinishGoal,
  completeActiveGoal,
  createLearningGoal,
  editLearningGoal,
  getActiveGoal,
  nextGoalPosition,
} from "@/lib/goals";
import {
  abandonMissionInState,
  applyMissionFeedbackInState,
  completeMissionInState,
  continueOldMissionInState,
  effectiveMood,
  getLevelProgress,
  markPastMissionsMissed,
  rolloverLocalDate,
  skipOldMissionInState,
} from "@/lib/progress";
import {
  advanceFocusSessions,
  cancelFocusSessionInState,
  completeLinkedStepFocusInState,
  completeFocusSessionInState,
  continueLinkedFocusInState,
  FOCUS_PRESETS,
  focusSessionRemainingMilliseconds,
  getActiveFocusSession,
  getPendingBreakSession,
  skipFocusBreakInState,
  startFocusBreakInState,
  startFocusSessionInState,
  weeklyStudyDates,
} from "@/lib/focus-sessions";
import {
  createReferenceFileRecord,
  extractReferenceFile,
  formatFileSize,
  removeReferenceFileRecord,
  REFERENCE_FILE_ACCEPT,
  replaceReferenceFileRecord,
  validateReferenceFile,
} from "@/lib/reference-files";
import {
  mergeExtractedCourseDetails,
} from "@/lib/course-context";
import {
  beginNewLocalProfile,
  deleteLocalProfile,
  EMPTY_STATE,
  listLocalProfiles,
  loadLocalSession,
  loadState,
  setPreferredMode,
  saveLocalSession,
  saveState,
  selectLocalProfile,
} from "@/lib/storage";
import type { LocalProfileSummary } from "@/lib/storage";
import type {
  AppMode,
  FocusPreset,
  LearningGoal,
  LearningGoalDraft,
  HeroCustomization,
  LearnerMood,
  LearningStage,
  LocalProfile,
  MissionAdjustment,
  MissionFeedbackDifficulty,
  MissionFeedbackReason,
  MissionPace,
  StatQuestState,
  WeeklyReview,
  WeeklyReviewDraft,
} from "@/lib/types";
import { DEFAULT_HERO, DEFAULT_PLAYER_CLASS, HERO_PRESETS } from "@/lib/hero";
import {
  formatMissionCountdown,
  plannedMissionMinutes,
} from "@/lib/mission-timer";
import {
  loadAppTheme,
  saveAppTheme,
  type AppTheme,
} from "@/lib/theme";
import {
  levelCosmeticTier,
  streakVisualTier,
} from "@/lib/progression-visuals";
import { weeklyStudyAnalytics } from "@/lib/study-analytics";
import { recommendNextTarget } from "@/lib/adaptive-learning";
import { goalCompletionSummary } from "@/lib/learning-map";
import { deriveEntryExperience } from "@/lib/entry-experience";

type FocusProfileDraft = {
  displayName: string;
  birthYear: string;
  learningStage: LearningStage | "";
  careerInterest: string;
};

type FocusProfileErrors = Partial<
  Record<keyof FocusProfileDraft, string>
>;

const ENTRY_LEARNING_CYCLE = [
  "Goal",
  "Mission",
  "Focus",
  "Feedback",
  "Review",
] as const;

const EMPTY_FOCUS_PROFILE: FocusProfileDraft = {
  displayName: "",
  birthYear: "",
  learningStage: "",
  careerInterest: "",
};

function focusProfileFieldError(
  field: keyof FocusProfileDraft,
  value: string,
): string | null {
  const normalized = value.trim();
  if (field === "displayName") {
    return normalized.length >= 2
      ? null
      : "Enter at least 2 characters for your display name.";
  }
  if (field === "careerInterest") {
    return normalized.length >= 2
      ? null
      : "Enter at least 2 characters for your career or study field.";
  }
  if (field === "learningStage") {
    return normalized
      ? null
      : "Choose your current learning stage.";
  }
  if (!normalized) return null;

  const birthYear = Number(normalized);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(birthYear) &&
    birthYear >= currentYear - 100 &&
    birthYear <= currentYear - 8
    ? null
    : `Enter a birth year from ${currentYear - 100} to ${currentYear - 8}, or leave it blank.`;
}

const EMPTY_GOAL: LearningGoalDraft = {
  subject: "",
  currentLevel: "beginner",
  desiredOutcome: "",
  minutesPerDay: 60,
  daysPerWeek: 5,
  deadline: "",
  referenceFiles: [],
  courseDetails: [],
  courseContextReviewed: false,
  learningTopics: [],
};

const EMPTY_REVIEW: WeeklyReviewDraft = {
  win: "",
  obstacle: "",
  nextFocus: "",
  nextMissionPace: "standard",
};

const FOCUS_TIMER_POSITION_KEY = "statquest.focusTimerPosition.v1";
const TIMER_DRAG_THRESHOLD = 6;
const TIMER_EDGE_MARGIN = 8;

type FocusTimerPosition = {
  xRatio: number;
  yRatio: number;
};

type FocusTimerDrag = {
  pointerId: number;
  captureTarget: HTMLElement;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  pendingLeft: number;
  pendingTop: number;
  moved: boolean;
  animationFrame: number;
};

function clampValue(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function timerAxisBounds(viewportSize: number, timerSize: number) {
  const available = Math.max(0, viewportSize - timerSize);
  const margin = Math.min(TIMER_EDGE_MARGIN, available / 2);
  return { minimum: margin, maximum: available - margin };
}

function clampTimerPixels(
  left: number,
  top: number,
  timerWidth: number,
  timerHeight: number,
) {
  const horizontal = timerAxisBounds(window.innerWidth, timerWidth);
  const vertical = timerAxisBounds(window.innerHeight, timerHeight);
  return {
    left: clampValue(left, horizontal.minimum, horizontal.maximum),
    top: clampValue(top, vertical.minimum, vertical.maximum),
  };
}

function parseFocusTimerPosition(raw: string | null): FocusTimerPosition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FocusTimerPosition>;
    if (
      !Number.isFinite(parsed.xRatio) ||
      !Number.isFinite(parsed.yRatio) ||
      parsed.xRatio! < 0 ||
      parsed.xRatio! > 1 ||
      parsed.yRatio! < 0 ||
      parsed.yRatio! > 1
    ) {
      return null;
    }
    return { xRatio: parsed.xRatio!, yRatio: parsed.yRatio! };
  } catch {
    return null;
  }
}

function normalizedTimerPixels(
  position: FocusTimerPosition,
  timerWidth: number,
  timerHeight: number,
) {
  const horizontal = timerAxisBounds(window.innerWidth, timerWidth);
  const vertical = timerAxisBounds(window.innerHeight, timerHeight);
  return {
    left:
      horizontal.minimum +
      position.xRatio * (horizontal.maximum - horizontal.minimum),
    top:
      vertical.minimum +
      position.yRatio * (vertical.maximum - vertical.minimum),
  };
}

function normalizedTimerPosition(
  left: number,
  top: number,
  timerWidth: number,
  timerHeight: number,
): FocusTimerPosition {
  const horizontal = timerAxisBounds(window.innerWidth, timerWidth);
  const vertical = timerAxisBounds(window.innerHeight, timerHeight);
  const horizontalRange = horizontal.maximum - horizontal.minimum;
  const verticalRange = vertical.maximum - vertical.minimum;
  return {
    xRatio:
      horizontalRange > 0
        ? clampValue((left - horizontal.minimum) / horizontalRange, 0, 1)
        : 0.5,
    yRatio:
      verticalRange > 0
        ? clampValue((top - vertical.minimum) / verticalRange, 0, 1)
        : 0.5,
  };
}

const subscribeToHydration = () => () => undefined;

function loadInitialState(): StatQuestState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const loaded = loadState(window.localStorage);
  const currentDate = getLocalDateKey();
  return advanceFocusSessions(
    rolloverLocalDate(
      {
        ...loaded,
        missions: markPastMissionsMissed(loaded.missions, currentDate),
      },
      currentDate,
    ),
    Date.now(),
  );
}

function loadInitialSession(): boolean {
  if (typeof window === "undefined") return false;
  const state = loadState(window.localStorage);
  return loadLocalSession(window.localStorage, state.profile !== null);
}

function loadInitialProfiles(): LocalProfileSummary[] {
  if (typeof window === "undefined") return [];
  return listLocalProfiles(window.localStorage);
}

function loadInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  return loadAppTheme(window.localStorage);
}

function isProfileComplete(profile: LocalProfile | null): profile is LocalProfile {
  return Boolean(
    profile?.learningStage &&
      profile.careerInterest.trim().length >= 2,
  );
}

function profileToFocusDraft(profile: LocalProfile | null): FocusProfileDraft {
  if (!profile) return EMPTY_FOCUS_PROFILE;
  return {
    displayName: profile.displayName,
    birthYear: profile.birthYear?.toString() ?? "",
    learningStage: profile.learningStage ?? "",
    careerInterest: profile.careerInterest,
  };
}

function goalToDraft(goal: LearningGoal): LearningGoalDraft {
  return {
    subject: goal.subject,
    currentLevel: goal.currentLevel,
    desiredOutcome: goal.desiredOutcome,
    minutesPerDay: goal.minutesPerDay,
    daysPerWeek: goal.daysPerWeek,
    deadline: goal.deadline,
    referenceFiles: [...goal.referenceFiles],
    courseDetails: goal.courseDetails.map((detail) => ({ ...detail })),
    courseContextReviewed: goal.courseContextReviewed === true,
    learningTopics: goal.learningTopics.map((topic) => ({
      ...topic,
      sourceReferences: [...topic.sourceReferences],
    })),
  };
}

function getWeekStart(date = new Date()): string {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (localDate.getDay() + 6) % 7;
  localDate.setDate(localDate.getDate() - mondayOffset);
  return getLocalDateKey(localDate);
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function Home() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [appState, setAppState] = useState<StatQuestState>(loadInitialState);
  const [theme, setTheme] = useState<AppTheme>(loadInitialTheme);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [localSession, setLocalSession] = useState(loadInitialSession);
  const [savedProfiles, setSavedProfiles] =
    useState<LocalProfileSummary[]>(loadInitialProfiles);
  const [focusProfileDraft, setFocusProfileDraft] = useState<FocusProfileDraft>(
    () => profileToFocusDraft(appState.profile),
  );
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileErrors, setProfileErrors] = useState<FocusProfileErrors>({});
  const [entryError, setEntryError] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showAdventureSetup, setShowAdventureSetup] = useState(false);
  const [entryTransition, setEntryTransition] = useState<{
    displayName: string;
    hero: HeroCustomization;
  } | null>(null);
  const [goalDraft, setGoalDraft] = useState<LearningGoalDraft>(EMPTY_GOAL);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalError, setGoalError] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [fileDropActive, setFileDropActive] = useState(false);
  const [missionError, setMissionError] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [evidenceDrafts, setEvidenceDrafts] = useState<
    Record<string, { reflection: string; evidenceUrl: string }>
  >({});
  const [evidenceError, setEvidenceError] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState<{
    difficulty: MissionFeedbackDifficulty;
    confidence: 1 | 2 | 3 | 4 | 5;
    reasons: MissionFeedbackReason[];
  }>({ difficulty: "about-right", confidence: 3, reasons: [] });
  const [reviewDraft, setReviewDraft] =
    useState<WeeklyReviewDraft>(EMPTY_REVIEW);
  const [reviewError, setReviewError] = useState("");
  const [reviewGoalId, setReviewGoalId] = useState("");
  const [focusPreset, setFocusPreset] = useState<FocusPreset>("25/5");
  const [focusGoalId, setFocusGoalId] = useState("");
  const [focusRoomOpen, setFocusRoomOpen] = useState(false);
  const [today, setToday] = useState(() => getLocalDateKey());
  const floatingTimerRef = useRef<HTMLButtonElement>(null);
  const timerPositionRef = useRef<FocusTimerPosition | null>(null);
  const timerDragRef = useRef<FocusTimerDrag | null>(null);
  const suppressTimerClickRef = useRef(false);
  const focusRoomWasVisibleRef = useRef(false);
  const aboutTriggerRef = useRef<HTMLButtonElement>(null);
  const aboutCloseRef = useRef<HTMLButtonElement>(null);
  const profileDisplayNameRef = useRef<HTMLInputElement>(null);
  const profileBirthYearRef = useRef<HTMLInputElement>(null);
  const profileLearningStageRef = useRef<HTMLSelectElement>(null);
  const profileCareerInterestRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const storedTheme = loadAppTheme(window.localStorage);
    document.documentElement.dataset.theme = storedTheme;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const hideGridGlow = () => {
      window.cancelAnimationFrame(animationFrame);
      root.style.setProperty("--pointer-grid-opacity", "0");
    };

    const updateGridGlow = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotion.matches) return;

      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        root.style.setProperty("--pointer-x", `${event.clientX}px`);
        root.style.setProperty("--pointer-y", `${event.clientY}px`);
        root.style.setProperty("--pointer-grid-opacity", "1");
      });
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) hideGridGlow();
    };

    const handleMotionPreferenceChange = () => {
      if (reducedMotion.matches) hideGridGlow();
    };

    window.addEventListener("pointermove", updateGridGlow, { passive: true });
    window.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("blur", hideGridGlow);
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", updateGridGlow);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", hideGridGlow);
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      root.style.removeProperty("--pointer-x");
      root.style.removeProperty("--pointer-y");
      root.style.removeProperty("--pointer-grid-opacity");
    };
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;
    aboutCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAboutOpen(false);
      window.requestAnimationFrame(() => aboutTriggerRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [aboutOpen]);

  useEffect(() => {
    if (hydrated) saveState(window.localStorage, appState);
  }, [appState, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let midnightTimer = 0;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimer = window.setTimeout(() => {
        const nextDate = getLocalDateKey();
        setToday(nextDate);
        setAppState((current) => rolloverLocalDate(current, nextDate));
        scheduleNextMidnight();
      }, Math.max(1_000, nextMidnight.getTime() - now.getTime() + 250));
    };
    scheduleNextMidnight();
    return () => window.clearTimeout(midnightTimer);
  }, [hydrated]);

  const activeGoals = useMemo(
    () =>
      appState.goals
        .filter((goal) => goal.status === "active")
        .sort((left, right) => left.position - right.position),
    [appState.goals],
  );
  const activeGoal = getActiveGoal(activeGoals);

  const todayMission = useMemo(
    () =>
      appState.missions.find(
        (mission) =>
          mission.date === today && mission.goalId === activeGoal?.id,
      ) ?? null,
    [activeGoal?.id, appState.missions, today],
  );
  const activeMissions = useMemo(
    () => appState.missions.filter((mission) => mission.status === "active"),
    [appState.missions],
  );
  const entryExperience = useMemo(
    () => deriveEntryExperience(appState, today),
    [appState, today],
  );
  const activeFocusSession = getActiveFocusSession(appState.focusSessions);
  const pendingBreakSession = getPendingBreakSession(appState.focusSessions);
  const focusRoomSession = activeFocusSession ?? pendingBreakSession;
  const focusRoomVisible = Boolean(focusRoomOpen && focusRoomSession);
  const floatingTimerVisible = Boolean(activeFocusSession);

  useEffect(() => {
    const wasVisible = focusRoomWasVisibleRef.current;
    focusRoomWasVisibleRef.current = focusRoomVisible;
    if (!wasVisible || focusRoomVisible) return;

    window.requestAnimationFrame(() => {
      if (activeFocusSession) {
        floatingTimerRef.current?.focus({ preventScroll: true });
      } else {
        document
          .getElementById("focus-session-controls")
          ?.focus({ preventScroll: true });
      }
    });
  }, [activeFocusSession, focusRoomVisible]);

  useEffect(() => {
    if (!floatingTimerVisible) return;
    const timer = floatingTimerRef.current;
    if (!timer) return;

    const applyPosition = (position: FocusTimerPosition | null) => {
      if (!position) {
        timer.style.removeProperty("left");
        timer.style.removeProperty("top");
        timer.style.removeProperty("bottom");
        timer.style.removeProperty("transform");
        return;
      }
      const rect = timer.getBoundingClientRect();
      const pixels = normalizedTimerPixels(position, rect.width, rect.height);
      timer.style.left = `${pixels.left}px`;
      timer.style.top = `${pixels.top}px`;
      timer.style.bottom = "auto";
      timer.style.transform = "none";
    };

    let savedPosition: FocusTimerPosition | null = null;
    try {
      savedPosition = parseFocusTimerPosition(
        window.localStorage.getItem(FOCUS_TIMER_POSITION_KEY),
      );
    } catch {
      savedPosition = null;
    }
    timerPositionRef.current = savedPosition;
    applyPosition(savedPosition);

    const handleResize = () => applyPosition(timerPositionRef.current);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      const drag = timerDragRef.current;
      if (drag?.animationFrame) window.cancelAnimationFrame(drag.animationFrame);
      timerDragRef.current = null;
    };
  }, [floatingTimerVisible]);

  useEffect(() => {
    const updateDragPosition = (event: PointerEvent) => {
      const drag = timerDragRef.current;
      const timer = floatingTimerRef.current;
      if (!drag || !timer || drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < TIMER_DRAG_THRESHOLD) return;

      drag.moved = true;
      suppressTimerClickRef.current = true;
      timer.classList.add("is-dragging");
      const rect = timer.getBoundingClientRect();
      const next = clampTimerPixels(
        drag.originLeft + deltaX,
        drag.originTop + deltaY,
        rect.width,
        rect.height,
      );
      drag.pendingLeft = next.left;
      drag.pendingTop = next.top;
      if (drag.animationFrame) return;
      drag.animationFrame = window.requestAnimationFrame(() => {
        const current = timerDragRef.current;
        const currentTimer = floatingTimerRef.current;
        if (!current || !currentTimer) return;
        currentTimer.style.left = `${current.pendingLeft}px`;
        currentTimer.style.top = `${current.pendingTop}px`;
        currentTimer.style.bottom = "auto";
        currentTimer.style.transform = "none";
        current.animationFrame = 0;
      });
    };

    const endDrag = (event: PointerEvent) => {
      updateDragPosition(event);
      const drag = timerDragRef.current;
      const timer = floatingTimerRef.current;
      if (!drag || !timer || drag.pointerId !== event.pointerId) return;
      if (drag.animationFrame) window.cancelAnimationFrame(drag.animationFrame);
      if (drag.moved) {
        timer.style.left = `${drag.pendingLeft}px`;
        timer.style.top = `${drag.pendingTop}px`;
        timer.style.bottom = "auto";
        timer.style.transform = "none";
        const rect = timer.getBoundingClientRect();
        const position = normalizedTimerPosition(
          drag.pendingLeft,
          drag.pendingTop,
          rect.width,
          rect.height,
        );
        timerPositionRef.current = position;
        try {
          window.localStorage.setItem(
            FOCUS_TIMER_POSITION_KEY,
            JSON.stringify(position),
          );
        } catch {
          // Cosmetic persistence can fail without affecting the study timer.
        }
      }
      timer.classList.remove("is-dragging");
      if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
        drag.captureTarget.releasePointerCapture(event.pointerId);
      }
      timerDragRef.current = null;
      window.setTimeout(() => {
        suppressTimerClickRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", updateDragPosition);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", updateDragPosition);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !activeFocusSession) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      setAppState((current) => advanceFocusSessions(current, now));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [activeFocusSession, hydrated]);
  const selectedMission =
    activeMissions.find((mission) => mission.id === selectedMissionId) ??
    activeMissions[0] ??
    null;
  const rewardedMissionCountToday = appState.missions.filter(
    (mission) => mission.date === today && mission.rewardEligible,
  ).length;
  const rewardedFocusCountToday = appState.focusSessions.filter(
    (session) =>
      session.xpAwarded &&
      session.completedAt !== null &&
      getLocalDateKey(new Date(session.completedAt)) === today,
  ).length;
  const selectedFocusGoalIsActive = activeGoals.some(
    (goal) => goal.id === focusGoalId,
  );
  const activeFocusRewardAvailable = Boolean(
    activeFocusSession?.goalId &&
      activeGoals.some((goal) => goal.id === activeFocusSession.goalId) &&
      rewardedFocusCountToday < 6,
  );
  const selectedReviewGoal =
    activeGoals.find((goal) => goal.id === reviewGoalId) ?? activeGoals[0] ?? null;
  const latestReview = selectedReviewGoal
    ? latestReviewForGoal(appState.weeklyReviews, selectedReviewGoal.id)
    : undefined;

  const selectedEvidenceDraft = selectedMission
    ? evidenceDrafts[selectedMission.id] ?? { reflection: "", evidenceUrl: "" }
    : { reflection: "", evidenceUrl: "" };
  const focusRemaining = activeFocusSession
    ? focusSessionRemainingMilliseconds(activeFocusSession, clockNow) ?? 0
    : null;
  const currentMood = effectiveMood(appState, today);
  const focusRoomGoal = focusRoomSession?.goalId
    ? appState.goals.find((goal) => goal.id === focusRoomSession.goalId) ?? null
    : null;
  const focusRoomMission = focusRoomSession?.missionId
    ? appState.missions.find(
        (mission) => mission.id === focusRoomSession.missionId,
      ) ?? null
    : focusRoomSession?.goalId
      ? activeMissions.find((mission) => mission.goalId === focusRoomSession.goalId) ?? null
      : null;
  const focusRoomCurrentTask =
    focusRoomMission?.steps.find((step) =>
      focusRoomSession?.stepId
        ? step.id === focusRoomSession.stepId
        : !step.completed,
    )?.title ?? null;
  const recommendedTarget = useMemo(() => {
    const unfinished = activeMissions[0];
    if (unfinished) {
      const goal = activeGoals.find((candidate) => candidate.id === unfinished.goalId);
      const topic = goal?.learningTopics.find(
        (candidate) => candidate.id === unfinished.topicId,
      );
      if (goal) {
        return {
          goalId: goal.id,
          topicId: unfinished.topicId ?? topic?.id ?? "",
          topicTitle: topic?.title ?? unfinished.subject,
          kind: unfinished.kind,
          difficulty: unfinished.difficulty,
          estimatedMinutes: plannedMissionMinutes(unfinished),
          reasons: ["Resume your unfinished mission before starting a new one."],
        };
      }
    }
    return recommendNextTarget(appState, today);
  }, [activeGoals, activeMissions, appState, today]);
  const pendingFeedbackMission = useMemo(
    () =>
      appState.missions
        .filter(
          (mission) =>
            mission.status === "completed" &&
            mission.feedback === null &&
            mission.topicId !== null,
        )
        .sort((left, right) =>
          (right.completedAt ?? right.createdAt).localeCompare(
            left.completedAt ?? left.createdAt,
          ),
        )[0] ?? null,
    [appState.missions],
  );
  const recommendedGoal = recommendedTarget
    ? appState.goals.find((goal) => goal.id === recommendedTarget.goalId) ?? null
    : null;
  const recommendedActiveMission = recommendedTarget
    ? activeMissions.find((mission) => mission.goalId === recommendedTarget.goalId) ?? null
    : null;
  const thisWeek = useMemo(
    () =>
      weeklyStudyAnalytics({
        focusSessions: appState.focusSessions,
        missions: appState.missions,
      }),
    [appState.focusSessions, appState.missions],
  );

  const activityHistory = useMemo(
    () => [
      ...appState.missions
        .filter((mission) => mission.status !== "active")
        .map((mission) => ({
          kind: "mission" as const,
          id: mission.id,
          timestamp: mission.completedAt ?? mission.createdAt,
          mission,
        })),
      ...appState.focusSessions
        .filter((session) => session.completedAt !== null)
        .map((session) => ({
          kind: "focus" as const,
          id: session.id,
          timestamp: session.completedAt!,
          session,
        })),
    ].sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    [appState.focusSessions, appState.missions],
  );

  const levelProgress = getLevelProgress(appState.totalXp);
  const levelTier = levelCosmeticTier(levelProgress.level);
  const streakTier = streakVisualTier(appState.streak.current);
  const completedCount = appState.missions.filter(
    (mission) => mission.status === "completed",
  ).length;

  function changeTheme(nextTheme: AppTheme) {
    if (nextTheme === theme) return;
    const root = document.documentElement;
    const applyTheme = () => {
      saveAppTheme(window.localStorage, nextTheme);
      root.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const transitionDocument = document as Document & {
      startViewTransition?: (
        update: () => void,
      ) => { finished: Promise<void> };
    };

    if (reducedMotion || !transitionDocument.startViewTransition) {
      applyTheme();
      return;
    }

    root.classList.add("theme-wipe-active");
    const transition = transitionDocument.startViewTransition(applyTheme);
    void transition.finished.finally(() => {
      root.classList.remove("theme-wipe-active");
    });
  }

  function renderThemeToggle() {
    return (
      <div className="theme-toggle" role="group" aria-label="Focus appearance">
        <button
          type="button"
          aria-pressed={theme === "light"}
          onClick={() => changeTheme("light")}
        >
          Light
        </button>
        <button
          type="button"
          aria-pressed={theme === "dark"}
          onClick={() => changeTheme("dark")}
        >
          Dark
        </button>
      </div>
    );
  }

  function closeAbout() {
    setAboutOpen(false);
    window.requestAnimationFrame(() => aboutTriggerRef.current?.focus());
  }

  function renderEntryHeader() {
    return (
      <div className="entry-header">
        <button
          className="entry-brand-button"
          type="button"
          ref={aboutTriggerRef}
          aria-haspopup="dialog"
          aria-expanded={aboutOpen}
          onClick={() => setAboutOpen(true)}
        >
          <span className="brand-mark" aria-hidden="true">SQ</span>
          <span className="entry-brand-copy">
            <strong>StatQuest</strong>
            <small>Focused learning</small>
          </span>
        </button>
        {renderThemeToggle()}
      </div>
    );
  }

  function renderEntryAbout() {
    if (!aboutOpen) return null;
    return (
      <div
        className="entry-about-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeAbout();
        }}
      >
        <section
          className="entry-about-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-statquest-title"
        >
          <div className="entry-about-heading">
            <div className="entry-about-lockup">
              <span className="brand-mark" aria-hidden="true">SQ</span>
              <div>
                <span>STATQUEST</span>
                <h2 id="about-statquest-title">Focused daily learning progress</h2>
              </div>
            </div>
            <button
              className="entry-dialog-close"
              type="button"
              ref={aboutCloseRef}
              onClick={closeAbout}
              aria-label="Close About StatQuest"
            >
              ×
            </button>
          </div>
          <p>Turn learning goals into focused daily progress.</p>
          <ol className="entry-about-flow" aria-label="How StatQuest works">
            {["Goal", "Mission", "Focus", "Feedback", "Review"].map((stage, index) => (
              <li key={stage}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage}</strong>
              </li>
            ))}
          </ol>
          <ul className="entry-about-capabilities">
            <li>Adaptive daily missions</li>
            <li>Guided Focus sessions</li>
            <li>Useful review timing</li>
            <li>Track mastery, XP, and streaks</li>
          </ul>
        </section>
      </div>
    );
  }

  function updateFocusProfileField<K extends keyof FocusProfileDraft>(
    field: K,
    value: FocusProfileDraft[K],
  ) {
    setFocusProfileDraft((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => {
      if (!current[field]) return current;
      const nextError = focusProfileFieldError(field, value);
      if (nextError) return { ...current, [field]: nextError };
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function saveFocusProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = focusProfileDraft.displayName.trim();
    const careerInterest = focusProfileDraft.careerInterest.trim();
    const birthYearText = focusProfileDraft.birthYear.trim();
    const birthYear = birthYearText ? Number(birthYearText) : null;
    const nextErrors: FocusProfileErrors = {};
    const fields: Array<keyof FocusProfileDraft> = [
      "displayName",
      "birthYear",
      "learningStage",
      "careerInterest",
    ];

    for (const field of fields) {
      const error = focusProfileFieldError(field, focusProfileDraft[field]);
      if (error) nextErrors[field] = error;
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      const firstInvalid = fields.find((field) => nextErrors[field]);
      const firstInvalidRef = firstInvalid === "displayName"
        ? profileDisplayNameRef
        : firstInvalid === "birthYear"
          ? profileBirthYearRef
          : firstInvalid === "learningStage"
            ? profileLearningStageRef
            : profileCareerInterestRef;
      window.requestAnimationFrame(() => firstInvalidRef.current?.focus());
      return;
    }

    const profile: LocalProfile = {
      id: appState.profile?.id ?? crypto.randomUUID(),
      displayName,
      birthYear,
      learningStage: focusProfileDraft.learningStage as LearningStage,
      careerInterest,
      preferredMode: appState.profile?.preferredMode ?? "focus",
      adventureSetupComplete:
        appState.profile?.adventureSetupComplete ?? false,
      hero: appState.profile?.hero ?? { ...DEFAULT_HERO },
      playerCharacter:
        appState.profile?.playerCharacter ?? DEFAULT_PLAYER_CLASS,
      createdAt: appState.profile?.createdAt ?? new Date().toISOString(),
    };
    const nextState = { ...appState, profile };
    saveState(window.localStorage, nextState);
    setAppState(nextState);
    setSavedProfiles(listLocalProfiles(window.localStorage));
    saveLocalSession(window.localStorage, true);
    setLocalSession(true);
    setShowProfileForm(false);
    setProfileErrors({});
    setFocusProfileDraft(profileToFocusDraft(profile));
  }

  function saveAdventureProfile(profileInput: SavedProfileInput) {
    const setupWasComplete = appState.profile?.adventureSetupComplete ?? false;
    const profile: LocalProfile = {
      id: appState.profile?.id ?? crypto.randomUUID(),
      ...profileInput,
      preferredMode: "adventure",
      adventureSetupComplete: true,
      createdAt: appState.profile?.createdAt ?? new Date().toISOString(),
    };
    const nextState = { ...appState, profile };
    saveState(window.localStorage, nextState);
    setAppState(nextState);
    setSavedProfiles(listLocalProfiles(window.localStorage));
    saveLocalSession(window.localStorage, true);
    setLocalSession(true);
    setShowAdventureSetup(false);
    setFocusProfileDraft(profileToFocusDraft(profile));
    if (!setupWasComplete) {
      setEntryTransition({
        displayName: profile.displayName,
        hero: profile.hero,
      });
    }
  }

  function changeMode(mode: AppMode) {
    const nextState = setPreferredMode(appState, mode);
    saveState(window.localStorage, nextState);
    setAppState(nextState);
    setShowProfileForm(false);
    if (mode === "focus") setShowAdventureSetup(false);
  }

  function continueLocalSession(mode: AppMode) {
    const nextState = setPreferredMode(appState, mode);
    saveState(window.localStorage, nextState);
    setAppState(nextState);
    saveLocalSession(window.localStorage, true);
    setLocalSession(true);
    setShowProfileForm(false);
    setShowAdventureSetup(false);
  }

  function resumeMissionFromEntry(missionId: string) {
    setSelectedMissionId(missionId);
    setEntryError("");
    continueLocalSession("focus");
  }

  function startRecommendedFromEntry() {
    const target = entryExperience.recommendation;
    if (!target) {
      continueLocalSession("focus");
      return;
    }
    try {
      const nextState = generateMissionForGoal(
        appState,
        target.goalId,
        today,
        appState.profile ?? undefined,
      );
      const mission = nextState.missions.find(
        (candidate) =>
          candidate.goalId === target.goalId && candidate.status === "active",
      );
      saveState(window.localStorage, nextState);
      setAppState(nextState);
      if (mission) setSelectedMissionId(mission.id);
      saveLocalSession(window.localStorage, true);
      setLocalSession(true);
      setEntryError("");
    } catch (error) {
      setEntryError(
        error instanceof Error
          ? error.message
          : "StatQuest could not start the recommended mission.",
      );
    }
  }

  function logOutLocalSession() {
    saveLocalSession(window.localStorage, false);
    setLocalSession(false);
  }

  function startNewProfile() {
    beginNewLocalProfile(window.localStorage);
    setAppState(EMPTY_STATE);
    setFocusProfileDraft(EMPTY_FOCUS_PROFILE);
    setProfileErrors({});
    setEntryError("");
    setShowProfileForm(false);
    setShowAdventureSetup(false);
    setLocalSession(true);
  }

  function switchProfile(profileId: string) {
    const state = selectLocalProfile(window.localStorage, profileId);
    if (!state) return;
    setAppState(state);
    setFocusProfileDraft(profileToFocusDraft(state.profile));
    setProfileErrors({});
    setEntryError("");
    setShowProfileForm(false);
    setShowAdventureSetup(false);
    saveLocalSession(window.localStorage, true);
    setLocalSession(true);
  }

  function removeProfile(profileId: string, displayName: string) {
    if (
      !window.confirm(
        `Permanently delete the local profile ${displayName} and all of its goals, missions, and XP from this browser?`,
      )
    ) {
      return;
    }
    const state = deleteLocalProfile(window.localStorage, profileId);
    setAppState(state);
    setFocusProfileDraft(profileToFocusDraft(state.profile));
    const profiles = listLocalProfiles(window.localStorage);
    setSavedProfiles(profiles);
    setLocalSession(false);
  }

  function openNewGoalForm() {
    setEditingGoalId(null);
    setGoalDraft(EMPTY_GOAL);
    setGoalError("");
    setReferenceError("");
    setMissionError("");
    setShowGoalForm(true);
  }

  function openEditGoalForm(goal: LearningGoal) {
    setEditingGoalId(goal.id);
    setGoalDraft(goalToDraft(goal));
    setGoalError("");
    setReferenceError("");
    setMissionError("");
    setShowGoalForm(true);
  }

  function updateGoalDraft<K extends keyof LearningGoalDraft>(
    field: K,
    value: LearningGoalDraft[K],
  ) {
    setGoalDraft((current) => ({ ...current, [field]: value }));
  }

  async function connectReferenceFiles(
    selectedFiles: File[],
    replaceFileId?: string,
  ) {
    if (selectedFiles.length === 0) return;

    const files = replaceFileId ? selectedFiles.slice(0, 1) : selectedFiles;
    let connectedCount = goalDraft.referenceFiles.length - (replaceFileId ? 1 : 0);
    const accepted: Array<{ file: File; record: ReturnType<typeof createReferenceFileRecord> }> = [];
    const errors: string[] = [];

    for (const file of files) {
      const error = validateReferenceFile(file, connectedCount);
      if (error) {
        errors.push(error);
        continue;
      }
      accepted.push({ file, record: createReferenceFileRecord(file) });
      connectedCount += 1;
    }

    if (accepted.length === 0) {
      setReferenceError(errors.join(" "));
      return;
    }

    setGoalDraft((current) => ({
      ...current,
      courseContextReviewed: true,
      courseDetails: replaceFileId
        ? current.courseDetails.filter(
            (detail) => detail.sourceReference.fileId !== replaceFileId,
          )
        : current.courseDetails,
      referenceFiles: replaceFileId
        ? replaceReferenceFileRecord(
            current.referenceFiles,
            replaceFileId,
            accepted[0].record,
          )
        : [...current.referenceFiles, ...accepted.map(({ record }) => record)],
    }));
    setReferenceError(errors.join(" "));

    for (const { file, record } of accepted) {
      try {
        const extractedText = await extractReferenceFile(file, (progress) => {
          setGoalDraft((current) => ({
            ...current,
            referenceFiles: current.referenceFiles.map((reference) =>
              reference.id === record.id
                ? { ...reference, progress: Math.min(100, Math.max(0, progress)) }
                : reference,
            ),
          }));
        });
        setGoalDraft((current) => {
          const referenceFiles = current.referenceFiles.map((reference) =>
            reference.id === record.id
              ? {
                  ...reference,
                  status: "ready" as const,
                  progress: 100,
                  extractedText,
                  extractionError: null,
                }
              : reference,
          );
          return {
            ...current,
            courseContextReviewed: true,
            referenceFiles,
            courseDetails: mergeExtractedCourseDetails(
              current.courseDetails,
              referenceFiles.filter((reference) => reference.id === record.id),
            ),
          };
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `StatQuest could not read ${file.name}.`;
        setGoalDraft((current) => ({
          ...current,
          referenceFiles: current.referenceFiles.map((reference) =>
            reference.id === record.id
              ? {
                  ...reference,
                  status: "error",
                  progress: 0,
                  extractedText: "",
                  extractionError: message,
                }
              : reference,
          ),
        }));
      }
    }
  }

  function handleReferenceInput(event: ChangeEvent<HTMLInputElement>) {
    void connectReferenceFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleReferenceDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFileDropActive(false);
    void connectReferenceFiles(Array.from(event.dataTransfer.files));
  }

  function removeReferenceFile(fileId: string) {
    setGoalDraft((current) => ({
      ...current,
      referenceFiles: removeReferenceFileRecord(current.referenceFiles, fileId),
      courseDetails: current.courseDetails.filter(
        (detail) => detail.sourceReference.fileId !== fileId,
      ),
      learningTopics: current.learningTopics.flatMap((topic) => {
        const sourceReferences = topic.sourceReferences.filter(
          (reference) => reference.fileId !== fileId,
        );
        return sourceReferences.length === 0 &&
          topic.attemptCount === 0 &&
          topic.id.startsWith("learning-topic:course-detail:")
          ? []
          : [{ ...topic, sourceReferences }];
      }),
    }));
    setReferenceError("");
  }

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !goalDraft.subject.trim() ||
      !goalDraft.desiredOutcome.trim()
    ) {
      setGoalError("Complete the subject and outcome.");
      return;
    }

    if (goalDraft.deadline && goalDraft.deadline < today) {
      setGoalError("The deadline cannot be in the past.");
      return;
    }

    if (goalDraft.referenceFiles.some((file) => file.status === "extracting")) {
      setGoalError("Wait for the connected files to finish processing before saving the goal.");
      return;
    }

    const cleanedDraft = {
      ...goalDraft,
      subject: goalDraft.subject.trim(),
      desiredOutcome: goalDraft.desiredOutcome.trim(),
    };

    setAppState((current) => {
      if (editingGoalId) {
        return {
          ...current,
          goals: current.goals.map((goal) =>
            goal.id === editingGoalId
              ? editLearningGoal(goal, cleanedDraft)
              : goal,
          ),
        };
      }

      const goal = createLearningGoal(cleanedDraft, {
        position: nextGoalPosition(current.goals),
        status: "active",
      });
      return { ...current, goals: [...current.goals, goal] };
    });
    setGoalDraft(EMPTY_GOAL);
    setEditingGoalId(null);
    setShowGoalForm(false);
    setGoalError("");
    setReferenceError("");
    setMissionError("");
  }

  function finishGoal(goal: LearningGoal) {
    const expectedGoalId = goal.id;
    if (!canFinishGoal(goal.id, appState.missions)) {
      setGoalError("Complete at least one mission before finishing this goal.");
      return;
    }
    if (activeMissions.some((mission) => mission.goalId === goal.id)) {
      setGoalError("Complete this goal's active mission before finishing the goal.");
      return;
    }
    const summary = goalCompletionSummary(
      goal,
      appState.missions,
      appState.weeklyReviews.filter((review) => review.goalId === goal.id).length,
    );
    if (!window.confirm(`Finish ${goal.subject}?\n\n${summary}\n\nOther goals will remain active.`)) {
      return;
    }
    setAppState((current) => ({
      ...current,
      goals: completeActiveGoal(
        current.goals,
        expectedGoalId,
        new Date().toISOString(),
      ),
    }));
    setGoalError("");
    setMissionError("");
  }

  function generateMission(goalId: string) {
    const issue = missionGenerationIssue(appState, goalId);
    if (issue) {
      setMissionError(issue);
      return;
    }
    try {
      const nextState = generateMissionForGoal(
        appState,
        goalId,
        today,
        appState.profile
          ? {
              birthYear: appState.profile.birthYear,
              learningStage: appState.profile.learningStage,
              careerInterest: appState.profile.careerInterest,
            }
          : undefined,
      );
      const newMission = nextState.missions.find(
        (mission) => !appState.missions.some((existing) => existing.id === mission.id),
      );
      setAppState((current) => {
        try {
          return current === appState
            ? nextState
            : generateMissionForGoal(
                current,
                goalId,
                today,
                current.profile
                  ? {
                      birthYear: current.profile.birthYear,
                      learningStage: current.profile.learningStage,
                      careerInterest: current.profile.careerInterest,
                    }
                  : undefined,
              );
        } catch {
          return current;
        }
      });
      if (newMission) {
        setSelectedMissionId(newMission.id);
        setEvidenceError("");
      }
      setMissionError("");
    } catch (error) {
      setMissionError(
        error instanceof Error
          ? error.message
          : "StatQuest could not generate an accurate mission from these files.",
      );
    }
  }

  function toggleStep(stepId: string) {
    if (!selectedMission || selectedMission.status !== "active") return;

    setAppState((current) => ({
      ...current,
      missions: current.missions.map((mission) =>
        mission.id === selectedMission.id
          ? {
              ...mission,
              steps: mission.steps.map((step) =>
                step.id === stepId
                  ? { ...step, completed: !step.completed }
                  : step,
              ),
            }
          : mission,
      ),
    }));
    setEvidenceError("");
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMission) return;

    const missionId = selectedMission.id;
    const evidence = {
      reflection: selectedEvidenceDraft.reflection,
      evidenceUrl: selectedEvidenceDraft.evidenceUrl,
      submittedAt: new Date().toISOString(),
    };

    try {
      completeMissionInState(appState, missionId, evidence);
      setAppState((current) =>
        completeMissionInState(current, missionId, evidence),
      );
      setEvidenceDrafts((current) => {
        const next = { ...current };
        delete next[missionId];
        return next;
      });
      setEvidenceError("");
      setSelectedMissionId("");
    } catch (error) {
      setEvidenceError(
        error instanceof Error ? error.message : "Evidence could not be saved.",
      );
    }
  }

  function updateEvidenceDraft(
    missionId: string,
    field: "reflection" | "evidenceUrl",
    value: string,
  ) {
    setEvidenceDrafts((current) => ({
      ...current,
      [missionId]: {
        reflection: current[missionId]?.reflection ?? "",
        evidenceUrl: current[missionId]?.evidenceUrl ?? "",
        [field]: value,
      },
    }));
  }

  function abandonMission(missionId: string) {
    const mission = appState.missions.find((item) => item.id === missionId);
    if (
      !mission ||
      !window.confirm(`Abandon the active ${mission.subject} mission? It will remain in history for 0 XP.`)
    ) {
      return;
    }
    setAppState((current) => abandonMissionInState(current, missionId));
    setEvidenceDrafts((current) => {
      const next = { ...current };
      delete next[missionId];
      return next;
    });
    setSelectedMissionId("");
    setEvidenceError("");
    setMissionError("");
  }

  function continueOldMission(missionId: string) {
    setAppState((current) =>
      continueOldMissionInState(current, missionId, today),
    );
    setMissionError("");
  }

  function replaceMission(
    missionId: string,
    adjustment?: MissionAdjustment,
  ) {
    try {
      const next = replaceActiveMissionInState(
        appState,
        missionId,
        today,
        adjustment,
      );
      const replacement = next.missions.find(
        (mission) => mission.replacementOf === missionId && mission.status === "active",
      );
      if (!replacement) return;
      setAppState((current) =>
        current === appState
          ? next
          : replaceActiveMissionInState(current, missionId, today, adjustment),
      );
      setSelectedMissionId(replacement.id);
      setEvidenceError("");
      setMissionError("");
    } catch (error) {
      setMissionError(
        error instanceof Error ? error.message : "The mission could not be adjusted.",
      );
    }
  }

  function skipOldMission(missionId: string) {
    setAppState((current) => skipOldMissionInState(current, missionId, today));
    setSelectedMissionId("");
    setEvidenceError("");
    setMissionError("");
  }

  function submitMissionFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingFeedbackMission) return;
    setAppState((current) =>
      applyMissionFeedbackInState(current, pendingFeedbackMission.id, {
        ...feedbackDraft,
        submittedAt: new Date().toISOString(),
      }),
    );
    setFeedbackDraft({ difficulty: "about-right", confidence: 3, reasons: [] });
  }

  function startFocus() {
    const startedAt = new Date().toISOString();
    setAppState((current) =>
      startFocusSessionInState(
        current,
        focusPreset,
        focusGoalId || null,
        startedAt,
      ),
    );
    setClockNow(new Date(startedAt).getTime());
    setFocusRoomOpen(true);
  }

  function startMissionStepFocus(missionId: string) {
    const mission = appState.missions.find(
      (candidate) => candidate.id === missionId && candidate.status === "active",
    );
    const step = mission?.steps.find((candidate) => !candidate.completed);
    if (!mission || !step) {
      setMissionError("Complete the remaining evidence before starting another study block.");
      return;
    }
    const startedAt = new Date().toISOString();
    const sessionId = crypto.randomUUID();
    setAppState((current) =>
      startFocusSessionInState(
        current,
        focusPreset,
        mission.goalId,
        startedAt,
        sessionId,
        { missionId: mission.id, stepId: step.id },
      ),
    );
    setSelectedMissionId(mission.id);
    setClockNow(new Date(startedAt).getTime());
    setFocusRoomOpen(true);
    setMissionError("");
  }

  function studyRecommended() {
    if (!recommendedTarget) return;
    const existing = activeMissions.find(
      (mission) => mission.goalId === recommendedTarget.goalId,
    );
    if (existing) {
      startMissionStepFocus(existing.id);
      return;
    }
    try {
      const generated = generateMissionForGoal(
        appState,
        recommendedTarget.goalId,
        today,
        appState.profile ?? undefined,
      );
      const mission = generated.missions.find(
        (candidate) =>
          candidate.goalId === recommendedTarget.goalId &&
          candidate.status === "active",
      );
      if (!mission) return;
      setAppState(generated);
      setSelectedMissionId(mission.id);
      setMissionError("");
    } catch (error) {
      setMissionError(
        error instanceof Error ? error.message : "The recommended mission could not be generated.",
      );
    }
  }

  function cancelFocus(sessionId: string) {
    if (!window.confirm("Stop this Focus session? It will award 0 XP.")) return;
    setAppState((current) => cancelFocusSessionInState(current, sessionId));
  }

  function completeFocus(sessionId: string) {
    setAppState((current) =>
      current.focusSessions.find((session) => session.id === sessionId)?.missionId
        ? completeLinkedStepFocusInState(
            current,
            sessionId,
            new Date().toISOString(),
          )
        : completeFocusSessionInState(
            current,
            sessionId,
            new Date().toISOString(),
          ),
    );
  }

  function needAnotherFocusBlock(sessionId: string) {
    setAppState((current) =>
      continueLinkedFocusInState(
        current,
        sessionId,
        new Date().toISOString(),
      ),
    );
    setClockNow(Date.now());
    setFocusRoomOpen(true);
  }

  function scrollToCurrentTimer() {
    const targetId = activeFocusSession ? "focus-session-controls" : "selected-mission-detail";
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  function beginFloatingTimerDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const timer = floatingTimerRef.current;
    if (!timer) return;
    const rect = timer.getBoundingClientRect();
    timerDragRef.current = {
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      pendingLeft: rect.left,
      pendingTop: rect.top,
      moved: false,
      animationFrame: 0,
    };
    suppressTimerClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleFloatingTimerClick() {
    if (suppressTimerClickRef.current) {
      suppressTimerClickRef.current = false;
      return;
    }
    if (activeFocusSession) {
      setFocusRoomOpen(true);
      return;
    }
    scrollToCurrentTimer();
  }

  function updateReview<K extends keyof WeeklyReviewDraft>(
    field: K,
    value: WeeklyReviewDraft[K],
  ) {
    setReviewDraft((current) => ({ ...current, [field]: value }));
  }

  function submitWeeklyReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const win = reviewDraft.win.trim();
    const obstacle = reviewDraft.obstacle.trim();
    const nextFocus = reviewDraft.nextFocus.trim();

    if (!selectedReviewGoal || !win || !obstacle || !nextFocus) {
      setReviewError("Complete all three review answers.");
      return;
    }

    const weekStart = getWeekStart();
    const review: WeeklyReview = {
      id: crypto.randomUUID(),
      goalId: selectedReviewGoal.id,
      weekStart,
      win,
      obstacle,
      nextFocus,
      nextMissionPace: reviewDraft.nextMissionPace,
      createdAt: new Date().toISOString(),
    };

    setAppState((current) => ({
      ...current,
      weeklyReviews: [
        review,
        ...current.weeklyReviews.filter(
          (item) =>
            item.weekStart !== review.weekStart || item.goalId !== review.goalId,
        ),
      ],
    }));
    setReviewDraft(EMPTY_REVIEW);
    setReviewError("");
  }

  function renderFocusProfileForm() {
    const editing = appState.profile !== null;
    const featuredSavedProfile = savedProfiles.at(-1) ?? null;
    const displayName = focusProfileDraft.displayName.trim();
    const careerInterest = focusProfileDraft.careerInterest.trim();
    const profileReady =
      displayName.length >= 2 &&
      Boolean(focusProfileDraft.learningStage) &&
      careerInterest.length >= 2;
    const profileGuideReaction = Object.keys(profileErrors).length > 0
      ? "concerned"
      : profileReady
        ? "happy"
        : "idle";
    return (
      <main className="onboarding-shell entry-shell">
        <section className="onboarding-card profile-card entry-card entry-new-profile">
          {renderEntryHeader()}
          <div className="entry-profile-layout">
            <section className="entry-orientation" aria-labelledby="entry-value-title">
              <p className="eyebrow">{editing ? "PROFILE SETTINGS" : "NEW PROFILE"}</p>
              <h1 id="entry-value-title">Turn learning goals into focused daily progress.</h1>
              <p className="hero-copy">
                <span className="entry-promise-desktop">
                  StatQuest helps you choose what to study next, focus on one step
                  at a time, and review weak topics when they matter.
                </span>
                <span className="entry-promise-mobile">
                  Turn a learning goal into the next useful study step.
                </span>
              </p>
              <ol className="entry-product-cycle entry-product-cycle-desktop" aria-label="StatQuest learning cycle">
                {ENTRY_LEARNING_CYCLE.map((stage, index) => (
                  <li
                    className={
                      profileReady
                        ? stage === "Focus"
                          ? "is-system-preview is-next-focus"
                          : "is-system-preview"
                        : undefined
                    }
                    key={stage}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{stage}</strong>
                  </li>
                ))}
              </ol>
              <p className="entry-trust-note entry-trust-note-desktop">
                <strong>Local only · not synced.</strong>
              </p>
            </section>

            <section className="entry-profile-setup" aria-labelledby="profile-setup-title">
              <div className="entry-profile-setup-heading">
                <p className="eyebrow">LEARNER PROFILE</p>
                <h2 id="profile-setup-title">
                  {editing ? "Keep your learner profile up to date." : "Set up your learner profile."}
                </h2>
                <p>
                  Add a little context about how and what you study. You can
                  update these details later.
                </p>
                <Character
                  className="entry-profile-guide"
                  decorative
                  entryAsset
                  hero={appState.profile?.hero ?? DEFAULT_HERO}
                  reaction={profileGuideReaction}
                  size="mini"
                />
              </div>
              <form noValidate onSubmit={saveFocusProfile}>
                <label>
                  Display name
                  <input
                    autoFocus
                    ref={profileDisplayNameRef}
                    value={focusProfileDraft.displayName}
                    onChange={(event) => updateFocusProfileField("displayName", event.target.value)}
                    placeholder="Example: Tung"
                    minLength={2}
                    required
                    aria-invalid={Boolean(profileErrors.displayName)}
                    aria-describedby={profileErrors.displayName ? "focus-profile-display-name-error" : undefined}
                  />
                  {profileErrors.displayName && (
                    <span className="field-error" id="focus-profile-display-name-error">
                      {profileErrors.displayName}
                    </span>
                  )}
                </label>
                <div className="field-grid profile-fields">
                  <label>
                    Birth year (optional)
                    <input
                      ref={profileBirthYearRef}
                      type="number"
                      min={new Date().getFullYear() - 100}
                      max={new Date().getFullYear() - 8}
                      value={focusProfileDraft.birthYear}
                      onChange={(event) => updateFocusProfileField("birthYear", event.target.value)}
                      placeholder="Example: 2008"
                      aria-invalid={Boolean(profileErrors.birthYear)}
                      aria-describedby={profileErrors.birthYear ? "focus-profile-birth-year-error" : undefined}
                    />
                    {profileErrors.birthYear && (
                      <span className="field-error" id="focus-profile-birth-year-error">
                        {profileErrors.birthYear}
                      </span>
                    )}
                  </label>
                  <label>
                    Current learning stage
                    <select
                      ref={profileLearningStageRef}
                      value={focusProfileDraft.learningStage}
                      onChange={(event) => updateFocusProfileField("learningStage", event.target.value as LearningStage)}
                      required
                      aria-invalid={Boolean(profileErrors.learningStage)}
                      aria-describedby={profileErrors.learningStage ? "focus-profile-learning-stage-error" : undefined}
                    >
                      <option value="" disabled>Select your stage</option>
                      <option value="elementary">Elementary school</option>
                      <option value="middle-school">Middle school</option>
                      <option value="high-school">High school / Grade 9–12</option>
                      <option value="college">College or university</option>
                      <option value="professional">Working professional</option>
                      <option value="other">Other / self-directed</option>
                    </select>
                    {profileErrors.learningStage && (
                      <span className="field-error" id="focus-profile-learning-stage-error">
                        {profileErrors.learningStage}
                      </span>
                    )}
                  </label>
                </div>
                <label>
                  Career, job, or field you want to study
                  <input
                    ref={profileCareerInterestRef}
                    value={focusProfileDraft.careerInterest}
                    onChange={(event) => updateFocusProfileField("careerInterest", event.target.value)}
                    placeholder="Example: software engineering, nursing, accounting"
                    minLength={2}
                    required
                    aria-invalid={Boolean(profileErrors.careerInterest)}
                    aria-describedby={profileErrors.careerInterest ? "focus-profile-career-interest-error" : undefined}
                  />
                  {profileErrors.careerInterest && (
                    <span className="field-error" id="focus-profile-career-interest-error">
                      {profileErrors.careerInterest}
                    </span>
                  )}
                </label>
                <div className="button-row entry-profile-actions">
                  <button
                    className={`primary-button entry-focus-action${profileReady ? " is-ready" : ""}`}
                    type="submit"
                  >
                    {editing ? "Save learner profile" : "Continue with Focus"}
                  </button>
                  {!editing && (
                    <div className="entry-adventure-choice">
                      <button
                        className="secondary-button entry-adventure-action"
                        type="button"
                        onClick={() => {
                          setProfileErrors({});
                          setShowAdventureSetup(true);
                        }}
                      >
                        Customize Adventure
                      </button>
                      <small>Optional RPG view · same profile, goals, missions, XP, and progress.</small>
                    </div>
                  )}
                  {editing && isProfileComplete(appState.profile) && (
                    <button
                      className="secondary-button entry-adventure-action"
                      type="button"
                      onClick={() => {
                        setFocusProfileDraft(profileToFocusDraft(appState.profile));
                        setShowProfileForm(false);
                        setProfileErrors({});
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {!editing && featuredSavedProfile && (
                <div className="saved-profile-list">
                  <span>Return to a saved profile</span>
                  <button
                    className="secondary-button entry-saved-profile-button"
                    type="button"
                    onClick={() => switchProfile(featuredSavedProfile.id)}
                  >
                    Continue as {featuredSavedProfile.displayName}
                  </button>
                  {savedProfiles.length > 1 && (
                    <details className="entry-saved-profile-disclosure">
                      <summary>View all profiles ({savedProfiles.length})</summary>
                      <div>
                        {savedProfiles.map((profile) => (
                          <button
                            className="secondary-button entry-saved-profile-button"
                            type="button"
                            key={profile.id}
                            onClick={() => switchProfile(profile.id)}
                          >
                            Continue as {profile.displayName}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </section>

            <details className="entry-mobile-how-it-works">
              <summary>How it works</summary>
              <p>Set a goal, follow a focused mission, share feedback, and review at the right time.</p>
              <ol className="entry-product-cycle" aria-label="StatQuest learning cycle">
                {ENTRY_LEARNING_CYCLE.map((stage, index) => (
                  <li
                    className={
                      profileReady
                        ? stage === "Focus"
                          ? "is-system-preview is-next-focus"
                          : "is-system-preview"
                        : undefined
                    }
                    key={stage}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{stage}</strong>
                  </li>
                ))}
              </ol>
              <p className="entry-trust-note">
                <strong>Local only · not synced.</strong>
              </p>
            </details>
          </div>
        </section>
        {renderEntryAbout()}
      </main>
    );
  }

  function renderLocalProfileReturn() {
    const profile = appState.profile!;
    const otherProfiles = savedProfiles.filter((item) => item.id !== profile.id);
    const featuredOtherProfile = otherProfiles.at(-1) ?? null;
    const resume = entryExperience.resume;
    const completedResumeSteps = resume
      ? resume.remainingMinutes === 0
        ? resume.stepCount
        : Math.max(0, resume.stepNumber - 1)
      : 0;
    const recommendation = entryExperience.recommendation;
    const recommendationGoal = recommendation
      ? appState.goals.find((goal) => goal.id === recommendation.goalId) ?? null
      : null;
    const hasPlan =
      entryExperience.plan.reviewsDue > 0 ||
      entryExperience.plan.assessment !== null ||
      entryExperience.plan.weekly !== null;
    return (
      <main className="onboarding-shell entry-shell">
        <section className="onboarding-card entry-card entry-return-card">
          {renderEntryHeader()}
          <div className="entry-return-heading">
            <div>
              <p className="eyebrow">WELCOME BACK</p>
              <h1>Welcome back, {profile.displayName}.</h1>
              <p className="hero-copy">{entryExperience.introduction}</p>
            </div>
            <div className="entry-compact-stats" aria-label="Current progress">
              <div><span>Level</span><strong>{levelProgress.level}</strong></div>
              <div><span>XP</span><strong>{appState.totalXp}</strong></div>
              <div><span>Streak</span><strong>{appState.streak.current} days</strong></div>
            </div>
          </div>

          <div className="entry-return-grid">
            <div className="entry-mission-main">
              <article className="entry-continuity-card">
              {resume ? (
                <>
                  <p className="eyebrow">CONTINUE WHERE YOU LEFT OFF</p>
                  <span className="entry-subject">{resume.subject}</span>
                  <h2>{resume.title}</h2>
                  <div className="entry-current-step">
                    <span>Step {resume.stepNumber} of {resume.stepCount}</span>
                    <strong>{resume.stepTitle}</strong>
                  </div>
                  <div
                    className="entry-step-progress"
                    role="progressbar"
                    aria-label={`${completedResumeSteps} of ${resume.stepCount} mission steps complete`}
                    aria-valuemin={0}
                    aria-valuemax={resume.stepCount}
                    aria-valuenow={completedResumeSteps}
                  >
                    {Array.from({ length: resume.stepCount }, (_, index) => (
                      <span
                        className={
                          index < completedResumeSteps
                            ? "is-complete"
                            : index === completedResumeSteps && completedResumeSteps < resume.stepCount
                              ? "is-current"
                              : undefined
                        }
                        key={`${resume.missionId}-progress-${index}`}
                      />
                    ))}
                  </div>
                  <p className="entry-time-estimate">
                    {resume.remainingMinutes > 0
                      ? `Estimated remaining: ${resume.remainingMinutes} min`
                      : "All steps complete · evidence ready"}
                  </p>
                  <button
                    className="primary-button entry-primary-action"
                    type="button"
                    onClick={() => resumeMissionFromEntry(resume.missionId)}
                  >
                    Resume study
                  </button>
                </>
              ) : recommendation && recommendationGoal ? (
                <>
                  <p className="eyebrow">RECOMMENDED NEXT</p>
                  <span className="entry-subject">{recommendationGoal.subject}</span>
                  <h2>{recommendation.kind[0].toUpperCase() + recommendation.kind.slice(1)} {recommendation.topicTitle}</h2>
                  <div className="entry-recommendation-reasons">
                    <span>Why this?</span>
                    <ul>
                      {recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                  <p className="entry-time-estimate">Estimated {recommendation.estimatedMinutes} min</p>
                  <button className="primary-button entry-primary-action" type="button" onClick={startRecommendedFromEntry}>
                    Start mission
                  </button>
                </>
              ) : (
                <>
                  <p className="eyebrow">FOCUS IS READY</p>
                  <h2>Choose your next learning goal.</h2>
                  <p>No unfinished mission or review is waiting.</p>
                  <button className="primary-button entry-primary-action" type="button" onClick={() => continueLocalSession("focus")}>
                    Open Focus
                  </button>
                </>
              )}
              {entryError && <p className="form-error" role="alert">{entryError}</p>}
              </article>

              <aside className="entry-guardian" aria-label="Learning companion update">
                <Character hero={profile.hero} size="small" reaction={resume || recommendation ? "happy" : "idle"} entryAsset />
                <div>
                  <span>YOUR GUARDIAN</span>
                  <p>{entryExperience.guardianMessage}</p>
                </div>
              </aside>
            </div>

            {hasPlan && (
              <section className="entry-today-plan" aria-labelledby="entry-today-title">
                <h2 id="entry-today-title">Today&apos;s plan</h2>
                <div>
                  {entryExperience.plan.reviewsDue > 0 && (
                    <p><span>Reviews due</span><strong>{entryExperience.plan.reviewsDue}</strong></p>
                  )}
                  {entryExperience.plan.assessment && (
                    <p>
                      <span>Next assessment</span>
                      <strong>
                        {entryExperience.plan.assessment.subject} · {entryExperience.plan.assessment.daysUntil === 0
                          ? "today"
                          : `${entryExperience.plan.assessment.daysUntil} days`}
                      </strong>
                    </p>
                  )}
                  {entryExperience.plan.weekly && (
                    <p>
                      <span>Weekly target</span>
                      <strong>{entryExperience.plan.weekly.completedDays} / {entryExperience.plan.weekly.targetDays} study days</strong>
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="entry-return-utility-row">
            <div className="entry-secondary-actions">
              <div className="entry-adventure-return">
                <button className="secondary-button" type="button" onClick={() => continueLocalSession("adventure")}>
                  Open Adventure view
                </button>
                <small>Same profile, goals, missions, XP, and progress.</small>
              </div>
              <details className="entry-profile-settings">
                <summary>Profile options</summary>
                <div>
                  <button className="secondary-button" type="button" onClick={startNewProfile}>
                    New profile
                  </button>
                  {featuredOtherProfile && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => switchProfile(featuredOtherProfile.id)}
                    >
                      Switch to {featuredOtherProfile.displayName}
                    </button>
                  )}
                  {otherProfiles.length > 1 && (
                    <details className="entry-profile-switcher">
                      <summary>View other profiles ({otherProfiles.length})</summary>
                      <div>
                        {otherProfiles.map((savedProfile) => (
                          <button
                            className="secondary-button"
                            type="button"
                            key={savedProfile.id}
                            onClick={() => switchProfile(savedProfile.id)}
                          >
                            Switch to {savedProfile.displayName}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="entry-profile-danger-zone">
                    <button
                      className="entry-delete-action"
                      type="button"
                      onClick={() => removeProfile(profile.id, profile.displayName)}
                    >
                      Delete local profile
                    </button>
                  </div>
                </div>
              </details>
            </div>
            <p className="entry-storage-note">Stored on this device.</p>
          </div>
        </section>
        {renderEntryAbout()}
      </main>
    );
  }

  function renderAdventureSetup() {
    return (
      <AdventureOnboarding
        key={appState.profile?.id ?? "adventure-setup"}
        profile={appState.profile}
        savedProfiles={savedProfiles}
        onSave={saveAdventureProfile}
        onCancel={() => {
          if (appState.profile?.adventureSetupComplete) {
            setShowAdventureSetup(false);
          } else {
            changeMode("focus");
          }
        }}
        cancelLabel={
          appState.profile?.adventureSetupComplete
            ? "Return without changes"
            : "Switch to Focus"
        }
        onSelectProfile={switchProfile}
      />
    );
  }

  function renderAdventureHome() {
    const profile = appState.profile!;
    const player = playerClassDetails(profile.playerCharacter);
    const companion =
      HERO_PRESETS.find((option) => option.id === profile.hero.preset) ??
      HERO_PRESETS[0];

    return (
      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="StatQuest Adventure home">
            <span className="brand-mark">SQ</span>
            <span>StatQuest · Adventure</span>
          </a>
          <div className="profile-menu">
            <button
              className="status-pill status-button"
              type="button"
              onClick={() => setShowAdventureSetup(true)}
            >
              Customize Adventure
            </button>
            <button
              className="status-pill status-button"
              type="button"
              onClick={() => setShowProfileForm(true)}
            >
              Edit profile
            </button>
            <button
              className="status-pill status-button"
              type="button"
              onClick={() => changeMode("focus")}
            >
              Switch to Focus
            </button>
            <button
              className="status-pill status-button"
              type="button"
              onClick={logOutLocalSession}
            >
              Log out
            </button>
          </div>
        </header>

        <section className="hero" id="top">
          <div>
            <p className="eyebrow">ADVENTURE MODE</p>
            <h1>Welcome, {profile.displayName}.</h1>
            <p className="hero-copy">
              Adventure and Focus share the same learning progress.
            </p>
          </div>
          <div className="level-card" aria-label="Adventure party">
            <div className="level-card-copy">
              <span>CURRENT PARTY</span>
              <strong>{player.name} + {companion.label}</strong>
              <small>Level {levelProgress.level} · {appState.totalXp} XP</small>
            </div>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Adventure status">
          <article><span>Player</span><strong>{player.name}</strong></article>
          <article><span>Companion</span><strong>{companion.label}</strong></article>
          <article><span>Level</span><strong>{levelProgress.level}</strong></article>
          <article><span>Total XP</span><strong>{appState.totalXp}</strong></article>
        </section>

        <section className="mission-section" id="mission">
          <div className="section-heading">
            <p className="eyebrow">CURRENT QUEST</p>
            <h2>{activeGoal?.subject ?? "No active goal"}</h2>
          </div>
          {todayMission ? (
            <article className="mission-card">
              <p className="eyebrow">{todayMission.status} MISSION</p>
              <h3>{todayMission.title}</h3>
              <p>{todayMission.objective}</p>
              <strong>{todayMission.xpAwarded ? "Completed" : `${todayMission.xp} XP`}</strong>
            </article>
          ) : (
            <div className="empty-state compact">
              <p>No mission has been generated today.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="loading-screen">
        <span className="brand-mark">SQ</span>
        <p>Loading StatQuest…</p>
      </main>
    );
  }

  if (entryTransition) {
    return (
      <EnterWorldTransition
        hero={entryTransition.hero}
        displayName={entryTransition.displayName}
        onComplete={() => setEntryTransition(null)}
      />
    );
  }

  if (!appState.profile) {
    if (showAdventureSetup) return renderAdventureSetup();
    return renderFocusProfileForm();
  }

  if (!localSession) {
    if (appState.profile.preferredMode === "adventure") {
      return (
        <ReturnToAdventure
          profile={appState.profile}
          savedProfiles={savedProfiles}
          onContinue={() => continueLocalSession("adventure")}
          onNewProfile={startNewProfile}
          onDeleteProfile={() =>
            removeProfile(appState.profile!.id, appState.profile!.displayName)
          }
          onSelectProfile={switchProfile}
        />
      );
    }

    return renderLocalProfileReturn();
  }

  if (!isProfileComplete(appState.profile) || showProfileForm) {
    return renderFocusProfileForm();
  }


  if (appState.profile.preferredMode === "adventure") {
    if (!appState.profile.adventureSetupComplete || showAdventureSetup) {
      return renderAdventureSetup();
    }
    return renderAdventureHome();
  }

  return (
    <main className="focus-shell">
      <FocusTopbar
        displayName={appState.profile.displayName}
        level={levelProgress.level}
        levelTier={levelTier}
        totalXp={appState.totalXp}
        xpInLevel={levelProgress.xpInLevel}
        xpForNextLevel={levelProgress.xpForNextLevel}
        streakCurrent={appState.streak.current}
        streakLongest={appState.streak.longest}
        streakTier={streakTier}
        theme={theme}
        inactive={focusRoomVisible}
        onThemeChange={changeTheme}
        onProfile={() => setShowProfileForm(true)}
        onAdventure={() => changeMode("adventure")}
        onLogout={logOutLocalSession}
      />

      <section
        className="focus-dashboard"
        id="focus-dashboard"
        inert={focusRoomVisible ? true : undefined}
        aria-hidden={focusRoomVisible || undefined}
      >
        <aside className="focus-panel focus-goals-panel" aria-labelledby="focus-goals-title">
          <div className="focus-panel-heading">
            <div>
              <p className="eyebrow">GOALS</p>
              <h1 id="focus-goals-title">Active goals</h1>
            </div>
            <span className="focus-count">{activeGoals.length}</span>
          </div>

          {showGoalForm || activeGoals.length === 0 ? (
            <form className="compact-goal-form" onSubmit={submitGoal}>
              <div className="compact-form-heading">
                <strong>{editingGoalId ? "Edit goal" : "Add goal"}</strong>
                <span>New goals are active immediately.</span>
              </div>
              <label>
                Subject or skill
                <input
                  name="subject"
                  value={goalDraft.subject}
                  onChange={(event) => updateGoalDraft("subject", event.target.value)}
                  placeholder="Example: Discrete Mathematics"
                  required
                />
              </label>
              <label>
                Desired outcome
                <textarea
                  name="desiredOutcome"
                  rows={3}
                  value={goalDraft.desiredOutcome}
                  onChange={(event) => updateGoalDraft("desiredOutcome", event.target.value)}
                  placeholder="Describe the result you want to produce."
                  required
                />
              </label>
              <div className="compact-field-grid">
                <label>
                  Current level
                  <select
                    name="currentLevel"
                    value={goalDraft.currentLevel}
                    onChange={(event) =>
                      updateGoalDraft(
                        "currentLevel",
                        event.target.value as LearningGoalDraft["currentLevel"],
                      )
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <label>
                  Minutes
                  <input
                    name="minutesPerDay"
                    type="number"
                    min={30}
                    max={480}
                    value={goalDraft.minutesPerDay}
                    onChange={(event) =>
                      updateGoalDraft("minutesPerDay", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Days/week
                  <input
                    name="daysPerWeek"
                    type="number"
                    min={1}
                    max={7}
                    value={goalDraft.daysPerWeek}
                    onChange={(event) =>
                      updateGoalDraft("daysPerWeek", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Deadline <span className="optional-label">(optional)</span>
                  <input
                    name="deadline"
                    type="date"
                    min={today}
                    value={goalDraft.deadline}
                    onChange={(event) => updateGoalDraft("deadline", event.target.value)}
                  />
                </label>
              </div>

              <details className="goal-files-disclosure">
                <summary>Study material <span>(optional)</span></summary>
                <fieldset className="reference-fieldset" aria-label="Reference study files">
                  <p className="field-hint reference-intro">
                    Up to 5 PDF, DOCX, TXT, PNG, or JPG files, 10 MB each.
                    Extracted text stays with this local profile; raw files are not retained.
                  </p>
                  <label
                    className={"upload-dropzone compact-upload " + (fileDropActive ? "is-dragging" : "")}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setFileDropActive(true);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setFileDropActive(false);
                      }
                    }}
                    onDrop={handleReferenceDrop}
                  >
                    <input
                      className="file-input"
                      type="file"
                      accept={REFERENCE_FILE_ACCEPT}
                      multiple
                      onChange={handleReferenceInput}
                    />
                    <span className="upload-icon" aria-hidden="true">+</span>
                    <strong>Drop files or browse</strong>
                    <span>Files are processed in this browser.</span>
                  </label>

                  {goalDraft.referenceFiles.length > 0 && (
                    <ul className="reference-file-list">
                      {goalDraft.referenceFiles.map((reference) => {
                        const readyStatus =
                          reference.status === "ready"
                            ? hasRecognizedSourceContext([reference], goalDraft.subject)
                              ? "Ready · context recognized"
                              : "Ready · general context only"
                            : reference.status === "extracting"
                              ? "Reading file…"
                              : reference.extractionError ?? "Needs replacement";
                        return (
                          <li className={"reference-file " + reference.status} key={reference.id}>
                            <div className="file-copy">
                              <strong>{reference.name}</strong>
                              <span>
                                {reference.kind.toUpperCase()} · {formatFileSize(reference.size)}
                              </span>
                              <span className="file-status">{readyStatus}</span>
                              {reference.status === "extracting" && (
                                <span className="file-progress" aria-label={"Reading " + reference.progress + "%"}>
                                  <span style={{ width: reference.progress + "%" }} />
                                </span>
                              )}
                            </div>
                            <div className="file-actions">
                              <label className="compact-file-button">
                                Replace
                                <input
                                  className="file-input"
                                  type="file"
                                  accept={REFERENCE_FILE_ACCEPT}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void connectReferenceFiles([file], reference.id);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                className="compact-file-button remove"
                                type="button"
                                onClick={() => removeReferenceFile(reference.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {goalDraft.courseDetails.length > 0 && (
                    <fieldset className="course-detail-review">
                      <legend>Confirm extracted course details</legend>
                      <p className="field-hint">
                        Edit or confirm only details that should influence planning.
                      </p>
                      {goalDraft.courseDetails.map((detail) => (
                        <div className="course-detail-row" key={detail.id}>
                          <label>
                            <span>{detail.kind}</span>
                            <input
                              value={detail.title}
                              onChange={(event) =>
                                setGoalDraft((current) => ({
                                  ...current,
                                  courseDetails: current.courseDetails.map((candidate) =>
                                    candidate.id === detail.id
                                      ? { ...candidate, title: event.target.value }
                                      : candidate,
                                  ),
                                }))
                              }
                            />
                          </label>
                          {detail.kind === "assessment" && (
                            <label>
                              <span>Date</span>
                              <input
                                type="date"
                                value={detail.date ?? ""}
                                onChange={(event) =>
                                  setGoalDraft((current) => ({
                                    ...current,
                                    courseDetails: current.courseDetails.map((candidate) =>
                                      candidate.id === detail.id
                                        ? { ...candidate, date: event.target.value || null }
                                        : candidate,
                                    ),
                                  }))
                                }
                              />
                            </label>
                          )}
                          <label className="course-detail-confirm">
                            <input
                              type="checkbox"
                              checked={detail.confirmed}
                              onChange={(event) =>
                                setGoalDraft((current) => ({
                                  ...current,
                                  courseDetails: current.courseDetails.map((candidate) =>
                                    candidate.id === detail.id
                                      ? { ...candidate, confirmed: event.target.checked }
                                      : candidate,
                                  ),
                                }))
                              }
                            />
                            Confirm
                          </label>
                          <button
                            className="compact-file-button remove"
                            type="button"
                            onClick={() =>
                              setGoalDraft((current) => {
                                const source = detail.sourceReference;
                                return {
                                  ...current,
                                  courseDetails: current.courseDetails.filter(
                                    (candidate) => candidate.id !== detail.id,
                                  ),
                                  learningTopics: current.learningTopics.flatMap((topic) => {
                                    const sourceReferences = topic.sourceReferences.filter(
                                      (reference) =>
                                        reference.fileId !== source.fileId ||
                                        reference.excerpt !== source.excerpt,
                                    );
                                    return topic.id === `learning-topic:${detail.id}` &&
                                      topic.attemptCount === 0
                                      ? []
                                      : [{ ...topic, sourceReferences }];
                                  }),
                                };
                              })
                            }
                          >
                            Remove detail
                          </button>
                        </div>
                      ))}
                    </fieldset>
                  )}
                  {referenceError && <p className="form-error" role="alert">{referenceError}</p>}
                </fieldset>
              </details>

              {goalError && <p className="form-error" role="alert">{goalError}</p>}
              <div className="button-row compact-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={goalDraft.referenceFiles.some((file) => file.status === "extracting")}
                >
                  {editingGoalId ? "Save changes" : "Add active goal"}
                </button>
                {activeGoals.length > 0 && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setShowGoalForm(false);
                      setEditingGoalId(null);
                      setGoalDraft(EMPTY_GOAL);
                      setGoalError("");
                      setReferenceError("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              <div className="focus-goal-list focus-scroll-list">
                {activeGoals.map((goal) => {
                  const goalMission = activeMissions.find((mission) => mission.goalId === goal.id);
                  const generationIssue = missionGenerationIssue(appState, goal.id);
                  return (
                    <article className="compact-goal-item" key={goal.id}>
                      <div>
                        <strong>{goal.subject}</strong>
                        <span>
                          {goal.minutesPerDay} min · {goal.deadline ? formatDate(goal.deadline) : "No deadline"}
                        </span>
                        <small>
                          Study days this week: {weeklyStudyDates(appState, goal.id).length} / {goal.daysPerWeek}
                        </small>
                        <small>{goalMission ? "Mission active" : "Ready to generate"}</small>
                        <details className="goal-learning-map">
                          <summary>Learning map · {goal.learningTopics.length} topics</summary>
                          <ul>
                            {goal.learningTopics.map((topic) => (
                              <li key={topic.id}>
                                <span>
                                  <strong>{topic.title}</strong>
                                  <small>
                                    {topic.status} · {topic.mastery}% mastery
                                    {topic.nextReviewDate
                                      ? ` · review ${formatDate(topic.nextReviewDate)}`
                                      : ""}
                                  </small>
                                </span>
                                <progress max={100} value={topic.mastery} aria-label={`${topic.title} mastery`} />
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                      <div className="compact-goal-actions">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={Boolean(generationIssue)}
                          onClick={() => generateMission(goal.id)}
                          title={generationIssue ?? undefined}
                        >
                          Generate
                        </button>
                        <button className="secondary-button" type="button" onClick={() => openEditGoalForm(goal)}>
                          Edit
                        </button>
                        <button className="secondary-button" type="button" onClick={() => finishGoal(goal)}>
                          Finish
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {(goalError || missionError || activeMissions.length >= 5) && (
                <p className="form-error focus-panel-error" role="alert">
                  {goalError || missionError || "You already have 5 active missions. Complete one before generating another."}
                </p>
              )}
              <button className="primary-button focus-add-goal" type="button" onClick={openNewGoalForm}>
                + Add Goal
              </button>
            </>
          )}
        </aside>

        <section className="focus-panel focus-missions-panel" aria-labelledby="focus-missions-title">
          <div className="focus-panel-heading">
            <div>
              <p className="eyebrow">TODAY&apos;S MISSIONS</p>
              <h2 id="focus-missions-title">Choose the work in front of you</h2>
            </div>
            <span className="focus-count">{activeMissions.length} / 5</span>
          </div>

          {recommendedGoal && recommendedTarget && (
            <article className="recommended-mission" aria-labelledby="recommended-mission-title">
              <div>
                <span>TODAY&apos;S RECOMMENDED MISSION</span>
                <strong id="recommended-mission-title">
                  {recommendedGoal.subject} · {recommendedTarget.topicTitle}
                </strong>
                <small>
                  {recommendedTarget.kind} · Estimated {recommendedTarget.estimatedMinutes} min · {recommendedTarget.difficulty} challenge
                </small>
                <ul aria-label="Why this mission">
                  {recommendedTarget.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
              <button className="primary-button" type="button" onClick={studyRecommended}>
                {recommendedActiveMission ? "Resume unfinished step" : "Generate mission"}
              </button>
            </article>
          )}

          {activeMissions.length > 0 && (
            <div className="mission-selector" aria-label="Active mission selector">
              {activeMissions.map((mission) => (
                <button
                  className={mission.id === selectedMission?.id ? "selected" : ""}
                  type="button"
                  key={mission.id}
                  aria-pressed={mission.id === selectedMission?.id}
                   onClick={() => {
                     setSelectedMissionId(mission.id);
                     setEvidenceError("");
                   }}
                >
                  <strong>{mission.subject}</strong>
                  <span>
                    {mission.kind} · {mission.difficulty} challenge · {mission.xp > 0 ? mission.xp + " XP" : "Practice"}
                  </span>
                  <small>Estimated {plannedMissionMinutes(mission)} min</small>
                </button>
              ))}
            </div>
          )}

          <div className="mission-detail-scroll">
            {!selectedMission ? (
              recommendedGoal && recommendedTarget ? (
                <div className="empty-state compact focus-empty">
                  <h3>Recommended mission ready to generate</h3>
                  <p>Use Generate mission above to create and review the objective, steps, and evidence before starting Focus.</p>
                  {missionError && <p className="form-error" role="alert">{missionError}</p>}
                </div>
              ) : (
                <div className="empty-state compact focus-empty">
                  <h3>No active missions</h3>
                  <p>Generate a mission from any active goal. Up to five goals can have missions at once.</p>
                  {missionError && <p className="form-error" role="alert">{missionError}</p>}
                </div>
              )
            ) : (
              <article
                className="mission-card compact-mission-card"
                id="selected-mission-detail"
                tabIndex={-1}
              >
                <div className="mission-heading">
                  <div>
                    <p className="eyebrow">ACTIVE {selectedMission.kind.toUpperCase()} MISSION</p>
                    <h3>{selectedMission.title}</h3>
                  </div>
                  <div className="mission-reward">
                    <span>{selectedMission.difficulty} challenge · {selectedMission.workload} workload</span>
                    <strong>
                      {selectedMission.rewardEligible
                        ? "+" + selectedMission.xp + " XP"
                        : "Practice · 0 XP"}
                    </strong>
                    <div className="mission-estimate">
                      <strong>Estimated {plannedMissionMinutes(selectedMission)} min</strong>
                      <small>Start Focus when you want a real countdown.</small>
                    </div>
                  </div>
                </div>
                {selectedMission.recommendationReasons.length > 0 && (
                  <div className="mission-reasons">
                    <strong>Why this?</strong>
                    <ul>
                      {selectedMission.recommendationReasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                )}
                {selectedMission.date < today && selectedMission.carryoverDecision === null && (
                  <div className="old-mission-actions">
                    <div>
                      <strong>Unfinished from {formatDate(selectedMission.date)}</strong>
                      <span>Continue it, replace it without creating another reward, or skip it.</span>
                    </div>
                    <div className="button-row compact-actions">
                      <button className="primary-button" type="button" onClick={() => continueOldMission(selectedMission.id)}>Continue</button>
                      <button className="secondary-button" type="button" onClick={() => replaceMission(selectedMission.id)}>Replace</button>
                      <button className="secondary-button" type="button" onClick={() => skipOldMission(selectedMission.id)}>Skip</button>
                    </div>
                  </div>
                )}
                <p className="mission-objective">{selectedMission.objective}</p>

                <div className="mission-study-actions">
                  <button className="primary-button" type="button" onClick={() => startMissionStepFocus(selectedMission.id)}>
                    {selectedMission.steps.some((step) => step.completed)
                      ? "Resume unfinished step"
                      : "Study mission"}
                  </button>
                  <span>Links Focus Room to the exact next incomplete step.</span>
                </div>

                <ol className="mission-steps">
                  {selectedMission.steps.map((step) => (
                    <li key={step.id} className={step.completed ? "step-completed" : ""}>
                      <label className="step-check">
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={() => toggleStep(step.id)}
                        />
                        <span aria-hidden="true" />
                      </label>
                      <div>
                        <div className="step-title-row">
                          <h4>{step.title}</h4>
                          <span>{step.minutes} min</span>
                        </div>
                        <p>{step.instruction}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <details className="mission-adjustments">
                  <summary>Adjust mission</summary>
                  <div className="button-row compact-actions">
                    <button type="button" className="secondary-button" onClick={() => replaceMission(selectedMission.id, "less-time")}>Less time</button>
                    <button type="button" className="secondary-button" onClick={() => replaceMission(selectedMission.id, "more-challenge")}>More challenge</button>
                    <button type="button" className="secondary-button" onClick={() => replaceMission(selectedMission.id, "different-topic")}>Different topic</button>
                    <button type="button" className="secondary-button" onClick={() => replaceMission(selectedMission.id, "review")}>Review instead</button>
                  </div>
                  <small>Adjustments replace this mission but preserve its one reward opportunity.</small>
                </details>

                <div className="mission-support-grid">
                  <div className="evidence-box">
                    <h4>Evidence required</h4>
                    <ul>
                      {selectedMission.evidenceRequirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="completion-criteria">
                    <h4>Completion criteria</h4>
                    <ul>
                      {selectedMission.completionCriteria.map((criterion) => (
                        <li key={criterion}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <form className="evidence-form compact-evidence-form" onSubmit={submitEvidence}>
                  <label>
                    What did you do and verify?
                     <textarea
                       rows={3}
                       value={selectedEvidenceDraft.reflection}
                       onChange={(event) =>
                         updateEvidenceDraft(selectedMission.id, "reflection", event.target.value)
                       }
                       placeholder="In a few sentences, name the topic, work completed, corrections, and checked result."
                     />
                     <span className="field-hint">
                       Keep it concrete and relevant. {selectedEvidenceDraft.reflection.trim().length} / 80 characters minimum.
                     </span>
                   </label>
                  <label>
                    Evidence URL <span className="optional-label">(optional)</span>
                    <input
                      type="url"
                       value={selectedEvidenceDraft.evidenceUrl}
                       onChange={(event) =>
                         updateEvidenceDraft(selectedMission.id, "evidenceUrl", event.target.value)
                       }
                       placeholder="https://..."
                     />
                   </label>
                   <ul className="evidence-readiness" aria-label="Evidence checklist">
                     <li className={selectedMission.steps.every((step) => step.completed) ? "ready" : ""}>
                       All steps complete
                     </li>
                     <li className={selectedEvidenceDraft.reflection.trim().length >= 80 ? "ready" : ""}>
                       80+ characters
                     </li>
                     <li>Concrete, relevant work and result details</li>
                   </ul>
                   {evidenceError && <p className="form-error" role="alert">{evidenceError}</p>}
                   <div className="button-row compact-actions">
                     <button className="primary-button" type="submit">
                       {selectedMission.rewardEligible
                         ? "Check evidence and claim XP"
                         : "Check evidence and complete practice"}
                     </button>
                     <button
                       className="secondary-button abandon-button"
                       type="button"
                       onClick={() => abandonMission(selectedMission.id)}
                     >
                       Abandon mission
                     </button>
                   </div>
                 </form>
              </article>
            )}
          </div>
        </section>

        <aside className="focus-panel focus-progress-panel" aria-labelledby="focus-progress-title">
          <div className="focus-panel-heading">
            <div>
              <p className="eyebrow">PROGRESS</p>
              <h2 id="focus-progress-title">Keep the loop honest</h2>
            </div>
          </div>

          <div className="compact-progress-grid">
            <div><span>Level</span><strong>{levelProgress.level}</strong></div>
            <div><span>Total XP</span><strong>{appState.totalXp}</strong></div>
            <div><span>Streak</span><strong>{appState.streak.current} days</strong></div>
            <div><span>Completed</span><strong>{completedCount}</strong></div>
          </div>
           <div className="today-reward-status">
            <span>Today</span>
            <strong>{rewardedMissionCountToday} / 5 rewarded missions</strong>
           </div>

           <details className="focus-weekly-analytics">
             <summary>This week</summary>
             <div className="focus-weekly-grid">
               <div><span>Focus periods</span><strong>{thisWeek.completedFocusPeriods}</strong></div>
               <div><span>Focus minutes</span><strong>{thisWeek.completedFocusMinutes}</strong></div>
               <div><span>Missions</span><strong>{thisWeek.completedMissions}</strong></div>
               <div><span>Study days</span><strong>{thisWeek.uniqueStudyDays}</strong></div>
             </div>
             <small>{formatDate(thisWeek.weekStart)} – {formatDate(thisWeek.weekEnd)}</small>
           </details>

           {pendingFeedbackMission && (
             <form className="mission-feedback-panel" onSubmit={submitMissionFeedback}>
               <div>
                 <span>COMPLETION FEEDBACK</span>
                 <strong>{pendingFeedbackMission.subject}</strong>
                 <small>This updates mastery and review timing. It awards no XP.</small>
               </div>
               <label>
                 Difficulty
                 <select
                   value={feedbackDraft.difficulty}
                   onChange={(event) =>
                     setFeedbackDraft((current) => ({
                       ...current,
                       difficulty: event.target.value as MissionFeedbackDifficulty,
                     }))
                   }
                 >
                   <option value="too-easy">Too easy</option>
                   <option value="about-right">About right</option>
                   <option value="difficult">Difficult</option>
                 </select>
               </label>
               <label>
                 Confidence
                 <select
                   value={feedbackDraft.confidence}
                   onChange={(event) =>
                     setFeedbackDraft((current) => ({
                       ...current,
                       confidence: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                     }))
                   }
                 >
                   {[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value} / 5</option>)}
                 </select>
               </label>
               <fieldset>
                 <legend>What affected the result? <span className="optional-label">(optional)</span></legend>
                 {([
                   ["forgot-concepts", "Forgot concepts"],
                   ["needed-hints", "Needed hints"],
                   ["mistakes", "Made mistakes"],
                   ["ran-out-of-time", "Ran out of time"],
                   ["independent", "Worked independently"],
                 ] as const).map(([value, label]) => (
                   <label key={value}>
                     <input
                       type="checkbox"
                       checked={feedbackDraft.reasons.includes(value)}
                       onChange={(event) =>
                         setFeedbackDraft((current) => ({
                           ...current,
                           reasons: event.target.checked
                             ? [...current.reasons, value]
                             : current.reasons.filter((reason) => reason !== value),
                         }))
                       }
                     />
                     {label}
                   </label>
                 ))}
               </fieldset>
               <button className="primary-button" type="submit">Update learning map</button>
             </form>
           )}

           <section
             className="focus-session-controls"
             id="focus-session-controls"
             tabIndex={-1}
             aria-labelledby="start-focus-title"
           >
             <div className="focus-session-heading">
               <div>
                 <span>OPTIONAL TIMER</span>
                 <strong id="start-focus-title">Start Focus</strong>
               </div>
               <small>
                 {activeFocusSession
                   ? activeFocusRewardAvailable
                     ? "+5 XP after confirmed completion"
                     : activeFocusSession.goalId
                       ? "Practice period · 0 XP"
                       : "No goal records Focus time at 0 XP"
                   : selectedFocusGoalIsActive
                     ? "+5 XP for the first 6 rewarded periods today"
                     : "Choose an active goal for Focus XP; No goal records Focus time at 0 XP"}
               </small>
             </div>
             {activeFocusSession ? (
               <div className="active-focus-summary">
                 <strong>
                   {activeFocusSession.phase === "break"
                     ? "Break"
                     : activeFocusSession.status === "ready-to-complete"
                       ? "Focus time reached"
                       : `${activeFocusSession.focusMinutes} min focus`}
                 </strong>
                 <span>{formatMissionCountdown(focusRemaining ?? 0)}</span>
                 {activeFocusSession.status === "ready-to-complete" ? (
                   activeFocusSession.missionId && activeFocusSession.stepId ? (
                     <div className="button-row compact-actions">
                       <button className="primary-button" type="button" onClick={() => completeFocus(activeFocusSession.id)}>
                         Complete step
                       </button>
                       <button className="secondary-button" type="button" onClick={() => needAnotherFocusBlock(activeFocusSession.id)}>
                         Need another focus block
                       </button>
                     </div>
                   ) : (
                     <button className="primary-button" type="button" onClick={() => completeFocus(activeFocusSession.id)}>
                       Complete focus
                     </button>
                   )
                 ) : activeFocusSession.phase === "focus" ? (
                   <button className="secondary-button" type="button" onClick={() => cancelFocus(activeFocusSession.id)}>
                     Stop · 0 XP
                   </button>
                 ) : null}
               </div>
             ) : pendingBreakSession ? (
               <div className="focus-break-offer">
                 <span>Focus complete. Take the {pendingBreakSession.breakMinutes} min break?</span>
                 <div className="button-row compact-actions">
                   <button
                     className="primary-button"
                     type="button"
                     onClick={() => setAppState((current) => startFocusBreakInState(current, pendingBreakSession.id))}
                   >
                     Start break
                   </button>
                   <button
                     className="secondary-button"
                     type="button"
                     onClick={() => setAppState((current) => skipFocusBreakInState(current, pendingBreakSession.id))}
                   >
                     Skip
                   </button>
                 </div>
               </div>
             ) : (
               <div className="focus-session-setup">
                 <label>
                   Preset
                   <select value={focusPreset} onChange={(event) => setFocusPreset(event.target.value as FocusPreset)}>
                     {(Object.entries(FOCUS_PRESETS) as Array<[FocusPreset, (typeof FOCUS_PRESETS)[FocusPreset]]>).map(
                       ([value, preset]) => <option value={value} key={value}>{preset.label}</option>,
                     )}
                   </select>
                 </label>
                 <label>
                   Goal <span className="optional-label">(optional)</span>
                   <select value={focusGoalId} onChange={(event) => setFocusGoalId(event.target.value)}>
                     <option value="">No goal</option>
                     {activeGoals.map((goal) => <option value={goal.id} key={goal.id}>{goal.subject}</option>)}
                   </select>
                 </label>
                 <button className="primary-button focus-start-button" type="button" onClick={startFocus}>Start Focus</button>
               </div>
             )}
           </section>

           <fieldset className="mood-selector">
            <legend>How does today&apos;s workload feel?</legend>
            {([
              ["good", "🙂 Good"],
              ["moderate", "😐 Moderate"],
              ["struggling", "😢 Struggling"],
              ["tired", "😴 Tired"],
            ] as const).map(([value, label]) => (
              <label className={currentMood === value ? "selected" : ""} key={value}>
                <input
                  type="radio"
                  name="learnerMood"
                  value={value}
                  checked={currentMood === value}
                  onChange={() =>
                    setAppState((current) => ({
                      ...current,
                      mood: value as LearnerMood,
                      moodDate: today,
                    }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <div className="focus-review-scroll">
            <form className="compact-review-form" onSubmit={submitWeeklyReview} id="review">
              <strong>Mission review</strong>
              {selectedReviewGoal ? (
                <>
                  <label>
                    Goal
                    <select
                      value={selectedReviewGoal.id}
                      onChange={(event) => {
                        setReviewGoalId(event.target.value);
                        setReviewDraft(EMPTY_REVIEW);
                        setReviewError("");
                      }}
                    >
                      {activeGoals.map((goal) => (
                        <option value={goal.id} key={goal.id}>{goal.subject}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    What produced real progress?
                    <textarea rows={2} value={reviewDraft.win} onChange={(event) => updateReview("win", event.target.value)} />
                  </label>
                  <label>
                    What blocked execution?
                    <textarea rows={2} value={reviewDraft.obstacle} onChange={(event) => updateReview("obstacle", event.target.value)} />
                  </label>
                  <label>
                    What should upcoming missions focus on?
                    <textarea rows={2} value={reviewDraft.nextFocus} onChange={(event) => updateReview("nextFocus", event.target.value)} />
                  </label>
                  <label>
                    Upcoming mission strategy
                    <select
                      value={reviewDraft.nextMissionPace}
                      onChange={(event) => updateReview("nextMissionPace", event.target.value as MissionPace)}
                    >
                      <option value="light">Light — narrower scope</option>
                      <option value="standard">Standard — normal strategy</option>
                      <option value="stretch">Stretch — deeper verification</option>
                    </select>
                  </label>
                  {reviewError && <p className="form-error" role="alert">{reviewError}</p>}
                  <button className="primary-button" type="submit">Save review</button>
                </>
              ) : (
                <p className="field-hint">Add an active goal before saving a review.</p>
              )}
            </form>

            <div className="latest-review compact-latest-review">
              <span>Latest review for this goal</span>
              {latestReview ? (
                <>
                  <strong>Week of {formatDate(latestReview.weekStart)}</strong>
                  <dl>
                    <div><dt>Win</dt><dd>{latestReview.win}</dd></div>
                    <div><dt>Obstacle</dt><dd>{latestReview.obstacle}</dd></div>
                    <div><dt>Next focus</dt><dd>{latestReview.nextFocus}</dd></div>
                  </dl>
                </>
              ) : (
                <p>No scoped review yet.</p>
              )}
            </div>

            <details className="compact-history" id="history">
              <summary>Recent history ({activityHistory.length})</summary>
              {activityHistory.length === 0 ? (
                <p className="field-hint">Completed, abandoned, and missed study activity appears here.</p>
              ) : (
                <div className="history-list">
                  {activityHistory.slice(0, 8).map((activity) => {
                    if (activity.kind === "mission") {
                      const mission = activity.mission;
                      return (
                        <article key={activity.id}>
                          <div>
                            <span className={"history-status " + mission.status}>{mission.status}</span>
                            <h3>{mission.subject}</h3>
                            <p>{formatDate(mission.date)} · {mission.title}</p>
                          </div>
                          <strong>
                            {mission.status === "completed" && mission.xpAwarded
                              ? "+" + mission.xp + " XP"
                              : mission.status === "completed" && !mission.rewardEligible
                                ? "Practice"
                                : "0 XP"}
                          </strong>
                        </article>
                      );
                    }
                    const session = activity.session;
                    const goal = appState.goals.find((item) => item.id === session.goalId);
                    return (
                      <article key={activity.id}>
                        <div>
                          <span className="history-status completed">focus</span>
                          <h3>{goal?.subject ?? `Focus ${session.focusMinutes} min`}</h3>
                          <p>
                            {goal ? `Focus ${session.focusMinutes} min · ` : ""}
                            {formatDate(getLocalDateKey(new Date(session.completedAt!)))}
                          </p>
                        </div>
                        <strong>{session.xpAwarded ? "+5 XP" : "Practice"}</strong>
                      </article>
                    );
                  })}
                </div>
              )}
            </details>
          </div>
        </aside>
      </section>

      {focusRoomSession && (
        <FocusRoom
          open={focusRoomVisible}
          session={focusRoomSession}
          remainingMilliseconds={activeFocusSession ? focusRemaining ?? 0 : 0}
          goalSubject={focusRoomGoal?.subject ?? null}
          currentTask={focusRoomCurrentTask}
          hero={appState.profile.hero}
          rewardAvailable={activeFocusRewardAvailable}
          onMinimize={() => setFocusRoomOpen(false)}
          onStop={() => cancelFocus(focusRoomSession.id)}
          onComplete={() => completeFocus(focusRoomSession.id)}
          onNeedAnotherBlock={() => needAnotherFocusBlock(focusRoomSession.id)}
          onStartBreak={() =>
            setAppState((current) =>
              startFocusBreakInState(current, focusRoomSession.id),
            )
          }
          onSkipBreak={() =>
            setAppState((current) =>
              skipFocusBreakInState(current, focusRoomSession.id),
            )
          }
        />
      )}

      {!focusRoomVisible && activeFocusSession && (
        <button
          ref={floatingTimerRef}
          className={
            "floating-study-timer " +
            (activeFocusSession.phase === "break" ? "break" : "focus") +
            (focusRemaining !== null &&
            focusRemaining > 0 &&
            focusRemaining <= 300_000
              ? " timer-warning"
              : "")
          }
          type="button"
          onClick={handleFloatingTimerClick}
          aria-label="Reopen Focus Room"
          aria-live="off"
        >
          <span
            className="floating-timer-grip"
            aria-hidden="true"
            onPointerDown={beginFloatingTimerDrag}
          >
            •••
          </span>
          <span className="floating-timer-label">
            {activeFocusSession.phase === "break" ? "BREAK" : "FOCUS SESSION"}
          </span>
          <strong>
            {activeFocusSession.phase === "break"
              ? `${activeFocusSession.breakMinutes} min break`
              : appState.goals.find((goal) => goal.id === activeFocusSession.goalId)?.subject ??
                `${activeFocusSession.focusMinutes} min focus`}
          </strong>
          <time>{formatMissionCountdown(focusRemaining ?? 0)}</time>
          <small>
            {activeFocusSession.phase === "break"
              ? "Next focus session"
              : activeFocusSession.status === "ready-to-complete"
                ? activeFocusSession.missionId
                  ? "Complete the linked step or start another block"
                  : "Complete focus to record progress"
                : activeFocusRewardAvailable
                  ? "+5 XP on completion"
                  : "Practice · 0 XP"}
          </small>
        </button>
      )}
    </main>
  );
}
