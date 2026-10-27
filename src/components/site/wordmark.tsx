import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Typeset "ticofit®" wordmark in the display serif. */
export function Wordmark({
  className,
  markClassName,
  showMark = true,
}: {
  className?: string;
  markClassName?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn("font-tf-serif leading-none", className)}>
      {BRAND.wordmark.lead}
      <span className="italic">{BRAND.wordmark.italic}</span>
      {showMark && (
        <span className={cn("align-super text-[12px]", markClassName)}>{BRAND.wordmark.mark}</span>
      )}
    </span>
  );
}
