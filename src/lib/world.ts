import type { HeroPreset } from "@/lib/types";

export type TimeOfDay = "day" | "night";

export type DoorDialogue = {
  world: string;
  companion: string;
  reaction: "concerned" | "happy";
};

const DAY_COMPANION_DIALOGUE: Record<HeroPreset, string> = {
  owl: "Even heroes need somewhere to return to.",
  fox: "Locked? That is basically an invitation to explore somewhere else.",
  cat: "They are out. Excellent. More quiet for us.",
};

const NIGHT_COMPANION_DIALOGUE: Record<HeroPreset, string> = {
  owl: "A wise adventurer knows when it is time to rest.",
  fox: "Finally. My paws were starting to file a complaint.",
  cat: "Good. I already picked the best sleeping spot.",
};

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? "night" : "day";
}

export function getDoorDialogue(
  timeOfDay: TimeOfDay,
  companion: HeroPreset,
): DoorDialogue {
  if (timeOfDay === "night") {
    return {
      world:
        "A warm light spills through the doorway. The house feels safe enough to rest for the night.",
      companion: NIGHT_COMPANION_DIALOGUE[companion],
      reaction: "happy",
    };
  }

  return {
    world:
      "The door is locked. Everyone must be out adventuring. Come back when the stars are awake.",
    companion: DAY_COMPANION_DIALOGUE[companion],
    reaction: "concerned",
  };
}
