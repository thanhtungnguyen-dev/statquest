# StatQuest application UI refresh — screenshot-inspired

## Visual references

- **Quest-map reference:** connected daily quest steps, weekly activity and skills in a dark game UI.
- **Dashboard reference:** concise progress rings, goal cards and visible next actions.

Reference pictures were supplied by the user as visual inspiration. Neither screenshot is embedded in the site.

## Implemented

1. Replaced the underdeveloped Adventure status and mission area with a real quest board. Its path is made from mission steps, with completed states, labels and a direct action back into Focus.
2. Added weekly achievements using the app's own completed missions, focus periods, study days, and focused minutes. No fictional rewards or challenges.
3. Added topic mastery rings, derived from each active learning goal's actual topics. In empty states, the interface explains how to start.
4. Added a Focus mastery overview and mobile Goals / Missions / Progress shortcuts.
5. Clarified goal-form input labels and review empty-state copy.

## Data and safety

Existing missions, progress, XP, timers, saved profiles, localStorage keys and learning rules are unchanged. The changes are presentational and read existing derived application state.

## Verification required before release

- TypeScript, lint, automated tests and production build on the feature branch.
- Chromium preview on the same branch, including 360px mobile, 1365px desktop, zero browser exceptions and no horizontal overflow.
- Manual review of populated Adventure mission paths and large-data layouts. Current Playwright smoke coverage mainly exercises initial Focus onboarding.

The visual references do not establish performance metrics, user outcomes or a numeric quality certification.
