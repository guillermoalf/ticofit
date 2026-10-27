"use client";

import { useId, useRef, useState } from "react";

import type { SedeId } from "@/content/landing";
import { cn } from "@/lib/utils";

const TONES = {
  light: {
    list: "bg-amarillo-verde p-1.5",
    on: "bg-verde-profundo text-crema-claro",
    off: "bg-transparent text-oliva",
    button: "px-4 text-[14px] sm:px-[30px] sm:text-[15px]",
  },
  dark: {
    list: "bg-verde-noche p-[5px]",
    on: "bg-lima-claro text-verde-profundo",
    off: "bg-transparent text-niebla-media",
    button: "px-4 text-[14px] sm:px-7",
  },
} as const;

/**
 * Sede switcher (`/sedes`, `/membresias`). Renders the intro section with the
 * tablist, then the selected panel. Panels are server-rendered and passed in.
 */
export function SedeTabs({
  label,
  tabs,
  initial,
  tone,
  intro,
  introClassName,
  panels,
}: {
  label: string;
  tabs: ReadonlyArray<{ id: SedeId; label: string }>;
  initial: SedeId;
  tone: keyof typeof TONES;
  intro: React.ReactNode;
  introClassName?: string;
  panels: Record<SedeId, React.ReactNode>;
}) {
  const [sede, setSede] = useState<SedeId>(initial);
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const t = TONES[tone];

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setSede(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <>
      <section className={introClassName}>
        {intro}
        <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full flex-wrap rounded-full", t.list)}>
          {tabs.map((tab, i) => {
            const selected = tab.id === sede;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setSede(tab.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-full border-0 font-semibold transition-colors",
                  t.button,
                  selected ? t.on : t.off,
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${sede}`}>
        {panels[sede]}
      </div>
    </>
  );
}
