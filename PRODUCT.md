# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

StatQuest is primarily for university students who need help deciding what to study next and turning course requirements into concrete daily work. It also serves self-directed learners pursuing academic or career goals. The product is not restricted by age.

## Product Purpose

StatQuest turns a learner's goals and course context into specific adaptive daily missions, then guides the learner through focused work, evidence submission, feedback, mastery tracking, and spaced review. Success means the learner can identify the right next task, complete meaningful work, and build durable progress rather than merely making study plans.

## Positioning

StatQuest's differentiator is its learning-decision loop: it decides what the learner should work on next from their goal, current progress, and learner-confirmed course material, then converts that decision into a concrete, actionable mission. Gamification supports this loop but is not the product's primary value.

## Operating Context

- Learners create and maintain academic or career-oriented goals, including several unfinished goals at once.
- Learners can connect course materials such as syllabi, assignments, lecture notes, rubrics, practice sheets, and screenshots to a goal.
- Learners review and confirm extracted course details before those details influence mission planning.
- Daily work moves through a recurring loop of mission selection, Focus, evidence, feedback, mastery updates, and spaced review.
- Focus and Adventure are two presentation modes over the same learner profile, goals, missions, XP, streak, history, and review state.

## Capabilities and Constraints

- The current product is a verified single-device Learning MVP using browser-local profiles and localStorage.
- Local profiles are explicitly local-only and are not secure authentication. Supabase authentication, cloud persistence, atomic server-side XP awards, and verified multi-user row-level security remain a future milestone.
- Existing local data, saved-profile isolation, legacy snapshots, and migration paths must be preserved unless the user explicitly authorizes a breaking reset.
- Learners may keep any number of unfinished goals active, with at most one active mission per goal and five active missions per profile.
- Missions may use PDF, DOCX, TXT, PNG, and JPG reference content only after useful details are extracted and confirmed by the learner.
- Source-grounded missions must remain faithful to learner-confirmed course material. Raw excerpts, filenames, calculated age, internal guidance, and other provenance remain internal rather than leaking into learner-facing mission copy.
- Weak, failed, or insufficient extraction must produce an honest fallback or request for more context rather than invented course content.
- Mission completion, XP, goal completion, and persistence behavior must remain idempotent and data-preserving. Production XP must eventually be derived and awarded atomically by trusted server logic.
- Focus and Adventure must continue to share one learning state rather than becoming separate products or progress systems.
- Gamification must remain supportive and restrained. XP, streaks, levels, companions, and Adventure presentation must not override learning clarity or productivity.

## Brand Commitments

- The product name is **StatQuest**.
- Product language should be direct, encouraging, academically credible, and honest about technical and security boundaries.
- Focus is the default productivity-oriented experience; Adventure is an optional RPG-inspired presentation over the same learning system.
- Claims must not describe a local profile as secure authentication or imply that unimplemented cloud, security, or verification capabilities already exist.

## Evidence on Hand

- The repository contains a working Next.js implementation of the local learning loop, profile flows, Focus and Adventure modes, goal references, mission generation, evidence validation, progression, history, review, and migrations.
- Automated tests cover core business rules, persistence and migrations, accessibility contrast, responsive entry and Focus behavior, reference processing, mission context, and progression invariants.
- Existing product and release evidence is documented in `README.md`, `CODEX_HANDOFF.md`, `docs/OPTIMIZED_RELEASE.md`, and `docs/PRODUCTION_UPGRADE.md`.
- Existing player, companion, and accessory artwork is stored under `public/`.
- No verified testimonials, customer logos, institutional endorsements, public usage metrics, pricing, or production security claims are currently available and future work must not fabricate them.

## Product Principles

1. **Choose the next useful action.** Reduce planning ambiguity by converting current learning context into specific work.
2. **Ground guidance in learner-confirmed truth.** Use uploaded materials carefully, preserve provenance internally, and never invent course content.
3. **Make progress meaningful.** Reward completed, relevant learning evidence rather than superficial interaction.
4. **Preserve learner continuity.** Protect existing data, migrations, history, and shared state across modes and future infrastructure upgrades.
5. **Keep motivation subordinate to learning.** Use game elements to support focus and consistency without obscuring academic clarity.

## Accessibility & Inclusion

StatQuest targets WCAG AA contrast and accessible interaction across Light and Dark themes, desktop and mobile layouts, keyboard use, focus states, reduced-motion preferences, form validation, and status messaging. The learning experience should adapt to a learner's level and context without imposing an age restriction or exposing inferred age in mission content.
