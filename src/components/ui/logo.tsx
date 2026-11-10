import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/**
 * The ticofit lockup for the portal and auth pages (near-black background),
 * in crema. Flat — no glow, shadow or filter. Size it with a height utility
 * (e.g. `h-9`); width follows the viewBox ratio.
 */
export function Logo({ className }: { className?: string }) {
  // The --tf-* palette utilities only exist inside the public site layout,
  // so the portal reads the colour from BRAND directly.
  return (
    <span className="inline-flex" style={{ color: BRAND.palette.cremaClaro }}>
      <TicofitLogo className={cn("h-9 w-auto", className)} />
    </span>
  );
}
