"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Character, type CharacterReaction } from "@/components/game/character";
import { formatMissionCountdown } from "@/lib/mission-timer";
import type { FocusSession, HeroCustomization } from "@/lib/types";
import {
  parseYouTubeVideoId,
  youtubePrivacyEmbedUrl,
} from "@/lib/youtube";

type FocusRoomProps = {
  open: boolean;
  session: FocusSession;
  remainingMilliseconds: number;
  goalSubject: string | null;
  currentTask: string | null;
  hero: HeroCustomization;
  rewardAvailable: boolean;
  onMinimize: () => void;
  onStop: () => void;
  onComplete: () => void;
  onNeedAnotherBlock: () => void;
  onStartBreak: () => void;
  onSkipBreak: () => void;
};

export function FocusRoom({
  open,
  session,
  remainingMilliseconds,
  goalSubject,
  currentTask,
  hero,
  rewardAvailable,
  onMinimize,
  onStop,
  onComplete,
  onNeedAnotherBlock,
  onStartBreak,
  onSkipBreak,
}: FocusRoomProps) {
  const roomRef = useRef<HTMLElement>(null);
  const [audioMode, setAudioMode] = useState<"none" | "youtube">("none");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState("");

  useEffect(() => {
    if (open) roomRef.current?.focus({ preventScroll: true });
  }, [open]);

  const isBreak = session.phase === "break";
  const isReadyToComplete = session.status === "ready-to-complete";
  const isBreakOffer =
    session.phase === "focus" &&
    session.status === "completed" &&
    session.completedAt !== null;
  const durationMinutes = isBreak ? session.breakMinutes : session.focusMinutes;
  const durationMilliseconds = durationMinutes * 60_000;
  const progressPercent = Math.max(
    0,
    Math.min(
      100,
      ((durationMilliseconds - remainingMilliseconds) / durationMilliseconds) * 100,
    ),
  );

  let guardianReaction: CharacterReaction = "idle";
  let guardianMessage = "One task at a time.";
  if (isBreak) {
    guardianReaction = "happy";
    guardianMessage = "Break time. Rest your eyes.";
  } else if (isReadyToComplete || isBreakOffer) {
    guardianReaction = "celebrating";
    guardianMessage = "Focus complete.";
  } else if (remainingMilliseconds <= 60_000) {
    guardianReaction = "concerned";
    guardianMessage = "Almost there.";
  }

  const loadYouTube = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const videoId = parseYouTubeVideoId(youtubeInput);
    if (!videoId) {
      setYoutubeVideoId(null);
      setYoutubeError("That does not look like a valid YouTube video link.");
      return;
    }
    setYoutubeVideoId(videoId);
    setYoutubeError("");
  };

  const embedUrl = youtubeVideoId
    ? youtubePrivacyEmbedUrl(youtubeVideoId)
    : null;

  return (
    <section
      ref={roomRef}
      className={`focus-room ${isBreak ? "is-break" : "is-focus"}${open ? "" : " is-minimized"}`}
      role={open ? "dialog" : undefined}
      aria-modal={open ? true : undefined}
      aria-labelledby={open ? "focus-room-title" : undefined}
      aria-hidden={!open || undefined}
      inert={!open ? true : undefined}
      tabIndex={-1}
    >
      <div className="focus-room-ambient" aria-hidden="true" />
      <button className="focus-room-minimize" type="button" onClick={onMinimize}>
        Minimize
      </button>

      <div className="focus-room-layout">
        <div className="focus-room-primary">
          <p className="focus-room-status">
            {isBreak ? "BREAK" : isBreakOffer ? "FOCUS COMPLETE" : "FOCUS"}
          </p>
          <h1 id="focus-room-title">{goalSubject ?? "Independent Focus"}</h1>
          <time className="focus-room-countdown" dateTime={`PT${durationMinutes}M`}>
            {formatMissionCountdown(remainingMilliseconds)}
          </time>
          <div className="focus-room-progress-copy">
            <span>{Math.round(progressPercent)}% complete</span>
            <span>{durationMinutes} min {isBreak ? "break" : "focus"}</span>
          </div>
          <progress
            className="focus-room-progress"
            max={100}
            value={progressPercent}
            aria-label={`${isBreak ? "Break" : "Focus"} session progress`}
          />

          <div className="focus-room-task">
            <span>Current task</span>
            <strong>{currentTask ?? goalSubject ?? "Independent focus"}</strong>
          </div>

          <div className="focus-room-actions">
            {isBreakOffer ? (
              <>
                <button className="primary-button" type="button" onClick={onStartBreak}>
                  Start {session.breakMinutes} min break
                </button>
                <button className="secondary-button" type="button" onClick={onSkipBreak}>
                  Skip
                </button>
              </>
            ) : isReadyToComplete ? (
              session.missionId && session.stepId ? (
                <>
                  <button className="primary-button" type="button" onClick={onComplete}>
                    Complete step
                  </button>
                  <button className="secondary-button" type="button" onClick={onNeedAnotherBlock}>
                    Need another focus block
                  </button>
                </>
              ) : (
                <button className="primary-button" type="button" onClick={onComplete}>
                  Complete focus
                </button>
              )
            ) : !isBreak ? (
              <button className="secondary-button" type="button" onClick={onStop}>
                Stop · 0 XP
              </button>
            ) : (
              <span className="focus-room-break-note">Breaks award 0 XP.</span>
            )}
          </div>
          {!isBreak && !isBreakOffer && (
            <small className="focus-room-reward-note">
              {rewardAvailable
                ? "+5 XP after you confirm completion"
                : "Practice period · 0 XP"}
            </small>
          )}
        </div>

        <aside className="focus-room-guardian" aria-label="Focus Guardian">
          <Character hero={hero} reaction={guardianReaction} size="small" />
          <div className="focus-guardian-dialogue" aria-live="polite">
            <span>FOCUS GUARDIAN</span>
            <strong>{guardianMessage}</strong>
          </div>
        </aside>

        <aside className="focus-room-audio" aria-labelledby="focus-audio-title">
          <div>
            <span>FOCUS AUDIO</span>
            <strong id="focus-audio-title">Optional sound</strong>
          </div>
          <label>
            Source
            <select
              value={audioMode}
              onChange={(event) => {
                const mode = event.target.value as "none" | "youtube";
                setAudioMode(mode);
                if (mode === "none") {
                  setYoutubeVideoId(null);
                  setYoutubeError("");
                }
              }}
            >
              <option value="none">None</option>
              <option value="youtube">Custom YouTube link</option>
            </select>
          </label>

          {audioMode === "youtube" && (
            <form onSubmit={loadYouTube}>
              <label htmlFor="focus-youtube-url">YouTube video link</label>
              <div className="focus-audio-input-row">
                <input
                  id="focus-youtube-url"
                  type="url"
                  value={youtubeInput}
                  placeholder="https://www.youtube.com/watch?v=…"
                  onChange={(event) => {
                    setYoutubeInput(event.target.value);
                    if (!event.target.value.trim()) {
                      setYoutubeVideoId(null);
                      setYoutubeError("");
                    }
                  }}
                />
                <button className="secondary-button" type="submit">Load</button>
              </div>
              {youtubeError && <p className="form-error" role="alert">{youtubeError}</p>}
            </form>
          )}

          {embedUrl && audioMode === "youtube" && (
            <div className="focus-youtube-player">
              <iframe
                src={embedUrl}
                title="Focus audio YouTube player"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setYoutubeVideoId(null);
                  setYoutubeInput("");
                  setYoutubeError("");
                }}
              >
                Disable YouTube
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
