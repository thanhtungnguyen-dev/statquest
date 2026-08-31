# StatQuest agent instructions

Read **CODEX_HANDOFF.md** when it is provided with the project and read
**README.md** before changing this repository.

## Working contract

- The user owns product ideas and final product decisions.
- The coding agent owns implementation, architecture, debugging, tests, and
  safe migration.
- Teach important programming logic while building, without turning product
  work into unrelated exercises.
- Prefer working features over speculative documentation.
- Preserve all existing browser data and migration paths unless the user
  explicitly authorizes a breaking reset.
- Never describe the local profile as secure authentication.
- Never expose secrets or a Supabase service-role key in browser code.
- Do not award XP from untrusted client logic in production.

## Required checks

For every behavior change:

1. Add or update an automated test.
2. Run `npm.cmd test` on Windows or `npm test` elsewhere.
3. Run lint and a production build when dependencies are available.
4. Keep README and production-upgrade documentation consistent with reality.
5. Report what was verified and any check that could not be run.

## Current product boundary

The repository contains a complete single-device Learning MVP. It supports
multiple simultaneously active goals and up to five active missions. Supabase authentication,
cross-device sync, atomic server-side XP, two-user RLS verification, additional
stats, public leaderboards, AI mission generation, and production evidence
verification remain later milestones.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
