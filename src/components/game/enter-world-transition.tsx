"use client";

import { useEffect } from "react";
import { Character } from "@/components/game/character";
import { GameWorldBackdrop, useReducedMotion } from "@/components/game/game-scene";
import type { HeroCustomization } from "@/lib/types";

type EnterWorldTransitionProps = {
  hero: HeroCustomization;
  displayName: string;
  onComplete: () => void;
};

export function EnterWorldTransition({
  hero,
  displayName,
  onComplete,
}: EnterWorldTransitionProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, reducedMotion ? 350 : 2100);
    return () => window.clearTimeout(timeout);
  }, [onComplete, reducedMotion]);

  return (
    <main className={`enter-world-transition ${reducedMotion ? "reduced" : ""}`} aria-live="polite">
      <GameWorldBackdrop transition />
      <div className="portal-ring" aria-hidden="true"><span /><span /><span /></div>
      <div className="transition-message">
        <p>ADVENTURE SAVED</p>
        <h1>{displayName}, your learning world is ready!</h1>
        <span>{reducedMotion ? "Opening your dashboard…" : "Follow the path to your first quest…"}</span>
      </div>
      <div className="transition-hero" aria-hidden="true">
        <Character hero={hero} reaction="celebrating" decorative />
      </div>
      <button className="skip-transition" type="button" onClick={onComplete}>
        Skip animation
      </button>
    </main>
  );
}
