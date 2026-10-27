"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Chevron } from "./icons";
import { PillLink } from "./pill-link";
import { Wordmark } from "./wordmark";

const { nav } = landing;

/** Routes whose page sits on the dark field; the header flips to cream text. */
const DARK_ROUTES = ["/membresias"];

/**
 * Shared site header. Owns the Sedes dropdown (closes on outside click and
 * Escape) and the full-screen mobile menu.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const dark = DARK_ROUTES.includes(pathname);

  const [sedesOpen, setSedesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const menuId = useId();

  // Close everything when the route changes.
  useEffect(() => {
    setSedesOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sedesOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setSedesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSedesOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [sedesOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;
  const sedesActive = pathname === "/sedes";

  const linkBase = "text-[14px] leading-[44px] tracking-[0.4px] no-underline";
  const linkTone = dark
    ? "text-crema-claro hover:text-lima-claro"
    : "text-verde-profundo hover:text-negro-grisaceo";
  const activeTone = dark
    ? "text-lima-claro border-b border-lima-claro"
    : "border-b border-verde-profundo";

  return (
    <header
      className={cn(
        "relative z-20 flex items-center gap-6 px-5 py-[18px] lg:px-10",
        dark ? "bg-verde-profundo" : "bg-crema-claro",
      )}
    >
      <Link
        href="/"
        aria-label={nav.inicioLabel}
        className={cn(
          "text-[28px] tracking-[-0.4px] no-underline",
          dark ? "text-crema-claro" : "text-verde-profundo",
        )}
      >
        <Wordmark />
      </Link>

      {/* Desktop nav */}
      <nav className="ml-auto hidden items-center gap-[26px] lg:flex">
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            aria-expanded={sedesOpen}
            aria-controls={dropdownId}
            onClick={() => setSedesOpen((open) => !open)}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-[7px] bg-transparent px-1 text-[14px] tracking-[0.4px]",
              dark ? "text-crema-claro" : "text-verde-profundo",
              sedesActive && activeTone,
            )}
          >
            {nav.sedesLabel}
            <Chevron className={cn("transition-transform", sedesOpen && "rotate-180", dark && "text-lima-claro")} />
          </button>
          {sedesOpen && (
            <div
              id={dropdownId}
              className="absolute top-[46px] -left-3 w-[300px] rounded-[14px] border border-linea bg-crema-claro p-2 shadow-[0_16px_40px] shadow-verde-profundo/15"
            >
              {nav.sedesMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSedesOpen(false)}
                  className="block rounded-[10px] px-[15px] py-[13px] text-verde-profundo no-underline hover:bg-crema-card"
                >
                  <span className="block text-[15px] font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[13px] text-salvia">{item.sub}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {nav.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(linkBase, linkTone, isActive(link.href) && activeTone)}
          >
            {link.label}
          </Link>
        ))}

        <PillLink
          href={nav.reservar.href}
          variant="lima"
          className="min-h-10 px-[22px] text-[13px] tracking-[0.6px]"
        >
          {nav.reservar.label}
        </PillLink>
      </nav>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={nav.abrirMenu}
        onClick={() => setMenuOpen(true)}
        className={cn(
          "ml-auto inline-flex size-11 cursor-pointer items-center justify-center bg-transparent lg:hidden",
          dark ? "text-crema-claro" : "text-verde-profundo",
        )}
      >
        <svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true">
          <path d="M1 1h22M1 8h22M1 15h22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {menuOpen && (
        <div
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-label={nav.menuLabel}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-y-auto px-5 pt-[18px] pb-10 lg:hidden",
            dark ? "bg-verde-profundo text-crema-claro" : "bg-crema-claro text-verde-profundo",
          )}
        >
          <div className="flex items-center">
            <Link href="/" aria-label={nav.inicioLabel} className="text-[28px] text-inherit no-underline">
              <Wordmark />
            </Link>
            <button
              type="button"
              aria-label={nav.cerrarMenu}
              onClick={() => setMenuOpen(false)}
              autoFocus
              className="ml-auto inline-flex size-11 cursor-pointer items-center justify-center bg-transparent text-inherit"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="mt-10 flex flex-col">
            <p className={cn("text-[11px] tracking-[2.4px]", dark ? "text-lima-claro" : "text-salvia")}>
              {nav.sedesLabel.toUpperCase()}
            </p>
            {nav.sedesMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 font-tf-serif text-[34px] leading-tight text-inherit no-underline"
              >
                {item.label}
              </Link>
            ))}
            <div className={cn("my-6 h-px", dark ? "bg-linea-oscura" : "bg-linea")} />
            {nav.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "py-2 font-tf-serif text-[34px] leading-tight text-inherit no-underline",
                  isActive(link.href) && "italic",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <PillLink
            href={nav.reservar.href}
            variant="lima"
            className="mt-10 min-h-[52px] self-start px-8 text-[15px]"
          >
            {nav.reservar.label}
          </PillLink>
        </div>
      )}
    </header>
  );
}
