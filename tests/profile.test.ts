import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_HERO, normalizeHero } from "../src/lib/hero.ts";
import {
  EMPTY_PROFILE_DRAFT,
  firstProfileError,
  isProfileDraftValid,
  profileToFormDraft,
  validateProfileDraft,
} from "../src/lib/profile.ts";

const VALID_DRAFT = {
  ...EMPTY_PROFILE_DRAFT,
  displayName: "Tung",
  birthYear: "2008",
  learningStage: "high-school" as const,
  careerInterest: "software engineering",
  hero: { preset: "cat", color: "sky", accessory: "leaf" } as const,
  heroSelected: true,
};

test("profile validation reports a specific accessible message for every field", () => {
  const errors = validateProfileDraft(EMPTY_PROFILE_DRAFT, 2026);

  assert.match(errors.hero ?? "", /Choose the adventurer/i);
  assert.match(errors.displayName ?? "", /what should.*call you/i);
  assert.match(errors.birthYear ?? "", /four-digit year/i);
  assert.match(errors.learningStage ?? "", /learning level/i);
  assert.match(errors.careerInterest ?? "", /career path/i);
  assert.equal(firstProfileError(errors), "hero");
});

test("birth year must be four digits and age-appropriate", () => {
  assert.match(
    validateProfileDraft({ ...VALID_DRAFT, birthYear: "99" }, 2026).birthYear ?? "",
    /four-digit/i,
  );
  assert.match(
    validateProfileDraft({ ...VALID_DRAFT, birthYear: "2022" }, 2026).birthYear ?? "",
    /four-digit/i,
  );
  assert.equal(validateProfileDraft(VALID_DRAFT, 2026).birthYear, undefined);
});

test("a complete character and learner profile passes validation", () => {
  assert.equal(isProfileDraftValid(VALID_DRAFT, 2026), true);
  assert.deepEqual(validateProfileDraft(VALID_DRAFT, 2026), {});
});

test("saved profiles restore their selected hero into character creation", () => {
  const draft = profileToFormDraft({
    id: "profile-hero",
    displayName: "Mina",
    birthYear: 2000,
    learningStage: "college",
    careerInterest: "biomedical engineering",
    hero: VALID_DRAFT.hero,
    playerCharacter: "explorer",
    preferredMode: "focus",
    adventureSetupComplete: true,
    createdAt: "2026-08-19T00:00:00.000Z",
  });

  assert.equal(draft.heroSelected, true);
  assert.deepEqual(draft.hero, VALID_DRAFT.hero);
});

test("invalid or missing stored hero values receive the safe guide default", () => {
  assert.deepEqual(normalizeHero(undefined), DEFAULT_HERO);
  assert.deepEqual(
    normalizeHero({ preset: "dragon" as never, color: "neon" as never }),
    DEFAULT_HERO,
  );
});
