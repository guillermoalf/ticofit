import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

/**
 * The ticofit lockup, from the brand files in /public/branding.
 *
 * `on` is the background it sits on: "dark" (verde profundo, negro grisáceo,
 * the portal's near-black) picks the crema file, "light" (crema) the verde
 * profundo one. Renders flat — no glow, shadow or filter. Size it with a
 * height utility (e.g. `h-7`); width follows the file's ratio.
 */
export function Logo({
  className,
  on = "dark",
  priority,
}: {
  className?: string;
  on?: "light" | "dark";
  priority?: boolean;
}) {
  return (
    <Image
      src={on === "dark" ? BRAND.logo.onDark : BRAND.logo.onLight}
      alt={BRAND.name}
      width={BRAND.logo.width}
      height={BRAND.logo.height}
      priority={priority}
      className={cn("h-9 w-auto", className)}
    />
  );
}
