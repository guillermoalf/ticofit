"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Delete, Lock } from "lucide-react";

import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { SignOutButton } from "@/app/portal/signout-button";
import { cn } from "@/lib/utils";
import { bootstrapAction, unlockAction } from "./desk-actions";

export type DeskLockStaff = { id: string; full_name: string; role_label: string; has_pin: boolean };

/**
 * The shared computer's resting state. Staff tap their name and type their
 * 4-digit PIN (keyboard digits work too). With no staff at all yet, it asks
 * for the first administrator instead.
 */
export function DeskLock({
  deskName,
  sedeNames,
  staff,
}: {
  deskName: string;
  sedeNames: string[];
  staff: DeskLockStaff[];
}) {
  const [picked, setPicked] = useState<DeskLockStaff | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <TicofitLogo className="h-9 w-auto text-verde-profundo" />
        <p className="text-right text-sm text-muted">{sedeNames.join(" · ") || deskName}</p>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        {staff.length === 0 ? (
          <Bootstrap />
        ) : picked ? (
          <PinPad person={picked} onBack={() => setPicked(null)} />
        ) : (
          <>
            <h1 className="font-tf-serif text-[40px] leading-tight sm:text-[52px]">¿Quién está trabajando?</h1>
            <p className="mt-2 text-muted">Tocá tu nombre y escribí tu PIN.</p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {staff.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(s)}
                    className="flex h-full w-full cursor-pointer flex-col items-start rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-hover"
                  >
                    <span className="text-[17px] font-semibold">{s.full_name}</span>
                    <span className="mt-1 text-sm text-muted">{s.role_label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <Lock size={15} aria-hidden="true" /> {deskName}
        </span>
        <SignOutButton />
      </footer>
    </main>
  );
}

function PinPad({ person, onBack }: { person: DeskLockStaff; onBack: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = useCallback(
    (value: string) => {
      start(async () => {
        const res = await unlockAction(person.id, value);
        if (res.ok) {
          router.refresh();
        } else {
          setError(res.error);
          setPin("");
        }
      });
    },
    [person.id, router],
  );

  const press = useCallback(
    (d: string) => {
      if (pending) return;
      setError(null);
      setPin((p) => {
        const next = (p + d).slice(0, 4);
        if (next.length === 4) submit(next);
        return next;
      });
    },
    [pending, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, onBack]);

  if (!person.has_pin) {
    return (
      <div className="text-center">
        <h1 className="font-tf-serif text-[36px]">{person.full_name}</h1>
        <p className="mt-3 text-muted">Todavía no tenés PIN. Pedile a un administrador que te asigne uno.</p>
        <button type="button" onClick={onBack} className="mt-8 cursor-pointer text-sm font-semibold underline underline-offset-4">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xs text-center">
      <h1 className="font-tf-serif text-[36px] leading-tight">{person.full_name}</h1>
      <p className="mt-1 text-muted">Escribí tu PIN</p>

      <div className="mt-6 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("size-4 rounded-full border-2 border-verde-profundo", i < pin.length && "bg-verde-profundo")}
          />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={pending}>
            {d}
          </Key>
        ))}
        <button type="button" onClick={onBack} className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
          Volver
        </button>
        <Key onClick={() => press("0")} disabled={pending}>
          0
        </Key>
        <Key onClick={() => setPin((p) => p.slice(0, -1))} disabled={pending} label="Borrar">
          <Delete size={22} aria-hidden="true" />
        </Key>
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-16 cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface text-2xl font-semibold transition-colors hover:bg-surface-hover disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Bootstrap() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirm) return setError("Los dos PIN no coinciden.");
    start(async () => {
      const res = await bootstrapAction(name, pin);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[16px] text-ink outline-none focus:border-primary";

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm">
      <h1 className="font-tf-serif text-[40px] leading-tight">Primer ingreso</h1>
      <p className="mt-2 text-muted">
        Todavía no hay personal registrado. Creá el primer administrador: después vas a poder agregar al resto del equipo.
      </p>
      <label htmlFor="boot-name" className="mt-6 mb-1.5 block text-sm text-muted">
        Tu nombre
      </label>
      <input id="boot-name" value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="name" />
      <label htmlFor="boot-pin" className="mt-4 mb-1.5 block text-sm text-muted">
        PIN de 4 números
      </label>
      <input
        id="boot-pin"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="new-password"
        className={input}
      />
      <label htmlFor="boot-confirm" className="mt-4 mb-1.5 block text-sm text-muted">
        Repetí el PIN
      </label>
      <input
        id="boot-confirm"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="new-password"
        className={input}
      />
      <p role="alert" className="mt-3 min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full cursor-pointer rounded-full bg-verde-profundo px-6 py-3.5 font-semibold text-crema-claro disabled:opacity-60"
      >
        Crear y entrar
      </button>
    </form>
  );
}
