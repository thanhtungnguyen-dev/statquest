import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const NEW_PROFILE = PAGE.slice(
  PAGE.indexOf("function renderFocusProfileForm"),
  PAGE.indexOf("function renderLocalProfileReturn"),
);
const WELCOME_BACK = PAGE.slice(
  PAGE.indexOf("function renderLocalProfileReturn"),
  PAGE.indexOf("function renderAdventureSetup"),
);

test("Focus entry uses a continuous Compass Desk setup and honest local storage copy", () => {
  assert.match(NEW_PROFILE, /NEW PROFILE/);
  assert.match(NEW_PROFILE, /entry-profile-layout/);
  assert.match(PAGE, /ENTRY_LEARNING_CYCLE[\s\S]*?Goal[\s\S]*?Mission[\s\S]*?Focus[\s\S]*?Feedback[\s\S]*?Review/);
  assert.match(NEW_PROFILE, /Continue with Focus/);
  assert.match(NEW_PROFILE, /Set up your learner profile/);
  assert.match(NEW_PROFILE, /Add a little context about how and what you study/);
  assert.doesNotMatch(NEW_PROFILE, /appropriately challenging/);
  assert.match(NEW_PROFILE, /Customize Adventure/);
  assert.match(NEW_PROFILE, /Optional RPG view · same profile, goals, missions, XP, and progress/);
  assert.match(NEW_PROFILE, /entry-mobile-how-it-works[\s\S]*?<summary>How it works<\/summary>/);
  assert.match(NEW_PROFILE, /Local only · not synced/);
  assert.match(NEW_PROFILE, /Birth year \(optional\)/);
  assert.doesNotMatch(NEW_PROFILE, /Birth year[\s\S]{0,700}?required/);
  assert.doesNotMatch(NEW_PROFILE, /secure authentication/);
  assert.doesNotMatch(NEW_PROFILE, />\s*(?:Register|Login|Log in|Sign up|Account)\s*</i);
  assert.match(CSS, /\.entry-profile-layout\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(CSS, /\.entry-profile-setup form\s*\{[\s\S]*?grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*?\.entry-profile-setup form \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*?\.entry-product-cycle-desktop,[\s\S]*?display: none/);
});

test("New Profile reports and clears field-specific validation errors", () => {
  assert.match(NEW_PROFILE, /<form noValidate onSubmit=\{saveFocusProfile\}>/);
  assert.match(NEW_PROFILE, /aria-invalid=\{Boolean\(profileErrors\.displayName\)\}/);
  assert.match(NEW_PROFILE, /aria-describedby=\{profileErrors\.learningStage/);
  assert.match(NEW_PROFILE, /focus-profile-career-interest-error/);
  assert.match(PAGE, /function updateFocusProfileField[\s\S]*?delete next\[field\]/);
  assert.match(PAGE, /firstInvalidRef[\s\S]*?requestAnimationFrame[\s\S]*?focus\(\)/);
});

test("entry profile controls use a featured profile and progressive disclosure", () => {
  assert.match(NEW_PROFILE, /featuredSavedProfile = savedProfiles\.at\(-1\)/);
  assert.match(NEW_PROFILE, /Continue as \{featuredSavedProfile\.displayName\}/);
  assert.match(NEW_PROFILE, /<summary>View all profiles \(\{savedProfiles\.length\}\)<\/summary>/);
  assert.match(WELCOME_BACK, /featuredOtherProfile = otherProfiles\.at\(-1\)/);
  assert.match(WELCOME_BACK, /entry-profile-switcher[\s\S]*?View other profiles \(\{otherProfiles\.length\}\)/);
  assert.match(WELCOME_BACK, /entry-profile-danger-zone[\s\S]*?Delete local profile/);
  assert.match(CSS, /\.entry-saved-profile-button \{ min-height: 44px/);
  assert.match(CSS, /@media \(max-width: 760px\)[\s\S]*?\.entry-profile-settings > summary \{ min-height: 44px/);
});

test("Welcome Back prioritizes real continuity and keeps deletion behind profile options", () => {
  assert.match(WELCOME_BACK, /entryExperience\.resume/);
  assert.match(WELCOME_BACK, /Step \{resume\.stepNumber\} of \{resume\.stepCount\}/);
  assert.match(WELCOME_BACK, /className="entry-step-progress"[\s\S]*?role="progressbar"[\s\S]*?aria-valuenow=\{completedResumeSteps\}/);
  assert.match(WELCOME_BACK, /Estimated remaining/);
  assert.match(WELCOME_BACK, /recommendation\.reasons\.map/);
  assert.match(WELCOME_BACK, /Start mission/);
  assert.match(WELCOME_BACK, /entry-return-grid[\s\S]*?entry-mission-main[\s\S]*?entry-continuity-card[\s\S]*?entry-guardian/);
  assert.match(WELCOME_BACK, /<Character/);
  assert.match(WELCOME_BACK, /<Character[\s\S]*?entryAsset/);
  assert.match(WELCOME_BACK, /entryExperience\.guardianMessage/);
  assert.match(WELCOME_BACK, /resume \|\| recommendation \? "happy" : "idle"/);
  assert.match(WELCOME_BACK, /entryExperience\.plan\.reviewsDue/);
  assert.match(WELCOME_BACK, /Open Adventure view/);
  assert.match(WELCOME_BACK, /Same profile, goals, missions, XP, and progress/);
  assert.match(WELCOME_BACK, /<details className="entry-profile-settings">[\s\S]*?Delete local profile[\s\S]*?<\/details>/);
  assert.doesNotMatch(WELCOME_BACK, />\s*(?:Register|Login|Log in|Sign up|Account)\s*</i);
});

test("entry About dialog is keyboard-operable and entry motion respects reduced motion", () => {
  assert.match(PAGE, /aria-haspopup="dialog"/);
  assert.match(PAGE, /role="dialog"/);
  assert.match(PAGE, /aria-modal="true"/);
  assert.match(PAGE, /event\.key !== "Escape"[\s\S]*?setAboutOpen\(false\)/);
  assert.match(PAGE, /aboutCloseRef\.current\?\.focus\(\)/);
  assert.match(PAGE, /aboutTriggerRef\.current\?\.focus\(\)/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.entry-card,[\s\S]*?animation: none/);
});

test("entry delight presents a truthful learning-system preview and primary action", () => {
  assert.doesNotMatch(NEW_PROFILE, /entryPathStep|is-revealed|is-active/);
  assert.match(NEW_PROFILE, /profileReady[\s\S]*?stage === "Focus"[\s\S]*?is-system-preview is-next-focus[\s\S]*?is-system-preview/);
  assert.match(CSS, /\.entry-product-cycle li\.is-system-preview > span[\s\S]*?\.entry-product-cycle li\.is-next-focus > span/);
  assert.match(NEW_PROFILE, /profileGuideReaction[\s\S]*?concerned[\s\S]*?happy[\s\S]*?idle/);
  assert.match(NEW_PROFILE, /className="entry-profile-guide"[\s\S]*?decorative[\s\S]*?entryAsset/);
  assert.match(NEW_PROFILE, /entry-focus-action\$\{profileReady \? " is-ready" : ""\}/);
  assert.match(CSS, /body:has\(\.entry-return-card\)::before[\s\S]*?entry-welcome-ambient 28s/);
  assert.match(CSS, /entry-mission-main:has\(\.entry-primary-action:is\(:hover, :focus-visible\)\)[\s\S]*?entry-guardian/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.entry-product-cycle li\.is-next-focus > span[\s\S]*?animation: none/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?body:has\(\.entry-return-card\)::before,[\s\S]*?\.entry-focus-action\.is-ready \{ animation: none/);
});
