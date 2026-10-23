"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./welcome.module.css";

type IntroPhase = "checking" | "opening" | "question" | "exit" | "done";

const INTRO_KEY = "statquest.welcome.intro.seen.v1";

const struggles = [
  {
    heading: "don't know where to start?",
    label: "I don't know where to start",
    mission: {
      lead: "Make progress",
      accent: "on Python.",
      description: "Start with one concrete lesson.",
      first: "Review lists & loops",
      next: "Solve one small problem",
      last: "Reflect on what you learned",
    },
  },
  {
    heading: "can't stay consistent?",
    label: "I keep losing momentum",
    mission: {
      lead: "Build a habit",
      accent: "one session at a time.",
      description: "Pick up where you left off.",
      first: "Revisit your last notes",
      next: "Complete a 25-minute focus session",
      last: "Write down your next step",
    },
  },
  {
    heading: "feel overwhelmed?",
    label: "There's just too much to do",
    mission: {
      lead: "Focus on",
      accent: "one priority.",
      description: "A clear action beats an endless to-do list.",
      first: "Choose your most useful task",
      next: "Work on one small section",
      last: "Plan tomorrow's first step",
    },
  },
] as const;

export default function WelcomePage() {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [struggle, setStruggle] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const skipRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLAnchorElement>(null);
  const introPresentedRef = useRef(false);
  const currentMission = struggles[struggle].mission;

  // Read the theme already used by the learning application.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    try {
      localStorage.setItem("statquest.theme.v1", next);
    } catch {
      // The current page can still switch themes without storage.
    }
  };

  // Play a short optional intro once per browser, not once per tab.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_KEY) === "1";
    } catch {
      // Storage can be unavailable in private mode.
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      setPhase(seen || reducedMotion ? "done" : "opening");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const next: Partial<Record<IntroPhase, [IntroPhase, number]>> = {
      opening: ["question", 600],
      question: ["exit", 650],
      exit: ["done", 350],
    };
    const transition = next[phase];
    if (!transition) return;
    const timeout = window.setTimeout(() => setPhase(transition[0]), transition[1]);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // The landing works without storage access.
    }
    if (introPresentedRef.current) {
      startRef.current?.focus({ preventScroll: true });
      introPresentedRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "checking" || phase === "done") return;
    introPresentedRef.current = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhase("done");
      if (event.key === "Tab") {
        event.preventDefault();
        skipRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [phase]);

  const replayIntro = () => {
    setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "opening");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className={styles.landing} data-intro={phase}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <div className={styles.pageContent}>
        <header className={styles.nav}>
          <Link className={styles.wordmark} href="/" aria-label="StatQuest welcome">
            <Image src="/branding/statquest-symbol-light.png" width={42} height={42} alt="" />
            <span>StatQuest<span className={styles.wordmarkDot}>.</span></span>
          </Link>
          <nav className={styles.navLinks} aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <button type="button" className={styles.themeToggle} onClick={toggleTheme} aria-label={theme === "dark" ? "Use light appearance" : "Use dark appearance"} aria-pressed={theme === "dark"}>{theme === "dark" ? "Light" : "Dark"} mode</button>
            <Link className={styles.navAction} href="/app">Open StatQuest <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>

        <main>
          <section className={styles.hero} aria-labelledby="welcome-heading">
            <div className={styles.heroText}>
              <span className={styles.eyebrow}><span className={styles.eyebrowSpark}>✦</span> TURN GOALS INTO STUDY SESSIONS</span>
              <h1 id="welcome-heading" className={styles.heading} aria-live="polite">
                Have goals,<br />
                but <span className={styles.highlight} key={struggle}>{struggles[struggle].heading}</span>
              </h1>
              <p className={styles.heroLead}>
                You know what you want to learn. Figuring out what to do next is harder.
                StatQuest turns your goal into a focused mission you can start <strong>today.</strong>
              </p>
              <div className={styles.heroButtons}>
                <Link ref={startRef} className={styles.primaryButton} href="/app">Start your quest <span aria-hidden="true">↗</span></Link>
                <a className={styles.secondaryButton} href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
              </div>
              <div className={styles.questions} role="group" aria-label="Choose what you are struggling with">
                <span>Sound familiar?</span>
                <div className={styles.questionButtons}>
                  {struggles.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`${styles.questionChip} ${struggle === index ? styles.questionChipActive : ""}`}
                      aria-pressed={struggle === index}
                      onClick={() => setStruggle(index)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.previewArea}>
              <div className={styles.orbitOne} aria-hidden="true" />
              <div className={styles.orbitTwo} aria-hidden="true" />
              <article className={styles.previewCard} aria-label="Example of a StatQuest daily mission">
                <div className={styles.previewTopline}>
                  <span className={styles.demoPill}><span className={styles.greenDot} /> EXAMPLE MISSION</span>
                  <span className={styles.previewNumber}>3 STEPS</span>
                </div>
                <p className={styles.previewKicker}>TODAY&apos;S NEXT STEP</p>
                <h2 aria-live="polite">{currentMission.lead}<br /><span>{currentMission.accent}</span></h2>
                <p className={styles.previewSub}>{currentMission.description}</p>
                <div className={styles.taskList}>
                  <div className={styles.taskDone}><span className={styles.taskCheck} aria-hidden="true">✓</span><span>{currentMission.first}</span><small>Done</small></div>
                  <div className={styles.taskCurrent}><span className={styles.taskIndex}>02</span><span>{currentMission.next}</span><small>Next</small></div>
                  <div className={styles.taskPending}><span className={styles.taskIndex}>03</span><span>{currentMission.last}</span></div>
                </div>
                <div className={styles.previewProgress}>
                  <div className={styles.progressLabels}><strong>Your progress</strong><span>1 of 3 steps</span></div>
                  <div className={styles.progressTrack} role="progressbar" aria-label="Example mission progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={1}><span /></div>
                </div>
                <div className={styles.previewFooter}><span className={styles.focusIcon} aria-hidden="true">◷</span><span>Focus on one step</span><strong>25 min</strong></div>
              </article>
              <span className={styles.decorStar} aria-hidden="true">✳</span>
            </div>
          </section>

          <section id="how-it-works" className={styles.howItWorks} aria-labelledby="how-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>HOW STATQUEST WORKS</span>
              <h2 id="how-heading">A plan for <em>your next study session.</em></h2>
              <p>Turn your goal into focused work you can finish.</p>
            </div>
            <div className={styles.steps}>
              <article className={styles.step}><span className={styles.stepNumber}>01</span><div className={styles.stepIcon}>◎</div><h3>Set a goal</h3><p>Tell StatQuest what you want to learn or achieve.</p></article>
              <article className={styles.step}><span className={styles.stepNumber}>02</span><div className={styles.stepIcon}>▤</div><h3>Get daily missions</h3><p>Get specific tasks based on your goal and study progress.</p></article>
              <article className={styles.step}><span className={styles.stepNumber}>03</span><div className={styles.stepIcon}>↗</div><h3>Focus. Track. Repeat.</h3><p>Use a focus timer, record work, and see what to review next.</p></article>
            </div>
          </section>

          <section id="features" className={styles.features} aria-labelledby="features-heading">
            <div className={styles.featureIntro}>
              <div>
                <span className={styles.sectionEyebrow}>BUILT FOR REAL STUDY</span>
                <h2 id="features-heading">More than a to-do list.</h2>
              </div>
              <p>Planning matters when it leads to learning. StatQuest helps you do the work, not just organize it.</p>
            </div>
            <div className={styles.featureGrid}>
              <article className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">◷</span>
                <h3>Make time to focus</h3>
                <p>Work through one mission with a focus timer. Stop rearranging the plan and start studying.</p>
                <span className={styles.featureTag}>FOCUS SESSIONS</span>
              </article>
              <article className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">↺</span>
                <h3>Know what to revisit</h3>
                <p>See completed work, track progress, and return to topics that need another pass.</p>
                <span className={styles.featureTag}>PROGRESS &amp; REVIEW</span>
              </article>
              <article className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">◇</span>
                <h3>Learn your way</h3>
                <p>Use a clear Focus workspace or optional Adventure view. Both share the same progress.</p>
                <span className={styles.featureTag}>TWO VIEWS, ONE PROFILE</span>
              </article>
            </div>
            <p className={styles.privacyNote}><strong>Your study progress stays in this browser.</strong> No account is required. Clearing browser data can erase saved progress.</p>
          </section>

          <section className={styles.closing}>
            <span className={styles.sectionEyebrow}>YOUR NEXT STEP STARTS HERE</span>
            <h2>Less time planning.<br /><em>More time learning.</em></h2>
            <Link className={styles.primaryButton} href="/app">Start your quest <span aria-hidden="true">↗</span></Link>
            <p>No sign-up required · Saved locally in your browser</p>
          </section>
        </main>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} StatQuest · Made for learners who want to make progress.</span>
          <button type="button" className={styles.replay} onClick={replayIntro}>↺ Replay intro</button>
        </footer>
      </div>

      {phase !== "done" && (
        <div className={styles.intro} data-phase={phase} role={phase === "checking" ? undefined : "dialog"} aria-modal={phase === "checking" ? undefined : true} aria-label="StatQuest introduction">
          <div className={styles.introTop}>
            <span>STATQUEST <span aria-hidden="true">✦</span></span>
            <button ref={skipRef} type="button" onClick={() => setPhase("done")} className={styles.skipIntro}>Skip intro <span aria-hidden="true">↗</span></button>
          </div>
          <div className={styles.introCenter} aria-live="polite">
            {phase === "opening" ? <h2>Have goals,<br /><em>but...</em></h2> : <h2>Where do you<br /><em>start?</em></h2>}
          </div>
          <div className={styles.introBottom}>GOAL <span>✦</span> MISSION <span>✦</span> FOCUS</div>
        </div>
      )}
    </div>
  );
}
