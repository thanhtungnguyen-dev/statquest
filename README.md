# StatQuest

StatQuest is a study planning web app that turns long-term learning goals into smaller daily missions.

I built it to help students decide what to study next, track progress, and review weaker topics over time.

Live demo: https://statquest-azure.vercel.app

---

## Features

- Create multiple learning goals
- Generate `learn`, `practice`, `review`, and `apply` missions
- Track topic mastery and review dates
- Focus Mode with 25/5 and 50/10 timers
- Mission-linked Focus Room
- XP, levels, streaks, and weekly study activity
- Multiple local learner profiles
- Focus and Adventure modes using the same study data
- Upload PDF, DOCX, TXT, PNG, and JPG reference files
- Browser-side PDF/DOCX text extraction and image OCR
- Light and Dark mode
- Local state migration from older versions
- Automated tests for core application behavior

---

## How It Works

A user creates a learning goal, for example:

```text
Learn database systems
```

StatQuest keeps track of topics related to that goal and generates smaller missions.

Example:

```text
Goal
  ↓
Learn relational algebra
  ↓
Practice joins
  ↓
Review normalization
  ↓
Apply concepts in exercises
```

After completing a mission, the user gives difficulty and confidence feedback.

That feedback updates the topic mastery and helps decide when the topic should be reviewed again.

---

## Mission Types

StatQuest currently uses four mission types:

```text
LEARN
PRACTICE
REVIEW
APPLY
```

Mission selection can depend on:

- topic mastery
- next review date
- recent work
- confirmed assessment timing
- available study time
- learner feedback

The mission system is deterministic, so it is based on stored learning state rather than random task generation.

---

## Focus Mode

Focus Mode is the main study interface.

It includes:

- 25/5 timer
- 50/10 timer
- full-screen Focus Room
- minimize and reopen without resetting the timer
- mission step tracking
- optional YouTube audio
- XP and streak tracking
- weekly study analytics

---

## Adventure Mode

Adventure Mode is an optional game-style interface built on top of the same learning data.

Users can choose:

```text
Classes:
- Warrior
- Mage
- Explorer

Companions:
- Owl
- Fox
- Cat
```

The user can also customize character colors and accessories.

Focus and Adventure share:

```text
Goals
Missions
XP
Streaks
History
Reviews
```

---

## Reference Files

Users can attach course material to a learning goal.

Supported formats:

```text
PDF
DOCX
TXT
PNG
JPG
```

StatQuest can:

- validate uploaded files
- extract text from PDFs
- extract text from DOCX files
- read TXT files
- perform OCR on images
- let the user review extracted course information

Reference processing currently happens in the browser.

The raw file is not uploaded to a StatQuest server.

---

## Study Progress

StatQuest tracks:

- XP
- level
- current streak
- longest streak
- completed missions
- missed missions
- Focus sessions
- weekly activity
- topic mastery
- spaced review dates

A mission can only award its XP once.

---

## Tech Stack

```text
Next.js
React
TypeScript
pdfjs-dist
mammoth
Tesseract.js
ESLint
Node.js Test Runner
Vercel
```

---

## Current Architecture

The current version is a local-first MVP.

```text
Browser
  │
  ├── Next.js / React
  │
  ├── Learning logic
  │
  ├── File processing
  │
  └── localStorage
```

User data is currently stored in browser `localStorage`.

That means the same profile is not automatically available on another device yet.

---

## Current Limitation

The app currently shows:

```text
Local only · not synced.
```

This means:

```text
Laptop browser
      ↓
localStorage
```

and another device has separate data.

The next major update is to add account login and cloud sync.

---

## Planned Sync Version

The planned setup is:

```text
Laptop
   \
Phone ----> StatQuest ----> Supabase Auth
   /                         ↓
PC                       PostgreSQL
```

Planned work:

- user authentication
- cloud database
- synced profiles
- synced goals and missions
- row-level security
- server-side XP updates
- local-to-cloud migration
- multi-device support

---

## Project Structure

Some of the main files:

```text
src/lib/goals.ts
src/lib/mission-generator.ts
src/lib/adaptive-learning.ts
src/lib/learning-map.ts
src/lib/course-context.ts
src/lib/reference-files.ts
src/lib/progress.ts
src/lib/study-analytics.ts
src/lib/storage.ts
src/lib/youtube.ts
```

Main UI:

```text
src/app/page.tsx
```

Focus components:

```text
src/components/focus/
```

Adventure components:

```text
src/components/game/
```

Tests:

```text
tests/
```

---

## Local Development

Clone the repository:

```bash
git clone https://github.com/thanhtungnguyen-dev/statquest.git
```

Move into the project:

```bash
cd statquest
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Testing

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

The current version includes 149 automated tests covering things like:

- goals
- mission generation
- progress rules
- Focus behavior
- profile storage
- file uploads
- migration
- character customization
- Adventure interactions

---

## Local Storage

The current MVP stores data locally in the browser.

This includes:

```text
Profiles
Goals
Missions
XP
Streaks
Learning progress
Character customization
Study history
```

The project also supports migration from older local state formats.

---

## Security Note

The current local profile system is not secure authentication.

Because data is stored in browser `localStorage`, users should not store sensitive information or private documents in the current version.

Reference files are processed locally in the browser.

---

## Roadmap

### Current

- [x] Multiple learning goals
- [x] Adaptive missions
- [x] Focus Mode
- [x] Adventure Mode
- [x] XP and streaks
- [x] Topic mastery
- [x] Spaced review
- [x] Reference file processing
- [x] OCR
- [x] Weekly analytics
- [x] Automated tests
- [x] Vercel deployment

### Next

- [ ] Supabase authentication
- [ ] PostgreSQL storage
- [ ] Multi-device sync
- [ ] Row-level security
- [ ] Server-side XP updates
- [ ] Cloud profile migration

### Later

- [ ] Better study analytics
- [ ] Background file processing
- [ ] Caching
- [ ] Rate limiting
- [ ] More backend work
- [ ] Better mobile support

---

## Deployment

StatQuest is deployed on Vercel.

```text
Local code
   ↓
Git
   ↓
GitHub
   ↓
Vercel
   ↓
Live website
```

Live demo:

https://statquest-azure.vercel.app

---

## Author

Tung Nguyen

Computer Science student interested in software engineering, backend systems, distributed systems, and cloud computing.

GitHub:

https://github.com/thanhtungnguyen-dev
