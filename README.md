# StatQuest

![CI](https://github.com/thanhtungnguyen-dev/statquest/actions/workflows/ci.yml/badge.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-blue)
![Tests](https://img.shields.io/badge/tests-149%20passing-success)

An AI-powered statistics learning platform that helps students build statistical intuition through personalized missions, interactive practice, and adaptive learning workflows.

StatQuest transforms traditional studying into a structured learning experience by combining goal-based planning, progress tracking, focused study sessions, and evidence-based review.

---

# Demo

## Learning Dashboard

![Dashboard](docs/screenshots/dashboard.png)

The dashboard provides a central learning workspace containing:

- active learning goals
- recommended missions
- progress tracking
- focus session access
- learning statistics

---

## Personalized Mission Generation

![Mission Generation](docs/screenshots/mission-generation.png)

StatQuest converts learning goals into structured learning missions.

Each mission includes:

- recommended learning tasks
- estimated completion time
- difficulty level
- XP rewards
- reasoning behind recommendations

The goal is to answer:

> "What should I study next, and why?"

---

## Mission Execution

![Mission Details](docs/screenshots/mission-details.png)

Each mission breaks learning into actionable steps:

- define the main idea
- inspect concrete examples
- complete guided practice
- verify understanding independently

This encourages active learning instead of passive content consumption.

---

## Focus Mode

![Focus Mode](docs/screenshots/focus-mode.png)

Focus Mode provides a distraction-free learning environment with:

- active learning task
- timer-based sessions
- progress tracking
- reward system
- focus companion

---

# Overview

Many students struggle with statistics not because of mathematical difficulty, but because they lack:

- a clear learning path
- feedback on weak areas
- consistent review habits
- practice connected to real understanding

StatQuest addresses this by creating a personalized learning system that adapts to:

- learning goals
- uploaded study materials
- progress history
- review needs
- completion evidence

The platform helps learners build a consistent loop:

```
Goal
 |
Mission Generation
 |
Focused Learning
 |
Progress Tracking
 |
Improved Recommendations
```

---

# Features

## Personalized Learning Missions

StatQuest generates structured missions based on:

- current goals
- topic mastery
- review schedule
- upcoming assessments
- available study time

Mission types include:

- learning new concepts
- reviewing weak areas
- practicing previously learned topics
- reinforcing successful skills

---

## Focus Learning Mode

A dedicated environment designed for deep work.

Features:

- focused study sessions
- timer-based learning
- progress tracking
- completion evidence
- streak tracking

The system separates:

- time spent studying
- cognitive difficulty
- learning progress

to avoid rewarding superficial activity.

---

## Learning Progress System

StatQuest tracks:

- completed missions
- mastery level
- review timing
- learning streaks
- XP progression

The system uses deterministic rules to make learning recommendations consistent and explainable.

---

## Document Understanding

Students can provide learning materials such as:

- PDFs
- documents
- notes

The system extracts useful information and connects it with learning goals.

Supported processing:

- PDF extraction
- DOCX parsing
- OCR-based text recognition

---

## Local-First Architecture

The current version focuses on privacy and simplicity.

User data is stored locally, allowing:

- offline-friendly usage
- no required account
- fast interaction

Future versions can migrate to a full production backend.

---

# Tech Stack

## Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS

## Data & Logic

- Local persistence
- Deterministic learning engine
- State migration system

## File Processing

- PDF.js
- Mammoth
- Tesseract.js

## Quality

- ESLint
- Node test runner
- GitHub Actions CI

---

# Architecture

Current MVP architecture:

```
User
 |
Next.js Application
 |
Learning Engine
 |
Local Storage
 |
File Processing
```

Future production architecture:

```
Client
 |
Next.js API Layer
 |
Application Services
 |
PostgreSQL Database
 |
Background Workers
 |
Analytics Pipeline
```

More details:

- `docs/architecture/overview.md`

---

# Engineering Highlights

## Deterministic Learning Engine

Instead of generating random recommendations, StatQuest uses rule-based decision making for:

- mission priority
- review scheduling
- mastery updates
- XP calculation

This improves:

- predictability
- debugging
- testing reliability

---

## Testing Strategy

The project contains automated tests covering:

- mission generation
- learning progression
- review scheduling
- file processing
- state migration
- Focus Mode behavior
- profile management

Current status:

```
149 tests passed
0 failed
```

---

## Continuous Integration

Every pull request runs:

```
Install dependencies
        |
Type checking
        |
Linting
        |
Automated tests
        |
Production build
```

This prevents broken code from reaching the main branch.

---

# Getting Started

## Requirements

- Node.js 22+
- npm

---

## Installation

Clone the repository:

```bash
git clone https://github.com/thanhtungnguyen-dev/statquest.git

cd statquest
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Available Commands

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Lint:

```bash
npm run lint
```

Type checking:

```bash
npm run typecheck
```

Tests:

```bash
npm test
```

---

# Roadmap

## Completed

- Personalized mission system
- Focus learning mode
- Progress tracking
- File processing
- Learning state migration
- Automated testing
- CI pipeline
- Product documentation

## Future Improvements

- User authentication
- Cloud synchronization
- PostgreSQL backend
- AI tutoring assistant
- Advanced learning analytics
- Collaborative learning features

---

# Security

Current version is a local-first MVP.

Security considerations:

- No sensitive information should be stored locally
- File processing is performed locally
- Authentication is not implemented yet

Future versions will introduce:

- secure authentication
- server-side validation
- database access control
- encrypted user data storage

---

# Author

Thanh Tung Nguyen

Computer Science Student

Interested in:

- Software Engineering
- Artificial Intelligence
- Learning Technologies

---

# License

This project is for educational and portfolio purposes.