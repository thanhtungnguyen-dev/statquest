import Image from "next/image";

type StatQuestMarkProps = {
  className?: string;
};

// Use real images so existing .brand-mark background rules cannot hide the logo.
export function StatQuestMark({ className = "" }: StatQuestMarkProps) {
  return (
    <span className={`brand-mark statquest-mark ${className}`.trim()} aria-hidden="true">
      <Image
        src="/branding/statquest-symbol-light.png"
        alt=""
        width={64}
        height={64}
        unoptimized
        className="statquest-mark-img statquest-mark-light"
      />
      <Image
        src="/branding/statquest-symbol-dark.png"
        alt=""
        width={64}
        height={64}
        unoptimized
        className="statquest-mark-img statquest-mark-dark"
      />
    </span>
  );
}
