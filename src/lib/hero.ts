import type {
  HeroAccessory,
  HeroColor,
  HeroCustomization,
  HeroPreset,
  PlayerClassId,
} from "@/lib/types";

export const HERO_PRESETS: ReadonlyArray<{
  id: HeroPreset;
  label: string;
  description: string;
}> = [
  { id: "owl", label: "Ollie", description: "A thoughtful owl guide" },
  { id: "fox", label: "Fenn", description: "A curious fox explorer" },
  { id: "cat", label: "Miso", description: "A calm cat scholar" },
];

export const HERO_COLORS: ReadonlyArray<{
  id: HeroColor;
  label: string;
  value: string;
  shade: string;
}> = [
  { id: "meadow", label: "Meadow green", value: "#63d99a", shade: "#277457" },
  { id: "sunset", label: "Sunset coral", value: "#ff9d77", shade: "#a94737" },
  { id: "sky", label: "Sky blue", value: "#6fc8ff", shade: "#286b9a" },
  { id: "violet", label: "Storybook violet", value: "#b89cff", shade: "#6650a5" },
];

export const HERO_ACCESSORIES: ReadonlyArray<{
  id: HeroAccessory;
  label: string;
}> = [
  { id: "glasses", label: "Round glasses" },
  { id: "satchel", label: "Explorer satchel" },
  { id: "leaf", label: "Lucky leaf" },
];

export const DEFAULT_HERO: HeroCustomization = {
  preset: "owl",
  color: "meadow",
  accessory: "glasses",
};

export const DEFAULT_PLAYER_CLASS: PlayerClassId = "warrior";

const PRESETS = new Set<HeroPreset>(HERO_PRESETS.map(({ id }) => id));
const COLORS = new Set<HeroColor>(HERO_COLORS.map(({ id }) => id));
const ACCESSORIES = new Set<HeroAccessory>(
  HERO_ACCESSORIES.map(({ id }) => id),
);
const PLAYER_CLASSES = new Set<PlayerClassId>(["warrior", "mage", "explorer"]);

export function normalizePlayerClass(value: unknown): PlayerClassId {
  return PLAYER_CLASSES.has(value as PlayerClassId)
    ? (value as PlayerClassId)
    : DEFAULT_PLAYER_CLASS;
}

export function normalizeHero(
  value: Partial<HeroCustomization> | null | undefined,
): HeroCustomization {
  return {
    preset: value?.preset && PRESETS.has(value.preset) ? value.preset : DEFAULT_HERO.preset,
    color: value?.color && COLORS.has(value.color) ? value.color : DEFAULT_HERO.color,
    accessory:
      value?.accessory && ACCESSORIES.has(value.accessory)
        ? value.accessory
        : DEFAULT_HERO.accessory,
  };
}

export function heroColors(color: HeroColor): { main: string; shade: string } {
  const selection = HERO_COLORS.find((option) => option.id === color) ?? HERO_COLORS[0];
  return { main: selection.value, shade: selection.shade };
}
