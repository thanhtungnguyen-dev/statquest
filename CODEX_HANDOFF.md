# StatQuest Codex handoff

Last updated: 2026-08-23

## Current state

StatQuest is a verified single-device Learning MVP. A browser can hold several
isolated local learner profiles. Each profile can keep any number of unfinished
goals active simultaneously, with one active mission per goal and five active
missions across the profile.

The app now has two UI modes over that same state. Focus is the default
minimalist experience. Adventure is optional and reuses the current RPG setup.
The preferred mode is stored on the shared profile; missing or invalid values
normalize to Focus. Existing character data is preserved but never selects
Adventure by itself.

Onboarding uses a responsive pixel-art RPG character creator with Warrior,
Mage, and Explorer classes; owl, fox, and cat companions; persistent color and
accessory customization; shared companion dialogue; and an interactive
day/night cottage door. Existing profiles receive a non-destructive Warrior
default when no class was previously saved.

This is not a production multi-user service. Its local profile is not secure
authentication. Supabase authentication and cloud persistence are not yet
connected.

## Implemented product loop

Course context → deterministic target recommendation → generate and review a
`learn`, `practice`, `review`, or `apply` mission → explicit **Study mission** →
mission-linked Focus → evidence completion → eligible XP once → no-XP
difficulty/confidence feedback → mastery and spaced review update → next
recommendation. An already-active recommended mission may resume its unfinished
Focus step directly. Finishing still targets one exact goal.

Goals can also store locally processed reference-file metadata and extracted
text. The raw files are not retained.

## Goal decisions

- Users may create all goals up front and all new unfinished goals are active.
- Goal editing preserves ID, creation date, status, position, missions,
  XP, streak, and history.
- Finishing a goal targets its expected ID and does not affect another goal.
- Historical goals and missions are preserved.
- Up to five missions may be active globally, with one active mission per goal.
- Later completed missions may share a goal/date and use non-reused ordinal IDs.
- The first five missions created per local mission date are reward-eligible;
  later missions for that date are 0-XP practice.
- A goal cannot finish until it has at least one completed mission.
- Each goal accepts up to five PDF, DOCX, TXT, PNG, or JPG references of up to
  10 MB each. Users can add, replace, or remove them.

## Storage and migration

Current state key:

- `statquest.state.v2`
- `statquest.localProfiles.v1` (saved-profile index)
- `statquest.localProfileState.v2.[profile-id]` (isolated profile state)

Previous sources that remain supported and are not deleted:

- `statquest.state.v1`
- `statquest.activeLearningGoal`
- `statquest.todayMission`

Local-session key:

- `statquest.localSession.v1`

Each normalized profile also stores `preferredMode` and an explicit
`adventureSetupComplete` flag. These fields are added in place without changing
the state key or deleting legacy snapshots.

Logout changes only the local-session flag. Creating another local profile
preserves existing profiles. Profile deletion requires explicit confirmation
and targets only the selected profile. If the v2 payload is invalid, loading
falls back to valid v1 or standalone legacy data instead of silently clearing
progress.

## Mission and reward rules

- Up to 30 minutes: easy, 10 XP, focused task plus correction/check.
- 31–59 minutes: medium, 20 XP, recall, practice, and verification.
- 60 minutes or more: hard, 30 XP, review, substantial application,
  correction, and retrieval/verification.
- Minutes determine workload and time-tiered XP. Current level, topic state,
  mission kind, feedback, and mood may affect cognitive difficulty but never XP.
- All steps, at least 80 characters, at least 12 meaningful words, sufficient
  vocabulary diversity, mission-keyword overlap, and a concrete action/result
  verb are required.
- Repeated-character gibberish and unrelated evidence are rejected.
- Optional evidence URLs must use HTTP or HTTPS.
- XP is awarded once per eligible completed mission, with no aggregate daily XP cap.
- The first six rewarded Focus periods completed for active goals per local day
  earn 5 XP each. No-goal Focus still records analytics and streak activity at
  0 XP and does not consume one of those reward slots. Completion remains
  idempotent.
- Streak activity uses local completion date and updates once on that date.
- Optional birth year is stored as metadata and has no mission effect. Learning
  stage may adjust scaffolding and wording only; it does not change target,
  mission kind, difficulty, workload, XP, rewards, mastery, or review. Career
  interest may inform naturally useful generic examples but never overrides
  learner-confirmed source requirements.
- Levels require 100 XP.
- Missed calendar days expire current streak but never remove earned XP.
- New uploads expose identified questions, topics, outcomes, concrete
  requirements, and assessment dates for learner edit/confirmation/removal.
  Only confirmed details influence planning. Missions
  retain exact source excerpts as internal provenance but do not render raw
  excerpts or filenames to learners.
- Weak or conversational readable text falls back to the normal flexible
  mission. Failed, still-processing, or insufficient extraction still produces
  an actionable error instead of invented course content.
- Mission generation, mission completion/XP, and expected-goal completion are
  idempotent against duplicate client actions.

These client-side rules are suitable only for the local MVP. Production XP
must be derived and awarded atomically on the server from trusted stored mission
data.

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Local UI and event orchestration |
| `src/app/globals.css` | Responsive presentation |
| `src/components/game/adventure-onboarding.tsx` | Shared onboarding state, validation, dialogue, and profile save flow |
| `src/components/game/rpg-character-setup.tsx` | Player-class and companion customization controls |
| `src/components/game/game-scene.tsx` | Pointer-responsive world and interactive day/night cottage door |
| `src/lib/types.ts` | State and domain contracts |
| `src/lib/goals.ts` | Goal creation, editing, and expected-goal completion |
| `src/lib/mission-generator.ts` | Deterministic daily missions |
| `src/lib/progress.ts` | Evidence, XP, level, streak, and missed rules |
| `src/lib/reference-files.ts` | Reference validation and browser-side PDF/DOCX/TXT/image extraction |
| `src/lib/storage.ts` | Persistence, migration, and local session |
| `tests/` | Business-rule and migration tests |
| `supabase/schema.sql` | Starter schema, not production proof |
| `docs/PRODUCTION_UPGRADE.md` | Supabase milestone requirements |
| `docs/OPTIMIZED_RELEASE.md` | Release changes and verification |

## Verified release status

On 2026-08-24:

- `npm.cmd test`: 140 passed, 0 failed
- `npm.cmd run lint`: passed
- `npm.cmd run build`: passed
- Browser onboarding: passed
- Player-class, companion, color, accessory, dialogue, blink, and door controls: passed
- New Focus, new Adventure, returning Focus, returning Adventure, incomplete
  Adventure setup, and two-way shared-data mode switching: passed
- Reversible local logout/return: passed
- Browser warnings/errors: none observed
- Browser TXT, DOCX, PDF, and PNG extraction: passed
- Desktop 1280×720 and mobile 390×844 responsive checks: passed
- Computed background, heading, navigation, and supporting-text colors: passed

## Milestone 1 next steps

1. Create and configure a Supabase project.
2. Convert the starter schema to ordered migrations and add active/completed/
   archived goal state.
3. Add cookie-based Supabase authentication.
4. Introduce local and cloud repository adapters.
5. Add previewed, idempotent local-to-cloud import without deleting local data.
6. Add atomic database functions for mission completion/XP and targeted goal
   completion that leaves other active goals unchanged.
7. Remove direct client rights to XP, streak, status, and award fields.
8. Add two-user RLS, anonymous-access, cross-owner foreign-key, and concurrent
   duplicate-completion tests.
9. Run tests, lint, build, database lint, and pgTAP before deployment.

Never expose the Supabase service-role key in browser code. Never claim that
RLS is verified until the two-user negative tests and reward-field tests pass.
