"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Camera,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LineChart,
  Menu,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/app/portal/signout-button";
import type { Role } from "@/types/profile";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const COACH_LINKS: NavItem[] = [
  { href: "/portal/clientes", label: "Clientes", icon: Users },
  { href: "/portal/ejercicios", label: "Ejercicios", icon: Dumbbell },
  { href: "/portal/programas", label: "Programas", icon: ClipboardList },
  { href: "/portal/pagos", label: "Pagos", icon: CreditCard },
  { href: "/portal/visitas", label: "Visitas", icon: CalendarCheck },
  { href: "/portal/perfil", label: "Mi cuenta", icon: User },
];

/** The platform owner manages coaches, nothing else. */
const ADMIN_LINKS: NavItem[] = [
  { href: "/portal/admin", label: "Entrenadores", icon: ShieldCheck },
  { href: "/portal/perfil", label: "Mi cuenta", icon: User },
];

const CLIENT_LINKS: NavItem[] = [
  { href: "/portal/rutina", label: "Mi rutina", icon: Dumbbell },
  { href: "/portal/progreso", label: "Mi progreso", icon: LineChart },
  { href: "/portal/evidencias", label: "Evidencias", icon: Camera },
  { href: "/portal/perfil", label: "Mi perfil", icon: User },
];

/**
 * Role-aware portal navigation: fixed sidebar on desktop, hamburger +
 * blur/overlay panel (same pattern as the landing navbar) on mobile.
 */
export function PortalSidebar({
  role,
  userName,
}: {
  role: Role;
  userName: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links =
    role === "admin"
      ? ADMIN_LINKS
      : role === "coach"
        ? COACH_LINKS
        : CLIENT_LINKS;

  // Close the mobile panel on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            isActive(href)
              ? "bg-surface-hover text-ink"
              : "text-muted hover:bg-surface-hover/60 hover:text-ink",
          )}
        >
          <Icon
            size={18}
            className={isActive(href) ? "text-primary" : "text-muted-2"}
          />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-border pt-4">
      {userName && (
        <p className="mb-3 truncate px-3 text-sm text-muted" title={userName}>
          {userName}
        </p>
      )}
      <SignOutButton />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/40 px-4 py-6 lg:flex">
        <Link href="/portal" aria-label={BRAND.name} className="mb-8 inline-flex px-3">
          <Logo className="h-6" />
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-base/80 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/portal" aria-label={BRAND.name} className="inline-flex">
            <Logo className="h-6" />
          </Link>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile overlay — dims content and closes the menu on tap. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[45] bg-black/60 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Mobile menu panel — slides down from below the top bar. */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-0 top-16 bottom-0 z-[46] flex flex-col overflow-y-auto",
          "border-t border-border bg-[#0a0a0a]/90 px-5 py-6 backdrop-blur-xl",
          "transition-transform duration-200 ease-out lg:hidden",
          open ? "translate-y-0 pointer-events-auto" : "-translate-y-full pointer-events-none",
        )}
      >
        <div className="flex-1">{nav}</div>
        <div className="mt-6">{footer}</div>
      </div>
    </>
  );
}
