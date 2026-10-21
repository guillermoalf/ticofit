import { cn } from "@/lib/utils";

type CardBaseProps = {
  className?: string;
  /** Adds the neon glow + lift on hover (for clickable cards). */
  interactive?: boolean;
  children: React.ReactNode;
};

const base = "rounded-card border border-border bg-surface/60 p-6";

/** Surface card. Renders an <a> when `href` is set, otherwise a <div>. */
export function Card({
  className,
  interactive,
  children,
  href,
  ...props
}: CardBaseProps &
  (
    | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & React.HTMLAttributes<HTMLDivElement>)
  )) {
  const classes = cn(base, interactive && "glow-hover", className);

  if (href !== undefined) {
    return (
      <a
        href={href}
        className={classes}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <div className={classes} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}
