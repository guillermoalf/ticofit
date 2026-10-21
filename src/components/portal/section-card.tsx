"use client";

import { cn } from "@/lib/utils";

/**
 * The compact section shell the client-detail panels share: a title, a
 * one-line count and a single round action button. Deliberately quiet — a
 * coach scrolling a client record on a phone should see what they have and
 * one way to add to it, nothing else.
 */

export function PortalSection({
  title,
  summary,
  action,
  children,
}: {
  title: string;
  summary: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-card border border-border bg-surface/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{summary}</p>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** The round icon button that sits in a section header. */
export function SectionAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong text-ink transition-colors hover:border-primary hover:bg-surface-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** One-line empty state — no illustration, no second call to action. */
export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted-2">
      {children}
    </p>
  );
}
