import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva(
  "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] no-underline transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        // clean white button with dark label — the high-contrast default
        primary:
          "bg-white text-primary-ink hover:bg-white/90 hover:-translate-y-0.5",
        // outlined; gains a faint wash + neon-edge accent on hover
        ghost:
          "border border-border-strong bg-transparent text-ink hover:bg-surface-hover hover:border-primary",
        // "neon tube" — transparent fill, glowing violet border (accent CTA)
        neon: "border border-primary bg-transparent text-ink shadow-glow-soft hover:shadow-glow hover:-translate-y-0.5",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm: "h-10 px-5 text-[13px]",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonBaseProps = VariantProps<typeof button> & {
  className?: string;
  children: React.ReactNode;
  /**
   * Shows a spinner in place of the leading icon and blocks further clicks.
   * Server actions here routinely take several seconds, so every async
   * button must pass this — without it the app reads as frozen and the coach
   * taps again.
   */
  loading?: boolean;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant,
  size,
  className,
  children,
  loading,
  ...props
}: ButtonProps) {
  const classes = cn(button({ variant, size }), className);

  if ("href" in props && props.href !== undefined) {
    return (
      <a className={classes} {...(props as ButtonAsLink)}>
        {children}
      </a>
    );
  }

  const { disabled, ...rest } = props as ButtonAsButton;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
