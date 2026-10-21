"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * The shared right-hand panel for portal forms.
 *
 * Sized in `dvh`, not `vh`/`inset-y-0`: on iOS the software keyboard shrinks
 * the visual viewport without changing `vh`, so a `vh`-sized panel keeps its
 * full height, the page scrolls underneath, and the next tap lands on
 * whatever slid under the finger. `dvh` tracks the dynamic viewport, and
 * `overscroll-contain` keeps the scroll inside the panel.
 */
export function SlideOver({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[100dvh]">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border-strong bg-surface shadow-glow"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/** Scrollable body for a SlideOver form. Pair with SlideOverFooter. */
export function SlideOverBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-5">
      {children}
    </div>
  );
}

/** Sticky action row that never scrolls out of reach on a phone. */
export function SlideOverFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 gap-3 border-t border-border bg-surface px-6 py-4">
      {children}
    </div>
  );
}
