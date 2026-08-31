export type LearningLevel = "beginner" | "intermediate" | "advanced";
export type GoalCategory = "learning";
export type MissionDifficulty = "easy" | "medium" | "hard";
export type MissionWorkload = "easy" | "medium" | "hard";
export type MissionKind = "learn" | "practice" | "review" | "apply";
export type MissionStatus = "active" | "completed" | "missed" | "abandoned";
export type MissionCarryoverDecision = "continued" | "replaced" | "skipped";
export type MissionPace = "light" | "standard" | "stretch";
export type GoalStatus = "queued" | "active" | "completed" | "archived";
export type LearnerMood = "good" | "moderate" | "struggling" | "tired";
export type FocusPreset = "25/5" | "50/10";
export type FocusPhase = "focus" | "break";
export type FocusSessionStatus =
  | "active"
  | "ready-to-complete"
  | "completed"
  | "cancelled";
export type ReferenceFileKind = "pdf" | "docx" | "text" | "image";
export type ReferenceFileStatus = "extracting" | "ready" | "error";
export type TopicMasteryStatus =
  | "unseen"
  | "learning"
  | "weak"
  | "comfortable"
  | "mastered";
export type CourseDetailKind = "topic" | "outcome" | "task" | "assessment";
export type MissionFeedbackDifficulty = "too-easy" | "about-right" | "difficult";
export type MissionFeedbackReason =
  | "forgot-concepts"
  | "needed-hints"
  | "mistakes"
  | "ran-out-of-time"
  | "independent";
export type LearningOutcomeQuality =
  | "strong-success"
  | "success"
  | "assisted"
  | "weak";
export type MissionAdjustment =
  | "less-time"
  | "more-challenge"
  | "different-topic"
  | "review";

export type AppMode = "focus" | "adventure";

export type PlayerClassId = "warrior" | "mage" | "explorer";
export type HeroPreset = "owl" | "fox" | "cat";
export type HeroColor = "meadow" | "sunset" | "sky" | "violet";
export type HeroAccessory = "glasses" | "satchel" | "leaf";

export type LearningStage =
  | "elementary"
  | "middle-school"
  | "high-school"
  | "college"
  | "professional"
  | "other";

export interface HeroCustomization {
  preset: HeroPreset;
  color: HeroColor;
  accessory: HeroAccessory;
}

export interface AdventureProfile {
  playerCharacter: PlayerClassId;
  hero: HeroCustomization;
  adventureSetupComplete: boolean;
}

export interface LocalProfile extends AdventureProfile {
  id: string;
  displayName: string;
  birthYear: number | null;
  learningStage: LearningStage | null;
  careerInterest: string;
  preferredMode: AppMode;
  createdAt: string;
}

export type LocalProfileDraft = Omit<LocalProfile, "id" | "createdAt">;

export interface GoalReferenceFile {
  id: string;
  name: string;
  kind: ReferenceFileKind;
  mimeType: string;
  size: number;
  status: ReferenceFileStatus;
  progress: number;
  extractedText: string;
  extractionError: string | null;
  addedAt: string;
}

export interface CourseDetail {
  id: string;
  kind: CourseDetailKind;
  title: string;
  date: string | null;
  confirmed: boolean;
  sourceReference: MissionSourceReference;
}

export interface LearningTopic {
  id: string;
  title: string;
  status: TopicMasteryStatus;
  mastery: number;
  lastStudiedAt: string | null;
  nextReviewDate: string | null;
  attemptCount: number;
  successCount: number;
  sourceReferences: MissionSourceReference[];
}

export interface LearningGoal {
  id: string;
  category: GoalCategory;
  subject: string;
  currentLevel: LearningLevel;
  desiredOutcome: string;
  minutesPerDay: number;
  daysPerWeek: number;
  deadline: string;
  referenceFiles: GoalReferenceFile[];
  courseDetails: CourseDetail[];
  courseContextReviewed?: boolean;
  learningTopics: LearningTopic[];
  status: GoalStatus;
  position: number;
  createdAt: string;
  completedAt: string | null;
}

export type LearningGoalDraft = Omit<
  LearningGoal,
  "id" | "category" | "status" | "position" | "createdAt" | "completedAt"
>;

export interface MissionStep {
  id: string;
  title: string;
  instruction: string;
  minutes: number;
  completed: boolean;
}

export interface MissionEvidence {
  reflection: string;
  evidenceUrl: string;
  submittedAt: string;
}

export interface MissionSourceReference {
  fileId: string;
  fileName: string;
  excerpt: string;
}

export interface MissionFeedback {
  difficulty: MissionFeedbackDifficulty;
  confidence: 1 | 2 | 3 | 4 | 5;
  reasons: MissionFeedbackReason[];
  submittedAt: string;
}

export interface DailyMission {
  id: string;
  goalId: string;
  subject: string;
  date: string;
  title: string;
  objective: string;
  kind: MissionKind;
  topicId: string | null;
  difficulty: MissionDifficulty;
  workload: MissionWorkload;
  pace: MissionPace;
  xp: number;
  rewardEligible: boolean;
  steps: MissionStep[];
  evidenceRequirements: string[];
  completionCriteria: string[];
  sourceReferences: MissionSourceReference[];
  learningTargetKey: string | null;
  recommendationReasons: string[];
  status: MissionStatus;
  evidence: MissionEvidence | null;
  feedback: MissionFeedback | null;
  xpAwarded: boolean;
  rewardOpportunityId: string;
  rewardDate: string;
  replacementOf: string | null;
  carryoverDecision: MissionCarryoverDecision | null;
  createdAt: string;
  completedAt: string | null;
}

export interface StreakState {
  current: number;
  longest: number;
  lastCompletionDate: string | null;
}

export interface FocusSession {
  id: string;
  goalId: string | null;
  missionId: string | null;
  stepId: string | null;
  focusMinutes: number;
  breakMinutes: number;
  phase: FocusPhase;
  status: FocusSessionStatus;
  startedAt: string;
  endsAt: string;
  completedAt: string | null;
  rewardEligible: boolean;
  xpAwarded: boolean;
}

export interface WeeklyReview {
  id: string;
  goalId?: string;
  weekStart: string;
  win: string;
  obstacle: string;
  nextFocus: string;
  nextMissionPace: MissionPace;
  createdAt: string;
}

export interface WeeklyReviewDraft {
  win: string;
  obstacle: string;
  nextFocus: string;
  nextMissionPace: MissionPace;
}

export interface StatQuestState {
  version: 2;
  profile: LocalProfile | null;
  goals: LearningGoal[];
  missions: DailyMission[];
  totalXp: number;
  streak: StreakState;
  missionPace: MissionPace;
  mood: LearnerMood;
  moodDate: string | null;
  focusSessions: FocusSession[];
  weeklyReviews: WeeklyReview[];
}
