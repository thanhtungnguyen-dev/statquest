---
version: alpha
name: StatQuest
description: A calm learning navigation system with a focused academic core and an expressive Adventure mode.
colors:
  compass-indigo: "#5965e8"
  compass-indigo-hover: "#4854d7"
  compass-indigo-dark: "#6875f5"
  mastery-mint: "#1fbd88"
  mastery-mint-dark: "#39d69d"
  study-paper: "#f4f7fc"
  study-surface: "rgba(255, 255, 255, 0.91)"
  study-surface-soft: "rgba(248, 250, 255, 0.84)"
  study-border: "rgba(112, 132, 167, 0.24)"
  ink-text: "#172033"
  muted-text: "#5b687d"
  deep-focus-navy: "#0b1220"
  deep-focus-surface: "rgba(18, 29, 48, 0.96)"
  deep-focus-soft: "rgba(27, 42, 66, 0.94)"
  dark-border: "#425571"
  dark-text: "#f4f7fc"
  success-text: "#137653"
  reward-amber: "#cc8100"
  streak-coral: "#c85b23"
  danger: "#cf405b"
  adventure-parchment: "#ead0a2"
  adventure-parchment-light: "#fff8e8"
  adventure-stone: "#74675d"
  adventure-ink: "#32261d"
  adventure-green: "#365e3d"
typography:
  entry-display:
    fontFamily: "Segoe UI Variable Display, Aptos Display, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "60px"
    fontWeight: 760
    lineHeight: 0.98
    letterSpacing: "-0.058em"
  focus-headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "27px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  entry-body:
    fontFamily: "Segoe UI Variable Text, Aptos, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  body-compact:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.1em"
  adventure-display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "68px"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  adventure-label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 950
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  adventure-control: "4px"
  adventure-card: "6px"
  control-sm: "9px"
  input: "11px"
  control: "13px"
  panel: "20px"
  surface: "26px"
  entry: "32px"
  full: "999px"
spacing:
  micro: "3px"
  xs: "7px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  2xl: "34px"
  3xl: "42px"
components:
  brand-mark:
    backgroundColor: "{colors.compass-indigo}"
    textColor: "{colors.dark-text}"
    rounded: "14px"
    size: "44px"
  button-primary:
    backgroundColor: "{colors.compass-indigo}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.compass-indigo-hover}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.study-surface-soft}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "48px"
  input-light:
    backgroundColor: "{colors.study-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.input}"
    padding: "10px 12px"
    height: "44px"
  focus-panel:
    backgroundColor: "{colors.study-surface}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.panel}"
    padding: "16px"
  status-chip:
    backgroundColor: "{colors.study-surface-soft}"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.full}"
    padding: "5px 9px"
  adventure-button:
    backgroundColor: "#a97646"
    textColor: "{colors.adventure-ink}"
    rounded: "{rounded.adventure-control}"
    padding: "12px 18px"
    height: "48px"
  adventure-choice-card:
    backgroundColor: "{colors.adventure-parchment-light}"
    textColor: "{colors.adventure-ink}"
    rounded: "{rounded.adventure-card}"
    padding: "12px"
---

# Design System: StatQuest

## Overview

**Creative North Star: "The Learning Compass"**

StatQuest is a clear learning navigation system: every surface should help the learner understand what matters now, what to do next, and why that action is useful. The secondary influence, **The Guided Study Desk**, keeps that navigation calm, focused, structured, and academically credible. The result is modern and quietly motivating without becoming sterile or corporate.

Focus is the primary expression: refined, purpose-driven productivity UI with restrained gamification. Adventure is a deliberately more tactile, illustrated, storybook-like expression of the same product. Shared brand marks, color logic, hierarchy, task clarity, and accessibility keep the modes coherent even when Adventure uses stronger framing, character art, and playful interaction.

**Key Characteristics:**

- Clear next-action hierarchy before decoration or reward.
- Compass Indigo leads navigation and primary action; Mastery Mint confirms learning progress.
- Calm academic density with deliberate whitespace and compact supporting data.
- Layered surfaces that remain connected to the page instead of appearing as unrelated floating cards.
- Restrained personality in Focus and expressive, accessible storybook character in Adventure.

**The One State, Two Expressions Rule.** Focus and Adventure may differ substantially in material and playfulness, but they must preserve the same StatQuest identity, hierarchy, and learning-state semantics.

## Colors

The core palette combines cool academic neutrals with a single navigational accent and one selective mastery accent. Adventure adds parchment, stone, and warm wood tones without changing the semantic meaning of Indigo, Mint, success, warning, or danger.

### Primary

- **Compass Indigo:** The main product accent for primary actions, selected navigation, active progress, focus rings, and the SQ brand mark. Its visual priority should be unmistakable.
- **Compass Indigo Hover:** A deeper interaction state for hover and active emphasis in Light mode.
- **Night Compass Indigo:** The slightly brighter Dark-mode form of the primary accent, chosen to remain visible against Deep Focus Navy.

### Secondary

- **Mastery Mint:** A selective accent for mastery, completed progress, positive study states, upload readiness, and Guardian details.
- **Night Mastery Mint:** The higher-luminance Dark-mode success and progress form.

### Tertiary

- **Reward Amber:** Reward values and earned-XP emphasis only.
- **Streak Coral:** Streak state and flame progression only.
- **Signal Red:** Destructive actions, validation errors, and danger states only.

### Neutral

- **Study Paper:** The Light-mode page foundation.
- **Study Surface / Study Surface Soft:** Translucent Light-mode layers for primary and supporting surfaces.
- **Study Border:** Cool gray-indigo structure for Light-mode divisions and controls.
- **Ink Text / Muted Text:** Primary reading color and supporting-copy color in Light mode.
- **Deep Focus Navy:** The Dark-mode page foundation.
- **Deep Focus Surface / Deep Focus Soft:** Near-navy Dark-mode content layers.
- **Dark Border / Dark Text:** Dark-mode structure and readable foreground text.

### Adventure

- **Quest Parchment / Quest Parchment Light:** Warm paper surfaces for panels, forms, and selection cards.
- **Weathered Stone:** Thick structural frames and inset geometry.
- **Story Ink:** Primary Adventure text and icon color.
- **Quest Grove:** Selection, success, and interaction emphasis that relates back to Mastery Mint without competing with Compass Indigo globally.

**The Indigo Leads Rule.** Indigo is the product's navigation and action voice. Mint supports mastery and positive learning state; it must not become a competing general-purpose primary color.

**The Functional Accent Rule.** Do not add another major accent unless it has a durable semantic role that Indigo, Mint, reward, streak, information, or danger cannot express.

## Typography

Focus uses contemporary system sans-serif typography for fast scanning and reliable rendering. Entry surfaces use Segoe UI Variable Display/Text with Aptos fallbacks for a slightly warmer, editorial welcome; the compact dashboard uses Inter and system fallbacks. Adventure keeps the same readable sans-serif body but introduces Georgia for storybook display moments.

### Hierarchy

- **Entry Display** (760, `clamp(42px, 4.5vw, 60px)`, 0.98): Welcome and orientation headlines with tightly controlled negative tracking.
- **Focus Headline** (700, `clamp(20px, 1.7vw, 27px)`, 1.08): Dense dashboard panel and mission headings.
- **Body** (400, 16px, 1.6): General explanatory content with generous reading rhythm.
- **Entry Body** (400, 15px, 1.65): Calm onboarding and return-flow explanation.
- **Compact Body** (400, 12px, 1.4): Supporting dashboard copy, metadata, and compact controls.
- **Label** (800, 11px, 0.1em): Short uppercase navigation, state, and section labels.
- **Adventure Display** (700, `clamp(38px, 6vw, 68px)`, 0.98): Storybook titles only.
- **Adventure Label** (950, 11px, 0.12em): Framed quest labels and compact RPG metadata.

**The Reading Before Reward Rule.** Mission objectives, instructions, and evidence criteria receive stronger size and contrast than XP, streak, difficulty, or decorative game metadata.

## Layout

Focus uses a fixed-max-width responsive grid. The page background carries a subtle 42px academic grid and restrained Indigo, sky, and Mint ambient gradients. New Profile uses an asymmetric two-column orientation/setup composition up to 1160px; Welcome Back uses a continuity-first composition up to 1040px. The dashboard expands to 1500px and divides into approximately 22% goals, 53% mission work, and 25% review/context, with 10px gutters.

Spacing follows a compact 3/7/10/14/18/24/34/42px rhythm. Related controls group tightly; task boundaries receive larger gaps. Desktop surfaces are intentionally information-rich, while mobile breakpoints at 760px and below collapse to one column, promote primary actions to full width, and convert side rails into horizontal integrated regions. Smaller Focus navigation adjustments occur near 720px and 430px.

Adventure uses a centered-to-left framed panel up to 900px over the illustrated world. Character setup uses three-column class and companion selectors on wide screens, then collapses through 860px and 580px breakpoints. Adventure can use more breathing room around art, but form labels and actions remain scan-friendly.

**The Next Action Owns the View Rule.** The current mission, recommendation, or primary setup action receives the largest uninterrupted region; supporting stats and game state must not fracture it into excessive cards.

## Elevation & Depth

StatQuest is **layered, not floating**. Focus establishes depth with tonal separation, thin cool borders, restrained ambient shadows, and occasional translucent surfaces that preserve the page context. Shadows support hierarchy and interaction; they do not turn every region into an independent floating card. Dark mode uses neutral navy-black layering rather than bright blue slabs.

Adventure uses structural depth: thick stone and wood borders, hard offset shadows, inset highlights, framed legends, and visible pressed states. Its depth should feel tactile and constructed, not like Focus glass with a parchment tint.

### Shadow Vocabulary

- **Focus Panel:** `0 18px 48px rgba(49, 67, 102, 0.085), inset 0 1px rgba(255, 255, 255, 0.88)` for major Light-mode dashboard surfaces.
- **Entry Continuity:** `0 22px 54px color-mix(in srgb, var(--primary) 12%, transparent), inset 0 1px color-mix(in srgb, white 38%, transparent)` for the principal resume/recommendation surface.
- **Entry Glass:** `0 24px 70px rgba(49, 67, 102, 0.13), inset 0 1px rgba(255, 255, 255, 0.52)` for the outer Light-mode entry panel.
- **Adventure Frame:** `0 0 0 3px #342e2a, 0 0 0 8px #a89a8e, 0 22px 50px rgba(49, 36, 27, 0.35)` plus restrained inset highlights for primary parchment panels.
- **Adventure Pressed Control:** A 6px hard vertical offset at rest, rising to 8px on hover and compressing to 2px when active.

**The Layered, Not Floating Rule.** Use borders, tonal change, and one purposeful shadow to establish hierarchy. Do not stack ambient shadows around every nested container.

## Shapes

Focus uses controlled softness: 9–13px radii for controls, 20px for dashboard panels, 26px for important composite surfaces, and 32px for the outer entry card. Fully rounded geometry is reserved for compact chips, toggles, progress tracks, and account controls. Thin 1px borders provide most structure.

Adventure is more architectural. Controls use 4–6px corners, panels use 7–8px corners with 3–8px borders, and labels use asymmetric `3px 10px 3px 10px` corners. Circular selection marks and color swatches remain secondary accents. Pixel-art imagery preserves hard pixels through `image-rendering: pixelated`.

**The Mode-True Shape Rule.** Focus surfaces are softly modern and restrained; Adventure surfaces are framed and tactile. Do not mix chunky stone borders into Focus or generic rounded glass cards into Adventure.

## Components

### Brand Mark

- **Shape:** A compact 40–44px square with a 12–14px radius and dense `SQ` lettering.
- **Color:** Compass Indigo in Focus and entry surfaces; selective level-tier borders may add bronze, silver, gold, or aura treatment without changing the mark's base identity.
- **Behavior:** Brand buttons use a small lift and restrained Indigo-tinted surface on hover, with a clear focus-visible state.

### Buttons

- **Primary:** One unmistakable Compass Indigo action, normally 48px high with 13px corners and 12px 18px padding. Light mode may use the established restrained Indigo gradient and a single ambient shadow.
- **Hover / Active:** Hover lifts by 1px with a slightly stronger shadow; active compresses by 1px and approximately 1.5% scale. Reduced-motion removes transforms.
- **Secondary:** Light translucent surface, cool border, and Ink Text in Light mode; transparent or tonal navy surface in Dark mode. It must remain visibly subordinate to the primary action.
- **Danger:** Signal Red text and border with only a low-opacity red surface; deletion remains inside explicit profile options.
- **Adventure Primary:** Warm wood gradient, 4px corner, thick dark border, inset highlight, and hard vertical offset. Secondary and danger variants retain the same tactile construction.

### Chips

- **Style:** Fully rounded, compact, thin-bordered, and text-led. Chips carry status, counts, pace, theme choice, or account state; they do not become decorative badges.
- **Selected State:** Compass Indigo fill or Indigo-tinted surface with explicit text contrast and visible focus treatment.

### Cards / Containers

- **Focus Panels:** 20px corners, 16px padding, one border, a tonal/translucent surface, and restrained depth. Nested supporting regions should prefer dividers or tonal shifts over another full card.
- **Entry Continuity Surface:** One 26px composite container joins mission/recommendation content and Guardian instead of presenting them as unrelated cards.
- **Adventure Panels:** Quest Parchment surfaces inside Weathered Stone frames with inset highlights and hard offset shadows.
- **Adventure Choice Cards:** 6px corners, 3px borders, warm paper fill, explicit selected green state, and visible keyboard outline.

### Inputs / Fields

- **Focus:** 11–13px corners, cool border, readable opaque-enough surface, and 10–15px internal padding. Focus uses Compass Indigo border plus a 3px low-opacity ring. Placeholder text remains explicit and readable rather than opacity-only.
- **Adventure:** 4px corners, 4px brown border, warm paper fill, inset parchment edge, and green focus ring. Error states use a strong red border and semantic message.

### Navigation

- **Focus Topbar:** A compact layered bar with the brand at left, level/XP/streak in the center, and theme/account actions at right. Mobile reduces the grid without hiding essential controls.
- **Active State:** Compass Indigo identifies selected theme, account, mission, and progress state. Muted labels become full-contrast on hover and focus.
- **Adventure Navigation:** Remains embedded in framed panels and world interactions rather than adopting the Focus topbar wholesale.

### Progress and Learning State

- **Progress:** Thin tracks and compact step segments use Compass Indigo for current state and Mastery Mint for completed state.
- **Rewards:** Reward Amber and Streak Coral are confined to XP and streak information. They never color the primary learning action.
- **Guardian:** Character art may cross into Focus as a quiet supportive figure, but structural RPG chrome remains inside Adventure.

### Motion

- **Focus:** 150–350ms transitions with restrained lift, fade, clip, or progress movement. Entry surfaces use a calm cubic-bezier curve; theme changes use a short directional wipe.
- **Adventure:** Idle character movement, blinking, dialogue reactions, and pressed controls may be more expressive while remaining bounded and purposeful.
- **Reduced Motion:** All ambient, character, aura, and entry motion must respect `prefers-reduced-motion` and retain complete usability when disabled.

## Do's and Don'ts

### Do:

- **Do** make the next useful learning action the clearest element on the screen.
- **Do** use Compass Indigo for navigation and primary action, and Mastery Mint selectively for mastery, progress, positive study state, and Guardian details.
- **Do** preserve a calm academic hierarchy with readable contrast, purposeful spacing, and WCAG AA interaction states.
- **Do** use dividers, tonal layers, and integrated regions before adding another nested card.
- **Do** let Adventure become tactile and playful while preserving shared StatQuest semantics, brand, and accessibility.
- **Do** keep decorative motion lightweight, bounded, and removable through reduced-motion preferences.

### Don't:

- **Don't** make Focus resemble noisy edtech, casino-style gamification, or a generic AI SaaS dashboard.
- **Don't** use excessive glass effects, milky blur, floating-card stacks, or decorative elements without functional purpose.
- **Don't** introduce a new major accent color without a durable functional role.
- **Don't** allow XP, streaks, levels, companions, or game language to outrank learning clarity and productivity.
- **Don't** use childish structural visuals outside Adventure; a restrained Guardian is the intentional exception.
- **Don't** flatten Adventure into generic modern cards or import its chunky frames into Focus.
- **Don't** sacrifice warmth and personality for sterile corporate minimalism.
