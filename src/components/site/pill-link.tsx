import { cn } from "@/lib/utils";
import { SmartLink } from "./smart-link";

const VARIANTS = {
  lima: "bg-lima-claro text-verde-profundo font-semibold",
  verde: "bg-verde-profundo text-crema-claro",
  tinta: "bg-banda-tinta text-crema-claro font-semibold",
  teal: "bg-teal text-crema-claro font-semibold",
  outline: "border border-verde-profundo text-verde-profundo",
  outlineTinta: "border border-banda-tinta text-banda-tinta",
  outlineTeal: "border border-teal text-teal",
  outlineCrema: "border border-crema-claro/60 text-crema-claro",
  outlineLima: "border border-lima-claro text-lima-claro font-semibold",
} as const;

export type PillVariant = keyof typeof VARIANTS;

/** Pill-shaped CTA. Size (min-height, padding, type) comes in `className`. */
export function PillLink({
  href,
  variant,
  className,
  children,
}: {
  href: string;
  variant: PillVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SmartLink
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full no-underline transition-opacity hover:opacity-90",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </SmartLink>
  );
}
