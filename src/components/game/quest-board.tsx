"use client";

import type { DailyMission, LearningGoal } from "@/lib/types";
import styles from "./quest-board.module.css";

type WeeklyActivity = {
  completedFocusPeriods: number;
  completedFocusMinutes: number;
  completedMissions: number;
  uniqueStudyDays: number;
  weekStart: string;
  weekEnd: string;
};

type QuestBoardProps = {
  goals: LearningGoal[];
  missions: DailyMission[];
  featuredMission: DailyMission | null;
  weekly: WeeklyActivity;
  onOpenFocus: () => void;
};

function displayWeek(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed);
}

function clampMastery(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

export function QuestBoard({ goals, missions, featuredMission, weekly, onOpenFocus }: QuestBoardProps) {
  const active = (featuredMission?.status === "active" ? featuredMission : null)
    ?? missions.find((mission) => mission.status === "active") ?? null;
  const latestCompleted = missions
    .filter((mission) => mission.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0] ?? null;
  const current = active ?? latestCompleted;
  const steps = current?.steps ?? [];
  const doneSteps = steps.filter((step) => step.completed).length;
  const skills = goals
    .flatMap((goal) => goal.learningTopics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      subject: goal.subject,
      mastery: clampMastery(topic.mastery),
    })))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  return (
    <section className={styles.board} aria-label="Adventure study quest board">
      <header className={styles.weekHeader}>
        <div className={styles.weekTitle}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>YOUR STUDY WEEK</span>
          <strong>{displayWeek(weekly.weekStart)} – {displayWeek(weekly.weekEnd)}</strong>
        </div>
        <span className={styles.weekNote}>Real progress, one mission at a time</span>
      </header>

      <div className={styles.layout}>
        <section className={styles.pathPanel} aria-labelledby="quest-path-title">
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.kicker}>MISSION PATH</span>
              <h2 id="quest-path-title">Your next quest</h2>
            </div>
            <span className={styles.pathCount}>
              {current ? `${doneSteps} / ${steps.length} steps` : "Ready to begin"}
            </span>
          </div>

          {current ? (
            <>
              <div className={styles.missionHighlight}>
                <span className={styles.missionSymbol} aria-hidden="true">✦</span>
                <div>
                  <span className={styles.kicker}>{current.status === "completed" ? "RECENTLY COMPLETED" : "ACTIVE MISSION"}</span>
                  <h3>{current.title}</h3>
                  <p>{current.subject}</p>
                </div>
                <span className={styles.xp}>{current.xpAwarded ? "Completed" : `${current.xp} XP`}</span>
              </div>
              <ol className={styles.questPath} aria-label="Actual mission steps">
                {steps.map((step, index) => (
                  <li className={step.completed ? styles.stepComplete : styles.stepPending} key={step.id}>
                    <span className={styles.stepMarker} aria-hidden="true">{step.completed ? "✓" : index + 1}</span>
                    <div className={styles.stepContent}>
                      <strong>{step.title}</strong>
                      <span>{step.completed ? "Complete" : `${step.minutes} min estimated`}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <button className={styles.primaryAction} type="button" onClick={onOpenFocus}>
                {current.status === "active" ? "Continue in Focus" : "Plan your next mission"}
                <span aria-hidden="true">↗</span>
              </button>
            </>
          ) : (
            <div className={styles.startState}>
              <div className={styles.startEmblem} aria-hidden="true">✦</div>
              <h3>{goals.length ? "A new quest is ready to plan" : "Your first quest starts here"}</h3>
              <p>{goals.length
                ? "You have a learning goal. Generate a mission in Focus to get a clear sequence of study steps."
                : "Add a learning goal in Focus, then generate your first mission. Your actual completed steps will appear here."}</p>
              <button className={styles.primaryAction} type="button" onClick={onOpenFocus}>
                {goals.length ? "Generate a mission" : "Create your first goal"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}

          <div className={styles.planFooter}>
            <span className={styles.kicker}>ACTIVE GOALS</span>
            <div className={styles.goalPills}>
              {goals.length > 0
                ? goals.slice(0, 4).map((goal) => <span key={goal.id}>{goal.subject}</span>)
                : <span>Goals will appear here as you add them</span>}
            </div>
          </div>
        </section>

        <aside className={styles.side} aria-label="Weekly achievements and skill progress">
          <section className={styles.statsPanel} aria-labelledby="weekly-achievements-title">
            <div className={styles.sideHeader}>
              <h2 id="weekly-achievements-title">Weekly achievements</h2>
              <span aria-hidden="true">↗</span>
            </div>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">✦</span>
                <strong>{weekly.completedMissions}</strong>
                <span>Missions finished</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">◷</span>
                <strong>{weekly.completedFocusPeriods}</strong>
                <span>Focus sessions</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">◈</span>
                <strong>{weekly.uniqueStudyDays}<small> / 7</small></strong>
                <span>Study days</span>
              </div>
            </div>
            <div className={styles.minuteNote}>
              <span>Focused time this week</span>
              <strong>{weekly.completedFocusMinutes} min</strong>
            </div>
          </section>

          <section className={styles.skillsPanel} aria-labelledby="target-skills-title">
            <div className={styles.sideHeader}>
              <h2 id="target-skills-title">Skill progress</h2>
              <span className={styles.skillCount}>{skills.length} shown</span>
            </div>
            {skills.length ? (
              <div className={styles.skillGrid}>
                {skills.map((skill) => (
                  <article key={skill.id} className={styles.skill}>
                    <div className={styles.skillRing} role="progressbar" aria-label={`${skill.title} mastery`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={skill.mastery} style={{ background: `conic-gradient(#67e2d4 ${skill.mastery}%, #263950 0)` }}>
                      <span>{skill.mastery}%</span>
                    </div>
                    <strong title={skill.title}>{skill.title}</strong>
                    <small title={skill.subject}>{skill.subject}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.skillEmpty}>Skill mastery appears here once your learning goals have topics to track.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
