"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Dumbbell,
  Home,
  Lock,
  Menu,
  Receipt,
  Settings,
  Users,
  UserCog,
  Wallet,
  Banknote,
  X,
} from "lucide-react";

import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { cn } from "@/lib/utils";
import { lockAction, switchSedeAction, touchAction } from "./desk-actions";
import { DESK_NAV, type DeskNavItem } from "./nav";

const ICONS: Record<DeskNavItem["icon"], React.ComponentType<{ size?: number; className?: string }>> = {
  home: Home,
  users: Users,
  receipt: Receipt,
  wallet: Wallet,
  calendar: CalendarDays,
  dumbbell: Dumbbell,
  team: UserCog,
  clock: Clock,
  payroll: Banknote,
  settings: Settings,
};

/**
 * Frame for every desk page: navigation filtered by the acting employee's
 * permissions, who is acting, the sede switcher and the lock button. Locks
 * itself after the configured idle minutes (the database expires the session
 * on its own as well, so a closed laptop can't keep one alive).
 */
export function DeskShell({
  staff,
  sedes,
  activeSedeId,
  idleMinutes,
  children,
}: {
  staff: StaffContext;
  sedes: { id: string; name: string }[];
  activeSedeId: string | null;
  idleMinutes: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const links = DESK_NAV.filter((l) => !l.needs || can(staff, l.needs));

  const lock = () =>
    start(async () => {
      await lockAction();
      router.refresh();
    });

  // Idle auto-lock.
  const lockRef = useRef(lock);
  lockRef.current = lock;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let touched = Date.now();
    const reset = () => {
      clearTimeout(timer);
      // The database only sees requests, so tell it about activity (at most
      // every 20 s, well inside the 1-minute minimum idle setting).
      if (Date.now() - touched > 20_000) {
        touched = Date.now();
        void touchAction().then((alive) => {
          if (!alive) router.replace("/bloqueo");
        });
      }
      timer = setTimeout(() => lockRef.current(), Math.max(1, idleMinutes) * 60_000);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [idleMinutes, router]);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/escritorio" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
              isActive(href) ? "bg-surface-hover font-semibold text-ink" : "text-muted hover:bg-surface-hover/70 hover:text-ink",
            )}
          >
            <Icon size={18} className={isActive(href) ? "text-ink" : "text-muted-2"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const who = (
    <div className="border-t border-border pt-4">
      <p className="text-[15px] font-semibold">{staff.full_name}</p>
      <p className="text-sm text-muted">{staff.role_label}</p>
      {sedes.length > 1 && (
        <div className="mt-3">
          <label htmlFor="sede-switch" className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
            Sede
          </label>
          <select
            id="sede-switch"
            value={activeSedeId ?? ""}
            onChange={(e) => start(async () => {
              await switchSedeAction(e.target.value || null);
              router.refresh();
            })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[16px] text-ink"
          >
            <option value="">Todas mis sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="button"
        onClick={lock}
        disabled={pending}
        className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-verde-profundo px-4 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-60"
      >
        <Lock size={15} aria-hidden="true" /> Bloquear
      </button>
    </div>
  );

  return (
    <div className="lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-surface px-4 py-6 lg:flex">
        <div>
          <TicofitLogo className="mb-8 h-8 w-auto px-2 text-verde-profundo" />
          {nav}
        </div>
        {who}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <TicofitLogo className="h-7 w-auto text-verde-profundo" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={lock}
            aria-label="Bloquear"
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border"
          >
            <Lock size={17} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menú" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface px-4 py-4 lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <TicofitLogo className="h-7 w-auto text-verde-profundo" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              autoFocus
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-6">
            {nav}
            {who}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
