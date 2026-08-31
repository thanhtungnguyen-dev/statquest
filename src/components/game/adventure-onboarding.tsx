"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Character, type CharacterGaze, type CharacterReaction } from "@/components/game/character";
import { GameScene, type ScenePointer } from "@/components/game/game-scene";
import {
  PlayerCharacterPreview,
  RpgCharacterSetup,
} from "@/components/game/rpg-character-setup";
import { SpeechBubble } from "@/components/game/speech-bubble";
import { DEFAULT_PLAYER_CLASS } from "@/lib/hero";
import {
  firstProfileError,
  isProfileDraftValid,
  PROFILE_FIELD_ORDER,
  profileToFormDraft,
  type ProfileField,
  type ProfileFormDraft,
  validateProfileDraft,
} from "@/lib/profile";
import type { LocalProfileSummary } from "@/lib/storage";
import type {
  HeroCustomization,
  HeroPreset,
  LearningStage,
  LocalProfile,
  PlayerClassId,
} from "@/lib/types";
import { getDoorDialogue, type TimeOfDay } from "@/lib/world";

export type SavedProfileInput = {
  displayName: string;
  birthYear: number;
  learningStage: LearningStage;
  careerInterest: string;
  hero: HeroCustomization;
  playerCharacter: PlayerClassId;
};

type AdventureOnboardingProps = {
  profile: LocalProfile | null;
  savedProfiles: LocalProfileSummary[];
  onSave: (profile: SavedProfileInput) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  onSelectProfile: (profileId: string) => void;
};

type WorldDialogue = {
  message: string;
  tone: "guide" | "success";
};

const FOCUS_GAZE: Record<ProfileField, CharacterGaze> = {
  hero: { x: -0.5, y: -0.2 },
  displayName: { x: -0.65, y: -0.05 },
  birthYear: { x: -0.55, y: 0.15 },
  learningStage: { x: -0.5, y: 0.38 },
  careerInterest: { x: -0.45, y: 0.65 },
};

const COMPANION_DIALOGUES: Record<HeroPreset, readonly string[]> = {
  owl: [
    "Hoot! I am Ollie. Careful thinking turns difficult quests into small steps.",
    "A wise adventurer checks the evidence before claiming victory.",
    "Your notes are a map. Let us discover what they reveal.",
  ],
  fox: [
    "Yip! I am Fenn. Every great quest begins with one clever move.",
    "I smell a shortcut—but we should probably learn the real method.",
    "Sharp eyes, steady work, and absolutely no suspicious XP tricks.",
  ],
  cat: [
    "Meow. I am Miso. A calm mind catches details that haste misses.",
    "One focused mission is better than twelve unfinished adventures.",
    "Keep the desk tidy. The brain may follow eventually.",
  ],
};

export function AdventureOnboarding({
  profile,
  savedProfiles,
  onSave,
  onCancel,
  cancelLabel = "Return without changes",
  onSelectProfile,
}: AdventureOnboardingProps) {
  const editing = profile !== null;
  const [draft, setDraft] = useState<ProfileFormDraft>(() =>
    profileToFormDraft(profile),
  );
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerClassId>(
    profile?.playerCharacter ?? DEFAULT_PLAYER_CLASS,
  );
  const [focusedField, setFocusedField] = useState<ProfileField | null>(null);
  const [touched, setTouched] = useState<
    Partial<Record<ProfileField, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [scenePointer, setScenePointer] = useState<ScenePointer>({
    x: 0.5,
    y: 0.5,
    direction: 0,
    active: false,
  });
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [interactionReaction, setInteractionReaction] =
    useState<CharacterReaction | null>(null);
  const [worldDialogue, setWorldDialogue] = useState<WorldDialogue | null>(null);

  const currentCompanion = draft.hero.preset;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDialogueIndex(
        (current) =>
          (current + 1) % COMPANION_DIALOGUES[currentCompanion].length,
      );
    }, 8000);
    return () => window.clearInterval(timer);
  }, [currentCompanion]);

  useEffect(() => {
    if (!interactionReaction) return;
    const timer = window.setTimeout(() => setInteractionReaction(null), 900);
    return () => window.clearTimeout(timer);
  }, [interactionReaction]);

  useEffect(() => {
    if (!worldDialogue) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWorldDialogue(null);
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [worldDialogue]);

  const allErrors = useMemo(() => validateProfileDraft(draft), [draft]);
  const visibleErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(allErrors).filter(
          ([field]) => submitted || touched[field as ProfileField],
        ),
      ) as ReturnType<typeof validateProfileDraft>,
    [allErrors, submitted, touched],
  );
  const errorField =
    (focusedField && visibleErrors[focusedField] ? focusedField : null) ??
    firstProfileError(visibleErrors);
  const valid = isProfileDraftValid(draft);

  const gaze = scenePointer.active
    ? {
        x: (scenePointer.x - 0.5) * 2,
        y: (scenePointer.y - 0.5) * 2,
      }
    : focusedField
      ? FOCUS_GAZE[focusedField]
      : { x: 0.05, y: 0 };

  const reaction: CharacterReaction = errorField
    ? "concerned"
    : interactionReaction ?? (valid ? "happy" : "idle");
  const companionDialogue =
    COMPANION_DIALOGUES[currentCompanion][dialogueIndex] ??
    COMPANION_DIALOGUES[currentCompanion][0];
  const dialogue = errorField
    ? visibleErrors[errorField]!
    : worldDialogue?.message ?? companionDialogue;
  const dialogueTone = errorField
    ? "error"
    : worldDialogue?.tone ?? (valid ? "success" : "guide");

  function updateDraft<K extends keyof ProfileFormDraft>(
    field: K,
    value: ProfileFormDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function markTouched(field: ProfileField) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function fieldErrorProps(field: ProfileField) {
    const invalid = Boolean(visibleErrors[field]);
    return {
      "aria-invalid": invalid || undefined,
      "aria-errormessage": invalid
        ? `profile-${field}-error`
        : undefined,
      "aria-describedby": invalid
        ? `profile-${field}-error guide-speech`
        : "guide-speech",
    };
  }

  function selectHero(hero: HeroCustomization) {
    setDraft((current) => ({
      ...current,
      hero,
      heroSelected: true,
    }));
    setTouched((current) => ({ ...current, hero: true }));
    setDialogueIndex(0);
    setWorldDialogue(null);
    setInteractionReaction("happy");
  }

  function interactWithCompanion() {
    setFocusedField(null);
    setWorldDialogue(null);
    setDialogueIndex(
      (current) =>
        (current + 1) % COMPANION_DIALOGUES[currentCompanion].length,
    );
    setInteractionReaction("celebrating");
  }

  function handleDoorInteraction(timeOfDay: TimeOfDay) {
    const response = getDoorDialogue(timeOfDay, currentCompanion);
    setFocusedField(null);
    setWorldDialogue({
      message: `${response.world} ${response.companion}`,
      tone: timeOfDay === "night" ? "success" : "guide",
    });
    setInteractionReaction(response.reaction);
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateProfileDraft(draft);
    const firstError = firstProfileError(errors);
    setSubmitted(true);
    setTouched(
      Object.fromEntries(PROFILE_FIELD_ORDER.map((field) => [field, true])),
    );

    if (firstError) {
      setFocusedField(firstError);
      setWorldDialogue(null);
      window.requestAnimationFrame(() => {
        const target =
          firstError === "hero"
            ? document.querySelector<HTMLInputElement>(
                'input[name="heroPreset"]',
              )
            : document.getElementById(`profile-${firstError}`);
        target?.focus();
      });
      return;
    }

    onSave({
      displayName: draft.displayName.trim(),
      birthYear: Number(draft.birthYear),
      learningStage: draft.learningStage as LearningStage,
      careerInterest: draft.careerInterest.trim(),
      hero: { ...draft.hero },
      playerCharacter: selectedPlayer,
    });
  }

  return (
    <GameScene
      className="onboarding-game adventurer-screen"
      onPointerState={setScenePointer}
      onWorldInteraction={handleDoorInteraction}
    >
      <section className="adventure-panel rpg-frame" aria-labelledby="adventure-title">
        <div className="adventure-intro">
          <span className="adventure-kicker">
            {editing ? "ADVENTURER PROFILE" : "NEW ADVENTURER"}
          </span>
          <h1 id="adventure-title">
            {editing
              ? "Tune your party for the next quest."
              : "Create your hero and begin the journey."}
          </h1>
          <p>
            Choose your class, meet your guide, and tell us what you want to
            master. Your answers shape quests for your level and destination.
          </p>
          <span className="local-profile-note">
            Saved on this device · not secure authentication
          </span>
        </div>

        <form className="adventure-form" onSubmit={submitProfile} noValidate>
          <RpgCharacterSetup
            player={selectedPlayer}
            hero={draft.hero}
            heroSelected={draft.heroSelected}
            heroInvalid={Boolean(visibleErrors.hero)}
            heroErrorId="profile-hero-error"
            gaze={gaze}
            reaction={reaction}
            dialogue={dialogue}
            dialogueTone={dialogueTone}
            dialogueTarget={errorField ?? (worldDialogue ? null : focusedField)}
            onDismissDialogue={
              worldDialogue && !errorField
                ? () => setWorldDialogue(null)
                : undefined
            }
            onPlayerChange={(player) => {
              setSelectedPlayer(player);
              setInteractionReaction("celebrating");
            }}
            onHeroChange={selectHero}
            onCompanionInteract={interactWithCompanion}
          />

          <fieldset className="rpg-fieldset adventurer-details">
            <legend>Adventurer details</legend>
            <div className="adventure-fields">
              <label>
                <span>Hero name</span>
                <input
                  id="profile-displayName"
                  autoFocus
                  value={draft.displayName}
                  placeholder="What should we call you?"
                  autoComplete="nickname"
                  {...fieldErrorProps("displayName")}
                  onFocus={() => setFocusedField("displayName")}
                  onBlur={() => markTouched("displayName")}
                  onChange={(event) =>
                    updateDraft("displayName", event.target.value)
                  }
                />
                {visibleErrors.displayName && (
                  <span
                    className="semantic-field-error"
                    id="profile-displayName-error"
                  >
                    {visibleErrors.displayName}
                  </span>
                )}
              </label>

              <label>
                <span>Birth year</span>
                <input
                  id="profile-birthYear"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.birthYear}
                  placeholder="When did your journey begin?"
                  autoComplete="bday-year"
                  {...fieldErrorProps("birthYear")}
                  onFocus={() => setFocusedField("birthYear")}
                  onBlur={() => markTouched("birthYear")}
                  onChange={(event) =>
                    updateDraft(
                      "birthYear",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                />
                {visibleErrors.birthYear && (
                  <span
                    className="semantic-field-error"
                    id="profile-birthYear-error"
                  >
                    {visibleErrors.birthYear}
                  </span>
                )}
              </label>

              <label>
                <span>Current learning level</span>
                <select
                  id="profile-learningStage"
                  value={draft.learningStage}
                  {...fieldErrorProps("learningStage")}
                  onFocus={() => setFocusedField("learningStage")}
                  onBlur={() => markTouched("learningStage")}
                  onChange={(event) =>
                    updateDraft(
                      "learningStage",
                      event.target.value as LearningStage,
                    )
                  }
                >
                  <option value="" disabled>Choose your current level</option>
                  <option value="elementary">Elementary school</option>
                  <option value="middle-school">Middle school</option>
                  <option value="high-school">High school / Grade 9–12</option>
                  <option value="college">College or university</option>
                  <option value="professional">Working professional</option>
                  <option value="other">Other / self-directed</option>
                </select>
                {visibleErrors.learningStage && (
                  <span
                    className="semantic-field-error"
                    id="profile-learningStage-error"
                  >
                    {visibleErrors.learningStage}
                  </span>
                )}
              </label>

              <label className="quest-path-field">
                <span>Choose your quest path</span>
                <input
                  id="profile-careerInterest"
                  value={draft.careerInterest}
                  placeholder="Example: Software engineering, nursing, or accounting"
                  autoComplete="organization-title"
                  {...fieldErrorProps("careerInterest")}
                  onFocus={() => setFocusedField("careerInterest")}
                  onBlur={() => markTouched("careerInterest")}
                  onChange={(event) =>
                    updateDraft("careerInterest", event.target.value)
                  }
                />
                {visibleErrors.careerInterest && (
                  <span
                    className="semantic-field-error"
                    id="profile-careerInterest-error"
                  >
                    {visibleErrors.careerInterest}
                  </span>
                )}
              </label>
            </div>
          </fieldset>

          <div className="adventure-actions">
            <button className="enter-world-button" type="submit">
              <span>
                {editing ? "Save Hero Changes" : "Enter the Learning World"}
              </span>
              <span aria-hidden="true">→</span>
            </button>
            {editing && onCancel && (
              <button
                className="adventure-secondary-button"
                type="button"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
            )}
          </div>
        </form>

        {!editing && savedProfiles.length > 0 && (
          <div className="continue-adventure">
            <span>Continue your adventure</span>
            <div>
              {savedProfiles.map((savedProfile) => (
                <button
                  type="button"
                  key={savedProfile.id}
                  onClick={() => onSelectProfile(savedProfile.id)}
                >
                  <span className="saved-party-avatar" aria-hidden="true">
                    <PlayerCharacterPreview
                      player={savedProfile.playerCharacter}
                      decorative
                    />
                    <Character
                      hero={savedProfile.hero}
                      size="mini"
                      reaction="happy"
                      decorative
                    />
                  </span>
                  <span>Continue as <strong>{savedProfile.displayName}</strong></span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </GameScene>
  );
}

type ReturnToAdventureProps = {
  profile: LocalProfile;
  savedProfiles: LocalProfileSummary[];
  onContinue: () => void;
  onNewProfile: () => void;
  onDeleteProfile: () => void;
  onSelectProfile: (profileId: string) => void;
};

export function ReturnToAdventure({
  profile,
  savedProfiles,
  onContinue,
  onNewProfile,
  onDeleteProfile,
  onSelectProfile,
}: ReturnToAdventureProps) {
  const otherProfiles = savedProfiles.filter((saved) => saved.id !== profile.id);
  return (
    <GameScene className="onboarding-game adventurer-screen">
      <section className="adventure-panel rpg-frame" aria-labelledby="return-title">
        <div className="return-party" aria-hidden="true">
          <PlayerCharacterPreview player={profile.playerCharacter} decorative />
          <Character hero={profile.hero} reaction="happy" decorative />
        </div>
        <div className="return-hero">
          <SpeechBubble
            id="return-guide-speech"
            message="Your goals, missions, XP, and streak are waiting on this device."
            tone="guide"
          />
        </div>
        <div className="adventure-intro">
          <span className="adventure-kicker">ADVENTURE SAVED</span>
          <h1 id="return-title">Welcome back, {profile.displayName}.</h1>
          <p>
            Continue your learning journey or create another local adventurer.
            This local profile is not secure authentication.
          </p>
        </div>
        <div className="return-actions">
          <button className="enter-world-button" type="button" onClick={onContinue}>
            <span>Continue as {profile.displayName}</span>
            <span aria-hidden="true">→</span>
          </button>
          <button className="adventure-secondary-button" type="button" onClick={onNewProfile}>
            Create a new local adventurer
          </button>
          <button className="adventure-danger-button" type="button" onClick={onDeleteProfile}>
            Delete this local profile
          </button>
        </div>
        {otherProfiles.length > 0 && (
          <div className="continue-adventure other-adventures">
            <span>Other saved adventures</span>
            <div>
              {otherProfiles.map((savedProfile) => (
                <button
                  type="button"
                  key={savedProfile.id}
                  onClick={() => onSelectProfile(savedProfile.id)}
                >
                  <span className="saved-party-avatar" aria-hidden="true">
                    <PlayerCharacterPreview
                      player={savedProfile.playerCharacter}
                      decorative
                    />
                    <Character hero={savedProfile.hero} size="mini" decorative />
                  </span>
                  <span>Continue as <strong>{savedProfile.displayName}</strong></span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </GameScene>
  );
}
