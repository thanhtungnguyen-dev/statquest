# StatQuest Optimized Local MVP

StatQuest turns long-term learning goals into precise daily missions. Users may
work on any number of active goals, with at most one active mission per goal and
five active missions across the profile.

## Included

- Multiple saved local learner profiles with switching, reversible logout,
  start-new, and confirmed deletion
- Focus and Adventure experiences over one shared profile, goals, missions, XP,
  streak, history, and review state; Focus is the safe default for new and
  legacy profiles
- Minimal profile entry and saved-profile return flow, explicit mode selection,
  persistent mode switching, and a small functional Adventure home
- Floating Light/Dark Focus dashboard bar with an accessible profile menu,
  deterministic streak-flame tiers, and cosmetic-only level tiers
- Full-screen timestamp-derived Focus Room with minimize/reopen behavior,
  existing companion artwork as a quiet Focus Guardian, and explicit
  completion, cancellation, break, XP, and streak rules
- Optional validated YouTube privacy embeds inside Focus Room and compact local
  Monday-through-Sunday study analytics; a loaded player stays mounted while
  the room is minimized
- Pixel-art RPG character creation with Warrior, Mage, and Explorer classes;
  owl, fox, and cat companions; four colors; three accessories; live dialogue;
  and saved customization
- Interactive day/night cottage door with companion-specific world reactions
- Pointer-responsive grass, flowers, gaze, and scenery parallax that activate
  only over the game world, with a fully static reduced-motion experience
- Saved-data-first entry transition with an always-available skip control
- Optional birth year, explicit learning stage, and career/study interest
- Multiple saved learning goals
- Simultaneously active unfinished goals with optional deadlines
- In-place goal editing that preserves ID, creation date, goal state, XP, and
  history
- Deterministic adaptive `learn`, `practice`, `review`, and `apply` missions
  selected from each goal's topic mastery, review schedule, confirmed assessment
  timing, recent work, weekly review, study target, and current mood
- Up to five active missions globally and one active mission per goal
- Unique ordinal mission IDs that allow later same-goal, same-date missions
- Up to five reward-eligible missions per local mission date; later missions
  for that date are 0-XP practice
- Birth year retained as optional metadata only; learning stage may adjust
  instructional scaffolding, and career interest may inform naturally useful
  generic examples without overriding confirmed source requirements
- Goal reference files with drag-and-drop, browse, type/size validation,
  progress, error, remove, and replace states
- Browser-side text extraction for PDF, DOCX, TXT, and PNG/JPG OCR
- Source-grounded missions that keep exact excerpts as internal provenance,
  use only learner-confirmed structured course details, never join unrelated
  files, and safely fall back when uploaded text is weak or conversational
- Time-tiered workloads using all available daily minutes: two focused steps
  for short sessions, three for medium sessions, and four for long sessions
- Estimated mission durations that become real countdowns only after explicitly
  starting a mission-linked Focus session
- Post-completion difficulty/confidence feedback that updates bounded mastery and
  deterministic spaced review without awarding XP
- Continue, replace, or skip handling for unfinished older missions; replacement
  and mission adjustments preserve the original reward opportunity
- Evidence relevance, vocabulary-diversity, repetition, action/result, URL, and
  one-time-XP validation
- Levels, current and longest streak, missed missions, history, and weekly pace
- Non-destructive migration from `statquest.state.v1` and the older standalone
  goal/mission keys
- Animated academic grid/glow background with reduced-motion support and
  explicit WCAG AA text/state color checks
- 149 automated business-rule, Focus, upload, profile, contrast, migration, character,
  and world-interaction tests

## Honest security boundary

This remains a single-device local MVP. Its browser-local profile is **not
secure authentication**. Data is stored in localStorage and should not contain
private documents or sensitive evidence.

Reference files are processed in the browser. The raw file is not retained;
only its metadata and up to 50,000 extracted characters are stored with the
goal. Image OCR may download its English recognition model on first use but
does not upload the selected image to a StatQuest server. Image-only PDFs may
not yield text; upload scanned pages as PNG/JPG or provide a text-based PDF.

Supabase Auth, cloud persistence, server-side atomic XP awards, and two-user
row-level-security tests are the next production milestone. Never expose a
Supabase service-role key in browser code.

## Install on Windows

```powershell
cd C:\statquest
npm.cmd install
npm.cmd run dev
```

Open <http://localhost:3000>.

When replacing an older source folder, keep a copy of the old folder and do not
clear browser storage. This release reads the existing state and writes a new
`statquest.state.v2` snapshot without deleting the version 1 or standalone
legacy keys. Saved profiles are indexed under `statquest.localProfiles.v1` and
stored separately so starting a new profile does not overwrite an older one.

## Verify

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Expected result for this release:

- 149 tests pass
- ESLint exits successfully
- Next.js production build succeeds

## Product flow

1. Create or return to one local profile, provide a learning stage and
   career/study interest, and optionally provide a birth year.
2. Choose Focus or Adventure. Focus is selected by default. Adventure opens
   character setup only when it has not been completed.
3. In Focus, start the existing 25/5 or 50/10 timer to enter Focus Room. It can
   be minimized and reopened from the floating timer without resetting the
   timestamp-derived session. Optional YouTube audio is loaded only after a
   supported URL is validated, and its player remains mounted while minimized.
4. Create any active goals. Deadlines are optional. Optionally connect up to five PDF, DOCX, TXT,
   PNG, or JPG references (10 MB each) and wait for each to show **Ready**.
5. Review, edit, confirm, or remove extracted course details before saving;
   only confirmed details can influence adaptive planning.
6. Generate the recommended mission for review, or generate up to five active
   missions across different goals. A goal can generate another after its
   current mission is completed.
7. Select a generated mission and choose **Study mission** to open Focus on the
   exact next incomplete step. An already-active recommendation can resume its
   unfinished step directly.
   Timer expiry waits for **Complete step** or **Need another focus block**.
8. Submit at least 80 characters and 12 meaningful words of relevant evidence,
   including mission-specific ideas and a concrete action/result.
9. Add completion feedback to update mastery and the next review date; feedback
   itself awards no XP.
10. Earn each eligible mission's XP once. The first five missions created for a
   local mission date are reward-eligible. Separately, the first six rewarded
   Focus periods completed for active goals each earn 5 XP per local day.
   No-goal Focus records analytics and streak activity at 0 XP and does not use
   one of those six slots.
11. Switch modes at any time without creating separate learning data.
12. When the active outcome is achieved, choose **Finish goal**.
13. Log out to switch profiles, create another saved local profile, or delete a
   selected profile after explicit confirmation.

## Core files

- `src/lib/goals.ts`: active-goal creation, identity-preserving edits, and
  expected-goal completion
- `src/lib/mission-generator.ts`: deterministic daily mission generation
- `src/lib/adaptive-learning.ts`: deterministic topic ranking and learner-facing reasons
- `src/lib/learning-map.ts`: topic normalization, mastery, and spaced review
- `src/lib/course-context.ts`: structured course-detail extraction and confirmation state
- `src/lib/reference-files.ts`: upload validation and browser-side extraction
- `src/lib/progress.ts`: evidence, XP, level, streak, and missed-day rules
- `src/lib/progression-visuals.ts`: deterministic visual-only streak and level
  tiers
- `src/lib/study-analytics.ts`: local Monday-through-Sunday Focus and mission
  summaries
- `src/lib/youtube.ts`: supported-URL parsing and controlled privacy embed URLs
- `src/lib/storage.ts`: state persistence, v1/legacy migration, hero defaults,
  and local session
- `src/components/focus/`: Focus topbar and Focus Room presentation components
- `src/components/game/`: reusable world scenery, animated characters,
  customization, accessible speech, onboarding, and entry transition
- `src/app/page.tsx`: optimized interface orchestration
- `tests/`: goal, mission, reference, contrast, progress, storage, migration,
  and logout invariants
- `docs/PRODUCTION_UPGRADE.md`: next Supabase milestone
- `docs/OPTIMIZED_RELEASE.md`: changes and verified release status
