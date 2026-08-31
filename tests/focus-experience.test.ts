import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  levelCosmeticTier,
  streakVisualTier,
} from "../src/lib/progression-visuals.ts";
import { weeklyStudyAnalytics } from "../src/lib/study-analytics.ts";
import {
  parseYouTubeVideoId,
  youtubePrivacyEmbedUrl,
} from "../src/lib/youtube.ts";
import { EMPTY_STATE } from "../src/lib/storage.ts";
import type { DailyMission, FocusSession } from "../src/lib/types.ts";

const PAGE = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const TOPBAR = readFileSync(
  new URL("../src/components/focus/focus-topbar.tsx", import.meta.url),
  "utf8",
);
const ROOM = readFileSync(
  new URL("../src/components/focus/focus-room.tsx", import.meta.url),
  "utf8",
);
const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("streak visual tiers use deterministic current-streak boundaries", () => {
  const cases = [
    [0, "ember"],
    [1, "small"],
    [2, "small"],
    [3, "warm"],
    [6, "warm"],
    [7, "strong"],
    [13, "strong"],
    [14, "advanced"],
    [29, "advanced"],
    [30, "radiant"],
  ] as const;
  for (const [days, tier] of cases) assert.equal(streakVisualTier(days), tier);
});

test("level cosmetic tiers are visual-only deterministic boundaries", () => {
  const cases = [
    [1, "starter"],
    [4, "starter"],
    [5, "bronze"],
    [9, "bronze"],
    [10, "silver"],
    [19, "silver"],
    [20, "gold"],
    [29, "gold"],
    [30, "aura"],
  ] as const;
  for (const [level, tier] of cases) assert.equal(levelCosmeticTier(level), tier);
});

test("YouTube parser accepts controlled common URLs and creates only privacy embeds", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(parseYouTubeVideoId(`https://youtu.be/${id}?t=12`), id);
  assert.equal(parseYouTubeVideoId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(
    youtubePrivacyEmbedUrl(id),
    `https://www.youtube-nocookie.com/embed/${id}`,
  );
});

test("YouTube parser rejects unsafe, unrelated, and malformed input", () => {
  for (const value of [
    "",
    "random text",
    "javascript:alert(1)",
    "data:text/html,video",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=too-short",
    "https://youtu.be/dQw4w9WgXcQ-extra",
  ]) {
    assert.equal(parseYouTubeVideoId(value), null);
  }
  assert.equal(youtubePrivacyEmbedUrl("not-video"), null);
});

function localIso(day: number, hour = 12): string {
  return new Date(2026, 7, day, hour).toISOString();
}

function focusSession(
  id: string,
  completedDay: number,
  overrides: Partial<FocusSession> = {},
): FocusSession {
  return {
    id,
    goalId: null,
    focusMinutes: 25,
    breakMinutes: 5,
    phase: "focus",
    status: "completed",
    startedAt: localIso(completedDay, 11),
    endsAt: localIso(completedDay, 12),
    completedAt: localIso(completedDay),
    rewardEligible: true,
    xpAwarded: true,
    ...overrides,
    missionId: overrides.missionId ?? null,
    stepId: overrides.stepId ?? null,
  };
}

function completedMission(
  id: string,
  date: string,
  completedAt: string | null,
): DailyMission {
  return {
    id,
    goalId: "goal",
    subject: "Mathematics",
    date,
    title: "Proof practice",
    objective: "Complete a proof",
    kind: "practice",
    topicId: null,
    learningTargetKey: null,
    difficulty: "medium",
    workload: "medium",
    pace: "standard",
    xp: 20,
    rewardEligible: true,
    steps: [],
    evidenceRequirements: [],
    completionCriteria: [],
    sourceReferences: [],
    recommendationReasons: [],
    status: "completed",
    evidence: null,
    feedback: null,
    xpAwarded: true,
    rewardOpportunityId: id,
    rewardDate: date,
    replacementOf: null,
    carryoverDecision: null,
    createdAt: completedAt ?? localIso(30),
    completedAt,
  };
}

test("weekly analytics use local Monday-Sunday completion dates and deduplicate study days", () => {
  const state = {
    ...EMPTY_STATE,
    focusSessions: [
      focusSession("monday", 24),
      focusSession("break-record", 26, {
        focusMinutes: 50,
        breakMinutes: 10,
        phase: "break",
      }),
      focusSession("cancelled", 30, { status: "cancelled" }),
      focusSession("next-week", 31),
    ],
    missions: [
      completedMission("mission-mon", "2026-08-24", localIso(24, 15)),
      completedMission("mission-wed", "2026-08-26", localIso(26, 16)),
      completedMission("legacy-sun", "2026-08-30", null),
      completedMission("next-week-mission", "2026-08-31", localIso(31, 14)),
    ],
  };

  assert.deepEqual(weeklyStudyAnalytics(state, new Date(2026, 7, 27, 12)), {
    weekStart: "2026-08-24",
    weekEnd: "2026-08-30",
    completedFocusPeriods: 2,
    completedFocusMinutes: 75,
    completedMissions: 3,
    uniqueStudyDays: 3,
  });
});

test("Focus Room is a presentation layer over the existing timestamp session actions", () => {
  assert.match(PAGE, /function startFocus\(\)[\s\S]*?startFocusSessionInState[\s\S]*?setFocusRoomOpen\(true\)/);
  assert.match(PAGE, /focusSessionRemainingMilliseconds\(activeFocusSession, clockNow\)/);
  assert.match(PAGE, /onMinimize=\{\(\) => setFocusRoomOpen\(false\)\}/);
  assert.match(PAGE, /if \(activeFocusSession\) \{\s*setFocusRoomOpen\(true\)/);
  assert.match(PAGE, /onStop=\{\(\) => cancelFocus\(focusRoomSession\.id\)\}/);
  assert.match(PAGE, /onComplete=\{\(\) => completeFocus\(focusRoomSession\.id\)\}/);
  assert.match(PAGE, /startFocusBreakInState\(current, focusRoomSession\.id\)/);
  assert.match(PAGE, /skipFocusBreakInState\(current, focusRoomSession\.id\)/);
  assert.doesNotMatch(ROOM, /setAppState|totalXp\s*[+:=]|updateStreak|xpAwarded\s*=/);
});

test("Focus Room reuses the Guardian and safely controls YouTube embeds", () => {
  assert.match(ROOM, /<Character hero=\{hero\} reaction=\{guardianReaction\} size="small"/);
  assert.match(ROOM, /parseYouTubeVideoId\(youtubeInput\)/);
  assert.match(ROOM, /src=\{embedUrl\}/);
  assert.match(ROOM, /youtubeVideoId\s*\?\s*youtubePrivacyEmbedUrl\(youtubeVideoId\)/);
  assert.doesNotMatch(ROOM, /src=\{youtubeInput\}|dangerouslySetInnerHTML|GameScene|game-world|house|map/);
  assert.match(ROOM, /None/);
  assert.match(ROOM, /Custom YouTube link/);
  assert.match(ROOM, /Disable YouTube/);
});

test("minimizing Focus Room keeps the safe YouTube player mounted but inaccessible", () => {
  assert.doesNotMatch(ROOM, /if \(!open\) return null/);
  assert.match(ROOM, /className=\{`focus-room[\s\S]*?\$\{open \? "" : " is-minimized"\}/);
  assert.match(ROOM, /inert=\{!open \? true : undefined\}/);
  assert.match(ROOM, /aria-hidden=\{!open \|\| undefined\}/);
  assert.match(ROOM, /role=\{open \? "dialog" : undefined\}/);
  assert.match(ROOM, /aria-modal=\{open \? true : undefined\}/);
  assert.match(ROOM, /<iframe[\s\S]*?src=\{embedUrl\}/);
  assert.match(
    CSS,
    /\.focus-room\.is-minimized\s*\{[\s\S]*?visibility: hidden;[\s\S]*?pointer-events: none;/,
  );
});

test("Focus reward copy distinguishes no-goal practice from eligible linked work", () => {
  assert.match(PAGE, /const rewardedFocusCountToday/);
  assert.match(PAGE, /const activeFocusRewardAvailable/);
  assert.match(PAGE, /No goal records Focus time at 0 XP/);
  assert.match(PAGE, /rewardAvailable=\{activeFocusRewardAvailable\}/);
  assert.match(ROOM, /rewardAvailable[\s\S]*?\+5 XP after you confirm completion[\s\S]*?Practice period · 0 XP/);
});

test("Focus topbar keeps progress, themes, and account actions accessible", () => {
  assert.match(TOPBAR, /StatQuest/);
  assert.match(TOPBAR, /Level/);
  assert.match(TOPBAR, /Current level XP progress/);
  assert.match(TOPBAR, /Current streak:[\s\S]*?Longest streak:/);
  assert.match(TOPBAR, /aria-label="Focus appearance"/);
  assert.match(TOPBAR, /<details className="focus-account-menu">/);
  assert.match(TOPBAR, /Profile/);
  assert.match(TOPBAR, /Adventure mode/);
  assert.match(TOPBAR, /Log out/);
  assert.match(CSS, /\.streak-flame-advanced \.streak-flame-core/);
  assert.match(CSS, /\.level-cosmetic-aura[\s\S]*?animation: level-aura-breathe/);
});

test("Focus experience remains responsive and reduced-motion aware", () => {
  assert.match(CSS, /@media \(max-width: 600px\)[\s\S]*?\.focus-room-layout/);
  assert.match(CSS, /@media \(max-width: 720px\)[\s\S]*?\.focus-top-stats[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.streak-flame-outer,[\s\S]*?\.level-cosmetic-aura \{ animation: none; \}/);
  assert.match(CSS, /\.focus-room-layout[\s\S]*?width: min\(1160px, calc\(100% - 52px\)\)/);
});
