# StatQuest redesign — October 23, 2026

## User experience goals

Improve clarity, usability, readability, interaction targets, accessibility, and visual consistency without splitting Focus and Adventure or changing the saved learning data format.

### Research-led decisions
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): normal text contrast, visible keyboard focus, 200% text resizing, and touch target spacing.
- [Nielsen Norman Group: Forms](https://www.nngroup.com/articles/web-form-design/): eliminate fields users do not need before they can complete their task.
- [Nielsen Norman Group: Microcopy](https://www.nngroup.com/articles/3-cs-microcopy/): clarity first, then concision and character.

### Release changes

1. Birth year is optional in Adventure as it was already in Focus; provided years must still be valid. Data remains a number or null. The user's career field, learner stage, goals, missions, local saves and both presentation modes are preserved.
2. Homepage introduces substantive, accurate product features (focus sessions, progress and reviews, two shared-state views) instead of repeating the same goal slogan.
3. Homepage has a theme control that uses the app's existing localStorage key. Added a complete set of dark theme surfaces.
4. A shared polish stylesheet makes small labels, controls and keyboard focus more legible across Focus, Adventure, onboarding and Focus Room while retaining existing layouts.
5. Regression coverage expands to birth-year validation, marketing copy, theme controls and design tokens. Added a Chromium/axe browser workflow that captures desktop/mobile screenshots, checks horizontal overflow, route health, dark mode and critical accessibility defects.

### Validation requirements

Baseline commit `b5b58c1` passed TypeScript, ESLint, unit tests and production build.
- Both GitHub workflows must pass on the PR.
- Vercel preview must successfully serve `/` and `/app`.
- Inspect browser screenshots and axe report before declaring visual quality.
- Check saved profile and mission migrations on existing data; this release does not alter stored shape.
- Do not claim a Lighthouse 90+ score without running Lighthouse and measuring Core Web Vitals. The 90+ visual goal is an editorial target, not an automated test score.

## Follow-up design debt

The large legacy globals.css needs incremental reduction with browser snapshots. Many generated or adaptive product states still require full manual visual review. Any change to age rules beyond making the year optional would be a separate product-policy decision.
