import assert from "node:assert/strict";
import test from "node:test";
import {
  beginNewLocalProfile,
  deleteLocalProfile,
  EMPTY_STATE,
  listLocalProfiles,
  loadLocalSession,
  loadState,
  normalizeAppMode,
  PREVIOUS_STORAGE_KEY,
  saveLocalSession,
  saveState,
  setPreferredMode,
  STORAGE_KEY,
  selectLocalProfile,
} from "../src/lib/storage.ts";
import { DEFAULT_HERO, DEFAULT_PLAYER_CLASS } from "../src/lib/hero.ts";

const PROFILE = {
  id: "profile-1",
  displayName: "Long",
  birthYear: 2008,
  learningStage: "high-school" as const,
  careerInterest: "software engineering",
  hero: { preset: "fox", color: "sunset", accessory: "satchel" } as const,
  playerCharacter: "mage" as const,
  preferredMode: "focus" as const,
  adventureSetupComplete: true,
  createdAt: "2026-08-19T00:00:00.000Z",
};

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("state survives a save and reload", () => {
  const storage = new MemoryStorage();
  const state = {
    ...EMPTY_STATE,
    profile: PROFILE,
    totalXp: 30,
    missionPace: "stretch" as const,
    mood: "tired" as const,
    moodDate: "2026-08-23",
    focusSessions: [{
      id: "saved-focus",
      goalId: null,
      missionId: null,
      stepId: null,
      focusMinutes: 25,
      breakMinutes: 5,
      phase: "focus" as const,
      status: "completed" as const,
      startedAt: "2026-08-23T18:00:00.000Z",
      endsAt: "2026-08-23T18:25:00.000Z",
      completedAt: "2026-08-23T18:25:00.000Z",
      rewardEligible: true,
      xpAwarded: true,
    }],
  };

  saveState(storage, state);
  assert.deepEqual(loadState(storage), state);
});

test("version 1 state migrates without deleting its source data", () => {
  const storage = new MemoryStorage();
  const previous = JSON.stringify({
    version: 1,
    profile: {
      id: "profile-1",
      displayName: "Long",
      createdAt: "2026-08-19T00:00:00.000Z",
    },
    activeGoal: {
      id: "v1-goal",
      category: "learning",
      subject: "Full-Stack Web Development",
      currentLevel: "beginner",
      desiredOutcome: "Build StatQuest",
      minutesPerDay: 240,
      daysPerWeek: 6,
      deadline: "2026-09-30",
      createdAt: "2026-08-19T00:00:00.000Z",
    },
    missions: [],
    totalXp: 30,
    streak: { current: 2, longest: 2, lastCompletionDate: "2026-08-19" },
    missionPace: "stretch",
    weeklyReviews: [],
  });
  storage.setItem(PREVIOUS_STORAGE_KEY, previous);

  const migrated = loadState(storage);

  assert.equal(migrated.version, 2);
  assert.equal(migrated.goals[0]?.id, "v1-goal");
  assert.equal(migrated.goals[0]?.status, "active");
  assert.deepEqual(migrated.goals[0]?.referenceFiles, []);
  assert.equal(migrated.totalXp, 30);
  assert.equal(migrated.profile?.birthYear, null);
  assert.equal(migrated.profile?.learningStage, null);
  assert.equal(migrated.profile?.careerInterest, "");
  assert.deepEqual(migrated.profile?.hero, DEFAULT_HERO);
  assert.equal(migrated.profile?.playerCharacter, DEFAULT_PLAYER_CLASS);
  assert.equal(migrated.profile?.preferredMode, "focus");
  assert.equal(migrated.profile?.adventureSetupComplete, false);
  assert.equal(storage.getItem(PREVIOUS_STORAGE_KEY), previous);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test("legacy standalone goals migrate into the goal collection", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    "statquest.activeLearningGoal",
    JSON.stringify({
      id: "legacy-goal",
      category: "learning",
      subject: "Full-Stack Web Development",
      currentLevel: "beginner",
      desiredOutcome: "Build StatQuest",
      minutesPerDay: 240,
      daysPerWeek: 6,
      deadline: "2026-09-30",
      createdAt: "2026-08-19T00:00:00.000Z",
    }),
  );

  const migrated = loadState(storage);
  assert.equal(migrated.goals[0]?.id, "legacy-goal");
  assert.equal(migrated.goals[0]?.minutesPerDay, 240);
  assert.equal(migrated.goals[0]?.status, "active");
  assert.deepEqual(migrated.goals[0]?.referenceFiles, []);
  assert.equal(migrated.version, 2);
});

test("current snapshots gain reference and mission fields without losing data", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...EMPTY_STATE,
      profile: PROFILE,
      goals: [
        {
          id: "goal-before-uploads",
          category: "learning",
          subject: "Discrete Mathematics",
          currentLevel: "intermediate",
          desiredOutcome: "Complete the course",
          minutesPerDay: 60,
          daysPerWeek: 5,
          deadline: "2026-09-30",
          status: "active",
          position: 0,
          createdAt: "2026-08-19T00:00:00.000Z",
          completedAt: null,
        },
      ],
      missions: [
        {
          id: "mission-before-sources",
          goalId: "goal-before-uploads",
          subject: "Discrete Mathematics",
          date: "2026-08-19",
          title: "Legacy mission",
          objective: "Preserve me",
          difficulty: "medium",
          pace: "standard",
          xp: 20,
          rewardEligible: true,
          steps: [],
          evidenceRequirements: [],
          status: "active",
          evidence: null,
          xpAwarded: false,
          createdAt: "2026-08-19T00:00:00.000Z",
          completedAt: null,
        },
      ],
    }),
  );

  const loaded = loadState(storage);
  assert.deepEqual(loaded.goals[0]?.referenceFiles, []);
  assert.deepEqual(loaded.goals[0]?.courseDetails, []);
  assert.equal(loaded.goals[0]?.learningTopics[0]?.status, "unseen");
  assert.equal(loaded.goals[0]?.learningTopics[0]?.title, "Discrete Mathematics");
  assert.deepEqual(loaded.missions[0]?.sourceReferences, []);
  assert.equal(loaded.missions[0]?.learningTargetKey, null);
  assert.ok(loaded.missions[0]?.completionCriteria.length);
  assert.equal(loaded.missions[0]?.objective, "Preserve me");
  assert.equal(loaded.missions[0]?.kind, "practice");
  assert.equal(loaded.missions[0]?.topicId, null);
  assert.equal(loaded.missions[0]?.feedback, null);
  assert.equal(loaded.missions[0]?.rewardOpportunityId, "mission-before-sources");
});

test("old Focus sessions normalize mission and step linkage to null", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...EMPTY_STATE,
      profile: PROFILE,
      focusSessions: [{
        id: "old-focus",
        goalId: null,
        focusMinutes: 25,
        breakMinutes: 5,
        phase: "focus",
        status: "cancelled",
        startedAt: "2026-08-23T18:00:00.000Z",
        endsAt: "2026-08-23T18:25:00.000Z",
        completedAt: null,
        rewardEligible: false,
        xpAwarded: false,
      }],
    }),
  );

  const loaded = loadState(storage);
  assert.equal(loaded.focusSessions[0]?.missionId, null);
  assert.equal(loaded.focusSessions[0]?.stepId, null);
});

test("legacy queued goals become active without losing their data", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...EMPTY_STATE,
      profile: PROFILE,
      goals: [{
        id: "queued-goal",
        category: "learning",
        subject: "English",
        currentLevel: "beginner",
        desiredOutcome: "Speak confidently",
        minutesPerDay: 30,
        daysPerWeek: 4,
        deadline: "",
        referenceFiles: [],
        status: "queued",
        position: 8,
        createdAt: "2026-08-19T00:00:00.000Z",
        completedAt: null,
      }],
    }),
  );

  const loaded = loadState(storage);
  assert.equal(loaded.goals[0]?.status, "active");
  assert.equal(loaded.goals[0]?.id, "queued-goal");
  assert.equal(loaded.goals[0]?.position, 8);
  assert.equal(loaded.goals[0]?.deadline, "");
});

test("missing mood defaults to moderate and old unscoped reviews remain history only", () => {
  const storage = new MemoryStorage();
  const oldReview = {
    id: "old-review",
    weekStart: "2026-08-17",
    win: "Finished",
    obstacle: "Unknown historical note",
    nextFocus: "Old focus",
    nextMissionPace: "stretch",
    createdAt: "2026-08-23T00:00:00.000Z",
  };
  const withoutMood = { ...EMPTY_STATE } as Partial<typeof EMPTY_STATE>;
  Reflect.deleteProperty(withoutMood, "mood");
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...withoutMood, profile: PROFILE, weeklyReviews: [oldReview] }),
  );

  const loaded = loadState(storage);
  assert.equal(loaded.mood, "moderate");
  assert.equal(loaded.moodDate, null);
  assert.deepEqual(loaded.focusSessions, []);
  assert.deepEqual(loaded.weeklyReviews, [oldReview]);
  assert.equal(loaded.weeklyReviews[0]?.goalId, undefined);
});

test("hero customization survives profile save and reload", () => {
  const storage = new MemoryStorage();
  const state = { ...EMPTY_STATE, profile: PROFILE };

  saveState(storage, state);
  const loaded = loadState(storage);

  assert.deepEqual(loaded.profile?.hero, {
    preset: "fox",
    color: "sunset",
    accessory: "satchel",
  });
  assert.deepEqual(listLocalProfiles(storage)[0]?.hero, loaded.profile?.hero);
  assert.equal(loaded.profile?.playerCharacter, "mage");
  assert.equal(listLocalProfiles(storage)[0]?.playerCharacter, "mage");
  assert.equal(listLocalProfiles(storage)[0]?.preferredMode, "focus");
});

test("missing or invalid preferred modes safely normalize to focus", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...EMPTY_STATE,
      profile: {
        ...PROFILE,
        preferredMode: "unknown",
      },
    }),
  );

  assert.equal(normalizeAppMode(undefined), "focus");
  assert.equal(normalizeAppMode("unknown"), "focus");
  assert.equal(loadState(storage).profile?.preferredMode, "focus");
});

test("legacy Adventure customization is preserved without selecting Adventure", () => {
  const storage = new MemoryStorage();
  const legacyProfile = {
    id: PROFILE.id,
    displayName: PROFILE.displayName,
    birthYear: PROFILE.birthYear,
    learningStage: PROFILE.learningStage,
    careerInterest: PROFILE.careerInterest,
    hero: PROFILE.hero,
    playerCharacter: PROFILE.playerCharacter,
    createdAt: PROFILE.createdAt,
  };
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...EMPTY_STATE, profile: legacyProfile }),
  );

  const loaded = loadState(storage);
  assert.equal(loaded.profile?.preferredMode, "focus");
  assert.equal(loaded.profile?.adventureSetupComplete, true);
  assert.equal(loaded.profile?.playerCharacter, "mage");
  assert.deepEqual(loaded.profile?.hero, PROFILE.hero);
});

test("returning Adventure users keep Adventure as their preferred mode", () => {
  const storage = new MemoryStorage();
  saveState(storage, {
    ...EMPTY_STATE,
    profile: { ...PROFILE, preferredMode: "adventure" },
  });

  const loaded = loadState(storage);
  assert.equal(loaded.profile?.preferredMode, "adventure");
  assert.equal(loaded.profile?.adventureSetupComplete, true);
});

test("new Focus profiles can keep default artwork without completing Adventure setup", () => {
  const storage = new MemoryStorage();
  saveState(storage, {
    ...EMPTY_STATE,
    profile: {
      ...PROFILE,
      adventureSetupComplete: false,
    },
  });

  assert.equal(loadState(storage).profile?.adventureSetupComplete, false);
});

test("mode switching preserves the shared learning state", () => {
  const goals = [{ id: "shared-goal" }] as never;
  const missions = [{ id: "shared-mission", xpAwarded: true }] as never;
  const reviews = [{ id: "shared-review" }] as never;
  const state = {
    ...EMPTY_STATE,
    profile: PROFILE,
    goals,
    missions,
    totalXp: 90,
    streak: { current: 4, longest: 7, lastCompletionDate: "2026-08-22" },
    weeklyReviews: reviews,
  };

  const adventure = setPreferredMode(state, "adventure");
  const focus = setPreferredMode(adventure, "focus");

  assert.equal(adventure.profile?.preferredMode, "adventure");
  assert.equal(focus.profile?.preferredMode, "focus");
  assert.equal(focus.goals, goals);
  assert.equal(focus.missions, missions);
  assert.equal(focus.weeklyReviews, reviews);
  assert.equal(focus.totalXp, 90);
  assert.deepEqual(focus.streak, state.streak);
  assert.deepEqual(focus.profile?.hero, PROFILE.hero);
  assert.equal(focus.profile?.playerCharacter, "mage");
});

test("local logout preserves progress and requires explicit return", () => {
  const storage = new MemoryStorage();
  const state = {
    ...EMPTY_STATE,
    profile: {
      ...PROFILE,
    },
    totalXp: 90,
  };
  saveState(storage, state);

  assert.equal(loadLocalSession(storage, true), true);
  saveLocalSession(storage, false);
  assert.equal(loadLocalSession(storage, true), false);
  assert.equal(loadState(storage).totalXp, 90);
  saveLocalSession(storage, true);
  assert.equal(loadLocalSession(storage, true), true);
});

test("a new local profile preserves the old profile and can switch back", () => {
  const storage = new MemoryStorage();
  saveState(storage, { ...EMPTY_STATE, profile: PROFILE, totalXp: 90 });

  beginNewLocalProfile(storage);
  assert.equal(loadState(storage).profile, null);

  const secondProfile = {
    ...PROFILE,
    id: "profile-2",
    displayName: "Tung Two",
    birthYear: 1998,
    learningStage: "professional" as const,
  };
  saveState(storage, {
    ...EMPTY_STATE,
    profile: secondProfile,
    totalXp: 10,
  });

  assert.deepEqual(
    listLocalProfiles(storage).map((profile) => profile.id),
    ["profile-1", "profile-2"],
  );
  assert.equal(selectLocalProfile(storage, "profile-1")?.totalXp, 90);
  assert.equal(loadState(storage).profile?.displayName, "Long");
});

test("deleting one local profile preserves other profiles", () => {
  const storage = new MemoryStorage();
  saveState(storage, { ...EMPTY_STATE, profile: PROFILE, totalXp: 90 });
  beginNewLocalProfile(storage);
  saveState(storage, {
    ...EMPTY_STATE,
    profile: { ...PROFILE, id: "profile-2", displayName: "Second" },
    totalXp: 20,
  });

  const selected = deleteLocalProfile(storage, "profile-2");

  assert.equal(selected.profile?.id, "profile-1");
  assert.equal(selected.totalXp, 90);
  assert.deepEqual(listLocalProfiles(storage).map((profile) => profile.id), [
    "profile-1",
  ]);
});
