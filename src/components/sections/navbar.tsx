"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SITE, waLink } from "@/content/site";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: highlight the nav link for the section currently in view.
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.replace("#", ""));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
          scrolled ? "border-border bg-base/80 backdrop-blur-md" : "border-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <a href="#top" aria-label={SITE.name} className="inline-flex items-center">
            <Logo className="h-6 sm:h-7" priority />
          </a>

          {/* desktop links (lg+ to avoid tablet crowding) */}
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={active === link.href ? "true" : undefined}
                className={cn(
                  "text-sm transition-colors hover:text-ink",
                  active === link.href ? "text-ink" : "text-muted",
                )}
              >
                {link.label}
              </a>
            ))}
            <Button href={waLink("¡Hola! Quiero agendar mi evaluación.")} size="sm">
              Agendá tu evaluación
            </Button>
          </div>

          {/* mobile/tablet toggle */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>

      {/* Full-screen overlay — dims page content and closes menu on tap.
          Rendered outside <header> to avoid stacking-context issues. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          "fixed inset-0 z-[45] bg-black/60 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Mobile/tablet menu panel — slides down from below the navbar bar.
          backdrop-blur-xl + opaque bg ensure content never bleeds through,
          regardless of scroll position. */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-0 top-16 bottom-0 z-[46] flex flex-col gap-2 overflow-y-auto",
          "border-t border-border bg-[#0a0a0a]/90 px-5 py-6 backdrop-blur-xl",
          "transition-transform duration-200 ease-out lg:hidden",
          open ? "translate-y-0 pointer-events-auto" : "-translate-y-full pointer-events-none",
        )}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={close}
            className="rounded-lg px-3 py-3 text-lg text-ink transition-colors hover:bg-surface-hover"
          >
            {link.label}
          </a>
        ))}
        <Button
          href={waLink("¡Hola! Quiero agendar mi evaluación.")}
          className="mt-3"
          onClick={close}
        >
          Agendá tu evaluación
        </Button>
      </div>
    </>
  );
}
