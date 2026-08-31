# Production account upgrade

The local MVP deliberately separates product-rule validation from storage. The
mission and progress functions can stay unchanged when browser storage is
replaced with Supabase.

## Required external setup

1. Create a Supabase project.
2. Run **supabase/schema.sql** in the Supabase SQL Editor.
3. Install the official client packages:

   ~~~powershell
   npm.cmd install @supabase/supabase-js @supabase/ssr
   ~~~

4. Create **.env.local**:

   ~~~text
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ~~~

5. Add email/password or OAuth screens.
6. Add a repository interface with both the existing localStorage adapter and
   an authenticated Supabase adapter. Do not remove the local migration path.
7. Import version 2, version 1, and standalone legacy data through an
   idempotent, previewed, one-time import after login.
8. Move mission completion into a database transaction or server function so
   clients cannot award themselves XP.
9. Model goals as active, completed, or archived. Do not impose a per-user
   active-goal limit.
10. Deploy only after testing row-level security with two separate users and a
    concurrent duplicate-completion race.

## Non-negotiable production rules

- Never expose the Supabase service-role key in browser code.
- Every table must keep row-level security enabled.
- XP and streak updates must be performed server-side and atomically.
- XP must be derived from the stored mission, never from a browser-supplied
  number.
- Replace the starter mission uniqueness rule with an ordinal mission identity
  for `(user_id, goal_id, mission_date, ordinal)`, plus constraints for no more
  than one active mission per goal, five active missions per user, and five
  reward-eligible missions per local mission date. Later missions for that date
  must be 0-XP practice.
- Add birth year, explicit learning stage, and career/study interest to the
  authenticated profile model with suitable validation and privacy controls.
- Store `preferred_mode` and Adventure customization on the same authenticated
  profile. Focus and Adventure must continue to share one set of goals,
  missions, XP, streaks, history, and reviews.
- Keep learner context and source provenance internal. Do not expose calculated
  age, generator instructions, filenames, or raw source excerpts in normal
  learner-facing mission copy.
- Completing a goal must target the expected goal ID and leave every other goal
  unchanged in the same database transaction.
- Local data must remain recoverable until the user confirms a successful
  import.
- Evidence links should be scanned or restricted before public sharing.
- Account pausing, leaderboards, and social features should be added only after
  authentication and abuse controls are working.
