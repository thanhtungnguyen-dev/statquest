import type { ProfileField } from "@/lib/profile";

const FIELD_LABELS: Partial<Record<ProfileField, string>> = {
  hero: "Hero choice",
  displayName: "Hero name",
  birthYear: "Birth year",
  learningStage: "Learning level",
  careerInterest: "Quest path",
};

type SpeechBubbleProps = {
  id: string;
  message: string;
  tone: "guide" | "success" | "error";
  target?: ProfileField | null;
  onDismiss?: () => void;
};

export function SpeechBubble({
  id,
  message,
  tone,
  target,
  onDismiss,
}: SpeechBubbleProps) {
  return (
    <div
      className={`guide-speech ${tone}`}
      id={id}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      data-target={target ?? "general"}
    >
      {target && <span className="speech-target">{FIELD_LABELS[target]}</span>}
      <p>{message}</p>
      {onDismiss && (
        <button
          className="dialogue-dismiss"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss dialogue"
        >
          Continue
        </button>
      )}
    </div>
  );
}
