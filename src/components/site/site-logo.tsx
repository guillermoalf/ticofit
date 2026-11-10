import { TicofitLogo } from "@/components/brand/ticofit-logo";

/**
 * Header logo: the inline ticofit SVG, coloured by the link's text colour.
 *
 * It is drawn large (`.tf-logo`) and scaled down to navbar size with a
 * transform, on every route. That makes it the same node, at the same
 * rendering, whether it is resting in the header or running the home intro
 * (design/landing/motion.md): the intro only adds an animation, so its landed
 * frame is identical to a normal page load. Transforms take no layout space,
 * so `.tf-logo-slot` sets its own size from the same variables.
 */
export function SiteLogo() {
  return (
    <span className="tf-logo">
      <TicofitLogo className="tf-logo-svg" />
    </span>
  );
}
