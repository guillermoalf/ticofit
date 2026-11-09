import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";

/**
 * Header logo lockup: "ticofit®" over "WELLNESS CLUB".
 *
 * The visible lockup (`.tf-logo`) is drawn large and scaled down to navbar
 * size with a transform, on every route. That makes it the same node, at the
 * same rendering, whether it is resting in the header or running the home
 * intro (see "Home intro" in globals.css): the intro only adds an animation,
 * so its landed frame is identical to a normal page load.
 *
 * Transforms take no layout space, so an invisible copy at navbar size
 * (`.tf-logo-sizer`) gives the slot its width.
 */
export function SiteLogo({ dark }: { dark: boolean }) {
  const lockup = (
    <>
      <Wordmark
        className="tf-logo-wordmark block leading-[1.05] tracking-[-0.014em]"
        markClassName="text-[0.4em] leading-[0]"
      />
      <span
        className={cn(
          "tf-logo-sub mt-[0.107em] block font-tf-sans text-[0.268em] leading-[1.2] tracking-[0.111em]",
          dark ? "text-lima-claro" : "text-salvia",
        )}
      >
        {landing.footer.sufijoWordmark}
      </span>
    </>
  );

  return (
    <>
      <span className="tf-logo-sizer">{lockup}</span>
      <span className="tf-logo">{lockup}</span>
    </>
  );
}
