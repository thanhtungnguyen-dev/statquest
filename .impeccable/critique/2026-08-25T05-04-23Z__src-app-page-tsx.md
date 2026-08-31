---
target: Main Focus dashboard only
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-25T05-04-23Z
slug: src-app-page-tsx
---
Method: dual-agent (A: /root/entry_layout_assessment · B: /root/entry_detector_review)

## Design Health Score

| Heuristic | Score | Evidence |
|---|---:|---|
| Visibility of system status | 3/4 | Mission counts, selection, reasons, step completion, and evidence readiness are explicit; a recommendation can still coexist with “No active missions.” |
| Match with the learner’s world | 3/4 | Mission language is academically credible; “Keep the loop honest” and reward-cap framing feel system-centered. |
| User control and freedom | 3/4 | Edit, finish, replace, skip, adjust, abandon, and cancel paths are present; no broad undo path is visible. |
| Consistency and standards | 2/4 | Level/XP/Streak are repeated, while Generate, Study now, Study mission, and Start Focus overlap conceptually. |
| Error prevention | 3/4 | Capacity constraints and evidence readiness are good; disabled generation rationale depends on a title tooltip. |
| Recognition rather than recall | 3/4 | Reasons and context are visible, but separated columns and scroll regions make learners carry mission/timer context. |
| Flexibility and efficiency | 1/4 | Native keyboard interaction exists, but there is no fast path for returning learners or power users. |
| Aesthetic and minimalist design | 2/4 | The center is larger, but three major panels, nested cards, and the omnibus Progress rail create dashboard noise. |
| Error recovery | 3/4 | Local errors and old-mission recovery paths are generally actionable. |
| Help and documentation | 2/4 | Inline hints and “Why this?” are useful; task-focused guidance is fragmented across surfaces. |
| **Total** | **25/40** | **Acceptable foundation; significant hierarchy and density work remains.** |

## Design Specificity Verdict

**Moderately product-specific, structurally generic — 2.5/4.** StatQuest’s recommendation reasons, learning map, mission steps, evidence criteria, and review language are distinctive. The page topology remains a familiar three-panel SaaS dashboard: management on the left, work in the middle, and an analytics/settings rail on the right. The learning-decision loop exists in the content but does not yet control the composition.

The deterministic scan returned `[]` with zero findings. That is a syntax-pattern result, not evidence that the experience is visually resolved. Live browser overlays and screenshots were unavailable because the in-app browser backend reported no sessions, so visual conclusions below are source-derived and called out as such.

## Overall Impression

The selected mission is the product’s strongest surface: it explains the objective, why the mission matters, concrete steps, timing, evidence, and completion criteria with academic credibility. Around it, however, goal administration, four start/generate paths, reward summaries, timer setup, mood logging, feedback, review, and history compete for attention. The page currently says “here is everything about your learning system” more strongly than “this is what matters now.”

## What’s Working

- **Mission content earns trust.** Objective, reasons, steps, per-step time, evidence, and completion criteria outrank decorative rewards inside the mission detail.
- **Recommendation transparency is product-specific.** “Why this mission” exposes the learning decision rather than presenting opaque automation.
- **The foundation is usable.** Native controls, headings, selected-state semantics, progress labeling, error locality, responsive breakpoints, and Focus Room isolation provide a solid base for a hierarchy redesign.

## Priority Issues

### [P1] The next useful learning action does not own the first read

**What is wrong:** Desktop gives Goals, Missions, and Progress three equally framed major surfaces, even though Missions is wider. Goals is the first DOM region and the only `h1`. At the mobile breakpoint, the DOM simply becomes Goals → Missions → Progress, so a learner reaches goal management before the recommendation/current mission.

**Why it matters:** StatQuest’s promise is to decide what matters now. The current first read asks the learner to scan a management panel and progress chrome before they can trust that decision. On mobile, the useful action is structurally buried, not merely visually understated.

**Recommended direction:** Make the recommended/current mission the first semantic and visual region at every viewport. Give it the dominant heading and largest uninterrupted region. On desktop, reduce Goals to roughly 16–20%, expand mission work toward 60–65%, and make the right region conditional. On mobile, use mission-first DOM order, followed by a compact goal switcher and then secondary progress/review. Preserve DOM and visual order rather than using CSS `order`. Raise mobile theme, account, goal, mission, and timer targets to at least 44px.

**Suggested command:** `$impeccable layout Main Focus dashboard`

### [P1] The workflow has four competing action models

**What is wrong:** Goal cards expose **Generate**, the recommendation exposes **Study now**, active detail exposes **Study mission/Resume unfinished step**, and the Progress rail exposes **Start Focus**. When a recommendation exists without an active mission, it can appear directly above “No active missions.” Timer setup is physically separated from the mission it is meant to support.

**Why it matters:** The learner must infer the difference between choosing recommended work, generating a mission, starting the mission, and starting a timer. The recommendation/empty-state pairing is technically accurate but feels contradictory. Separating timing from the mission also increases working-memory load.

**Recommended direction:** Create one state-aware next-action module with one primary CTA. Treat recommendation-without-active-mission as “ready to start,” not an empty state. Keep Generate as a contextual goal action, not a competing primary. Place timer entry beside the selected/recommended mission and label it as a supporting execution tool; preserve current FocusSession behavior.

**Suggested command:** `$impeccable clarify Main Focus dashboard`

### [P1] Progress is a second dashboard inside the dashboard

**What is wrong:** Level, XP, and Streak appear in the topbar and again in Progress. The rail then adds Completed, today’s reward cap, weekly analytics, completion feedback, timer controls, four mood choices, mission review, latest review, and history. Static inspection counts 14 bordered nested regions inside this outer panel.

**Why it matters:** The nominally supporting 25% rail becomes the densest decision surface. It duplicates rewards while compressing feedback and review, both of which are more important to the learning loop. The page also mixes status, execution, reflection, and history without a dominant purpose.

**Recommended direction:** Keep Level/XP/Streak in the topbar only. Recast the rail as a conditional **Today** context: pending feedback first when present, active timer state second, and one compact review prompt third. Put weekly analytics and history behind progressive disclosure. Use one coherent scroll model instead of fixed blocks above a separate review scroller.

**Suggested command:** `$impeccable distill Main Focus dashboard`

### [P2] The Goals column behaves like an admin console

**What is wrong:** Every goal card surfaces Generate/Edit/Finish at equal proximity, and **+ Add Goal** spans the full column as another primary button even after goals exist. Goal details, learning maps, creation, editing, file upload, and mission generation all live in the same rail.

**Why it matters:** Frequent learning selection and infrequent goal administration receive similar weight. With multiple courses, the learner must repeatedly decide whether StatQuest’s recommendation or a per-goal Generate button is authoritative. A full-width primary Add Goal also competes with studying.

**Recommended direction:** Make the default column a compact goal switcher/list with subject, immediate status, and small progress cue. Move Edit/Finish into a contextual menu or disclosure, make Add Goal a compact secondary action after the first goal exists, and open the existing full form only on demand. Do not hide the current active-goal state.

**Suggested command:** `$impeccable distill Main Focus dashboard`

### [P2] Surface and color treatment flatten the hierarchy

**What is wrong:** Three blurred gradient panels contain further translucent goal cards, selector cards, a mission card, step cards, evidence/completion cards, review cards, tiles, and disclosures. The Progress-rail Start Focus button overrides Compass Indigo with an animated purple/blue/green/amber/magenta gradient.

**Why it matters:** Repeated borders, radii, shadows, glass, and accent colors make unrelated blocks feel equally important. This conflicts with “layered, not floating,” the Indigo Leads rule, and restrained Focus gamification. The mission workspace should be visually calmer and more authoritative than its support chrome.

**Recommended direction:** Reserve the purposeful shadow and strongest tonal contrast for the mission workspace. Use dividers and quiet tonal bands inside Goals and Today/Progress instead of nested cards. Return every primary learning action to stable Compass Indigo; reserve Mint for completion/mastery, Amber for reward, and Coral for streak. Reduced-motion should not leave a six-hue primary button behind.

**Suggested command:** `$impeccable quieter Main Focus dashboard`

## Cognitive Load

**Seven of eight checks fail.** Macro grouping is understandable, but single focus, visual hierarchy, one-thing-at-a-time flow, minimal choices, working-memory support, progressive disclosure, and efficient chunking all need work. A learner can simultaneously plan goals, generate missions, choose a recommendation, start a mission, start a timer, log mood, provide feedback, review a week, and inspect history. That is far beyond the four-or-fewer meaningful choices expected in a focused work surface.

## Persona Red Flags

- **Alex, impatient power user:** Multiple equivalent start paths prevent a sub-60-second open-and-begin rhythm; no shortcut or compact returning-user route is visible.
- **Sam, accessibility-dependent:** Native semantics are a strength, but the only `h1` announces goal management. Independent desktop scroll regions fragment reading, disabled-generation rationale relies on `title`, and several mobile controls are 25–38px.
- **Casey, distracted mobile learner:** Stats and Goals precede the mission. The long tail then expands through timer, mood, review, latest review, and history, making one-handed interrupted use difficult.
- **Maya, multi-course university learner:** Every course presents Generate/Edit/Finish while the center presents a recommendation. She must decide which action is authoritative, and truncated course labels can weaken scanning.

## Minor Observations

- The `0 / 5` count emphasizes system capacity more than today’s plan.
- Long goal subjects are single-line ellipsized with no visible recovery.
- At ≤1100px, Progress becomes a full-width third row, making the page substantially longer.
- The desktop fixed-height shell uses independent Goals, Mission, and Review scrollers; this protects viewport fit but fragments the learning sequence.
- The mobile breakpoint removes internal scrolling correctly, but it preserves the wrong content priority.

## Three Highest-Impact Changes

1. **Rebuild around a mission-first DOM and composition:** current/recommended work first at every viewport, compact Goals second, conditional support third.
2. **Unify the study-start pathway:** one state-aware primary CTA, no recommendation/empty contradiction, and timer entry integrated with the mission.
3. **Turn Progress into a contextual Today rail:** remove duplicate stats, progressively disclose analytics/history, and flatten the surfaces with strict Indigo/Mint/reward semantics.
