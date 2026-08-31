/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { HERO_PRESETS, heroColors } from "@/lib/hero";
import type { HeroCustomization, HeroPreset } from "@/lib/types";

export type CharacterReaction = "idle" | "happy" | "concerned" | "celebrating";

export interface CharacterGaze {
  x: number;
  y: number;
}

type CharacterProps = {
  hero: HeroCustomization;
  reaction?: CharacterReaction;
  gaze?: CharacterGaze;
  size?: "mini" | "small" | "large";
  decorative?: boolean;
  entryAsset?: boolean;
  className?: string;
};

type CharacterStyle = CSSProperties & {
  "--hero-main": string;
  "--hero-shade": string;
  "--look-x": string;
  "--look-y": string;
};

const COMPANION_IMAGES: Record<HeroPreset, string> = {
  owl: "/companion-owl.jpg",
  fox: "/companion-fox.png",
  cat: "/companion-cat.png",
};

const ACCESSORY_IMAGES: Record<HeroCustomization["accessory"], string> = {
  glasses: "/accessory-glasses.png",
  satchel: "/accessory-satchel.png",
  leaf: "/accessory-leaf.png",
};

export function Character({
  hero,
  reaction = "idle",
  gaze = { x: 0, y: 0 },
  size = "large",
  decorative = false,
  entryAsset = false,
  className = "",
}: CharacterProps) {
  const colors = heroColors(hero.color);
  const heroName =
    HERO_PRESETS.find(({ id }) => id === hero.preset)?.label ?? "Guide";
  const lookX = Math.max(-1, Math.min(1, gaze.x));
  const lookY = Math.max(-1, Math.min(1, gaze.y));
  const companionImage =
    entryAsset && hero.preset === "owl"
      ? "/companion-owl-entry.png"
      : COMPANION_IMAGES[hero.preset];
  const style: CharacterStyle = {
    "--hero-main": colors.main,
    "--hero-shade": colors.shade,
    "--look-x": `${lookX * 4}px`,
    "--look-y": `${lookY * 3}px`,
  };

  return (
    <span
      className={`quest-character ${hero.preset} ${reaction} ${size} ${className}`}
      style={style}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${heroName}, your learning companion`}
    >
      <span className="companion-motion">
        <img
          className="companion-image"
          src={companionImage}
          alt=""
          draggable={false}
        />
      </span>

      <span className="equipped-accessory" aria-hidden="true">
        <img
          src={ACCESSORY_IMAGES[hero.accessory]}
          alt=""
          draggable={false}
        />
      </span>

      <span className="companion-shadow" aria-hidden="true" />
      <span className="companion-celebration" aria-hidden="true">
        <i>✦</i>
        <i>✦</i>
        <i>✦</i>
      </span>
    </span>
  );
}
