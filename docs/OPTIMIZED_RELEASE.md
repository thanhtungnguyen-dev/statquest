# Optimized local release

## What changed

- Added any number of simultaneously active goals with optional deadlines.
- Finishing one expected goal leaves every other goal active and unchanged.
- Goal editing remains in place without queue or unlock behavior.
- Goal editing now preserves identity and historical progress.
- Added reversible local logout and a `Continue as [name]` return screen.
- Added non-destructive version 1 to version 2 state migration.
- Kept the standalone legacy goal and mission migration.
- Fixed the React hooks lint failure by using hydration-aware state loading.
- Expanded automated coverage from 12 to 24 tests.
- Added a package lockfile for repeatable dependency installation.
- Added multiple isolated local profiles, profile switching, start-new, and
  confirmed deletion.
- Added birth year, explicit learning stage, and career/study interest.
- Added learning-stage scaffolding and selective career-context examples while
  keeping birth year as mission-inert metadata.
- Rejected repeated-character, low-diversity, unrelated, and action-free
  evidence.
- Added up to five active missions globally, one active mission per goal, and
  non-reused ordinal mission IDs for repeated goal/date work.
- Limited reward-eligible missions to five per local mission date and required
  a completed mission before a goal can finish.
- Added multi-file goal references with drag/drop, validation, extraction
  progress, errors, remove, and replace controls.
- Added browser-side PDF, DOCX, TXT, and PNG/JPG OCR extraction without storing
  raw files.
- Grounded missions in exact source excerpts kept as internal provenance, with explicit
  deliverables, and completion criteria. Insufficient material now stops with a
  clear corrective message.
- Reworked the full-app background with calm animated glows and a study grid,
  plus a reduced-motion mode.
- Replaced low-contrast and opacity-only states with explicit WCAG AA color
  pairs across headings, navigation, supporting text, forms, disabled controls,
  errors, and completed steps.
- Replaced the plain profile form with a reusable cozy 2D adventure scene,
  live character creator, accessible guide speech, and field-specific feedback.
- Persisted the selected hero, color, and accessory with safe defaults for all
  profiles saved before character customization existed.
- Added pointer-responsive grass, flowers, character gaze, and subtle parallax;
  interactions reset over form controls and become static when reduced motion
  is requested.
- Added a saved-data-first 2.1-second world-entry transition with a keyboard-
  accessible skip control and a 350-millisecond reduced-motion handoff.
- Rebuilt onboarding as a responsive pixel-art RPG character creator with
  Warrior, Mage, and Explorer classes and one shared source of truth for player,
  companion, color, accessory, dialogue, gaze, blink, and reaction state.
- Added an accessible cottage-door hitbox with deterministic day/night and
  companion-specific dialogue, without replacing the existing world artwork.
- Added a non-destructive saved-player-class default for older profiles.
- Added Focus and Adventure as UI modes over one shared learning state, with
  Focus as the default for new, missing, and invalid preferences.
- Restored the minimal local-profile entry and return screens for Focus while
  retaining the existing Adventure setup and customization.
- Added an explicit Adventure-setup completion flag, persistent two-way mode
  switching, and a minimal Adventure home that reads the shared goal, mission,
  level, and XP state.
- Replaced the Focus header presentation with one responsive Light/Dark glass
  bar, compact Level/XP/Streak progress, deterministic flame and cosmetic level
  tiers, and an accessible profile action menu.
- Added a full-screen Focus Room over the existing timestamp-derived session
  model, including minimize/reopen behavior, the saved companion as Focus
  Guardian, and the existing cancellation, completion, reward, and break paths.
- Added optional local Focus audio controls that accept only validated YouTube
  video IDs and construct `youtube-nocookie.com` embed URLs after explicit load;
  the loaded player remains mounted while the room is minimized.
- Added compact Monday-through-Sunday Focus periods, Focus minutes, completed
  missions, and unique study-day analytics using local completion dates.
- Kept birth year and raw-source provenance out of learner-facing missions;
  learning stage affects scaffolding only, while career context appears only in
  naturally suitable generic examples.
- Added a small deterministic source filter with safe flexible-mission fallback
  for weak or conversational files while retaining exact internal provenance.
- Made mission generation, mission completion/XP, and expected-goal completion
  idempotent against duplicate actions.
- Added per-goal learning maps with bounded mastery, topic states, attempt and
  success counts, last-study timestamps, review dates, and internal provenance.
- Added deterministic adaptive target selection and `learn`, `practice`,
  `review`, and `apply` mission kinds without coupling cognitive difficulty to XP.
- Replaced generation-time mission countdowns with estimates and linked Focus
  sessions to exact mission steps; expiry never completes a step automatically.
- Added learner confirmation/edit/removal of extracted course details before
  they can affect planning, plus strict same-file/proximity grounding.
- Added no-XP completion feedback, spaced review, older-mission Continue/Replace/Skip,
  one recommended mission, and reward-preserving mission adjustments.
- Recommended mission generation now selects the new mission for review before
  the learner explicitly chooses **Study mission**; active recommendations can
  still resume their unfinished Focus step.
- Focus completion awards 5 XP only for the first six rewarded active-goal
  periods per local day. No-goal Focus records analytics and streak activity at
  0 XP without consuming a rewarded-period slot.

## Data preservation

The optimized app writes current data to `statquest.state.v2`. It does not
delete or rewrite:

- `statquest.state.v1`
- `statquest.activeLearningGoal`
- `statquest.todayMission`

The v1 snapshot and legacy keys remain recovery sources. Local logout changes
only `statquest.localSession.v1`; it does not delete the profile or progress.

## Verified on 2026-08-24

| Check | Result |
| --- | --- |
| `npm.cmd test` | 140 passed, 0 failed |
| `npm.cmd run lint` | Passed |
| `npm.cmd run build` | Passed |
| Browser onboarding | Passed |
| Local logout and return | Passed |
| Browser console warnings/errors | None |
| TXT, DOCX, PDF, and PNG extraction | Passed |
| Desktop and mobile responsive layout | Passed, no horizontal overflow |
| Validation focus, speech, and character reactions | Passed |
| Hero customization save and edit persistence | Passed |
| Pointer-scene activation and form reset | Passed |
| Entry transition and skip action | Passed |
| Player, companion, color, and accessory controls | Passed |
| Cottage door day/night dialogue and keyboard semantics | Passed |
| New/returning Focus and Adventure entry flows | Passed |
| Two-way mode switching with shared goal and mission data | Passed |
| Focus Light/Dark at 1280×720 and 390×844 | Passed, no horizontal overflow |
| Focus Room start, minimize, floating-timer reopen, and Stop | Passed; Stop left XP unchanged |
| Focus Guardian and safe YouTube validation/load/disable | Passed |
| Profile menu, Profile action, Adventure switch, and local logout/return | Passed |
| Focus completion/break paths and reduced-motion invariants | Passed in automated coverage |

## Production boundary

This release does not claim to provide cloud accounts. The local profile is not
secure authentication, and client-side XP logic is not the final production
security model. Follow `PRODUCTION_UPGRADE.md` for the Supabase milestone.
