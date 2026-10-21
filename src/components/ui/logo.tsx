import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

/**
 * Brand wordmark.
 *
 * With no logo file configured (`BRAND.logoSrc === null`) it renders the
 * brand name as text, so the white-label base ships without any branded
 * binary. Drop a transparent PNG/SVG in /public, point `BRAND.logoSrc` at
 * it, and the same component renders the image instead.
 *
 * `glow` adds the soft accent halo. Size with a height utility (e.g. `h-7`);
 * width stays auto.
 */
export function Logo({
  className,
  glow = true,
  priority,
}: {
  className?: string;
  glow?: boolean;
  priority?: boolean;
}) {
  if (!BRAND.logoSrc) {
    return (
      <span
        className={cn(
          "inline-flex items-center font-display text-lg font-bold uppercase tracking-[0.2em] leading-none text-ink",
          glow && "text-neon",
          className,
        )}
      >
        {BRAND.name}
      </span>
    );
  }

  return (
    <Image
      src={BRAND.logoSrc}
      alt={BRAND.name}
      width={2185}
      height={302}
      priority={priority}
      className={cn("h-7 w-auto", glow && "logo-glow", className)}
    />
  );
}
