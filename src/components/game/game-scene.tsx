"use client";

import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getTimeOfDay, type TimeOfDay } from "@/lib/world";

export type ScenePointer = {
  x: number;
  y: number;
  direction: number;
  active: boolean;
};

type SceneStyle = CSSProperties & {
  "--scene-x": string;
  "--scene-y": string;
};

type GameSceneProps = {
  children: ReactNode;
  className?: string;
  onPointerState?: (pointer: ScenePointer) => void;
  onWorldInteraction?: (timeOfDay: TimeOfDay) => void;
};

const RESTING_POINTER: ScenePointer = {
  x: 0.5,
  y: 0.5,
  direction: 0,
  active: false,
};

const GRASS_BLADES = Array.from({ length: 44 }, (_, index) => ({
  id: index,
  left: (index * 23 + (index % 4) * 7) % 100,
  bottom: 1 + (index % 5) * 1.35,
  height: 18 + (index % 4) * 5,
}));

const FLOWERS = [
  { left: 7, bottom: 10, color: "sunny" },
  { left: 15, bottom: 5, color: "pink" },
  { left: 28, bottom: 9, color: "blue" },
  { left: 46, bottom: 4, color: "sunny" },
  { left: 67, bottom: 7, color: "pink" },
  { left: 76, bottom: 3, color: "blue" },
  { left: 91, bottom: 9, color: "sunny" },
];

function subscribeReducedMotion(callback: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function reducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeTimeOfDay(callback: () => void): () => void {
  const timer = window.setInterval(callback, 60_000);
  document.addEventListener("visibilitychange", callback);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", callback);
  };
}

function timeOfDaySnapshot(): TimeOfDay {
  return getTimeOfDay(new Date());
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
}

function useTimeOfDay(): TimeOfDay {
  return useSyncExternalStore(subscribeTimeOfDay, timeOfDaySnapshot, () => "day");
}

export function GameWorldBackdrop({
  pointer = RESTING_POINTER,
  transition = false,
  timeOfDay = "day",
  doorReaction = 0,
  onDoorInteraction,
}: {
  pointer?: ScenePointer;
  transition?: boolean;
  timeOfDay?: TimeOfDay;
  doorReaction?: number;
  onDoorInteraction?: () => void;
}) {
  const style: SceneStyle = {
    "--scene-x": `${(pointer.x - 0.5) * 2}`,
    "--scene-y": `${(pointer.y - 0.5) * 2}`,
  };

  return (
    <div
      className={`game-world-backdrop ${transition ? "transition-scene" : ""}`}
      style={style}
      data-time-of-day={timeOfDay}
    >
      <div className="storybook-sun" aria-hidden="true"><span /></div>
      <div className="cloud cloud-one" aria-hidden="true"><i /><i /><i /></div>
      <div className="cloud cloud-two" aria-hidden="true"><i /><i /><i /></div>
      <div className="cloud cloud-three" aria-hidden="true"><i /><i /><i /></div>

      <svg
        className="world-landscape"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        role={onDoorInteraction ? "group" : undefined}
        aria-label={onDoorInteraction ? "Learning world cottage" : undefined}
        aria-hidden={onDoorInteraction ? undefined : true}
      >
        <defs>
          <linearGradient id="farHill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9ad89d" />
            <stop offset="1" stopColor="#6ebd82" />
          </linearGradient>
          <linearGradient id="nearHill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#69c875" />
            <stop offset="1" stopColor="#379a5c" />
          </linearGradient>
        </defs>
        <path className="far-hill" d="M-80 560Q160 350 390 540T840 510Q1080 330 1320 520T1730 470V930H-80Z" fill="url(#farHill)" />
        <path className="near-hill" d="M-80 650Q160 480 420 650T870 600Q1130 450 1390 610T1730 570V930H-80Z" fill="url(#nearHill)" />
        <path className="world-path" d="M1220 900c-90-172-156-244-230-310-57-50-36-116 36-145 71-29 132-1 169 47-96 8-116 51-64 100 73 70 174 160 221 308Z" />

        <g className="distant-trees">
          <g transform="translate(80 430)"><rect x="38" y="100" width="26" height="110" rx="10" /><circle cx="50" cy="80" r="64" /><circle cx="15" cy="105" r="43" /><circle cx="90" cy="110" r="46" /></g>
          <g transform="translate(1350 420) scale(.9)"><rect x="38" y="100" width="26" height="110" rx="10" /><circle cx="50" cy="80" r="64" /><circle cx="15" cy="105" r="43" /><circle cx="90" cy="110" r="46" /></g>
          <g transform="translate(1450 505) scale(.65)"><rect x="38" y="100" width="26" height="110" rx="10" /><circle cx="50" cy="80" r="64" /><circle cx="15" cy="105" r="43" /><circle cx="90" cy="110" r="46" /></g>
        </g>

        {!transition && (
          <g
            className={`study-cottage ${doorReaction ? "door-reacted" : ""} ${timeOfDay}`}
            key={`cottage-${doorReaction}`}
            transform="translate(1080 300)"
          >
            <path className="chimney" d="M214 68h42v92h-42Z" />
            <path className="cottage-wall" d="M28 195h324v256H28Z" />
            <path className="cottage-roof" d="m-12 215 194-166 210 166-39 40-171-137L28 255Z" />
            <path className="roof-trim" d="m8 216 174-150 190 150" />
            <rect className="cottage-door" x="163" y="303" width="76" height="148" rx="34" />
            <circle className="door-knob" cx="218" cy="377" r="7" />
            <g className="cottage-window" transform="translate(62 274)">
              <rect width="74" height="78" rx="10" />
              <path d="M37 3v72M3 39h68" />
            </g>
            <g className="cottage-window" transform="translate(264 274)">
              <rect width="58" height="72" rx="10" />
              <path d="M29 3v66M3 36h52" />
            </g>
            <path className="cottage-vine" d="M43 421q54-60 108-4M291 420q24-46 54-61" />
            <g className="smoke-puffs"><circle cx="235" cy="46" r="20" /><circle cx="259" cy="18" r="27" /><circle cx="294" cy="-7" r="34" /></g>

            {onDoorInteraction && (
              <foreignObject className="house-door-control" x="157" y="296" width="88" height="162">
                <div className="house-door-control-inner">
                  <button
                    className="house-door-hitbox"
                    type="button"
                    onClick={onDoorInteraction}
                    aria-label={`Knock on the house door. It is currently ${timeOfDay}.`}
                  />
                </div>
              </foreignObject>
            )}
          </g>
        )}

        <g className="foreground-rocks"><path d="M930 769q28-70 83 0Z" /><path d="M1455 792q37-96 104 0Z" /><path d="M110 804q29-73 77 0Z" /></g>
      </svg>

      <div className="bird flock-one" aria-hidden="true"><span /><span /></div>
      <div className="bird flock-two" aria-hidden="true"><span /><span /></div>
      <div className="butterfly butterfly-one" aria-hidden="true"><i /><i /></div>
      <div className="butterfly butterfly-two" aria-hidden="true"><i /><i /></div>
      <div className="butterfly butterfly-three" aria-hidden="true"><i /><i /></div>
      <div className="leaf leaf-one" aria-hidden="true" />
      <div className="leaf leaf-two" aria-hidden="true" />
      <div className="leaf leaf-three" aria-hidden="true" />
      {Array.from({ length: 10 }, (_, index) => (
        <span className={`world-particle particle-${index + 1}`} key={index} aria-hidden="true" />
      ))}

      <div className="interactive-meadow" aria-hidden="true">
        {GRASS_BLADES.map((blade) => {
          const dx = pointer.x - blade.left / 100;
          const dy = pointer.y - (0.88 - blade.bottom / 300);
          const proximity = pointer.active
            ? Math.max(0, 1 - Math.hypot(dx, dy) / 0.16)
            : 0;
          const bend =
            proximity * (pointer.direction || Math.sign(dx) || 1) * 22;
          return (
            <span
              className="grass-blade"
              key={blade.id}
              style={{
                left: `${blade.left}%`,
                bottom: `${blade.bottom}%`,
                height: `${blade.height}px`,
                transform: `rotate(${bend}deg)`,
              }}
            />
          );
        })}
        {FLOWERS.map((flower, index) => {
          const dx = pointer.x - flower.left / 100;
          const proximity = pointer.active
            ? Math.max(0, 1 - Math.abs(dx) / 0.12)
            : 0;
          return (
            <span
              className={`meadow-flower ${flower.color}`}
              key={`${flower.left}-${flower.bottom}`}
              style={{
                left: `${flower.left}%`,
                bottom: `${flower.bottom}%`,
                transform: `rotate(${proximity * (pointer.direction || 1) * 12}deg)`,
                animationDelay: `${index * -0.45}s`,
              }}
            ><i /></span>
          );
        })}
      </div>
    </div>
  );
}

export function GameScene({
  children,
  className = "",
  onPointerState,
  onWorldInteraction,
}: GameSceneProps) {
  const [pointer, setPointer] = useState<ScenePointer>(RESTING_POINTER);
  const [doorReaction, setDoorReaction] = useState(0);
  const latestPointer = useRef(pointer);
  const lastX = useRef(0.5);
  const frame = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const timeOfDay = useTimeOfDay();

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function commitPointer(next: ScenePointer) {
    latestPointer.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      setPointer(latestPointer.current);
      onPointerState?.(latestPointer.current);
      frame.current = null;
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (reducedMotion) return;
    if (
      event.target instanceof Element &&
      event.target.closest(".adventure-panel, button, input, select, textarea, label")
    ) {
      if (latestPointer.current.active) commitPointer(RESTING_POINTER);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    const direction = Math.max(-1, Math.min(1, (x - lastX.current) * 28));
    lastX.current = x;
    commitPointer({ x, y, direction, active: true });
  }

  function resetPointer() {
    if (latestPointer.current.active) commitPointer(RESTING_POINTER);
  }

  function handleDoorInteraction() {
    setDoorReaction((current) => current + 1);
    onWorldInteraction?.(timeOfDay);
  }

  return (
    <main
      className={`game-scene ${className}`}
      data-time-of-day={timeOfDay}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <GameWorldBackdrop
        pointer={reducedMotion ? RESTING_POINTER : pointer}
        timeOfDay={timeOfDay}
        doorReaction={doorReaction}
        onDoorInteraction={onWorldInteraction ? handleDoorInteraction : undefined}
      />
      <div className="game-scene-content">{children}</div>
    </main>
  );
}
