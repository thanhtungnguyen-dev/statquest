/* eslint-disable @next/next/no-img-element */

import { Character, type CharacterGaze, type CharacterReaction } from "@/components/game/character";
import { SpeechBubble } from "@/components/game/speech-bubble";
import { HERO_ACCESSORIES, HERO_COLORS, HERO_PRESETS } from "@/lib/hero";
import type { ProfileField } from "@/lib/profile";
import type {
  HeroAccessory,
  HeroCustomization,
  HeroPreset,
  PlayerClassId,
} from "@/lib/types";

type PlayerClass = {
  id: PlayerClassId;
  name: string;
  title: string;
  description: string;
  image: string;
};

type RpgCharacterSetupProps = {
  player: PlayerClassId;
  hero: HeroCustomization;
  heroSelected: boolean;
  heroInvalid?: boolean;
  heroErrorId?: string;
  gaze: CharacterGaze;
  reaction: CharacterReaction;
  dialogue: string;
  dialogueTone: "guide" | "success" | "error";
  dialogueTarget?: ProfileField | null;
  onDismissDialogue?: () => void;
  onPlayerChange: (player: PlayerClassId) => void;
  onHeroChange: (hero: HeroCustomization) => void;
  onCompanionInteract: () => void;
};

export const PLAYER_CLASSES: readonly PlayerClass[] = [
  {
    id: "warrior",
    name: "Warrior",
    title: "The Iron Will",
    description:
      "Solves most problems with courage, discipline, and occasionally excessive force.",
    image: "/player-warrior.png",
  },
  {
    id: "mage",
    name: "Mage",
    title: "The Arcane Scholar",
    description:
      "Turns caffeine, questionable sleep schedules, and knowledge into raw power.",
    image: "/player-mage.png",
  },
  {
    id: "explorer",
    name: "Explorer",
    title: "The Curious Pathfinder",
    description:
      "Has no idea where the quest leads. Somehow still finds the side quests.",
    image: "/player-explorer.jpg",
  },
];

const COMPANION_IMAGES: Record<HeroPreset, string> = {
  owl: "/companion-owl.jpg",
  fox: "/companion-fox.png",
  cat: "/companion-cat.png",
};

const ACCESSORY_IMAGES: Record<HeroAccessory, string> = {
  glasses: "/accessory-glasses.png",
  satchel: "/accessory-satchel.png",
  leaf: "/accessory-leaf.png",
};

export function playerClassDetails(player: PlayerClassId | undefined): PlayerClass {
  return PLAYER_CLASSES.find(({ id }) => id === player) ?? PLAYER_CLASSES[0];
}

export function PlayerCharacterPreview({
  player,
  decorative = false,
  className = "",
}: {
  player: PlayerClassId | undefined;
  decorative?: boolean;
  className?: string;
}) {
  const selected = playerClassDetails(player);
  return (
    <span className={`player-character-stage ${className}`}>
      <span className="player-character-motion">
        <img
          className="player-character-image"
          src={selected.image}
          alt={decorative ? "" : `${selected.name} player character`}
          draggable={false}
        />
      </span>
    </span>
  );
}

export function RpgCharacterSetup({
  player,
  hero,
  heroSelected,
  heroInvalid = false,
  heroErrorId,
  gaze,
  reaction,
  dialogue,
  dialogueTone,
  dialogueTarget,
  onDismissDialogue,
  onPlayerChange,
  onHeroChange,
  onCompanionInteract,
}: RpgCharacterSetupProps) {
  const selectedPlayer = playerClassDetails(player);

  return (
    <div className="rpg-character-setup">
      <section className="rpg-party-stage" aria-labelledby="party-preview-title">
        <span className="rpg-section-label" id="party-preview-title">
          Your adventuring party
        </span>
        <div className="rpg-stage-light" aria-hidden="true" />

        <div className="rpg-player-preview">
          <PlayerCharacterPreview player={player} />
          <strong>{selectedPlayer.name}</strong>
          <span>{selectedPlayer.title}</span>
        </div>

        <div className="companion-stage">
          <SpeechBubble
            id="guide-speech"
            message={dialogue}
            tone={dialogueTone}
            target={dialogueTarget}
            onDismiss={onDismissDialogue}
          />
          <button
            className="companion-interaction"
            type="button"
            onClick={onCompanionInteract}
            aria-label="Talk to your selected companion"
          >
            <Character hero={hero} gaze={gaze} reaction={reaction} />
          </button>
        </div>

        <div className="equipped-item-slot" aria-label="Equipped accessory">
          <span>Equipped</span>
          <img
            src={ACCESSORY_IMAGES[hero.accessory]}
            alt={HERO_ACCESSORIES.find(({ id }) => id === hero.accessory)?.label}
            draggable={false}
          />
        </div>
      </section>

      <fieldset className="rpg-fieldset player-class-selector">
        <legend>Choose your class</legend>
        <p>Choose the strengths you want to bring into your learning quests.</p>

        <div className="player-class-grid">
          {PLAYER_CLASSES.map((option) => {
            const selected = player === option.id;
            return (
              <label
                className={`player-class-card ${selected ? "selected" : ""}`}
                key={option.id}
              >
                <input
                  className="rpg-radio"
                  type="radio"
                  name="playerCharacter"
                  value={option.id}
                  checked={selected}
                  onChange={() => onPlayerChange(option.id)}
                />
                <span className="player-class-art">
                  <span className="player-character-motion">
                    <img
                      className="player-character-image"
                      src={option.image}
                      alt=""
                      draggable={false}
                    />
                  </span>
                </span>
                <span className="player-class-copy">
                  <strong>{option.name}</strong>
                  <small>{option.title}</small>
                  <span>{option.description}</span>
                </span>
                <span className="rpg-selected-mark" aria-hidden="true">✓</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset
        className="rpg-fieldset companion-selector"
        aria-invalid={heroInvalid || undefined}
        aria-describedby={heroInvalid ? heroErrorId : undefined}
      >
        <legend>Choose your companion</legend>
        <p>Pick one guide, a banner color, and an adventure accessory.</p>

        <div className="companion-selector-grid" role="radiogroup" aria-label="Companion">
          {HERO_PRESETS.map((option) => {
            const selected = heroSelected && hero.preset === option.id;
            return (
              <label
                className={`companion-card ${selected ? "selected" : ""}`}
                key={option.id}
              >
                <input
                  className="rpg-radio"
                  type="radio"
                  name="heroPreset"
                  value={option.id}
                  checked={selected}
                  onChange={() => onHeroChange({ ...hero, preset: option.id })}
                />
                <span className="companion-card-art">
                  <img src={COMPANION_IMAGES[option.id]} alt="" draggable={false} />
                </span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="rpg-selected-mark" aria-hidden="true">✓</span>
              </label>
            );
          })}
        </div>

        <div className="rpg-customization-row">
          <fieldset className="color-choices">
            <legend>Main color</legend>
            <div>
              {HERO_COLORS.map((color) => (
                <label key={color.id} title={color.label}>
                  <input
                    className="rpg-radio"
                    type="radio"
                    name="heroColor"
                    value={color.id}
                    checked={hero.color === color.id}
                    onChange={() => onHeroChange({ ...hero, color: color.id })}
                  />
                  <span
                    className="color-swatch"
                    style={{ backgroundColor: color.value }}
                    aria-hidden="true"
                  />
                  <span>{color.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="accessory-grid">
            <legend>Accessory</legend>
            <div>
              {HERO_ACCESSORIES.map((accessory) => (
                <label
                  className={hero.accessory === accessory.id ? "selected" : ""}
                  key={accessory.id}
                >
                  <input
                    className="rpg-radio"
                    type="radio"
                    name="heroAccessory"
                    value={accessory.id}
                    checked={hero.accessory === accessory.id}
                    onChange={() =>
                      onHeroChange({ ...hero, accessory: accessory.id })
                    }
                  />
                  <img
                    src={ACCESSORY_IMAGES[accessory.id]}
                    alt=""
                    draggable={false}
                  />
                  <span>{accessory.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {heroInvalid && heroErrorId && (
          <span className="semantic-field-error" id={heroErrorId}>
            Choose the adventurer who will guide your learning journey.
          </span>
        )}
      </fieldset>
    </div>
  );
}
