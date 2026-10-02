import { DIFM_LOGO_DATA_URI } from "./logo-data";

interface BrandLogoProps {
  size?: number;
  class?: string;
  glowColor?: string;
}

export function DifmBrandLogo({
  size = 28,
  class: className = "",
  glowColor = "#6366f1"
}: BrandLogoProps) {
  return (
    <div
      class={`rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-black border ring-1 ring-white/10 transition-all duration-300 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderColor: `${glowColor}66`,
        boxShadow: `0 0 10px ${glowColor}40`
      }}
    >
      <img
        src={DIFM_LOGO_DATA_URI}
        alt="Do It For Me"
        width={size}
        height={size}
        class="w-full h-full object-cover block select-none pointer-events-none"
      />
    </div>
  );
}
