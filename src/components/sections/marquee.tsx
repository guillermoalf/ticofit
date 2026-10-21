import { SERVICES } from "@/content/site";

/**
 * Slow horizontal ribbon of the service names — monochrome, with a single
 * violet dot as separator. Pure CSS animation (paused under
 * prefers-reduced-motion); the list is duplicated for a seamless loop.
 */
export function Marquee() {
  const items = SERVICES.map((s) => s.title);

  const strip = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
    >
      {items.map((label) => (
        <li
          key={label}
          // `text-base` is unusable here: the design system names a color
          // "base", so Tailwind resolves it as `color: #0a0a0a` (invisible).
          className="flex items-center gap-8 pr-8 font-display text-sm font-medium uppercase tracking-[0.25em] text-muted-2 sm:text-[1rem]"
        >
          {label}
          <span aria-hidden className="h-1 w-1 rounded-full bg-primary shadow-glow-soft" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden border-y border-border py-5">
      <div className="animate-marquee flex w-max">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}
