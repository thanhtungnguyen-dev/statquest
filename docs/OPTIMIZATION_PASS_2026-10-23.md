# StatQuest performance and UX optimization — October 23, 2026

## Baseline
Production main commit `d471950` passed TypeScript, ESLint, unit tests and the production build before optimization.

## Changes
- Timed intro shortened from 3.08s to 1.60s and shown only once per browser rather than once per tab, with replay, skip, reduced-motion support, and restored focus on the start action.
- Companion and accessory assets now use responsive `next/image` sources, dimension hints and conditional lazy/eager loading rather than always transferring full PNG/JPG originals.
- Logo icons served via the Next.js optimizer. Working DOM-based Light/Dark switching remains.
- Removed unused `StatQuestMark` component and stacked CSS rules for legacy logo patches; retained current `StatQuestLogo`.
- Repaired 7px mobile Focus labels, smaller landing supporting text, narrow-screen heading wrapping, and removed an unnecessary floating slogan.
- Added regression tests for these decisions.

## Release validation
Branch CI must pass `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; verify Vercel preview URLs for `/` and `/app` before merge. These checks are not a substitute for browser-based 320px/200% zoom QA or measured Core Web Vitals and image transfer sizes. Some UI CSS still has compact text; do not claim complete WCAG certification.

Guidance: https://nextjs.org/docs/app/api-reference/components/image ; https://web.dev/articles/optimize-lcp ; https://www.w3.org/TR/WCAG22/
