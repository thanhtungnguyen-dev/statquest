import Image from "next/image";

type StatQuestLogoProps = {
  className?: string;
};

// Keep image elements inside the logo, rather than using CSS background images.
export function StatQuestLogo({ className = "" }: StatQuestLogoProps) {
  return (
    <span className={`statquest-logo ${className}`.trim()} aria-hidden="true">
      <Image
        className="statquest-logo-image statquest-logo-light"
        src="/branding/statquest-symbol-light.png"
        alt=""
        width={64}
        height={64}
      />
      <Image
        className="statquest-logo-image statquest-logo-dark"
        src="/branding/statquest-symbol-dark.png"
        alt=""
        width={64}
        height={64}
      />
    </span>
  );
}
