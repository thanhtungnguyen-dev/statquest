import { DEFAULT_HERO } from "./hero.ts";
import type { HeroCustomization, LearningStage, LocalProfile } from "@/lib/types";

export type ProfileField =
  | "hero"
  | "displayName"
  | "birthYear"
  | "learningStage"
  | "careerInterest";

export interface ProfileFormDraft {
  displayName: string;
  birthYear: string;
  learningStage: LearningStage | "";
  careerInterest: string;
  hero: HeroCustomization;
  heroSelected: boolean;
}

export type ProfileValidationErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_FIELD_ORDER: ProfileField[] = [
  "hero",
  "displayName",
  "birthYear",
  "learningStage",
  "careerInterest",
];

export const EMPTY_PROFILE_DRAFT: ProfileFormDraft = {
  displayName: "",
  birthYear: "",
  learningStage: "",
  careerInterest: "",
  hero: DEFAULT_HERO,
  heroSelected: false,
};

export function profileToFormDraft(profile: LocalProfile | null): ProfileFormDraft {
  if (!profile) return { ...EMPTY_PROFILE_DRAFT, hero: { ...DEFAULT_HERO } };
  return {
    displayName: profile.displayName,
    birthYear: profile.birthYear?.toString() ?? "",
    learningStage: profile.learningStage ?? "",
    careerInterest: profile.careerInterest,
    hero: { ...profile.hero },
    heroSelected: true,
  };
}

export function validateProfileDraft(
  draft: ProfileFormDraft,
  currentYear = new Date().getFullYear(),
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const birthYear = Number(draft.birthYear);
  const age = currentYear - birthYear;

  if (!draft.heroSelected) {
    errors.hero = "Choose the adventurer who will guide your learning journey.";
  }
  if (draft.displayName.trim().length < 2) {
    errors.displayName = "What should your fellow adventurers call you?";
  }
  if (
    !/^\d{4}$/.test(draft.birthYear.trim()) ||
    !Number.isInteger(birthYear) ||
    age < 8 ||
    age > 100
  ) {
    errors.birthYear =
      "That birth year doesn’t look quite right. Try a valid four-digit year.";
  }
  if (!draft.learningStage) {
    errors.learningStage =
      "Choose your current learning level so I can prepare the right quests.";
  }
  if (draft.careerInterest.trim().length < 2) {
    errors.careerInterest =
      "Tell me which skill or career path you want to explore.";
  }

  return errors;
}

export function firstProfileError(
  errors: ProfileValidationErrors,
): ProfileField | null {
  return PROFILE_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

export function isProfileDraftValid(
  draft: ProfileFormDraft,
  currentYear = new Date().getFullYear(),
): boolean {
  return Object.keys(validateProfileDraft(draft, currentYear)).length === 0;
}
