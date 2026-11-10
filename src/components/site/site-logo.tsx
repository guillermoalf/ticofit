import Image from "next/image";

import { BRAND } from "@/config/brand";

/**
 * Header logo: the real ticofit lockup image (it already carries
 * "WELLNESS CLUB" — never typeset any of it).
 *
 * The image (`.tf-logo`) is drawn large and scaled down to navbar size with a
 * transform, on every route. That makes it the same node, at the same
 * rendering, whether it is resting in the header or running the home intro
 * (see "Home intro" in globals.css): the intro only adds an animation, so its
 * landed frame is identical to a normal page load. Transforms take no layout
 * space, so `.tf-logo-slot` sets its own width from the same variables.
 */
export function SiteLogo({ dark }: { dark: boolean }) {
  return (
    <span className="tf-logo">
      <Image
        src={dark ? BRAND.logo.onDark : BRAND.logo.onLight}
        alt={BRAND.name}
        width={BRAND.logo.width}
        height={BRAND.logo.height}
        sizes="(min-width: 760px) 560px, 300px"
        priority
        className="tf-logo-img"
      />
    </span>
  );
}
