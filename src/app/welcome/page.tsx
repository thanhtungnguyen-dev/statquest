"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./welcome.module.css";

type IntroPhase = "checking" | "opening" | "question" | "exit" | "done";

const INTRO_KEY = "statquest.welcome.intro.seen.v1";

const struggles = [
  { heading: "don't know where to start?", label: "I don't know where to start" },
  { heading: "can't stay consistent?", label: "I keep losing momentum" },
  { heading: "feel overwhelmed?", label: "There's just too much to do" },
] as const;

export default function WelcomePage() {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  const [struggle, setStruggle] = useState(0);
  const skipRef = useRef<HTMLButtonElement>(null);

  // Play the short opening only once per browser tab. Never block reduced-motion users.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
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
      opening: ["question", 1150],
      question: ["exit", 1350],
      exit: ["done", 580],
    };
    const transition = next[phase];
    if (!transition) return;
    const timeout = window.setTimeout(() => setPhase(transition[0]), transition[1]);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // The landing works without session storage.
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "checking" || phase === "done") return;
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
            <Image src="/branding/statquest-symbol-light.png" width={42} height={42} alt="" unoptimized />
            <span>StatQuest<span className={styles.wordmarkDot}>.</span></span>
          </Link>
          <nav className={styles.navLinks} aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <Link className={styles.navAction} href="/app">Open StatQuest <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>

        <main>
          <section className={styles.hero} aria-labelledby="welcome-heading">
            <div className={styles.heroText}>
              <span className={styles.eyebrow}><span className={styles.eyebrowSpark}>✦</span> SMALL STEPS. REAL PROGRESS.</span>
              <h1 id="welcome-heading" className={styles.heading}>
                Have goals,<br />
                but <span className={styles.highlight} key={struggle}>{struggles[struggle].heading}</span>
              </h1>
              <p className={styles.heroLead}>
                Big goals don&apos;t need a perfect plan. They need a first step.
                StatQuest turns what you want to achieve into something you can do <strong>today.</strong>
              </p>
              <div className={styles.heroButtons}>
                <Link className={styles.primaryButton} href="/app">Start your quest <span aria-hidden="true">↗</span></Link>
                <a className={styles.secondaryButton} href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
              </div>
              <div className={styles.questions} aria-label="Choose what you are struggling with">
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

            <div className={styles.previewArea} aria-label="Example of a StatQuest daily mission">
              <div className={styles.orbitOne} aria-hidden="true" />
              <div className={styles.orbitTwo} aria-hidden="true" />
              <div className={styles.previewCard}>
                <div className={styles.previewTopline}>
                  <span className={styles.demoPill}><span className={styles.greenDot} /> EXAMPLE MISSION</span>
                  <span className={styles.previewNumber}>01 / 03</span>
                </div>
                <p className={styles.previewKicker}>TODAY&apos;S NEXT STEP</p>
                <h2>Make progress<br /><span>on Python.</span></h2>
                <p className={styles.previewSub}>A little progress beats a perfect plan.</p>
                <div className={styles.taskList}>
                  <div className={styles.taskDone}><span className={styles.taskCheck}>✓</span><span>Review lists &amp; loops</span><small>Done</small></div>
                  <div className={styles.taskCurrent}><span className={styles.taskIndex}>02</span><span>Solve one small problem</span><small>Next</small></div>
                  <div className={styles.taskPending}><span className={styles.taskIndex}>03</span><span>Reflect on what you learned</span></div>
                </div>
                <div className={styles.previewProgress}>
                  <div className={styles.progressLabels}><strong>Your progress</strong><span>1 of 3 steps</span></div>
                  <div className={styles.progressTrack}><span /></div>
                </div>
                <div className={styles.previewFooter}><span className={styles.focusIcon}>◷</span><span>Focus on one step</span><strong>25 min</strong></div>
              </div>
              <div className={styles.floatNote}><span className={styles.noteStar}>✦</span> One step closer.</div>
              <span className={styles.decorStar} aria-hidden="true">✳</span>
            </div>
          </section>

          <section id="how-it-works" className={styles.howItWorks} aria-labelledby="how-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionEyebrow}>THE SIMPLE PART</span>
              <h2 id="how-heading">From <em>“someday”</em> to <em>“done today.”</em></h2>
              <p>No complicated system. Just a clearer next step.</p>
            </div>
            <div className={styles.steps}>
              <article className={styles.step}><span className={styles.stepNumber}>01</span><div className={styles.stepIcon}>◎</div><h3>Set a goal</h3><p>Tell StatQuest what you want to learn or achieve.</p></article>
              <article className={styles.step}><span className={styles.stepNumber}>02</span><div className={styles.stepIcon}>▤</div><h3>Get daily missions</h3><p>Break your bigger goal into actionable study steps.</p></article>
              <article className={styles.step}><span className={styles.stepNumber}>03</span><div className={styles.stepIcon}>↗</div><h3>Focus. Track. Repeat.</h3><p>Stay on track with focus sessions and visible progress.</p></article>
            </div>
          </section>

          <section className={styles.closing}>
            <span className={styles.sectionEyebrow}>YOUR NEXT STEP STARTS HERE</span>
            <h2>You bring the goal.<br /><em>We&apos;ll help with the next step.</em></h2>
            <Link className={styles.primaryButton} href="/app">Start your quest <span aria-hidden="true">↗</span></Link>
            <p>Free to get started · No account required · Progress saved on this device</p>
          </section>
        </main>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} StatQuest. Make the next step count.</span>
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
          <div className={styles.introBottom}>LESS OVERTHINKING. MORE DOING. <span>✦</span> ONE STEP AT A TIME.</div>
        </div>
      )}
    </div>
  );
}
